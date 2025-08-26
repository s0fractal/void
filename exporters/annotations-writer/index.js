import express from 'express';
import fetch from 'node-fetch';
import { Counter, Histogram, Gauge, Registry, collectDefaultMetrics } from 'prom-client';
import fs from 'fs';

const RELAY = (process.env.RELAY_BASE || 'http://relay:8787').replace(/\/$/, '');
const SSE_PATH = process.env.SSE_PATH || '/sse';
const GRAFANA = (process.env.GRAFANA_URL || '').replace(/\/$/, '');
const TOKEN = process.env.GRAFANA_TOKEN || '';
const FALLBACK_DASHBOARD_ID = process.env.GRAFANA_DASHBOARD_ID ? Number(process.env.GRAFANA_DASHBOARD_ID) : null;
const PANEL_MAP_PATH = process.env.PANEL_MAP_PATH || '';
const PORT = Number(process.env.PORT || 9488);
const TYPES = (process.env.ANNOTATE_TYPES || 'duality.patch,duality.rollback,duality.particle.cid,ci.result,ci.fail,ci.pass')
  .split(',').map(s=>s.trim()).filter(Boolean);
const DEFAULT_TAGS = (process.env.TAGS || '').split(',').map(s=>s.trim()).filter(Boolean);
const DEFAULT_COLOR = (process.env.COLOR || '00ff88').trim();

const reg = new Registry();
collectDefaultMetrics({ register: reg });

const sent = new Counter({ name: 'void_annotations_sent_total', help: 'annotations sent', labelNames:['result','type'] });
const annMs = new Histogram({ name: 'void_annotations_ms', help: 'annotation latency', buckets:[10,20,50,100,200,500,1000,2000,5000] });
const sseConn = new Gauge({ name: 'void_annotations_sse_connected', help: '0/1' });

reg.registerMetric(sent); reg.registerMetric(annMs); reg.registerMetric(sseConn);

let panelMap = null;
if (PANEL_MAP_PATH && fs.existsSync(PANEL_MAP_PATH)){
  try { panelMap = JSON.parse(fs.readFileSync(PANEL_MAP_PATH, 'utf8')); } catch {}
}

function mergeTags(base, extra){
  const set = new Set([...(base||[]), ...(extra||[])]);
  return Array.from(set).filter(Boolean);
}

function pickRoute(evType){
  const def = { tags: DEFAULT_TAGS, color: DEFAULT_COLOR, dashboardId: FALLBACK_DASHBOARD_ID, panelId: undefined };
  if (!panelMap) return def;
  const d = panelMap.defaults || {};
  const m = (panelMap.map || {})[evType] || {};
  return {
    dashboardId: m.dashboardId ?? d.dashboardId ?? FALLBACK_DASHBOARD_ID,
    panelId:     m.panelId,
    color:       m.color ?? d.color ?? DEFAULT_COLOR,
    tags:        mergeTags(d.tags, m.tags)
  };
}

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
  const route = pickRoute(ev.type);
  const body = {
    time: ev.ts || Date.now(),
    text: textFor(ev),
    tags: mergeTags(route.tags, [ev.type, ev.astHash ? `ast:${ev.astHash.slice(0,8)}` : null]).filter(Boolean),
    isRegion: false,
    color: '#' + (route.color || DEFAULT_COLOR)
  };
  if (route.dashboardId) body.dashboardId = route.dashboardId;
  if (route.panelId !== undefined) body.panelId = route.panelId;
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
          try { await annotate(ev); } catch {}
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
app.listen(PORT, ()=> console.log('[annotations-writer(panelmap)] :%d', PORT));
