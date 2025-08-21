# void-resonance-chat — «Пустота & Все» (Resonance Interface)

Мета: перетворити чат на **Резонансну Камеру**: інтент → MCP/Orchestra → Mixer → мультимодальна відповідь.
Набір зроблено **безпечним за замовчуванням**: нові фічі відключені (env-тумблер), існуючі роутери/дашборд не ламаються.

## Швидкий старт (DRY-RUN, без ризику)
```bash
# 1) Увімкнути лише в релеї (стейджинг), згенерувати демо-відповідь:
export RESONANCE_ENABLED=1
export RESONANCE_DRYRUN=1
# (опційно) RELAY_SELF для посту подій у свій /event
export RELAY_SELF=http://localhost:8787/event

# 2) Підключити intent-router (див. relay/relay.patch) і перезапустити relay
git apply relay/relay.patch
docker compose build relay && docker compose up -d relay

# 3) Дашборд: додати ResonancePanel (див. dashboard/README_RESONANCE_PANEL.md)

# 4) Надіслати інтент (смоук)
./scripts/smoke.sh "Оптимізуй наш CI під 432Hz SLO"
```

## Увімкнення справжнього Orchestra (після церемонії)
- Заповнити `ORCHESTRA_HTTP=http://orchestra:8799/intent` (або ваш LangGraph gateway)
- Забрати `RESONANCE_DRYRUN`
- Увімкнути MCP-провайдери поступово (code/pulse/tmpbus/eyes/codex/claude/gpt)

## Події (канонічні типи)
- `intent.wave` — вхідний інтент
- `orchestra.plan` — план оркестрації/виклики агентів
- `orchestra.result` — результати агентів (паралельні)
- `response.harmonic` / `response.dissonant` — фінальна відповідь «Пустоти»

## Безпека
- За замовчуванням **вимкнено** (`RESONANCE_ENABLED=0`)
- DRY-RUN не викликає зовнішніх агентів, лише синтезує безпечну відповідь
- Ніколи не зберігаємо приватний контент; лише агрегати в подіях
