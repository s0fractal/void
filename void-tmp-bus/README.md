# void-tmp-bus — local /tmp event bus (UDS + spool + relay bridge)

**Мета:** дати стійкий, простий і автономний «нерв» через `/tmp/void`, який:
- приймає **JSONL події** через Unix Domain Socket (`/tmp/void/sock/events.sock`) та TCP `127.0.0.1:9478` (fallback),
- веде **хроніку** у `/tmp/void/log/pulse.jl` і **спул** у `/var/lib/void/spool/*.jl` оффлайн,
- має **лізинг-сесію** `/tmp/void/lease.json` (session_id, started_at, updated_at),
- **мостить** у Relay (`POST /event`, WS — пізніше) із автоматичним ретраєм.

Підходить як для **MN‑1 оффлайн**, так і для звʼязку з існуючим рілеєм.

## Quickstart (host)
```bash
# 0) каталоги
sudo bash scripts/mkvoidtmp.sh

# 1) запустити демон локально
cd bus && npm i && npm run dev  # слухає UDS і 127.0.0.1:9478

# 2) відправити подію
./bin/tmpbus-pub '({"type":"pr","status":"open","meta":{"who":"compass"}})'
# або: echo '{"type":"ci","status":"pass"}' | ./bin/tmpbus-pub -

# 3) дивитись хроніку
tail -f /tmp/void/log/pulse.jl
```

## Env
- `RELAY_HTTP` (напр. `http://localhost:8787/event`)
- `RELAY_API_KEY` (опційно)
- `TMP_DIR` (дефолт `/tmp/void`)
- `SPOOL_DIR` (дефолт `/var/lib/void/spool`)
- `TCP_PORT` (дефолт `9478`)

## Compose (опційно)
```bash
docker compose -f compose/compose.tmpbus.yml up -d
```

## Інтеграція
- **Relay Bridge:** події дублюються у relay (якщо доступний). У разі недоступності — падають у спул і будуть відправлені пізніше.
- **Glyph/Dashboard:** може читати `/tmp/void/log/pulse.jl` напряму, або через Relay, або обидва.
- **Guardians/Codex:** публікують у UDS сокет `events.sock` (1 рядок = 1 JSON подія).

## Безпека
- Директорії `/tmp/void` створюються з правами `0700` власником (користувач `void`/група `void`, якщо є).
- UDS сокети у `/tmp/void/sock` мають `0700`. Для спільного доступу — використовуй групи Unix.

## DoD (MVP)
- JSON з UDS → `pulse.jl` + спроба POST до Relay → у разі фейлу — у спул.
- Лізинг оновлюється кожні 10 сек (session_id зберігається між рестартами).
- Сервіс витягує зі спулу при відновленні мережі.
