# Void Sensor Incubator
Легкий інкубатор для розгортання сенсорного вузла мережі Void:
- **relay** — WebSocket + HTTP(S) + SSE рілеїнг подій у гліфи
- **ipfs-poller** — перевірка здоров'я IPFS CID та надсилання подій
- **docker-compose.yml** — оркестрація сервісів на спільній мережі `voidnet`

## Швидкий старт
```bash
cp .env.example .env   # (необов'язково) встанови RELAY_API_KEY, CIDS тощо
docker compose build
docker compose up -d
# Рілеїнг: ws://localhost:8787/ws  |  SSE: http://localhost:8787/sse  |  HTTP: POST /event
# IPFS поллер шле події у рілеїнг за інтервалом
```

## Події
Очікуваний формат події (JSON body для POST /event):
```json
{ "type": "ci", "status": "pass", "meta": { "repo": "org/repo", "sha": "..." } }
```
Мінімальний текстовий формат для WS/SSE: `ci:pass`

## Безпека
Якщо змінна оточення `RELAY_API_KEY` задана — POST /event потребує заголовок:
```
x-api-key: <RELAY_API_KEY>
```
IPFS-поллер теж буде додавати цей заголовок при відправці.

## Інтеграція з гліфом
У гліфі введи `WS URL`: `ws://<host>:8787/ws` (або wss:// на проді),
або `SSE URL`: `http://<host>:8787/sse`. Події, що надходять, відобразяться у пульсації.

## Інтеграція з Void Substrate
Створи спільну мережу (якщо ще не існує):
```bash
docker network create voidnet || true
```
Додай сервіс **void-substrate** до цієї мережі у твоєму compose (`networks: [voidnet]`),
або просто запусти інкубатор — він сам створить `voidnet`, і substrate можна приєднати:
```bash
docker network connect voidnet void-consciousness
```

## GitHub Action
У корені є `.github/workflows/void-glyph-pulse.yml`, яке надсилає події у рілеїнг.
Потрібні секрети:
- `VOID_GLYPH_RELAY_URL` — наприклад, `https://relay.example.com/event`
- `VOID_GLYPH_RELAY_KEY` — якщо ввімкнутий API key

## Тест
```bash
curl -sS http://localhost:8787/health
curl -sS -H 'content-type: application/json' -d '{"type":"pr","status":"open"}' http://localhost:8787/event
# або з ключем:
curl -sS -H 'x-api-key: secret' -H 'content-type: application/json' -d '{"type":"ci","status":"pass"}' http://localhost:8787/event
```
