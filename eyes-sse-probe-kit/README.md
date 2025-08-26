# Eyes SSE Probe Kit

Все для вимірювання e2e латентності **POST /eyes/url → SSE /sse** і точного матчінгу через `trace_id`.

## Склад
- `probe/` — Node/TypeScript CLI (`eyes-sse-probe`) із залежністю **eventsource**
- `relay/eyes-router.trace.patch` — патч до `eyes-router.js` (додає `trace_id` у `event.meta`)

## Кроки
1) Застосувати патч до релея:
```bash
git apply relay/eyes-router.trace.patch
docker compose build relay && docker compose up -d relay
```
2) Запустити пробу:
```bash
cd probe && npm i && npm run build
node dist/probe.js --relay http://localhost:8787 --url https://example.com --count 20 --save results.jsonl
```

## Результат
- e2e latency по кожному запиту, `p95/p99` сумарно
- JSONL з деталями та summary JSON — готово до завантаження в ваші аналітики
