# Void Codex — Tuning Pack

This pack adds:
- **TypeScript SDK** (`codex-api/sdk`) ready to build/publish.
- **GitHub Actions** for OpenAPI lint and contract smoke tests.
- **Relay HMAC Codex Proxy** (`relay-patch/`) + patch file to mount `/codex/*` routes.
- **Compose overlay** to run Codex alongside the sensor incubator.

## Quick Steps

### A) Add Codex to your stack
```bash
# From your incubator repo root
docker compose -f docker-compose.yml -f compose/compose.codex.yml up -d
# codex available at http://localhost:8788
```

### B) Patch relay to enable `/codex/*` proxy
Copy `relay-patch/codex-proxy.js` into your relay folder and apply `relay.patch` (or manually mount):
```js
// in relay.js
import { codexProxyRouter } from "./codex-proxy.js";
app.use("/codex", codexProxyRouter());
```

### C) Build SDK
```bash
cd codex-api/sdk && npm i && npm run build && npm run pub:pack
```

### D) GitHub Actions
Copy `.github/workflows/*` under your Codex API repo to enable OpenAPI lint and smoke tests.

### E) Call Codex via relay
```bash
./examples/codex-via-relay.sh
```

## Env
- `CODEX_API_KEY`, `CODEX_HMAC_SECRET` — shared secrets between relay and codex.
