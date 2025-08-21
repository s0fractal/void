# Integration: Eyes (Gemini URL Context) ↔ Relay ↔ Dashboard

## 1) Relay
- Copy `void-sensor-incubator/relay/eyes-router.js` into your `relay/`.
- Patch `relay.js` via `void-sensor-incubator/relay/relay.patch` (or add manually).

Env:
```
EYES_URL=http://eyes-gemini:8791
EYES_ALLOWLIST=github.com,voidlinux.org,example.com
RELAY_API_KEY=…
RELAY_SELF=http://localhost:8787/event
```

## 2) Compose
Bring up `eyes-gemini` if not already:
```
docker compose -f compose/compose.eyes.yml up -d
```

## 3) Dashboard
- Drop `apps/void-dashboard/src/components/EyesPanel.tsx` into your dashboard.
- Import and place `<EyesPanel/>` in any sidebar/column.
- Optional `VITE_RELAY_SSE` env to point at a remote relay.

## 4) Test
```
./examples/eyes-url.sh https://github.com/voideditor/void
```

**Result:** an `eyes` event is broadcast via Relay WS/SSE and rendered live on the dashboard.
