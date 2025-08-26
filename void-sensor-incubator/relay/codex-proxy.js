import crypto from 'crypto';
import express from 'express';

export function codexProxyRouter() {
  const router = express.Router();
  const target = process.env.CODEX_URL || 'http://codex:8788';
  const apiKey = process.env.CODEX_API_KEY || '';
  const secret = process.env.CODEX_HMAC_SECRET || '';

  async function forward(req, res, method) {
    try {
      const raw = JSON.stringify(req.body || {});
      const sig = secret ? crypto.createHmac('sha256', secret).update(raw).digest('hex') : undefined;
      const r = await fetch(`${target}/codex/${method}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(apiKey ? {'x-api-key': apiKey} : {}),
          ...(sig ? {'x-signature': sig} : {}),
          ...(req.headers['idempotency-key'] ? {'idempotency-key': String(req.headers['idempotency-key'])} : {}),
        },
        body: raw
      });
      const text = await r.text();
      res.status(r.status).type(r.headers.get('content-type')||'application/json').send(text);
    } catch (e) {
      res.status(502).json({ ok:false, error:String(e) });
    }
  }

  router.post('/plan', (req,res)=>forward(req,res,'plan'));
  router.post('/rules', (req,res)=>forward(req,res,'rules'));
  router.post('/report', (req,res)=>forward(req,res,'report'));
  router.post('/commit-msg', (req,res)=>forward(req,res,'commit-msg'));
  return router;
}
