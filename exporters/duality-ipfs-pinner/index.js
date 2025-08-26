import fetch from 'node-fetch';
import express from 'express';
import { Counter, Histogram, Gauge, Registry, collectDefaultMetrics } from 'prom-client';

const RELAY = (process.env.RELAY_BASE || 'http://relay:8787').replace(/\/$/, '');
const IPFS_API = (process.env.IPFS_API || 'http://localhost:5001').replace(/\/$/, '');
const PIN = (process.env.PIN || 'true') === 'true';
const PORT = Number(process.env.PORT || 9487);
const MAX_KB = Number(process.env.ALLOW_MAX_KB || 256);

const reg = new Registry();
collectDefaultMetrics({ register: reg });

const pins = new Counter({ name: 'void_duality_ipfs_pins_total', help: 'total pins', labelNames:['result'] });
const pinMs = new Histogram({ name: 'void_duality_ipfs_pin_ms', help:'pin latency', buckets:[10,20,50,100,200,500,1000,2000,5000] });
const withSrc = new Counter({ name: 'void_duality_particle_with_source_total', help:'events with normalizedSourceB64' });
const cidPresent = new Counter({ name: 'void_duality_cid_present_total', help:'particle.register already had CID' });
const sseConn = new Gauge({ name: 'void_duality_pinner_sse_connected', help:'0/1' });

reg.registerMetric(pins); reg.registerMetric(pinMs); reg.registerMetric(withSrc); reg.registerMetric(cidPresent); reg.registerMetric(sseConn);

async function addToIPFS(normB64){
  const norm = Buffer.from(normB64, 'base64').toString('utf8');
  if ((norm.length/1024) > MAX_KB) throw new Error('normalized source too large');
  const form = new (globalThis.FormData || (await import('formdata-node')).FormData)();
  const blob = new Blob([norm], { type:'text/plain' });
  form.append('file', blob, 'ast.txt');
  const url = IPFS_API + `/api/v0/add?pin=${PIN?'true':'false'}&cid-version=1&hash=sha2-256&wrap-with-directory=false`;
  const t0 = Date.now();
  const res = await fetch(url, { method:'POST', body: form });
  const text = await res.text();
  const dt = Date.now()-t0;
  pinMs.observe(dt);
  let cid='';
  try { const last = JSON.parse(text.trim().split(/\n+/).pop()||'{}'); cid = last.Hash || last.Cid?.['/'] || last.cid || ''; } catch {}
  if (!cid) {
    const m = text.match(/Hash[":\s]+([A-Za-z0-9]+)[\s"}]?/);
    cid = m ? m[1] : '';
  }
  if (!cid) throw new Error('ipfs add failed: '+text.slice(0,200));
  return { cid, bytes: norm.length };
}

async function postEvent(ev){
  try {
    await fetch(RELAY + '/event', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(ev) });
  } catch (e) { /* ignore */ }
}

async function runSSE(){
  const url = RELAY + '/duality/sse';
  for(;;){
    try{
      const res = await fetch(url);
      if (!res.ok) throw new Error('status '+res.status);
      sseConn.set(1);
      for await (const chunk of res.body){
        const s = chunk.toString('utf8');
        for (const line of s.split('\n')){
          const L = line.trim();
          if (!L.startsWith('data:')) continue;
          const payload = L.slice(5).trim();
          if (!payload) continue;
          const ev = JSON.parse(payload);
          if (ev.type === 'duality.particle.register'){
            if (ev.cid) { cidPresent.inc(); continue; }
            if (ev.normalizedSourceB64){
              withSrc.inc();
              try {
                const { cid, bytes } = await addToIPFS(ev.normalizedSourceB64);
                pins.inc({result:'ok'});
                await postEvent({ type:'duality.particle.cid', astHash: ev.astHash, cid, bytes, ts: Date.now() });
              } catch (e) {
                pins.inc({result:'err'});
                await postEvent({ type:'duality.pinner.error', astHash: ev.astHash, error: String(e).slice(0,200), ts: Date.now() });
              }
            }
          }
        }
      }
    } catch (e) {
      sseConn.set(0);
      await new Promise(r=>setTimeout(r, 1000));
    }
  }
}

runSSE();

const app = express();
app.get('/metrics', async (_req,res)=>{
  res.set('Content-Type', reg.contentType);
  res.end(await reg.metrics());
});
app.listen(PORT, ()=> console.log('[duality-ipfs-pinner] :%d', PORT));
