import express from 'express';
import fetch from 'node-fetch';
import { Counter, Histogram, Gauge, Registry, collectDefaultMetrics } from 'prom-client';
import { createHash } from 'crypto';
import { CID } from 'multiformats/cid';
import * as Digest from 'multiformats/hashes/digest';

const RELAY = (process.env.RELAY_BASE || 'http://relay:8787').replace(/\/$/, '');
const DUALITY_SSE = process.env.DUALITY_SSE || '/duality/sse';
const IPFS_API = (process.env.IPFS_API || 'http://ipfs:5001').replace(/\/$/, '');
const GATEWAYS = (process.env.GATEWAYS || 'https://ipfs.io').split(',').map(s=>s.trim()).filter(Boolean);
const VERIFY_INTERVAL_SEC = Number(process.env.VERIFY_INTERVAL_SEC || '60');
const LABEL_GATEWAY = (process.env.LABEL_GATEWAY || 'true') === 'true';
const GW_TIMEOUT_MS = Number(process.env.GW_TIMEOUT_MS || '4000');
const DIGEST_MODE = (process.env.DIGEST || 'none').toLowerCase(); // none|sha256
const DIGEST_MAX_BYTES = Number(process.env.DIGEST_MAX_BYTES || (1*1024*1024));
const PORT = Number(process.env.PORT || 9489);

const reg = new Registry();
collectDefaultMetrics({ register: reg });

const knownGauge = new Gauge({ name: 'void_duality_cids_known', help: 'number of known cids' });
const verifyTotal = new Counter({ name: 'void_duality_cid_verify_total', help: 'verify results', labelNames:['result'] });
const verifyMs = new Histogram({ name: 'void_duality_cid_verify_ms', help: 'verify latency', buckets:[20,50,100,200,500,1000,2000,5000,10000] });
const sseConn = new Gauge({ name: 'void_duality_cid_sse_connected', help:'0/1' });
const lastCheck = new Gauge({ name: 'void_duality_cid_last_check_ts', help:'unix ms of last verify batch' });
const gwTotal = new Counter({ name: 'void_cid_gateway_total', help: 'gateway checks', labelNames: LABEL_GATEWAY? ['gateway','result'] : ['result'] });
const gwMs = new Histogram({ name: 'void_cid_gateway_ms', help: 'gateway latency', buckets:[50,100,200,400,800,1600,3200,6400] });
const digestTotal = new Counter({ name: 'void_cid_digest_total', help: 'digest checks', labelNames:['result'] });
const digestMs = new Histogram({ name: 'void_cid_digest_ms', help: 'digest latency', buckets:[50,100,200,400,800,1600,3200,6400,12800] });
const bytesVerified = new Counter({ name: 'void_cid_bytes_verified_total', help: 'sum of bytes fetched for digest' });

reg.registerMetric(knownGauge); reg.registerMetric(verifyTotal); reg.registerMetric(verifyMs); reg.registerMetric(sseConn); reg.registerMetric(lastCheck);
reg.registerMetric(gwTotal); reg.registerMetric(gwMs); reg.registerMetric(digestTotal); reg.registerMetric(digestMs); reg.registerMetric(bytesVerified);


async function postEvent(ev){
  try {
    await fetch(RELAY + '/event', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(ev) });
  } catch {}
}

async function fetchRange(url, range='0-64'){
  const ctrl = new AbortController();
  const t = setTimeout(()=>ctrl.abort(), GW_TIMEOUT_MS);
  const res = await fetch(url, { method:'GET', headers: { 'Range': 'bytes='+range }, signal: ctrl.signal });
  clearTimeout(t);
  return res;
}

async function gatewayCheck(cid){
  const started = Date.now();
  let ok = false, which = null;
  for (const gw of GATEWAYS){
    try {
      const res = await fetchRange(gw.replace(/\/$/,'') + '/ipfs/' + cid, '0-64');
      const dt = Date.now()-started;
      gwMs.observe(dt);
      const label = LABEL_GATEWAY ? {gateway: gw, result: (res.ok || res.status===206) ? 'ok':'bad'} : {result:(res.ok||res.status===206)?'ok':'bad'};
      gwTotal.inc(label);
      if (res.ok || res.status === 206) { ok = true; which = gw; break; }
    } catch (e) {
      const label = LABEL_GATEWAY ? {gateway: gw, result: 'error'} : {result:'error'};
      gwTotal.inc(label);
    }
  }
  return { ok, gateway: which };
}

