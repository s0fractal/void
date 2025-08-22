# Void Unified Dash Kit

Єдиний дашборд для всієї екосистеми: **Spinal Reflex**, **TmpBus**, **E2EE Overlay**, **Pulse Health**.

## Що всередині
- `pulse-metrics/` — sidecar, що слухає **/sse** і експонує **void_pulse_health*** метрики.
- `grafana/void-unified-dashboard.json` — готова панель з кореляціями.
- `prometheus/rules/unified-rules.yml` — записні правила для p95 та кореляцій.
- `compose.unified.yml` — підняти pulse-metrics і підʼєднати до Prometheus.
- `mapping.example.json` — мапа імен метрик, якщо у вас інші назви для tmpbus/e2ee.

## Швидкий старт
```bash
# 1) Запустити pulse-metrics
docker compose -f compose.unified.yml up -d --build

# 2) Імпортувати grafana/void-unified-dashboard.json у Grafana

# 3) (Опційно) додати rules
#   скопіювати prometheus/rules/unified-rules.yml у свій Prometheus
```

## Pulse Health (гнучкий парсер)
Sidecar ловить типи подій:
- `health.update` або `health` з полями: `aggregate`, `ci`, `ipfs`, `substrate`, `guardian`.
- якщо цих подій немає, sidecar формує **proxy**:
  - `void_pulse_health_aggregate` зворотно пропорційно `reflex p95` та `tmpbus spool` (нормалізовано).

ENV тумблери для парсеру:
```
RELAY_BASE=http://relay:8787
SSE_PATH=/sse
PROM_PORT=9483
HEALTH_EVENT_REGEX=^health(\.update)?$
HEALTH_FIELDS=aggregate,ci,ipfs,substrate,guardian   # або підмножина
BACKUP_FROM_METRICS=1      # вмикає проксі-агрегацію, якщо немає health-подій
REFLEX_JOB=void_reflex     # для p95 у проксі-агрегації
TMPBUS_PREFIX=void_tmpbus  # очікуваний префікс метрик tmpbus (див. mapping.json)
REFRESH_MS=5000
```

## Узгодження назв метрик
Якщо у вас інші імена метрик для tmpbus/e2ee — відредагуйте `grafana/void-unified-dashboard.json`
або використайте `mapping.example.json` як довідник для замін.
