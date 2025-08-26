import express from 'express';
import fetch from 'node-fetch';
import { Counter, Histogram, Gauge, Registry, collectDefaultMetrics } from 'prom-client';
import fs from 'fs';

const RELAY = (process.env.RELAY_BASE || 'http://relay:8787').replace(/\/$/, '');
const SSE_PATH = process.env.SSE_PATH || '/sse';
const GRAFANA = (process.env.GRAFANA_URL || '').replace(/\/$/, '');
const TOKEN = process.env.GRAFANA_TOKEN || '';
const AUTOPANEL_MAP_PATH = process.env.AUTOPANEL_MAP_PATH || '';
const PORT = Number(process.env.PORT || 9490);
const TYPES = (process.env.ANNOTATE_TYPES || 'duality.patch,duality.rollback,duality.particle.cid,ci.result,ci.fail,ci.pass')
  .split(',').map(s=>s.trim()).filter(Boolean);
const DEFAULT_TAGS = (process.env.DEFAULT_TAGS || 'void,432Hz').split(',').map(s=>s.trim()).filter(Boolean);
const DEFAULT_COLOR = (process.env.DEFAULT_COLOR || '00ff88').trim();
const TTL = Number(process.env.CACHE_TTL_SEC || '300');

const reg = new Registry();
collectDefaultMetrics({ register: reg });

const annSent = new Counter({ name: 'void_annotations_sent_total', help: 'annotations sent', labelNames:['result','type'] });
const annMs = new Histogram({ name: 'void_annotations_ms', help:'annotation latency', buckets:[10,20,50,100,200,500,1000,2000,5000] });
const sseConn = new Gauge({ name: 'void_annotations_sse_connected', help:'0/1' });

const resTotal = new Counter({ name:'void_autopanel_resolve_total', help:'resolver results', labelNames:['result'] });
const resMs = new Histogram({ name:'void_autopanel_resolve_ms', help:'resolver latency', buckets:[20,50,100,200,400,800,1600,3200] });
const cacheSize = new Gauge({ name:'void_autopanel_cache_size', help:'cache size', labelNames:['kind'] });
const cacheHits = new Counter({ name:'void_autopanel_cache_hits_total', help:'cache hits', labelNames:['kind'] });
const cacheMiss = new Counter({ name:'void_autopanel_cache_misses_total', help:'cache misses', labelNames:['kind'] });

reg.registerMetric(annSent); reg.registerMetric(annMs); reg.registerMetric(sseConn);
reg.registerMetric(resTotal); reg.registerMetric(resMs); reg.registerMetric(cacheSize); reg.registerMetric(cacheHits); reg.registerMetric(cacheMiss);

let config = { defaults:{}, map:{} };
if (AUTOPANEL_MAP_PATH && fs.existsSync(AUTOPANEL_MAP_PATH)) {
  try { config = JSON.parse(fs.readFileSync(AUTOPANEL_MAP_PATH, 'utf8')); } catch {}
}

const dashCache = new Map(); // title -> { uid, id, ts }
const panelCache = new Map(); // uid + '|' + title -> { panelId, ts }

function now(){ return Date.now(); }
function alive(entry){ return entry && (now() - entry.ts) < TTL*1000; }

async function searchDashboardByTitle(title){
  const key = title.toLowerCase();
  const c = dashCache.get(key);
  if (alive(c)) { cacheHits.inc({kind:'dashboards'}); return c; }
  cacheMiss.inc({kind:'dashboards'});
  const t0 = now();
  const res = await fetch(GRAFANA + '/api/search?type=dash-db&query=' + encodeURIComponent(title), {
    headers: { 'authorization': 'Bearer ' + TOKEN }
  });
  const dt = now()-t0; resMs.observe(dt);
  if (!res.ok) { resTotal.inc({result:'error'}); throw new Error('search failed '+res.status); }
  const arr = await res.json();
  // best match: exact title (ci), else includes
  let best = arr.find(x => (x.title || '').toLowerCase() === key) || arr.find(x=> (x.title||'').toLowerCase().includes(key));
  if (!best){ resTotal.inc({result:'miss'}); return null; }
  const entry = { uid: best.uid, id: best.id, ts: now() };
  dashCache.set(key, entry);
  cacheSize.set({kind:'dashboards'}, dashCache.size);
  return entry;
}

