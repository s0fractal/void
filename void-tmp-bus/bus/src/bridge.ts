import { RELAY_HTTP, RELAY_API_KEY } from './config.js';

export async function forwardToRelay(ev: any): Promise<boolean> {
  if (!RELAY_HTTP) return false;
  try {
    const res = await fetch(RELAY_HTTP, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(RELAY_API_KEY ? {'x-api-key': RELAY_API_KEY} : {}) },
      body: JSON.stringify(ev),
      signal: AbortSignal.timeout(1200)
    });
    return res.ok;
  } catch {
    return false;
  }
}
