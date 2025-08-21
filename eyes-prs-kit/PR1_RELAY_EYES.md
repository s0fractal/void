**Title:** feat(relay/eyes): URL analysis via Gemini URL Context + live broadcast to glyph

## Summary
Adds `/eyes/url` entrypoint in Relay. Accepts a URL, calls **eyes-gemini** `/analyze` (Gemini URL Context), receives structured result and **idempotently** posts an `eyes` event back to Relay `/event` (broadcast via WS/SSE to dashboard/glyph).

## Changes
- `void-sensor-incubator/relay/eyes-router.js` (new) — POST `/eyes/url {url}` → forwards to `EYES_URL/analyze`, allowlist, timeouts, graceful errors; posts result to `/event` (with `RELAY_API_KEY` if enabled).
- `void-sensor-incubator/relay/relay.js` (mod) — mounts `app.use("/eyes", eyesRouter())`
- `void-sensor-incubator/relay/README_EYES.md` (new) — env & usage
- `void-sensor-incubator/examples/eyes-url.sh` (new) — smoke test

## Event Contract
```json
{
  "type": "eyes",
  "status": "ok|warn|timeout",
  "meta": {
    "url": "https://…",
    "domain": "…",
    "summary": "…",
    "veracity": 0.0,
    "complexity": 0.0,
    "affect": {"valence": -1.0, "arousal": 0.0},
    "risk": ["…"],
    "glyph_event": "harmonic_pulse|dissonant_pulse",
    "retrieval": {"mode":"url_context","hits":[]}
  },
  "ts": "ISO-8601"
}
```

## ENV
```
EYES_URL=http://eyes-gemini:8791
EYES_ALLOWLIST=github.com,voidlinux.org,example.com
RELAY_API_KEY=...
RELAY_SELF=http://localhost:8787/event
```

## SLO
- `/eyes/url` p95 ≤ **3.0s**
- Success rate ≥ **99.0%** (non-5xx from Gemini excluded)
- Broadcast latency < **1s** (local net)

## Observability / Security
- Logs: url domain, status, duration_ms (no page content)
- Optional Prometheus counters if Relay exports metrics
- Domain allowlist; privacy-first (no content storage)

## QA
```bash
# Smoke
./void-sensor-incubator/examples/eyes-url.sh https://example.com

# SSE
curl -s http://localhost:8787/sse

# Allowlist
EYES_ALLOWLIST=github.com    # request example.com → 403
```

## Risks & Rollback
- High RPS → add rate-limit/cache in a follow-up
- Timeouts → `status=timeout` (warn UI)
- Rollback: remove router import/mount; delete file; restart relay

## Checklist
- [x] Docs
- [x] Smoke test
- [x] Backward compatible
- [x] No sensitive logs
