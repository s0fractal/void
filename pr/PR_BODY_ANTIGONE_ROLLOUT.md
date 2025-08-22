# feat(antigone): relay integration + grafana annotations + prometheus alerts

## Що робить цей PR
- Інтегрує Antigone з **relay** через `RELAY_BASE` (шле події `antigone.decision/refusal`)
- Додає **Prometheus alerts** для Antigone (`prom/rules/antigone_rules.yml`)
- Додає **інструкцію розгортання** (`docs/ANTIGONE_ROLLOUT_GUIDE.md`)
- Готує місце під **Grafana annotations** (сумісно з AutoPanel/PanelMap)

## Як перевірити
1) Запустити Antigone (`compose.antigone.yml`) у `voidnet`  
2) Переконатися, що Prometheus зчитує `:9495/metrics`  
3) Перевірити алерти (thresholds можна тимчасово знизити для smoke-тесту)  

## SLO / Alerts
- `AntigoneDenyRateHigh` — deny-rate > 10% за 15хв
- `AntigoneLatencyP95High` — p95 рішення > 500мс за 10хв
- `AntigoneRefusalsSpike` — стрибок відмов
- `AntigoneGenomeHashChange` — зміна геному в проді

## Rollout / Rollback
- **Canary**: `DECISION_MODE=gate` для частини маршрутів у relay
- **Rollback**: `DECISION_MODE=warn` + рестарт контейнера (≤10с)
