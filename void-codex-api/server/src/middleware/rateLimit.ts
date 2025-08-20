import type { Request, Response, NextFunction } from 'express';

type Bucket = { tokens: number; updated: number };
const buckets = new Map<string, Bucket>();

const RATE = parseInt(process.env.RATE_LIMIT_RATE || '5', 10);
const INTERVAL_MS = parseInt(process.env.RATE_LIMIT_INTERVAL || '1000', 10);
const BURST = parseInt(process.env.RATE_LIMIT_BURST || '20', 10);

export function rateLimit(req: Request, res: Response, next: NextFunction) {
  const key = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'ip') + ':' + (req.path || '');
  const now = Date.now();
  const b = buckets.get(key) || { tokens: BURST, updated: now };
  const elapsed = now - b.updated;
  if (elapsed > 0) {
    const refill = Math.floor(elapsed / INTERVAL_MS) * RATE;
    b.tokens = Math.min(BURST, b.tokens + refill);
    b.updated = now;
  }
  if (b.tokens <= 0) {
    res.setHeader('Retry-After', Math.ceil(INTERVAL_MS / 1000).toString());
    return res.status(429).json({ ok:false, error:'rate_limited' });
  }
  b.tokens -= 1;
  buckets.set(key, b);
  next();
}
