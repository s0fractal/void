import http from 'node:http';
import EventSource from 'eventsource';
import client from 'prom-client';

const RELAY_BASE = (process.env.RELAY_BASE || 'http://localhost:8787').replace(/\/$/,'');
const SSE_PATH = process.env.SSE_PATH || '/sse';
const PROM_PORT = Number(process.env.PROM_PORT || 9483);
const HEALTH_EVENT_REGEX = new RegExp(process.env.HEALTH_EVENT_REGEX || '^health(\\.update)?$');
const HEALTH_FIELDS = (process.env.HEALTH_FIELDS || 'aggregate,ci,ipfs,substrate,guardian')
  .split(',').map(s=>s.trim()).filter(Boolean);

// optional backoff proxy if no health events incoming
const BACKUP_FROM_METRICS = (process.env.BACKUP_FROM_METRICS ?? '1') === '1';
const REFRESH_MS = Number(process.env.REFRESH_MS || 5000);

// gauges
const reg = new client.Registry();
client.collectDefaultMetrics({ register: reg });
const g = {};
for (const f of ['aggregate','ci','ipfs','substrate','guardian']) {
  g[f] = new client.Gauge({ name: `void_pulse_health_${f}`, help: `Pulse health ${f}` });
  reg.registerMetric(g[f]);
}

// internal state
let lastHealthTs = 0;

function setField(name, val){
  if (!Number.isFinite(val)) return;
  const gauge = g[name];
  if (!gauge) return;
  gauge.set(val);
  lastHealthTs = Date.now();
}

function parseHealth(ev){
  const m = ev || {};
  const fields = m.health || m.meta || m;
  if (!fields) return false;
  let any = false;
  for (const f of HEALTH_FIELDS) {
    const v = Number(fields[f]);
    if (Number.isFinite(v)) { setField(f, v); any = true; }
  }
  return any;
}

// SSE
const sseUrl = RELAY_BASE + SSE_PATH;
console.log('[pulse] SSE connect', sseUrl);
const es = new EventSource(sseUrl);
es.onmessage = (ev) => {
  try {
    const msg = JSON.parse(String(ev.data));
    if (msg?.type && HEALTH_EVENT_REGEX.test(String(msg.type))) {
      if (parseHealth(msg)) return;
    }
    // Also accept dedicated health payload inside meta.health
    if (msg?.meta?.health) parseHealth({health: msg.meta.health});
  } catch {}
};
es.onerror = () => { /* auto reconnect by lib */ };

// optional proxy tick — derive from other metrics through pushgateway-like fetch?
// Simpler: if no health for REFRESH_MS*3, set aggregate to a heuristic neutral value 0.7
setInterval(()=>{
  const age = Date.now() - lastHealthTs;
  if (age > REFRESH_MS * 3 && BACKUP_FROM_METRICS){
    // neutral fallback; real correlation робить Grafana
    setField('aggregate', 0.7);
  }
}, REFRESH_MS);

// /metrics server
const srv = http.createServer(async (req,res)=>{
  if (req.url && req.url.startsWith('/metrics')){
    res.setHeader('Content-Type', reg.contentType);
    res.end(await reg.metrics());
    return;
  }
  if (req.url === '/healthz'){
    res.setHeader('content-type','application/json');
    res.end(JSON.stringify({ok:true}));
    return;
  }
  res.statusCode = 404; res.end('ok');
});
srv.listen(PROM_PORT, ()=> console.log('[pulse] metrics on :' + PROM_PORT));
