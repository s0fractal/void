export async function addNormalizedToIPFS(normalizedSource: string, apiBase = (globalThis.process?.env?.IPFS_API ?? 'http://localhost:5001')): Promise<{cid:string, bytes:number}> {
  const endpoint = apiBase.replace(/\/$/, '') + '/api/v0/add?pin=true&cid-version=1&hash=sha2-256&wrap-with-directory=false';
  const body = new FormData();
  const blob = new Blob([normalizedSource], { type: 'text/plain' });
  body.append('file', blob, 'ast.txt');
  const res = await fetch(endpoint, { method:'POST', body });
  const text = await res.text();
  // ipfs returns either json lines or key=val text; try json first
  let cid = '';
  try {
    const lines = text.trim().split(/\n+/);
    const last = JSON.parse(lines.pop() || '{}');
    cid = last.Hash || last.Cid?.['/'] || last.cid || '';
  } catch {}
  if (!cid) {
    // fallback parse "Hash: Qm..." style
    const m = text.match(/Hash[":\s]+([A-Za-z0-9]+)[\s"}]?/);
    cid = m ? m[1] : '';
  }
  if (!cid) throw new Error('IPFS add failed: ' + text.slice(0,200));
  return { cid, bytes: normalizedSource.length };
}
