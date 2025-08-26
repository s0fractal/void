// Antigone Gate - Canary deployment for ethical firewall
// Integrates with intent-router to check commands before execution

import fetch from 'node-fetch';

const ANTIGONE_URL = process.env.ANTIGONE_URL || 'http://void-antigone:9495';
const CANARY_RATE = parseFloat(process.env.ANTIGONE_CANARY_RATE || '0.1'); // 10% default
const GATE_MODE = process.env.ANTIGONE_GATE_MODE === 'true'; // false = observe only

// Cache for performance (TTL: 30s)
const decisionCache = new Map();
const CACHE_TTL = 30000;

function getCacheKey(text, caps) {
  return `${text}|${(caps || []).sort().join(',')}`;
}

async function checkAntigone(text, caps = []) {
  const cacheKey = getCacheKey(text, caps);
  const cached = decisionCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.ts < CACHE_TTL)) {
    return cached.decision;
  }

  try {
    const endpoint = GATE_MODE ? '/antigone/act' : '/antigone/check';
    const res = await fetch(ANTIGONE_URL + endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text, caps }),
      timeout: 1000 // 1s timeout
    });

    if (!res.ok && res.status === 409) {
      // Explicit denial from Antigone
      const data = await res.json();
      return {
        allowed: false,
        reason: data.reason || 'dissonance',
        antigone: data.antigone,
        status: 409
      };
    }

    if (res.ok) {
      const data = await res.json();
      const decision = {
        allowed: data.decision !== 'deny',
        decision: data.decision,
        score: data.score,
        antigone: data.antigone || data,
        status: 200
      };
      
      decisionCache.set(cacheKey, { decision, ts: Date.now() });
      return decision;
    }

    // Service unavailable - default to allow
    return { allowed: true, status: res.status, error: 'service_unavailable' };
    
  } catch (err) {
    console.error('[antigone-gate] Error:', err.message);
    // On error, default to allow (fail open)
    return { allowed: true, error: err.message };
  }
}

export function antigoneGate() {
  return async (req, res, next) => {
    // Extract command text and capabilities from request
    const text = req.body?.text || req.body?.command || '';
    const caps = req.body?.caps || req.user?.caps || [];
    
    // Skip if no command text
    if (!text) return next();

    // Canary deployment - only check a percentage of requests
    const inCanary = Math.random() < CANARY_RATE;
    
    if (!inCanary && !GATE_MODE) {
      // Not in canary and not in gate mode - pass through
      return next();
    }

    const result = await checkAntigone(text, caps);
    
    // Attach result to request for logging
    req.antigone = result;

    if (!result.allowed && GATE_MODE && inCanary) {
      // Denied by Antigone in gate mode
      return res.status(409).json({
        ok: false,
        error: 'Command denied by ethical firewall',
        reason: result.reason || 'dissonance',
        antigone: result.antigone
      });
    }

    // Log warning decisions
    if (result.decision === 'warn') {
      console.warn('[antigone-gate] Warning:', {
        text: text.slice(0, 100),
        decision: result.decision,
        score: result.score
      });
    }

    next();
  };
}

// Metrics helper for Prometheus
export function antigoneMetrics() {
  let stats = {
    total: 0,
    allowed: 0,
    denied: 0,
    warned: 0,
    errors: 0,
    cache_hits: 0,
    cache_misses: 0
  };

  return {
    middleware: (req, res, next) => {
      if (req.antigone) {
        stats.total++;
        if (req.antigone.error) stats.errors++;
        else if (req.antigone.decision === 'deny') stats.denied++;
        else if (req.antigone.decision === 'warn') stats.warned++;
        else stats.allowed++;
        
        if (req.antigone.fromCache) stats.cache_hits++;
        else stats.cache_misses++;
      }
      next();
    },
    
    getStats: () => ({ ...stats }),
    
    reset: () => {
      stats = {
        total: 0,
        allowed: 0,
        denied: 0,
        warned: 0,
        errors: 0,
        cache_hits: 0,
        cache_misses: 0
      };
    }
  };
}