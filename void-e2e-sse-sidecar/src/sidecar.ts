import express from 'express';
import client from 'prom-client';
import EventSource from 'eventsource';

type VoidEvent = { type: string; meta?: any; ts?: string };

const RELAY_BASE = (process.env.RELAY_BASE || 'http://localhost:8787').replace(/\/$/, '');
const POST_ENDPOINT = process.env.POST_ENDPOINT || '/intent/wave';
const SSE_PATH = process.env.SSE_PATH || '/sse';
const PROBE_TEXT = process.env.PROBE_TEXT || 'Resonance probe';
const INTERVAL = Number(process.env.PROBE_INTERVAL_MS || '5000');
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || '15000');
const CONCURRENCY = Math.max(1, Number(process.env.CONCURRENCY || '1'));
const HEADERS = safeJson(process.env.HEADERS_JSON || '{}');
const PROM_PORT = Number(process.env.PROM_PORT || '9478');

// ---- metrics ----
const reg = new client.Registry();
client.collectDefaultMetrics({ register: reg });
const cRuns = new client.Counter({ name:'void_probe_runs_total', help:'probe runs', labelNames:['phase','result'] });
const hDur = new client.Histogram({
  name:'void_probe_duration_ms',
  help:'probe duration ms',
  labelNames:['phase'],
  buckets:[50,100,200,400,800,1500,3000,6000]
});
const gInflight = new client.Gauge({ name:'void_probe_inflight', help:'inflight probes' });
const gSseConnected = new client.Gauge({ name:'void_sse_connected', help:'SSE connected (0|1)' });
const cReconnects = new client.Counter({ name:'void_sse_reconnects_total', help:'SSE reconnects' });
reg.registerMetric(cRuns); reg.registerMetric(hDur); reg.registerMetric(gInflight); reg.registerMetric(gSseConnected); reg.registerMetric(cReconnects);

// ---- SSE listener ----
const sseUrl = RELAY_BASE + SSE_PATH;
let es: EventSource | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;

type Pending = {
  start: number;
  seenIntent?: boolean;
  intentDur?: number;
  timeout: NodeJS.Timeout;
};
const pending = new Map<string, Pending>();

function connectSSE(){
  if (es) { try { es.close(); } catch {} }
  es = new EventSource(sseUrl);
  gSseConnected.set(0);
  es.onopen = () => gSseConnected.set(1);
  es.onerror = () => {
    gSseConnected.set(0);
    cReconnects.inc();
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connectSSE, 1000);
  };
  es.onmessage = (ev: MessageEvent) => {
    try {
      const msg = JSON.parse(String(ev.data)) as VoidEvent;
      const tid = msg?.meta?.trace_id;
      if (!tid) return;
      const p = pending.get(tid);
      if (!p) return;
      const now = Date.now();
      if (msg.type === 'intent.wave' && !p.seenIntent){
        p.seenIntent = true;
        p.intentDur = now - p.start;
        hDur.labels('intent').observe(p.intentDur);
        cRuns.labels('intent','ok').inc();
      }
      if (msg.type === 'response.harmonic' || msg.type === 'response.dissonant'){
        const total = now - p.start;
        hDur.labels('response').observe(total);
        cRuns.labels('response','ok').inc();
        clearTimeout(p.timeout);
        pending.delete(tid);
        gInflight.set(pending.size);
      }
    } catch {}
  };
}
connectSSE();

// ---- probe runner ----
let stop = false;
const ONCE = process.argv.includes('--once');

async function runOne(){
  const trace = 'probe-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  const payload = {
    type:'intent.wave',
    meta:{ text: PROBE_TEXT, trace_id: trace },
    ts: new Date().toISOString()
  };
  const body = JSON.stringify(payload);
  const t0 = Date.now();
  const timeout = setTimeout(()=>{
    const p = pending.get(trace);
    if (p){
      if (!p.seenIntent){
        cRuns.labels('intent','timeout').inc();
      }
      cRuns.labels('response','timeout').inc();
      pending.delete(trace);
      gInflight.set(pending.size);
    }
  }, TIMEOUT_MS);

  pending.set(trace, { start: t0, timeout });
  gInflight.set(pending.size);

  const url = RELAY_BASE + POST_ENDPOINT;
  try{
    const r = await fetch(url, { method:'POST', headers:{ 'content-type':'application/json', **HEADERS }, body, signal: AbortSignal.timeout(TIMEOUT_MS) as any });
    if (!r.ok) {
      cRuns.labels('intent','error').inc();
      // immediate cleanup on failure
      clearTimeout(timeout);
      pending.delete(trace);
      gInflight.set(pending.size);
      return;
    }
  }catch{
    cRuns.labels('intent','error').inc();
    clearTimeout(timeout);
    pending.delete(trace);
    gInflight.set(pending.size);
  }
}

async function loop(){
  if (ONCE) {
    await runOne();
    return;
  }
  while (!stop){
    const proms: Promise<void>[] = [];
    for (let i=0;i<CONCURRENCY;i++) proms.push(runOne());
    await Promise.all(proms);
    await sleep(INTERVAL);
  }
}

function sleep(ms:number){ return new Promise(res=>setTimeout(res, ms)); }

// ---- HTTP server ----
const app = express();
app.get('/metrics', async (_req,res)=>{
  res.set('Content-Type', reg.contentType);
  res.end(await reg.metrics());
});
app.get('/healthz', (_req,res)=>res.json({ ok:true, sse: sseUrl, inflight: pending.size }));
app.listen(PROM_PORT, ()=> console.log('[sidecar] metrics on :' + PROM_PORT));

// start
loop().catch(err => { console.error(err); process.exit(1); });
