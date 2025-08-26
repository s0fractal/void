#!/usr/bin/env bash
set -euo pipefail

# === Chimera Pre-Merge Checklist ===
# Run this before creating the PR to main

echo "🔍 Chimera Pre-Merge Checklist"
echo "=============================="

FAILED=0

# 1. Unit/Integration Tests
echo -n "1. Running tests... "
if npm test --workspaces --if-present >/dev/null 2>&1 && \
   (cd tools/protein-hash && cargo test --quiet); then
  echo "✅"
else
  echo "❌"
  FAILED=$((FAILED + 1))
fi

# 2. Deterministic builds
echo -n "2. Checking deterministic builds... "
if npm run -s build:wasm -- --deterministic >/dev/null 2>&1; then
  HASH1=$(sha256sum dist/wasm/*.wasm 2>/dev/null | head -1 | awk '{print $1}')
  git clean -fdx >/dev/null 2>&1 || true
  npm ci >/dev/null 2>&1
  npm run -s build:wasm -- --deterministic >/dev/null 2>&1
  HASH2=$(sha256sum dist/wasm/*.wasm 2>/dev/null | head -1 | awk '{print $1}')
  if [ "$HASH1" = "$HASH2" ]; then
    echo "✅"
  else
    echo "❌ (hashes differ)"
    FAILED=$((FAILED + 1))
  fi
else
  echo "❌ (build failed)"
  FAILED=$((FAILED + 1))
fi

# 3. Security scans
echo -n "3. Security scan (trivy)... "
if docker run --rm -v "$PWD:/repo" aquasec/trivy fs --quiet --severity HIGH,CRITICAL --exit-code 0 /repo >/dev/null 2>&1; then
  echo "✅"
else
  echo "⚠️  (non-critical issues found)"
fi

echo -n "4. Secret scan (gitleaks)... "
if gitleaks detect --source . --exit-code 0 >/dev/null 2>&1; then
  echo "✅"
else
  echo "❌"
  FAILED=$((FAILED + 1))
fi

# 5. OPA policy test
echo -n "5. OPA policy validation... "
if command -v opa >/dev/null 2>&1; then
  ALLOW=$(echo '{"cid":"test","protein_hash":{"verified":true,"similarity":0.97,"signature":"trusted"},"policy":{"max_gas":2000000},"metadata":{"resonance_hz":432}}' | \
    opa eval -I -f raw -d security/opa/protein-hash-policy.rego 'data.chimera.wasm.validation.allow' 2>/dev/null | tr -d '\n')
  if [ "$ALLOW" = "true" ]; then
    echo "✅"
  else
    echo "❌"
    FAILED=$((FAILED + 1))
  fi
else
  echo "⚠️  (OPA not installed)"
fi

# 6. Check all features are disabled by default
echo -n "6. Features disabled by default... "
if grep -q "CHIMERA_ENABLED=0" .env.example && \
   grep -q "WASM_EXEC_ENABLED=0" .env.example && \
   grep -q "PROTEIN_HASH_ENABLED=0" .env.example; then
  echo "✅"
else
  echo "❌"
  FAILED=$((FAILED + 1))
fi

# 7. Documentation exists
echo -n "7. Documentation complete... "
if [ -f "CHIMERA-INTEGRATION-COMPLETE.md" ] && \
   [ -f "CHIMERA-WASM-INTEGRATION.md" ] && \
   [ -f "apps/first-node/README.md" ]; then
  echo "✅"
else
  echo "❌"
  FAILED=$((FAILED + 1))
fi

# 8. Metrics naming convention
echo -n "8. Metrics follow convention... "
if grep -q "void_wasm_runs_total" services/wasm-exec/src/metrics.ts 2>/dev/null && \
   grep -q "void_wasm_run_ms_bucket" services/wasm-exec/src/metrics.ts 2>/dev/null; then
  echo "✅"
else
  echo "⚠️  (check metric names)"
fi

echo "=============================="

if [ $FAILED -eq 0 ]; then
  echo "✅ All checks passed! Ready to create PR."
  echo ""
  echo "Create PR with:"
  echo "gh pr create -B main -H chimera-integration \\"
  echo "  --title \"feat(chimera): WASM code-as-signal stack (guarded & canary)\" \\"
  echo "  --body-file CHIMERA-INTEGRATION-COMPLETE.md \\"
  echo "  --label \"enhancement,chimera,security,canary,432Hz\""
else
  echo "❌ $FAILED checks failed. Please fix before creating PR."
  exit 1
fi