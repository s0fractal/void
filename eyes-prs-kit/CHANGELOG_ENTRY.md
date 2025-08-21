## [1.x.x] - 2025-08-24
### Added
- **Relay:** новий `/eyes/url` endpoint для аналізу URL через Gemini URL Context; події транслюються у WS/SSE.
- **Dashboard:** компонент **EyesPanel** з реальним часом (veracity, complexity, affect, ризики, harmonic/dissonant).
- **Integration:** візуальний нерв між Eyes сервісом і Void екосистемою; allowlist доменів, graceful деградація.

### Security
- Allowlist доменів для SSRF-захисту; логи без контенту сторінки.

### Performance
- `/eyes/url` p95 ≤ 3.0 s; broadcast latency < 1 s.