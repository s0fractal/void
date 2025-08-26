import { normalizeSource, astHash, Particle } from './index.js';

export interface RegisterOpts {
  withSource?: boolean;     // include normalizedSourceB64 on the wire
  relayBase?: string;
  lang?: Particle['lang'];
  uri?: string;
}

export async function registerParticle(sourceOrHash: string, opts: RegisterOpts = {}): Promise<{astHash:string}> {
  const relayBase = (opts.relayBase || 'http://localhost:8787').replace(/\/$/, '');
  const hash = /^[0-9a-f]{64}$/i.test(sourceOrHash) ? sourceOrHash : astHash(sourceOrHash);
  let normalizedSourceB64: string | undefined;
  if (opts.withSource && !/^[0-9a-f]{64}$/i.test(sourceOrHash)) {
    const norm = normalizeSource(sourceOrHash);
    // quick size guard (keep events small)
    if (norm.length <= 256*1024) {
      normalizedSourceB64 = Buffer.from(norm, 'utf8').toString('base64');
    }
  }
  const body: any = {
    astHash: hash,
    lang: opts.lang || 'ts',
    uri: opts.uri
  };
  if (normalizedSourceB64) body.normalizedSourceB64 = normalizedSourceB64;

  await fetch(relayBase + '/duality/particle', {
    method:'POST',
    headers:{'content-type':'application/json'},
    body: JSON.stringify(body)
  });
  return { astHash: hash };
}
