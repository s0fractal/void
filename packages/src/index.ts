import { createHash } from 'crypto';
import EventEmitter from 'eventemitter3';

/** Particle = immutable identity of code */
export interface Particle {
  lang: 'ts'|'js'|'rs'|'go'|'py'|'other';
  astHash: string;   // sha256 hex of normalized AST/source
  cid?: string;      // optional IPFS CID
  uri?: string;      // optional URI to source
  meta?: Record<string, any>;
}

/** Wave = live signal of execution/intent */
export interface Wave<TArgs=any, TResult=any> {
  astHash: string;
  frequency: number;      // Hz (default 432)
  phase: number;          // 0..2π
  ttlMs?: number;         // wave lifetime
  amplitude?: number;     // 0..1
  liveValue?: (...args: any[]) => TResult;
  emitter: EventEmitter;  // local events for collapse/observe
}

export interface DualityOps {
  call: <T=any>(...args: any[]) => Promise<T>;
  hotPatch: (newSourceOrHash: string) => Particle;
  rollback: () => Particle;
}

/** Normalize source with coarse rules if parser unavailable */
export function normalizeSource(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')   // block comments
            .replace(/\/\/.*$/gm, '')              // line comments
            .replace(/\s+/g, ' ')                   // collapse whitespace
            .trim();
}

/** sha256 of normalized AST/source (raw fallback) */
export function astHash(sourceOrNormalized: string): string {
  const n = normalizeSource(sourceOrNormalized);
  return createHash('sha256').update(n, 'utf8').digest('hex');
}

/** Hamming distance on hex sha256 (0..256) */
export function hamming256(a: string, b: string): number {
  const ba = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  let bits = 0;
  for (let i=0;i<ba.length;i++) {
    const x = ba[i] ^ bb[i];
    bits += x.toString(2).split('0').join('').length;
  }
  return bits;
}

/** Interference score ∈ [0,1]; 0=identical (constructive), 1=orthogonal (destructive) */
export function interferenceScore(hashA: string, hashB: string): number {
  return hamming256(hashA, hashB) / 256;
}

/** Construct a live Wave */
export function signal<TArgs=any, TResult=any>(p: Particle, opts?: Partial<Wave<TArgs, TResult>>): Wave<TArgs, TResult> {
  const w: Wave<TArgs, TResult> = {
    astHash: p.astHash,
    frequency: opts?.frequency ?? 432,
    phase: opts?.phase ?? 0,
    ttlMs: opts?.ttlMs ?? 15_000,
    amplitude: opts?.amplitude ?? 1.0,
    liveValue: opts?.liveValue,
    emitter: new EventEmitter()
  };
  return w;
}

/** Bind wave to relay bus; returns duality operators */
export function bindToRelay<TArgs=any, TResult=any>(w: Wave<TArgs, TResult>, particle: Particle, relayBase = 'http://localhost:8787'): DualityOps {
  const post = async (path: string, body: any) => {
    await fetch(relayBase + path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
  };

  let history: string[] = [particle.astHash];

  return {
    call: async <T=any>(...args: any[]) => {
      const startedAt = Date.now();
      // collapse: notify bus
      await post('/event', {
        type: 'duality.collapse',
        astHash: particle.astHash,
        startedAt,
        phase: w.phase,
        freq: w.frequency,
        argsCount: args.length
      });
      let res: any;
      if (typeof w.liveValue === 'function') {
        // local execution path
        res = (w.liveValue as any)(...args);
      }
      const endedAt = Date.now();
      await post('/event', {
        type: 'duality.result',
        astHash: particle.astHash,
        duration_ms: endedAt - startedAt,
        resultPreview: typeof res === 'object' ? {json:true} : String(res).slice(0,120)
      });
      return res as T;
    },
    hotPatch: (newSourceOrHash: string) => {
      const newHash = /^[0-9a-f]{64}$/i.test(newSourceOrHash) ? newSourceOrHash : astHash(newSourceOrHash);
      const old = particle.astHash;
      const score = interferenceScore(old, newHash);
      history.push(newHash);
      particle.astHash = newHash;
      w.astHash = newHash;
      // wave shift
      w.phase = (w.phase + Math.PI/8) % (2*Math.PI);
      post('/event', { type: 'duality.patch', from: old, to: newHash, interference: score });
      return { ...particle };
    },
    rollback: () => {
      if (history.length > 1) {
        const prev = history[history.length-2];
        const cur = history[history.length-1];
        history.pop();
        particle.astHash = prev;
        w.astHash = prev;
        // phase inversion symbolizes rollback
        w.phase = (w.phase + Math.PI) % (2*Math.PI);
        const score = interferenceScore(cur, prev);
        post('/event', { type: 'duality.rollback', from: cur, to: prev, interference: score });
      }
      return { ...particle };
    }
  };
}
