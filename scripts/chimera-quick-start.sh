#\!/usr/bin/env bash
set -euo pipefail

echo "🌀 Starting Chimera WASM Integration @ 432Hz..."

# 0) Environment
export RELAY="${RELAY:-http://localhost:8787}"
export PROM_URL="${PROM_URL:-http://localhost:9090}"

# 1) Security scan
echo "🔒 Running security scan..."
docker run --rm -v "$PWD:/repo" aquasec/trivy fs /repo || true
gitleaks detect --source . || true

# 2) Start services
echo "🚀 Starting services..."
docker compose -f compose/compose.wasm-exec.yml up -d
docker compose -f compose.intent.yml up -d
docker compose -f void-unified-dash-kit/compose.unified.yml up -d

# 3) Canary flags
echo "🐤 Configuring canary deployment..."
export WASM_EXEC_ENABLED=1 WASM_EXEC_CANARY=0.05 WASM_CAPS=emit
export INTENT_WASM_ENABLED=1 INTENT_WASM_CANARY=0.05

# 4) Wait for services (relay up)
echo "⏳ Waiting for relay..."
for i in {1..50}; do
  if curl -s "${RELAY}/health" >/dev/null 2>&1; then break; fi
  sleep 0.2
done

# 5) Run k6 (optional if K6_CID defined)
if [ -n "${K6_CID:-}" ]; then
  echo "🏃 Running k6 load test..."
  K6_RELAY_URL=$RELAY K6_CID=$K6_CID k6 run tools/k6/k6-chimera-load-test.js || true
fi

# 6) Digest
echo "📊 Generating digest..."
mkdir -p artifacts
scripts/chimera-digest.sh 24h > artifacts/chimera-digest.md

echo "✨ Chimera ready\! See artifacts/chimera-digest.md"
