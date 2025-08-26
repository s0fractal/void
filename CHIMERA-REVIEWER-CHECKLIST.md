**Reviewer Checklist**
- [ ] Env flags OFF-by-default підтверджені
- [ ] Deterministic WASM SHA співпадає
- [ ] OPA Rego allow=true на тестовому вхідному
- [ ] Cosign verify OK (OIDC)
- [ ] k6 smoke: intent_errors <5%, p95 <300ms
- [ ] Grafana: Chimera панелі показують трафік, violations=0
- [ ] Rollback: `./scripts/chimera-rollout.sh rollback` перевірений (dry-run)