async function digestCheck(cid){
  if (DIGEST_MODE !== 'sha256') return { mode: 'none', result: 'skipped' };
  try {
    const started = Date.now();
    // спроба IPFS API з лімітом довжини (не всі демони підтримують length у /cat)
    // fallback — GET з шлюзу повністю (ризик великих об'єктів; обмежено DIGEST_MAX_BYTES)
    // 1) IPFS API /block/stat для орієнтовного розміру
    let size = undefined;
    try {
      const s = await fetch(IPFS_API + '/api/v0/block/stat?arg=' + encodeURIComponent(cid));
      const t = await s.text();
      const m = t.match(/Size[^0-9]*([0-9]+)/i);
      size = m ? Number(m[1]) : undefined;
    } catch {}
    if (size && size > DIGEST_MAX_BYTES) {
      digestTotal.inc({result:'skipped_large'});
      return { mode: 'sha256', result: 'skipped_large', size };
    }
    // 2) Спроба /cat обмежено
    let buf = null;
    try {
      const ctrl = new AbortController();
      const tt = setTimeout(()=>ctrl.abort(), Math.max(GW_TIMEOUT_MS, 8000));
      const r = await fetch(IPFS_API + '/api/v0/cat?arg=' + encodeURIComponent(cid));
      const arr = await r.arrayBuffer();
      clearTimeout(tt);
      buf = Buffer.from(arr);
    } catch {}
    if (!buf){
      // 3) fallback gateway повний (обережно)
      for (const gw of GATEWAYS){
        try {
          const rr = await fetch(gw.replace(/\/$/,'') + '/ipfs/' + cid, { method:'GET' });
          if (!rr.ok) continue;
          const ab = await rr.arrayBuffer();
          const b = Buffer.from(ab);
          if (b.length > DIGEST_MAX_BYTES) {
            digestTotal.inc({result:'skipped_large'});
            return { mode:'sha256', result:'skipped_large', size: b.length };
          }
          buf = b; break;
        } catch {}
      }
    }
    if (!buf){
      digestTotal.inc({result:'error'});
      return { mode:'sha256', result:'error' };
    }
    bytesVerified.inc(buf.length);
    const dt = Date.now()-started;
    digestMs.observe(dt);
    // Перевірка CID v1 sha2-256
    const want = CID.parse(cid);
    const got = createHash('sha256').update(buf).digest();
    const wantMh = want.multihash; // bytes [code|size|digest]
    const same = Digest.decode(wantMh.bytes).digest.equals(got);
    digestTotal.inc({result: same ? 'ok' : 'mismatch'});
    return { mode:'sha256', result: same ? 'ok' : 'mismatch', size: buf.length };
  } catch (e) {
    digestTotal.inc({result:'error'});
    return { mode:'sha256', result:'error', error: String(e).slice(0,200) };
  }
}

function track(cid, meta){ known.set(cid, meta||{}); knownGauge.set(known.size); }

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
            track(ev.cid, { astHash: ev.astHash, bytes: ev.bytes });
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

async function loop(){
  for(;;){
    const entries = Array.from(known.entries());
    for (const [cid, meta] of entries){
      const t0 = Date.now();
      const gw = await gatewayCheck(cid);
      const dg = await digestCheck(cid);
      const dt = Date.now()-t0;
      verifyMs.observe(dt);
      const ok = gw.ok && (dg.result === 'ok' || dg.result === 'skipped_large' || dg.result === 'skipped' );
      verifyTotal.inc({result: ok ? 'ok' : 'bad'});
      await postEvent({ type:'duality.cid.verify', cid, ok, gw_ok: gw.ok, gw: gw.gateway, digest: dg, t_ms: dt, astHash: meta?.astHash, ts: Date.now() });
    }
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
app.get('/known', (_req,res)=> res.json({ size: known.size, gateways: GATEWAYS.length }) );
app.listen(PORT, ()=> console.log('[cid-verifier(gateways+digest)] :%d', PORT));
