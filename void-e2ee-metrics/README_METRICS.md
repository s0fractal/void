# Void E2EE Metrics Kit

Набір додає **Prometheus метрики** у `/e2ee/metrics` на релеї + готові **Grafana** панелі.
Сумісний з нашим опційним overlay — нічого не ламає, все вимикається тумблером.

## Показники
- `void_e2ee_ingest_requests_total{mode,status}` — кількість запитів (mode: e2ee|plaintext; status: ok|err)
- `void_e2ee_ingest_duration_ms` — гістограма латентності обробки
- `void_e2ee_decrypt_failures_total` — кількість помилок дешифру
- `void_e2ee_forward_intent_total` — скільки інтентів передано у `/intent/wave`
- `void_e2ee_overlay_flags{flag}` gauge (0|1): enabled, accept_plaintext

## Інтеграція в relay (нічого не зламає)
1) Встанови залежність у модулі relay:
```bash
cd relay
npm i prom-client
```

2) Застосуй патч:
```bash
git apply ../void-e2ee-metrics/relay/e2ee-router.metrics.patch
```

3) ENV (стейджинг):
```bash
export METRICS_E2EE_ENABLED=1
export E2EE_ENABLED=1
export E2EE_PROVIDER=mls
export E2EE_ACCEPT_PLAINTEXT=1
docker compose up -d --build relay
```

Метрики зʼявляться на `http://localhost:8787/e2ee/metrics`.

## Prometheus + Grafana (опціонально)
```bash
docker compose -f compose.metrics.yml up -d
# Prometheus: http://localhost:9090  |  Grafana: http://localhost:3000  (admin/admin)
```

## Алерти
`prometheus/rules/e2ee-rules.yml`:
- **E2EEIngestErrorRateHigh** — error rate > 1% за 5m
- **E2EEIngestLatencyP95High** — p95 > 800ms за 5m
- **E2EEDecryptFailures** — нові помилки дешифру
- **E2EEForwardDrop** — низький forward при нормальному ingest
