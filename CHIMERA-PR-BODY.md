# Chimera Integration — Code-as-Signal (Guarded & Canary)

**Scope**
- PR-A: Env flags & safety (OFF-by-default), canary scaffolding
- PR-B: WASM builder (TinyGo/Rust) + CID/CAR + manifest
- PR-C: FNPM CID resolver (cache → IPFS → HTTP gateways), dual-verify
- PR-D: Protein Hash (spectral signatures, AST/data-flow graph)
- PR-E: WASM Executor (Wasmtime+WASI, policy engine, syscalls, metrics)
- PR-F: Relay endpoint `/intent/execute-wasm` (async, idempotency)
- PR-G: Grafana dashboards + Prometheus rules
- PR-H: First Node (LiveKit) bootstrap

**Safety**
- Features OFF by default
- 6-stage canary (+ auto-rollback)
- Kill switch: `CHIMERA_FREEZE=1`
- OPA Rego policy (protein-hash, resonance=432Hz, gas limits)
- Cosign verify for WASM blobs (OIDC, no private keys in repo)

**SLO**
- intent errors < **5%**
- p95 exec < **300ms** (p99 < 500ms)
- policy violations = **0** during rollout

**How to test**
```bash
./scripts/chimera-pre-merge-checklist.sh
./scripts/chimera-merge-gate.sh     # очікуємо "✅ GO"
K6_CID=<demoCID> ./scripts/chimera-quick-start.sh
scripts/chimera-digest.sh 24h > artifacts/chimera-digest.md
```

**Rollout**
```bash
./scripts/chimera-rollout.sh start    # 1% → 5% → 10% → 25% → 50% → 100%
./scripts/chimera-rollout.sh check
./scripts/chimera-rollout.sh rollback # аварійний відкат
```

**Monitoring**
- Dashboards: `void-unified-dash-kit/dashboards/chimera/`
- Key metrics: `void_wasm_runs_total`, `void_wasm_run_ms_bucket`, violations, OPA allow/deny

**Reviewer Guide (TL;DR)**
- `.env.example` → flags = `0`
- Deterministic WASM: **OK** (SHA match)
- OPA allow → `true` на демо-вході
- Cosign verify: **OK** (OIDC)
- k6: `intent_errors < 5%`, `p95 < 300ms`
- Prometheus метрики видно; алерти підключені