# Eyes integration (relay)

Expose a community entry-point for URL analysis via Gemini URL Context.

## Mount
- Copy `eyes-router.js` to your `relay/`.
- Apply `relay.patch` (or add `app.use("/eyes", eyesRouter())` manually).

## Env
```
EYES_URL=http://eyes-gemini:8791
EYES_ALLOWLIST=example.com,github.com,voidlinux.org
RELAY_API_KEY=...          # if /event is protected
RELAY_SELF=http://localhost:8787/event
```

## Call
```bash
curl -s http://localhost:8787/eyes/url -H 'content-type: application/json'   -d '{"url":"https://example.com"}' | jq .
```
