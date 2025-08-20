import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";

const PORT = parseInt(process.env.PORT || "8787", 10);
const API_KEY = process.env.RELAY_API_KEY || "";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// --- WS ---
const server = app.listen(PORT, () => console.log("Relay listening on :" + PORT));
const wss = new WebSocketServer({ server, path: "/ws" });
const wsClients = new Set();
wss.on("connection", (ws) => {
  wsClients.add(ws);
  ws.on("close", () => wsClients.delete(ws));
});

function wsBroadcast(payload) {
  const data = JSON.stringify(payload);
  for (const ws of wsClients) {
    try { ws.send(data); } catch {}
  }
}

// --- SSE ---
const sseClients = new Set();
app.get("/sse", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });
  res.write("\n");
  const client = { res };
  sseClients.add(client);
  req.on("close", () => sseClients.delete(client));
});

function sseBroadcast(payload) {
  const data = "data: " + JSON.stringify(payload) + "\n\n";
  for (const c of sseClients) {
    try { c.res.write(data); } catch {}
  }
}

// --- HTTP ---
app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/event", (req, res) => {
  if (API_KEY) {
    const got = req.headers["x-api-key"];
    if (got !== API_KEY) return res.status(401).json({ ok: false, error: "unauthorized" });
  }
  const body = req.body || {};
  const { type = "event", status = "info", meta = {} } = body;
  const payload = { type, status, meta, ts: new Date().toISOString() };

  // broadcast
  wsBroadcast(payload);
  sseBroadcast(payload);

  res.json({ ok: true });
});

// keepalive for SSE
setInterval(() => sseBroadcast({ type: "tick", status: "ok" }), 15000);
