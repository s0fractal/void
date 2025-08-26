# eyes-sse-probe

CLI для вимірювання e2e латентності: **POST /eyes/url → SSE /sse (event type=eyes)**.

## Встановлення
```bash
cd probe
npm i
npm run build
```

## Запуск
```bash
node dist/probe.js   --relay http://localhost:8787   --sse /sse   --endpoint /eyes/url   --url https://example.com   --count 20   --timeout 12000   --save results.jsonl
```

Вивід: рядок на запит + summary (p95/p99). За `--save` збережеться `results.jsonl` та `results.summary.json`.
```text
OK  match  812ms  200  https://example.com?probe=abc123&i=3  [probe-...]
# summary { count: 20, ok: 20, matched: 20, p95_ms: 1180, p99_ms: 1460 }
```

> Примітка: для точного матчінгу використовується `trace_id`, який додається до тіла POST і проходить через relay до події.
