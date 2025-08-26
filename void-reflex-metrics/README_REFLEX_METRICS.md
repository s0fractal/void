# Void Spinal Reflex — Prometheus метрики

Цей пакет додає **вбудований Prometheus експортер** до рефлексу (спинного мозку):
- експонує `/metrics` (за замовчуванням порт `9482`),
- міряє **тривалість кроків** (git/deps/tests), **загальну тривалість збірки**,
- лічильники успіхів/збоїв/таймаутів,
- глибину черги та стан SSE.

## Швидкий старт (Docker overlay)
```bash
# 1) Додай override до вашого compose.reflex.yml
docker compose -f compose.reflex.metrics.override.yml up -d --build

# 2) Метрики
curl -s localhost:9482/metrics | head
```

## Встановлення у Void (runit, без Docker)
```bash
# на хості контейнера Void:
sudo mkdir -p /opt/spinal-reflex
sudo cp spinal-reflex.with-metrics.js /opt/spinal-reflex/spinal-reflex.js
sudo cp -r node/* /opt/spinal-reflex/
cd /opt/spinal-reflex && npm i --omit=dev

# перезапуск служби
sv restart void-reflex
# метрики
curl -s localhost:9482/metrics | head
```

## Параметри (ENV)
```
PROM_PORT=9482
METRICS_ENABLED=1
RELAY_BASE=http://relay:8787
SSE_PATH=/sse
EVENT_POST=/event
WORKDIR=/workspace/void-ci
ALLOW_REPOS="voideditor/void,s0fractal/void"
TIMEOUT_MS=900000
DRY_RUN=1
USER_NAME=void
```

## Prometheus + Grafana (опціонально)
```bash
# якщо немає вашої інфри — підняти демо
docker compose -f compose.metrics.yml up -d
# Prometheus: http://localhost:9090
# Grafana:    http://localhost:3000 (admin/admin) → імпортуй grafana/reflex-dashboard.json
```
