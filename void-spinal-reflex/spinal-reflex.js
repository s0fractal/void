import EventSource from 'eventsource';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const RELAY_BASE = (process.env.RELAY_BASE || 'http://localhost:8787').replace(/\/$/,''); 
const SSE = RELAY_BASE + (process.env.SSE_PATH || '/sse');
const EVENT_POST = RELAY_BASE + (process.env.EVENT_POST || '/event');

const WORKDIR = process.env.WORKDIR || '/workspace/void-ci';
const ALLOW_REPOS = (process.env.ALLOW_REPOS || 'voideditor/void,s0fractal/void')
  .split(',').map(s=>s.trim()).filter(Boolean);
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 15 * 60_000); // 15m
const DRY_RUN = process.env.DRY_RUN === '1';
const USER_NAME = process.env.USER_NAME || 'void'; // used in runit script

const queue = [];
let busy = false;
const activeByRepo = new Map();

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
  tick();
}

async function tick(){
  if (busy || !queue.length) return;
  const task = queue.shift(); busy = true;
  try { await runTask(task); }
  catch (e) { log('task error', task.key, e?.stack||String(e)); }
  finally { busy = false; tick(); }
}

async function runTask({ key, repo, pr, sha }){
  if (activeByRepo.get(repo)) { queue.push({ key, repo, pr, sha }); return; }
  activeByRepo.set(repo, true);
  const started = new Date().toISOString();
  const repoDir = path.join(WORKDIR, repo.replace('/','__'));
  await fs.mkdir(repoDir, { recursive: true });

  let status = 'pass';
  const logs = [];
  const steps = [];

  steps.push(step('git_prepare', 'bash', ['-lc', `
    set -e
    if [ ! -d ".git" ]; then git clone https://github.com/${repo}.git .; fi
    git fetch --all --prune
    if [ -n "${sha||''}" ]; then git checkout -f ${sha}; else git checkout -f $(git rev-parse HEAD); fi
    git submodule update --init --recursive
  `], { cwd: repoDir }));

  steps.push(step('deps', 'bash', ['-lc', `
    if command -v fnpm >/dev/null 2>&1; then fnpm install; else npm i; fi
  `], { cwd: repoDir }));

  steps.push(step('tests', 'bash', ['-lc', `
    if command -v fnpm >/dev/null 2>&1; then fnpm test || fnpm run test || exit 1;
    else npm test || npm run test || exit 1; fi
  `], { cwd: repoDir }));

  if (DRY_RUN){
    await postEvent({
      type: 'ci.result', status: 'dryrun',
      repo, pr, sha, started, finished: new Date().toISOString(),
      logs: [{ step:'dryrun', code:0, ms:0, tail:'skipped real CI by DRY_RUN=1' }],
      meta: { source:'spinal-reflex', mode:'auto', resonance: 0.5 }
    });
    activeByRepo.delete(repo);
    return;
  }

  for (const s of steps){
    const out = await s;
    logs.push(out);
    if (out.code !== 0){ status = 'fail'; break; }
  }

  await postEvent({
    type: 'ci.result', status,
    repo, pr, sha, started, finished: new Date().toISOString(),
    logs,
    meta: { source:'spinal-reflex', mode:'auto', resonance: status==='pass' ? 0.9 : 0.3 }
  });

  activeByRepo.delete(repo);
}

function step(name, cmd, args=[], opts={}){
  return new Promise((resolve) => {
    const t0 = Date.now();
    const child = spawn(cmd, args, { ...opts, shell:false });
    let stdout='', stderr='';
    let done=false;
    const killTimer = setTimeout(()=>{ if(!done) child.kill('SIGKILL'); }, TIMEOUT_MS);
    child.stdout.on('data', d => stdout += d.toString());
    child.stderr.on('data', d => stderr += d.toString());
    child.on('close', code => {
      clearTimeout(killTimer);
      done = true;
      resolve({ step:name, code, ms: Date.now()-t0, tail: tail(stdout+stderr, 4000) });
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

(function main(){
  console.log('[reflex] SSE connect', SSE, 'repos:', ALLOW_REPOS.join(','), 'DRY_RUN=', DRY_RUN);
  const es = new EventSource(SSE);
  es.onmessage = (m) => { try { const ev = JSON.parse(m.data); onEvent(ev); } catch {} };
  es.onerror = () => { /* auto-reconnect by lib */ };
})();
