import express from 'express';

/**
 * Eyes router.
 * POST /eyes/url {"url":"https://…"} → calls Eyes service /analyze
 * then POSTs the returned event to this relay (/event) for broadcast.
 *
 * Env:
 * - EYES_URL (default http://eyes-gemini:8791)
 * - EYES_ALLOWLIST (comma-separated domains, optional)
 * - RELAY_API_KEY (if your /event is protected)
 * - RELAY_SELF (override self /event URL; default http://localhost:8787/event)
 */
export function eyesRouter() {
  const router = express.Router();
  const EYES_URL = process.env.EYES_URL || 'http://eyes-gemini:8791';
  const RELAY_SELF = process.env.RELAY_SELF || 'http://localhost:8787/event';
  const API_KEY = process.env.RELAY_API_KEY || '';
  const ALLOW = (process.env.EYES_ALLOWLIST || '').split(',').map(s=>s.trim()).filter(Boolean);

  function allowed(u) {
    if (ALLOW.length === 0) return true;
    try {
      const h = new URL(u).hostname.replace(/^www\./,''); 
      return ALLOW.some(d => h === d || h.endsWith('.'+d));
    } catch { return false; }
  }

  router.post('/url', async (req, res) => {
    const url = String(req.body?.url || '').trim();
    if (!url || !/^https?:\/\//i.test(url)) return res.status(400).json({ ok:false, error:'bad_url' });
    if (!allowed(url)) return res.status(403).json({ ok:false, error:'domain_not_allowed' });

    try {
      const r = await fetch(`${EYES_URL}/analyze`, {
        method: 'POST',
        headers: { 'content-type':'application/json' },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(12000)
      });
      const jr = await r.json();
      if (!jr.ok) return res.status(502).json({ ok:false, error:'eyes_failed', detail: jr.error || null });

      const event = jr.event || { type:'eyes', status:'warn', meta:{ url, glyph_event:'dissonant_pulse' }, ts:new Date().toISOString() };

      await fetch(RELAY_SELF, {
        method: 'POST',
        headers: { 'content-type':'application/json', ...(API_KEY? {'x-api-key':API_KEY} : {}) },
        body: JSON.stringify(event),
        signal: AbortSignal.timeout(1500)
      }).catch(()=>{});

      return res.json({ ok:true, event });
    } catch (e) {
      return res.status(502).json({ ok:false, error:String(e) });
    }
  });

  return router;
}
