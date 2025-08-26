import EventSource from 'eventsource';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import client from 'prom-client';

const RELAY_BASE = (process.env.RELAY_BASE || 'http://localhost:8787').replace(/\/$/,''); 
const SSE = RELAY_BASE + (process.env.SSE_PATH || '/sse');
const EVENT_POST = RELAY_BASE + (process.env.EVENT_POST || '/event');

const WORKDIR = process.env.WORKDIR || '/workspace/void-ci';
const ALLOW_REPOS = (process.env.ALLOW_REPOS || 'voideditor/void,s0fractal/void')
  .split(',').map(s=>s.trim()).filter(Boolean);
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 15 * 60_000); // 15m
const DRY_RUN = process.env.DRY_RUN === '1';
const USER_NAME = process.env.USER_NAME || 'void'; // informative only
const METRICS_ENABLED = (process.env.METRICS_ENABLED ?? '1') === '1';
const PROM_PORT = Number(process.env.PROM_PORT || 9482);

const queue = [];
let busy = false;
const activeByRepo = new Map();

// ---------- Prometheus metrics ----------
const reg = new client.Registry();
client.collectDefaultMetrics({ register: reg });
const gQueue = new client.Gauge({ name:'void_reflex_queue_depth', help:'Tasks waiting' });
const gActive = new client.Gauge({ name:'void_reflex_active', help:'Active task (0|1)' });
const cEnq = new client.Counter({ name:'void_reflex_enqueued_total', help:'Enqueued tasks' });
const cBuilds = new client.Counter({ name:'void_reflex_builds_total', help:'Build results', labelNames:['status'] });
const hStep = new client.Histogram({
  name:'void_reflex_step_duration_ms',
  help:'Step duration (ms)',
  labelNames:['step','result'],
  buckets:[100,300,700,1500,3000,6000,12000,30000,60000,120000,300000,600000]
});
const hBuild = new client.Histogram({
  name:'void_reflex_build_duration_ms',
  help:'Build duration (ms)',
  buckets:[1000,5000,15000,30000,60000,120000,300000,600000,900000,1200000]
});
const cTimeouts = new client.Counter({ name:'void_reflex_timeouts_total', help:'Timeouts', labelNames:['phase'] });
const gSse = new client.Gauge({ name:'void_reflex_sse_connected', help:'SSE connected (0|1)' });
const cSseRe = new client.Counter({ name:'void_reflex_sse_reconnects_total', help:'SSE reconnects' });
const gLastStart = new client.Gauge({ name:'void_reflex_last_build_started', help:'Last build start time (unix seconds)' });
const gLastFinish = new client.Gauge({ name:'void_reflex_last_build_finished', help:'Last build finish time (unix seconds)' });
reg.registerMetric(gQueue); reg.registerMetric(gActive); reg.registerMetric(cEnq);
reg.registerMetric(cBuilds); reg.registerMetric(hStep); reg.registerMetric(hBuild);
reg.registerMetric(cTimeouts); reg.registerMetric(gSse); reg.registerMetric(cSseRe);
reg.registerMetric(gLastStart); reg.registerMetric(gLastFinish);

// metrics server
if (METRICS_ENABLED){
  const server = http.createServer(async (req,res)=>{
    if (req.url && req.url.startsWith('/metrics')){
      res.setHeader('Content-Type', reg.contentType);
      res.end(await reg.metrics());
      return;
    }
    if (req.url && req.url.startsWith('/healthz')){
      res.setHeader('content-type','application/json');
      res.end(JSON.stringify({ ok:true, queue: queue.length, active: busy, sse: gSse.hashMap?.size ? 1 : undefined }));
      return;
    }
    res.statusCode = 404; res.end('ok');
  });
  server.listen(PROM_PORT, ()=> console.log('[reflex] metrics on :' + PROM_PORT));
}

// ---------- core ----------
function log(...a){ console.log('[reflex]', ...a); }

function isInteresting(ev){
  const t = ev?.type;
  const a = ev?.meta?.action;
  if (t === 'github.pull_request' && ['opened','synchronize','reopened'].includes(a)) return true;
  if (t === 'github.push') return true;
  return false;
}

function onEvent(ev){
  if (!isInteresting(ev)) return;
  const repo = ev.repo || ev.meta?.repo;
  if (!repo || !ALLOW_REPOS.includes(repo)) return;
  const key = `${repo}@${ev.sha || ev.meta?.sha || ev.pr || 'head'}`;
  if (queue.find(t => t.key === key)) return;
  queue.push({ key, repo, pr: ev.pr || ev.meta?.pr, sha: ev.sha || ev.meta?.sha });
  cEnq.inc();
  gQueue.set(queue.length);
  tick();
}

