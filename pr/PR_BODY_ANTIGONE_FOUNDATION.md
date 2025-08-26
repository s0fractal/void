# feat(antigone): ethical firewall + genome distiller + tests + docker

## Що робить цей PR
- Додає **етичний firewall**: `check_dissonance()` з FastAPI (`/antigone/check`, `/antigone/act`)
- Додає **дистилятор геному**: `distill_genome.py` → `glyphs/core.yaml` (з SHA256)
- Додає **pytest** тести (`tools/antigone/tests/`)
- Додає **Docker/Compose** сервіс `void-antigone` з метриками Prometheus (`:9495/metrics`)
- Додає **CI workflow** (`.github/workflows/antigone-ci.yml`)
- Додає **LoRA hook** (`scripts/train_lora.sh`) — плейсхолдер

## Як перевірити
```bash
python tools/antigone/distill_genome.py data/dialogs/*.md > glyphs/core.yaml
python -m pytest -q tools/antigone/tests

docker build -f tools/antigone/docker/Dockerfile -t void/embryo-antigone:latest tools/antigone
docker compose -f tools/antigone/docker/compose.antigone.yml up -d --build
curl -s localhost:9495/health | jq .
curl -s localhost:9495/metrics | head
```

## SLO / Метрики
- `void_antigone_decisions_total{decision}`
- `void_antigone_decision_ms_bucket`
- `void_antigone_refusals_total{reason}`
- `void_antigone_genome_hash{sha}`

## Безпека
- Валідація схеми `glyphs/core.yaml`
- Публічні ендпоінти без stateful змін (firewall на шляху виконання)
- Rollback: **змінити** `DECISION_MODE=warn` і перезапустити контейнер

## Ризики
- Мінімальні. Код ізольований у `tools/antigone/**`, дефолтний режим — `warn`.
