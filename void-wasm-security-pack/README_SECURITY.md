# Void WASM Security Pack — Cosign + OPA + Mapper

Цей пакет додає **криптографічну верифікацію** модулів (Sigstore/Cosign) і **динамічні політики** (OPA Rego)
до `void-wasm-exec`, а також інструменти для адаптації дашбордів (metric mapper).

## Компоненти
- **Executor (security build)** з вбудованими:
  - Cosign перевіркою (через `cosign verify-blob`, опційно `--certificate`)
  - OPA PDP викликом (`POST /v1/data/void/policy/allow`) перед виконанням
  - Метрики: `void_wasm_cosign_total{result}`, `void_wasm_opa_total{result}`
- **OPA sidecar** (server-mode) зі зразком політик `opa/policies/policy.rego`
- **Compose overlays** для легкого запуску
- **Security dashboard** + **Prometheus правила/алерти**
- **Metric mapper** — скрипт для автопідстановки назв метрик у Grafana JSON

## Швидкий старт
```bash
# 1) Підняти OPA PDP
docker compose -f compose/compose.opa.yml up -d

# 2) Зібрати security executor
docker build -f docker/exec.security.Dockerfile -t void/wasm-exec:security .

# 3) Запустити сайдкар
docker compose -f compose/compose.security.yml up -d --build

# 4) Метрики перевірити
curl -s http://localhost:9490/metrics | egrep 'void_wasm_(cosign|opa|policy_denied)'
```

## Cosign
- Якщо `COSIGN_VERIFY=1`, executor вимагатиме валідної сигнатури **до** виконання.
- Джерела сигнатури:
  - `sig_url`/`cert_url` у envelope **або**
  - сусідні файли: `${wasm}.sig`, `${wasm}.crt` при `file://` URL
- Відмова → `result="verify_failed"` (метрика `void_wasm_cosign_total`).

## OPA
- Executor шле в OPA `input` з envelope полями + (за наявності) `signer` з Cosign.
- Відповідь `allow=false` → **deny**, інкремент `void_wasm_opa_total{result="deny"}` і `void_wasm_policy_denied_total`.

## Mapper
```
python3 tools/metric-mapper.py grafana/void-unified-dashboard.annotations.json mapping.sample.json > out.json
# Імпортуйте out.json у Grafana
```