async function tick(){
  if (busy || !queue.length) return;
  const task = queue.shift(); gQueue.set(queue.length);
  busy = true; gActive.set(1);
  try { await runTask(task); }
  catch (e) { log('task error', task.key, e?.stack||String(e)); }
  finally { busy = false; gActive.set(0); tick(); }
}

async function runTask({ key, repo, pr, sha }){
  if (activeByRepo.get(repo)) { queue.push({ key, repo, pr, sha }); gQueue.set(queue.length); return; }
  activeByRepo.set(repo, true);
  const tBuild0 = Date.now();
  gLastStart.set(Math.floor(tBuild0/1000));

  const started = new Date().toISOString();
  const repoDir = path.join(WORKDIR, repo.replace('/','__'));
  await fs.mkdir(repoDir, { recursive: true });

  let status = 'pass';
  const logs = [];

  const s1 = await stepTimed('git', 'bash', ['-lc', `
    set -e
    if [ ! -d ".git" ]; then git clone https://github.com/${repo}.git .; fi
    git fetch --all --prune
    if [ -n "${sha||''}" ]; then git checkout -f ${sha}; else git checkout -f $(git rev-parse HEAD); fi
    git submodule update --init --recursive
  `], { cwd: repoDir });
  logs.push(s1);
  if (s1.result !== 'ok') status = 'fail';

  if (status === 'pass'){
    const s2 = await stepTimed('deps', 'bash', ['-lc', `
      if command -v fnpm >/dev/null 2>&1; then fnpm install; else npm i; fi
    `], { cwd: repoDir });
    logs.push(s2);
    if (s2.result !== 'ok') status = 'fail';
  }

  if (status === 'pass'){
    const s3 = await stepTimed('tests', 'bash', ['-lc', `
      if command -v fnpm >/dev/null 2>&1; then fnpm test || fnpm run test || exit 1;
      else npm test || npm run test || exit 1; fi
    `], { cwd: repoDir });
    logs.push(s3);
    if (s3.result !== 'ok') status = 'fail';
  }

  const tBuild1 = Date.now();
  hBuild.observe(tBuild1 - tBuild0);
  gLastFinish.set(Math.floor(tBuild1/1000));

  if (DRY_RUN){
    cBuilds.labels('dryrun').inc();
  } else if (status === 'pass'){
    cBuilds.labels('pass').inc();
  } else {
    cBuilds.labels('fail').inc();
  }

  await postEvent({
    type: 'ci.result', status: DRY_RUN ? 'dryrun' : status,
    repo, pr, sha, started, finished: new Date().toISOString(),
    logs,
    meta: { source:'spinal-reflex', mode:'auto', resonance: status==='pass' ? 0.9 : 0.3 }
  });

  activeByRepo.delete(repo);
}

function stepTimed(stepName, cmd, args=[], opts={}){
  return new Promise((resolve) => {
    const t0 = Date.now();
    const child = spawn(cmd, args, { ...opts, shell:false });
    let stdout='', stderr='';
    let done=false, killed=false;
    const killTimer = setTimeout(()=>{ if(!done){ killed=true; child.kill('SIGKILL'); } }, TIMEOUT_MS);
    child.stdout.on('data', d => stdout += d.toString());
    child.stderr.on('data', d => stderr += d.toString());
    child.on('close', code => {
      clearTimeout(killTimer);
      done = true;
      const ms = Date.now()-t0;
      const result = (killed ? 'timeout' : (code===0 ? 'ok' : 'error'));
      if (result === 'timeout') cTimeouts.labels(stepName).inc();
      hStep.labels(stepName, result).observe(ms);
      resolve({ step:stepName, code, ms, result, tail: tail(stdout+stderr, 4000) });
    });
  });
}

function tail(s, n){ return s && s.length>n ? s.slice(-n) : (s||''); }

async function postEvent(payload){
  try {
    await fetch(EVENT_POST, {
      method:'POST',
      headers:{ 'content-type':'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(4000)
    });
  } catch {}
}

// ---- SSE
(function main(){
  console.log('[reflex] SSE connect', SSE, 'repos:', ALLOW_REPOS.join(','), 'DRY_RUN=', DRY_RUN);
  const es = new EventSource(SSE);
  gSse.set(0);
  es.onopen = () => gSse.set(1);
  es.onmessage = (m) => { try { const ev = JSON.parse(m.data); onEvent(ev); } catch {} };
  es.onerror = () => { gSse.set(0); cSseRe.inc(); /* auto-reconnect by lib */ };
})();