function flattenPanels(dash){
  const res = [];
  const walk = (panels)=>{
    if (!Array.isArray(panels)) return;
    for (const p of panels){
      if (p.type === 'row' && Array.isArray(p.panels)) walk(p.panels);
      else res.push(p);
    }
  };
  walk(dash?.dashboard?.panels || dash?.panels || []);
  return res;
}

async function fetchDashboardByUID(uid){
  const t0 = now();
  const res = await fetch(GRAFANA + '/api/dashboards/uid/' + encodeURIComponent(uid), {
    headers: { 'authorization': 'Bearer ' + TOKEN }
  });
  const dt = now()-t0; resMs.observe(dt);
  if (!res.ok) throw new Error('get dash failed '+res.status);
  return res.json();
}

async function resolvePanelId(dashboardTitle, panelTitle){
  const dash = await searchDashboardByTitle(dashboardTitle);
  if (!dash) return null;
  const key = dash.uid + '|' + panelTitle.toLowerCase();
  const c = panelCache.get(key);
  if (alive(c)) { cacheHits.inc({kind:'panels'}); return c.panelId; }
  cacheMiss.inc({kind:'panels'});
  const data = await fetchDashboardByUID(dash.uid);
  const panels = flattenPanels(data);
  // exact → case-insensitive includes → regex (`re:/.../i`)
  const lower = panelTitle.toLowerCase();
  let match = panels.find(p => (p.title||'').toLowerCase() === lower)
          || panels.find(p => (p.title||'').toLowerCase().includes(lower));
  if (!match && /^re:\//i.test(panelTitle)){
    try {
      const rx = new RegExp(panelTitle.slice(3).replace(/\/$/,'') , 'i');
      match = panels.find(p => rx.test(p.title||''));
    } catch {}
  }
  if (!match){ resTotal.inc({result:'miss'}); return null; }
  panelCache.set(key, { panelId: match.id, ts: now() });
  cacheSize.set({kind:'panels'}, panelCache.size);
  resTotal.inc({result:'ok'});
  return match.id;
}

function mergeTags(a,b){
  const set = new Set([...(a||[]), ...(b||[])]);
  return Array.from(set).filter(Boolean);
}

function resolveRule(evType){
  const d = config.defaults || {};
  const m = (config.map || {})[evType] || {};
  return {
    dashboardTitle: m.dashboardTitle || d.dashboardTitle,
    panelTitle: m.panelTitle,
    tags: mergeTags(d.tags, m.tags),
    color: m.color || d.color || DEFAULT_COLOR
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
  const rule = resolveRule(ev.type);
  const body = {
    time: ev.ts || Date.now(),
    text: textFor(ev),
    tags: mergeTags(rule.tags || DEFAULT_TAGS, [ev.type, ev.astHash ? `ast:${ev.astHash.slice(0,8)}` : null]).filter(Boolean),
    isRegion: false,
    color: '#' + (rule.color || DEFAULT_COLOR)
  };
  if (rule.dashboardTitle){
    const panelId = rule.panelTitle ? await resolvePanelId(rule.dashboardTitle, rule.panelTitle) : null;
    if (panelId) body.panelId = panelId;
    const dash = await searchDashboardByTitle(rule.dashboardTitle);
    if (dash?.id) body.dashboardId = dash.id;
  }
  const url = GRAFANA + '/api/annotations';
  const t0 = now();
  const res = await fetch(url, { method:'POST', headers: { 'content-type':'application/json', 'authorization': 'Bearer ' + TOKEN }, body: JSON.stringify(body) });
  const dt = now()-t0; annMs.observe(dt);
  if (!res.ok) { annSent.inc({result:'err', type: ev.type}); return false; }
  annSent.inc({result:'ok', type: ev.type});
  return true;
}

async function runSSE(){
  const url = RELAY + SSE_PATH;
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
app.listen(PORT, ()=> console.log('[annotations-writer(autopanel)] :%d', PORT));
