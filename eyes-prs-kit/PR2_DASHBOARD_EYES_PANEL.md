**Title:** feat(dashboard): add EyesPanel for live URL analyses (veracity, complexity, affect)

## Summary
Adds **EyesPanel.tsx**; listens to Relay **SSE /sse** and renders the latest `eyes` event: domain/summary, veracity/complexity (%), affect (valence/arousal), risk tags, harmonic/dissonant badge.

## Changes
- `apps/void-dashboard/src/components/EyesPanel.tsx` (new)
- `apps/void-dashboard/src/components/README_EYES_PANEL.md` (new)

## Integration
```tsx
import EyesPanel from './components/EyesPanel';
// place in sidebar:
<EyesPanel />
```
ENV (optional): `VITE_RELAY_SSE=http://localhost:8787/sse`

## SLO
- Render after SSE < **1s**
- Unsubscribes on unmount; no heavy re-renders

## QA
1) Run Relay + eyes-gemini
2) `./void-sensor-incubator/examples/eyes-url.sh https://github.com/voideditor/void`
3) See Eyes card update with summary & metrics

## Risks & Rollback
- No events → shows “waiting for first signal…”
- SSE drop doesn’t impact other panels
- Rollback: remove component/import (no migrations)

## Checklist
- [x] Docs
- [x] Light integration
- [x] No route/state breakages
