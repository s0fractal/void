/**
 * Duality Router for relay — adds particle register, wave emit and SSE feed.
 * Env:
 *  DUALITY_ENABLED=0|1
 *  DUALITY_ALLOW_ORIGINS=*
 */
import express from 'express';

export function mountDuality(app, bus) {
  const enabled = process.env.DUALITY_ENABLED === '1';
  const router = express.Router();

  const latest = []; // ring-buffer of last 200 events
  const clients = new Set();

  function push(ev){
    ev.ts = Date.now();
    latest.push(ev);
    while (latest.length > 200) latest.shift();
    for (const res of clients) {
      res.write(`data: ${JSON.stringify(ev)}\n\n`);
    }
    // forward to main bus
    if (bus?.emit) bus.emit('event', ev);
  }

  router.get('/duality/sse', (req,res)=>{
    if (!enabled) return res.status(503).send('duality disabled');
    res.setHeader('Content-Type','text/event-stream');
    res.setHeader('Cache-Control','no-cache');
    res.setHeader('Connection','keep-alive');
    res.flushHeaders();
    for (const ev of latest) res.write(`data: ${JSON.stringify(ev)}\n\n`);
    clients.add(res);
    req.on('close', ()=>clients.delete(res));
  });

  router.post('/duality/particle', express.json(), (req,res)=>{
    if (!enabled) return res.status(503).json({ok:false, error:'disabled'});
    const { astHash, lang='ts', cid, uri, meta } = req.body || {};
    if (!astHash || !/^[0-9a-f]{64}$/i.test(astHash)) return res.status(400).json({ok:false, error:'bad hash'});
    push({ type:'duality.particle.register', astHash, lang, cid, uri, meta });
    res.json({ok:true});
  });

  router.post('/duality/wave', express.json(), (req,res)=>{
    if (!enabled) return res.status(503).json({ok:false, error:'disabled'});
    const { astHash, amplitude=1, phase=0, freq=432, ttlMs=15000 } = req.body || {};
    if (!astHash) return res.status(400).json({ok:false, error:'no hash'});
    push({ type:'duality.wave.emit', astHash, amplitude, phase, freq, ttlMs });
    res.json({ok:true});
  });

  router.post('/duality/interference', express.json(), (req,res)=>{
    if (!enabled) return res.status(503).json({ok:false, error:'disabled'});
    const { hashA, hashB, score } = req.body || {};
    if (!hashA || !hashB || typeof score !== 'number') return res.status(400).json({ok:false});
    push({ type:'duality.interference', hashA, hashB, score });
    res.json({ok:true});
  });

  return router;
}
