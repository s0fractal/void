import express from 'express';
import fetch from 'node-fetch';
import { Counter, Histogram, Gauge, Registry, collectDefaultMetrics } from 'prom-client';

const RELAY = (process.env.RELAY_BASE || 'http://relay:8787').replace(/\/$/, '');
const SSE_PATH = process.env.SSE_PATH || '/sse';
const GRAFANA = (process.env.GRAFANA_URL || '').replace(/\/$/, '');
const TOKEN = process.env.GRAFANA_TOKEN || '';
const DASHBOARD_ID = process.env.GRAFANA_DASHBOARD_ID ? Number(process.env.GRAFANA_DASHBOARD_ID) : null;
const PORT = Number(process.env.PORT || 9488);
const TYPES = (process.env.ANNOTATE_TYPES || 'duality.patch,duality.rollback,duality.particle.cid,ci.result,ci.fail,ci.pass')
  .split(',').map(s=>s.trim()).filter(Boolean);
const TAGS = (process.env.TAGS || 'void,duality').split(',').map(s=>s.trim()).filter(Boolean);
const COLOR = (process.env.COLOR || '00ff88').trim(); // hex RGB

const reg = new Registry();
collectDefaultMetrics({ register: reg });

const sent = new Counter({ name: 'void_annotations_sent_total', help: 'annotations sent', labelNames:['result','type'] });
const annMs = new Histogram({ name: 'void_annotations_ms', help: 'annotation latency', buckets:[10,20,50,100,200,500,1000,2000,5000] });
const sseConn = new Gauge({ name: 'void_annotations_sse_connected', help: '0/1' });
const queueGauge = new Gauge({ name: 'void_annotations_queue', help: 'pending events' });

reg.registerMetric(sent); reg.registerMetric(annMs); reg.registerMetric(sseConn); reg.registerMetric(queueGauge);

function textFor(ev){
  const t = ev.type;
  if (t === 'duality.patch') return `patch ${ev.from?.slice(0,8)}→${ev.to?.slice(0,8)} (interf=${((ev.interference||0)*100).toFixed(1)}%)`;
  if (t === 'duality.rollback') return `rollback ${ev.from?.slice(0,8)}→${ev.to?.slice(0,8)} (interf=${((ev.interference||0)*100).toFixed(1)}%)`;
  if (t === 'duality.particle.cid') return `CID pinned ${ev.astHash?.slice(0,8)} → ${ev.cid}`;
  if (t === 'ci.pass') return `CI PASS ${ev.repo||''}#${ev.pr||''}`;
  if (t === 'ci.fail') return `CI FAIL ${ev.repo||''}#${ev.pr||''}`;
  if (t === 'ci.result') return `CI ${ev.status||''} dur=${ev.duration_ms||''}`;
  return t;
}

async function annotate(ev){
  if (!GRAFANA || !TOKEN) return false;
  const body = {
    time: ev.ts || Date.now(),
    text: textFor(ev),
    tags: [...TAGS, ev.type, ev.astHash ? `ast:${ev.astHash.slice(0,8)}` : undefined].filter(Boolean)
  };
  if (DASHBOARD_ID) body.dashboardId = DASHBOARD_ID;
  const url = GRAFANA + '/api/annotations';
  const t0 = Date.now();
  const res = await fetch(url, { method:'POST', headers: { 'content-type':'application/json', 'authorization': 'Bearer ' + TOKEN }, body: JSON.stringify(body) });
  const dt = Date.now()-t0;
  annMs.observe(dt);
  if (!res.ok) { sent.inc({result:'err', type: ev.type}); return false; }
  sent.inc({result:'ok', type: ev.type});
  return true;
}

async function runSSE(){
  const url = RELAY + SSE_PATH;
  let backoff = 1000;
  const q = [];
  for(;;){
    try{
      const res = await fetch(url);
      if (!res.ok) throw new Error('status '+res.status);
      sseConn.set(1);
      backoff = 1000;
      for await (const chunk of res.body){
        const s = chunk.toString('utf8');
        for (const line of s.split('\n')){
          const L = line.trim();
          if (!L.startsWith('data:')) continue;
          const payload = L.slice(5).trim();
          if (!payload) continue;
          const ev = JSON.parse(payload);
          if (!TYPES.includes(ev.type)) continue;
          q.push(ev); queueGauge.set(q.length);
          // lightweight worker
          while (q.length){
            const cur = q.shift(); queueGauge.set(q.length);
            try { await annotate(cur); } catch {}
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

const app = express();
app.get('/metrics', async (_req,res)=>{
  res.set('Content-Type', reg.contentType);
  res.end(await reg.metrics());
});
app.listen(PORT, ()=> console.log('[annotations-writer] :%d', PORT));
