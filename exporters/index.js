import express from 'express';
import fetch from 'node-fetch';
import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

const RELAY = process.env.RELAY_BASE || 'http://relay:8787';
const PORT = Number(process.env.PORT || 9486);
const reg = new Registry();
collectDefaultMetrics({ register: reg });

const sseReconnects = new Counter({ name: 'void_duality_sse_reconnects_total', help: 'reconnects' });
const waves = new Counter({ name: 'void_duality_waves_total', help: 'duality.wave.emit count' });
const particles = new Counter({ name: 'void_duality_particles_total', help: 'particle.register count' });
const collapses = new Counter({ name: 'void_duality_collapses_total', help: 'duality.collapse count' });
const results = new Histogram({ name: 'void_duality_result_ms', help: 'result duration', buckets:[5,10,20,50,100,200,500,1000,2000] });
const interference = new Histogram({ name: 'void_duality_interference', help: 'score 0..1', buckets:[0.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0] });
const connected = new Gauge({ name: 'void_duality_sse_connected', help: '0/1' });

reg.registerMetric(sseReconnects); reg.registerMetric(waves); reg.registerMetric(particles);
reg.registerMetric(collapses); reg.registerMetric(results); reg.registerMetric(interference);
reg.registerMetric(connected);

async function runSSE(){
  const url = RELAY + '/duality/sse';
  for(;;){
    try{
      const res = await fetch(url);
      if (!res.ok) throw new Error('status '+res.status);
      connected.set(1);
      for await (const chunk of res.body){
        const s = chunk.toString('utf8');
        for (const line of s.split('\n')){
          const L = line.trim();
          if (!L.startsWith('data:')) continue;
          const payload = L.slice(5).trim();
          if (!payload) continue;
          const ev = JSON.parse(payload);
          if (ev.type==='duality.wave.emit') waves.inc();
          if (ev.type==='duality.particle.register') particles.inc();
          if (ev.type==='duality.collapse') collapses.inc();
          if (ev.type==='duality.result' && typeof ev.duration_ms==='number') results.observe(ev.duration_ms);
          if (ev.type==='duality.interference' && typeof ev.score==='number') interference.observe(ev.score);
        }
      }
    } catch (e) {
      connected.set(0);
      sseReconnects.inc();
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
app.listen(PORT, ()=> console.log('[duality-exporter] :%d', PORT));
