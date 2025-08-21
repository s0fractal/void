# Void E2E SSE Sidecar
Sidecar сервіс, що вимірює **intent → response** затримку через SSE і експонує **Prometheus** метрики.

- Пушить `intent.wave` у `/intent/wave` (plaintext, без E2EE)
- Слухає `/sse`, матчить події за `meta.trace_id`
- Рахує два інтервали:
  - **post→intent_seen_ms** (коли побачили `intent.wave` у стрімі)
  - **post→response_seen_ms** (коли прийшла `response.harmonic|dissonant`)
- Витримує reconnection SSE, безпечно для прод (нічого не ламає).

## Тумблери (ENV)
```
RELAY_BASE=http://localhost:8787
POST_ENDPOINT=/intent/wave
SSE_PATH=/sse
PROBE_TEXT=Resonance probe
PROBE_INTERVAL_MS=5000
TIMEOUT_MS=15000
CONCURRENCY=1
HEADERS_JSON={}                 # додаткові заголовки до POST (JSON)
PROM_PORT=9478
```

## Запуск (локально)
```bash
npm i
npm run build
node dist/sidecar.js
# метрики: http://localhost:9478/metrics
```

## Docker
```bash
docker build -t void/e2e-sse-sidecar .
docker run --rm -p 9478:9478 \
  -e RELAY_BASE=http://relay:8787 \
  -e PROBE_INTERVAL_MS=3000 -e CONCURRENCY=2 \
  --network voidnet void/e2e-sse-sidecar
```

## Docker Compose (приклад)
```yaml
services:
  e2e-sidecar:
    build: ./void-e2e-sse-sidecar
    environment:
      - RELAY_BASE=http://relay:8787
      - SSE_PATH=/sse
      - POST_ENDPOINT=/intent/wave
      - PROBE_INTERVAL_MS=4000
      - TIMEOUT_MS=15000
      - CONCURRENCY=2
      - PROM_PORT=9478
    ports: ["9478:9478"]
    networks: ["voidnet"]
networks: { voidnet: { external: true } }
```

## Метрики
- `void_probe_runs_total{phase,result}`
- `void_probe_duration_ms_bucket{phase}` (histogram)
- `void_probe_inflight`
- `void_sse_connected` (0|1)
- `void_sse_reconnects_total`

## Smoke
```bash
PROBE_INTERVAL_MS=0 node dist/sidecar.js --once
curl -s localhost:9478/metrics | head
```
