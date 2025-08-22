import express from 'express';
import fetch from 'node-fetch';
import { Counter, Histogram, Gauge, Registry, collectDefaultMetrics } from 'prom-client';
import fs from 'fs';

const RELAY = (process.env.RELAY_BASE || 'http://relay:8787').replace(/\/$/, '');
const DUALITY_SSE = process.env.DUALITY_SSE || '/duality/sse';
const IPFS_API = (process.env.IPFS_API || 'http://ipfs:5001').replace(/\/$/, '');
const GATEWAY = (process.env.GATEWAY || 'https://ipfs.io').replace(/\/$/, '');
const VERIFY_INTERVAL_SEC = Number(process.env.VERIFY_INTERVAL_SEC || '60');
const HEAD_RANGE = process.env.HEAD_RANGE || '0-64';
const AUTO_REPIN = (process.env.AUTO_REPIN || 'false') === 'true';
const MAX_CONCURRENCY = Number(process.env.MAX_CONCURRENCY || '4');
const SEED_CIDS_PATH = process.env.SEED_CIDS_PATH || '';
const PORT = Number(process.env.PORT || 9489);

const reg = new Registry();
collectDefaultMetrics({ register: reg });

const knownGauge = new Gauge({ name: 'void_duality_cids_known', help: 'number of known cids' });
const verifyTotal = new Counter({ name: 'void_duality_cid_verify_total', help: 'verify results', labelNames:['result'] });
const verifyMs = new Histogram({ name: 'void_duality_cid_verify_ms', help: 'verify latency', buckets:[20,50,100,200,500,1000,2000,5000,10000] });
const sseConn = new Gauge({ name: 'void_duality_cid_sse_connected', help:'0/1' });
const lastCheck = new Gauge({ name: 'void_duality_cid_last_check_ts', help:'unix ms of last verify batch' });

reg.registerMetric(knownGauge); reg.registerMetric(verifyTotal); reg.registerMetric(verifyMs); reg.registerMetric(sseConn); reg.registerMetric(lastCheck);

const known = new Map(); // cid -> { astHash?, bytes? }

function addSeed(cid, astHash){
  if (!cid) return;
  known.set(cid, { astHash, bytes: undefined });
  knownGauge.set(known.size);
}

if (SEED_CIDS_PATH && fs.existsSync(SEED_CIDS_PATH)) {
  const lines = fs.readFileSync(SEED_CIDS_PATH, 'utf8').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  for (const cid of lines) addSeed(cid);
}

async function postEvent(ev){
  try {
    await fetch(RELAY + '/event', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(ev) });
  } catch {}
}

async function runSSE(){
  const url = RELAY + DUALITY_SSE;
  let backoff = 1000;
  for(;;){
    try{
      const res = await fetch(url);
      if (!res.ok) throw new Error('status '+res.status);
      sseConn.set(1); backoff = 1000;
      for await (const chunk of res.body){
        const s = chunk.toString('utf8');
        for (const line of s.split('\n')){
          const L = line.trim();
          if (!L.startsWith('data:')) continue;
          const payload = L.slice(5).trim();
          if (!payload) continue;
          const ev = JSON.parse(payload);
          if (ev.type === 'duality.particle.cid'){
            known.set(ev.cid, { astHash: ev.astHash, bytes: ev.bytes });
            knownGauge.set(known.size);
          }
        }
      }
    } catch (e) {
      sseConn.set(0);
      await new Promise(r=>setTimeout(r, backoff));
      backoff = Math.min(backoff*2, 10000);
    }
  }
}

runSSE();

async function checkOne(cid, meta){
  const t0 = Date.now();
  let pin_ok = false, gw_ok = false;
  try {
    // pin/ls
    const pinRes = await fetch(IPFS_API + '/api/v0/pin/ls?arg=' + encodeURIComponent(cid));
    const pinText = await pinRes.text();
    pin_ok = pinRes.ok && /Keys/.test(pinText) || /pinned/.test(pinText) || pinText.includes(cid);
    if (!pin_ok && AUTO_REPIN) {
      await fetch(IPFS_API + '/api/v0/pin/add?arg=' + encodeURIComponent(cid), { method:'POST' });
    }
    // gateway HEAD (small GET range)
    const gwUrl = GATEWAY + '/ipfs/' + cid;
    const gwRes = await fetch(gwUrl, { method:'GET', headers: { 'Range': 'bytes=' + HEAD_RANGE } });
    gw_ok = gwRes.ok || gwRes.status === 206;
    const dt = Date.now()-t0;
    verifyMs.observe(dt);
    const ok = pin_ok && gw_ok;
    verifyTotal.inc({result: ok ? 'ok' : (!pin_ok ? 'pin_missing' : 'gw_fail')});
    await postEvent({ type:'duality.cid.verify', cid, ok, pin_ok, gw_ok, t_ms: dt, astHash: meta?.astHash, ts: Date.now() });
  } catch (e) {
    verifyTotal.inc({result:'error'});
    await postEvent({ type:'duality.cid.error', cid, err: String(e).slice(0,200), ts: Date.now() });
  }
}

async function loop(){
  for(;;){
    const entries = Array.from(known.entries());
    let i = 0;
    const workers = new Array(Math.max(1, Math.min(MAX_CONCURRENCY, entries.length))).fill(0).map(async ()=>{
      while (i < entries.length){
        const my = i++; const [cid, meta] = entries[my];
        await checkOne(cid, meta);
      }
    });
    await Promise.all(workers);
    lastCheck.set(Date.now());
    await new Promise(r=>setTimeout(r, VERIFY_INTERVAL_SEC*1000));
  }
}
loop();

const app = express();
app.get('/metrics', async (_req,res)=>{
  res.set('Content-Type', reg.contentType);
  res.end(await reg.metrics());
});
app.get('/known', (_req,res)=>{
  res.json({ size: known.size });
});
app.listen(PORT, ()=> console.log('[cid-verifier] :%d', PORT));
