const GW = process.env.IPFS_GW || "https://cloudflare-ipfs.com/ipfs/";
const CIDS = (process.env.CIDS || "").split(",").map(s=>s.trim()).filter(Boolean);
const INTERVAL = parseInt(process.env.INTERVAL_SEC || "30", 10);
const RELAY = process.env.RELAY_URL || "http://relay:8787/event";
const KEY = process.env.RELAY_API_KEY || process.env.RELAY_API_KEY_POLL || "";
const DEGRADED = parseInt(process.env.DEGRADED_MS || "1500", 10);

if (!globalThis.fetch) {
  // Node 20+ has fetch; just in case provide dynamic import
  const { default: fetchFn } = await import("node-fetch");
  globalThis.fetch = fetchFn;
}

async function probe(cid) {
  const url = GW.replace(/\/$/,'/') + cid;
  const t0 = Date.now();
  try {
    const res = await fetch(url, { method: "HEAD", cache: "no-store" });
    return { ok: res.ok, ms: Date.now()-t0 };
  } catch(e) {
    return { ok: false, ms: 9e9 };
  }
}

async function send(payload) {
  try {
    await fetch(RELAY, {
      method: "POST",
      headers: { "content-type": "application/json", ...(KEY ? { "x-api-key": KEY } : {}) },
      body: JSON.stringify(payload),
    });
  } catch {}
}

async function tick() {
  if (!CIDS.length) {
    await send({ type: "ipfs", status: "idle", meta: { info: "no cids configured" } });
    return;
  }
  let worst=0, anyBad=false, samples=[];
  for (const cid of CIDS) {
    const r = await probe(cid);
    worst = Math.max(worst, r.ms);
    anyBad = anyBad || !r.ok || r.ms > DEGRADED;
    samples.push({ cid, ms: r.ms, ok: r.ok });
  }
  await send({ type: "ipfs", status: anyBad ? "degraded" : "ok", meta: { worst, samples } });
}

setInterval(tick, INTERVAL * 1000);
tick();
