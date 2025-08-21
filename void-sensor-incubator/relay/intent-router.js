import express from 'express';

/**
 * Resonance intent router.
 * - Guards: only enabled if RESONANCE_ENABLED=1
 * - Modes:
 *    DRYRUN: synthesize orchestra+response locally (no external calls)
 *    REAL: forward to ORCHESTRA_HTTP for processing, then broadcast
 *
 * Env:
 *  RESONANCE_ENABLED=0|1
 *  RESONANCE_DRYRUN=0|1
 *  ORCHESTRA_HTTP=http://orchestra:8799/intent   (optional)
 *  RELAY_SELF=http://localhost:8787/event
 *  RELAY_API_KEY=...
 */
export function intentRouter() {
  const router = express.Router();
  const enabled = process.env.RESONANCE_ENABLED === '1';
  const dryrun  = process.env.RESONANCE_DRYRUN === '1';
  const ORCH    = process.env.ORCHESTRA_HTTP || '';
  const SELF    = process.env.RELAY_SELF || 'http://localhost:8787/event';
  const API_KEY = process.env.RELAY_API_KEY || '';

  router.post('/wave', async (req,res) => {
    if (!enabled) return res.status(404).json({ ok:false, error:'resonance_disabled' });
    const meta = req.body?.meta || {};
    const text = String(meta?.text || '').trim();
    if (!text) return res.status(400).json({ ok:false, error:'missing_text' });
    const trace_id = meta?.trace_id || `wave-${Date.now()}`;
    const now = new Date().toISOString();

    // broadcast the raw intent (optional)
    await postEvent(SELF, API_KEY, {
      type:'intent.wave', meta:{ ...meta, text, trace_id }, ts: now
    });

    if (dryrun || !ORCH) {
      // Synthesize plan + response locally (safe mode)
      const plan = {
        type:'orchestra.plan',
        meta:{ steps:[
          { agent:'Planner', tool:'plan', args:{ intent:text }},
          { agent:'Claude', role:'code' },
          { agent:'GPT', role:'optimize' },
          { agent:'Glyph', role:'emotion' }
        ]},
        ts: now
      };
      await postEvent(SELF, API_KEY, plan);

      const response = {
        type:'response.harmonic',
        meta:{
          resonance: 0.82,
          modes:['text','code','glyph','audio_432'],
          sources:[
            {agent:'Claude', role:'code', weight:0.36},
            {agent:'GPT', role:'optimize', weight:0.32},
            {agent:'Glyph', role:'emotion', weight:0.22}
          ],
          explain: 'Dry-run blend; real mixer will weight by veracity/coherence/health/affect.',
          glyph_event: 'harmonic_pulse'
        },
        ts: now
      };
      await postEvent(SELF, API_KEY, response);
      return res.json({ ok:true, mode:'dryrun', plan, response });
    }

    // REAL mode: forward to orchestra
    try {
      const r = await fetch(ORCH, {
        method:'POST', headers:{'content-type':'application/json'},
        body: JSON.stringify({ type:'intent.wave', meta:{...meta, text, trace_id}, ts: now }),
        signal: AbortSignal.timeout(12000)
      });
      const jr = await r.json().catch(()=>({}));
      if (!r.ok) return res.status(502).json({ ok:false, error:'orchestra_failed', detail: jr });
      return res.json({ ok:true, mode:'real', detail: jr });
    } catch (e) {
      return res.status(502).json({ ok:false, error:String(e) });
    }
  });

  return router;
}

async function postEvent(url, apiKey, payload){
  try{
    await fetch(url, {
      method:'POST',
      headers:{ 'content-type':'application/json', ...(apiKey? {'x-api-key':apiKey} : {}) },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(1500)
    });
  } catch {}
}
