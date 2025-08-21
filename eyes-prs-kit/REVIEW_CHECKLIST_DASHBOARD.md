# Dashboard PR Review — EyesPanel (live analyses)

## 1) Поведінка
- [ ] Підʼєднання до SSE (`/sse` або `VITE_RELAY_SSE`) стабільне
- [ ] Відписка/закриття EventSource на unmount
- [ ] Рендер події ≤ **1s** після приходу SSE

## 2) UI/UX
- [ ] Відображення: domain (клік), summary (коротко)
- [ ] Відсотки: veracity/complexity у 0–100% (округлення адекватне)
- [ ] Affect: `valence`/`arousal` без формат-артефактів
- [ ] Бейдж `harmonic/dissonant` коректний за `glyph_event`
- [ ] Стан «waiting for first signal…» до першої події
- [ ] Мобільна верстка/темна тема узгоджені зі стилем дашборду
- [ ] Нема XSS: нічого не dangerouslySetInnerHTML; summary як plain text

## 3) Продуктивність
- [ ] Без зайвих ререндерів; немає heavy state
- [ ] Lighthouse/Perf: немає явних деградацій

## 4) Тести/Smoke
- [ ] Згенерована `eyes` подія відображається одразу
- [ ] Відʼєднання SSE не валить інші панелі

## 5) Документація
- [ ] `README_EYES_PANEL.md` ок, приклад імпорту `<EyesPanel />` працює

## 6) Rollback
- [ ] Видалення компоненту не ламає збірку/маршрути