# Void WASM Feature Pack

Розширення для `void-wasm-exec`:
- **Syscall шлюз** з політиками: `syscall.emit`, `syscall.http.fetch`, `syscall.kv.get/set`
- **Caps & Policy**: allowlist caps, дозволені хости/шляхи, ліміти розміру/часу
- **Rate limiting** для HTTP‑викликів
- **IPFS→HTTPS fallback** і кешування
- **Метрики Prometheus** для syscalls
- **Grafana панелі** та Prometheus rules
- **Приклади модулів**: `http-ping` (TinyGo), `kv-note` (Rust скелет)

Пакет — накладка на Starter Kit. Заміни `executor/cmd/void-wasm-exec/main.go` або використай `docker/exec.feature.Dockerfile`.
