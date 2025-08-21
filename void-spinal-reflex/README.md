# Void Spinal Reflex — автономний CI-рефлекс для Void

Це «спинний мозок»: демон, що **слухає Relay /sse** і автоматично виконує
`git pull → fnpm install → fnpm test`, після чого шле у Relay `ci.result` (`pass|fail|dryrun|error`).

- **Нічого не ламає**: окремий сервіс, без змін у Relay/Dashboard.
- Працює у **Void Linux (runit)** або як **Docker compose overlay**.
- Має **DRY_RUN=1** для безпечного ввімкнення.

## Події, які ловимо
- `github.pull_request` з `meta.action ∈ {opened,synchronize,reopened}`
- `github.push`
(за потреби підлаштуйте матчінг у `spinal-reflex.js`).

## Швидкий старт (Docker overlay, без зламу прод)
```bash
docker compose -f compose.reflex.yml up -d --build
# Перевірка:
curl -s http://localhost:8787/sse | jq --unbuffered 'select(.type=="ci.result")'
```

## Встановлення у Void (runit сервіс усередині контейнера)
```bash
# 1) Скопіювати службу
sudo bash scripts/install-runit.sh /opt/spinal-reflex

# 2) ENV (редагуйте /etc/sv/void-reflex/run або /etc/sv/void-reflex/env/*)
#    DRY_RUN=1 — рекомендується на перший запуск
sudo sv restart void-reflex
sv status void-reflex
```

## ENV тумблери
```
RELAY_BASE=http://relay:8787
SSE_PATH=/sse
EVENT_POST=/event
WORKDIR=/workspace/void-ci
ALLOW_REPOS="voideditor/void,s0fractal/void"
TIMEOUT_MS=900000          # 15 хв
DRY_RUN=1                  # спершу ON
USER_NAME=void             # під цим користувачем виконуються кроки
```

## Smoke подія (без GitHub)
```bash
bash scripts/smoke-pr.sh voideditor/void 1234 deadbeefcafebabe
# Або push-сигнал:
bash scripts/smoke-push.sh voideditor/void deadbeefcafebabe
```

## Що саме робить
1) Підписується на `SSE` і чергою обробляє PR/push події (конкурентність=1, дебаунс).
2) Клонує/оновлює репозиторій у `WORKDIR/<owner__repo>/`.
3) Виконує: `fnpm install` (або `npm i`), потім `fnpm test` (або `npm test`).
4) Публікує `ci.result` у Relay з хвостами логів кроків.

## Rollback
- Docker overlay: `docker compose -f compose.reflex.yml down`
- runit: `rm -f /var/service/void-reflex` і `sv down void-reflex`; видалити `/etc/sv/void-reflex`
