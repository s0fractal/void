# Relay PR Review — Eyes URL → Gemini → glyph

## 1) Архітектура & Код
- [ ] `/eyes/url` приймає лише `http(s)` та валідний `URL`
- [ ] **Allowlist** доменів застосовано (EYES_ALLOWLIST)
- [ ] Таймаути: Eyes call ≤ 12s; POST /event ≤ 1.5s
- [ ] Ідемпотентний постинг у `/event` (без дублю, нормальний retry=off)
- [ ] HMAC/`RELAY_API_KEY` використано, якщо /event захищено
- [ ] Ліміти розміру JSON, max URL length, graceful errors

## 2) Безпека
- [ ] SSRF-захист: дозволено лише домени з allowlist
- [ ] В логах немає контенту сторінки (лише domain/status/duration)
- [ ] Нема зберігання сирого контенту; приватність by design
- [ ] Відсутні eval/динамічне виконання, немає відкритих редиректів

## 3) Спостережуваність
- [ ] Логи включають `eyes.url`, `domain`, `status`, `duration_ms`
- [ ] (Опційно) Метрики підготовлені для підключення Prometheus

## 4) Продуктивність (SLO)
- [ ] `/eyes/url` p95 ≤ **3.0s** (staging)
- [ ] Success rate ≥ **99.0%**
- [ ] Broadcast latency WS/SSE < **1s**

## 5) Документація
- [ ] `README_EYES.md` охоплює ENV, приклади, помилки
- [ ] Приклади: `examples/eyes-url.sh` працює

## 6) QA / Е2Е
- [ ] Smoke: `./void-sensor-incubator/examples/eyes-url.sh https://example.com`
- [ ] SSE: `curl -s http://localhost:8787/sse | head` містить `type":"eyes"`
- [ ] Allowlist: домен поза списком → **403**
- [ ] Degrade: зупинка `eyes-gemini` → **502 eyes_failed** (graceful)

## 7) Rollback
- [ ] Видалення router + рядка `app.use("/eyes", …)` повертає Relay в попередній стан