# Relay Codex Proxy Patch

Adds HMAC-signed proxy routes to forward requests to Codex API.

## Env
- `CODEX_URL` — e.g. `http://codex:8788`
- `CODEX_API_KEY` — optional API key for Codex
- `CODEX_HMAC_SECRET` — optional shared secret for `x-signature` (HMAC-SHA256)

## Usage
POST to:
- `/codex/plan`
- `/codex/rules`
- `/codex/report`
- `/codex/commit-msg`

The relay will forward the JSON body to `${CODEX_URL}` with headers:
`x-api-key`, `x-signature`, `idempotency-key` (if provided).
