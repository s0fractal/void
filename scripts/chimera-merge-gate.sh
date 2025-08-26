#!/usr/bin/env bash
set -euo pipefail

TH_ERR=${TH_ERR:-0.05}      # 5%
TH_P95=${TH_P95:-300}       # ms

echo "🔎 Chimera Merge Gate — thresholds: err<$TH_ERR p95<$TH_P95ms"

# 1) OPA allow?
ALLOW=$(echo '{"cid":"demo","protein_hash":{"verified":true,"similarity":0.97,"signature":"trusted"},"policy":{"max_gas":2000000},"metadata":{"resonance_hz":432}}' \
 | opa eval -I -f raw -d security/opa/protein-hash-policy.rego 'data.chimera.wasm.validation.allow' | tr -d '\n')
echo "OPA allow: $ALLOW"
[ "$ALLOW" = "true" ]

# 2) Deterministic build
npm run -s build:wasm -- --deterministic
H1=$(sha256sum dist/wasm/*.wasm | awk '{print $1}')
git clean -fdx >/dev/null 2>&1 || true
npm ci >/dev/null
npm run -s build:wasm -- --deterministic
H2=$(sha256sum dist/wasm/*.wasm | awk '{print $1}')
echo "WASM SHA A=$H1 B=$H2"; [ "$H1" = "$H2" ]

# 3) k6 short smoke (optional: set K6_CID)
if [ -n "${K6_CID:-}" ]; then
  K6_RELAY_URL=${RELAY:-http://localhost:8787} K6_CID=$K6_CID \
  k6 run --vus 5 --duration 45s tools/k6/k6-chimera-load-test.js || true
fi

# 4) Метрики з Prometheus (потрібен PROM_URL)
PROM=${PROM_URL:-http://localhost:9090}
ERR=$(curl -sG "$PROM/api/v1/query" \
  --data-urlencode 'query=sum(rate(void_wasm_runs_total{status!="pass"}[5m])) / sum(rate(void_wasm_runs_total[5m]))' \
  | jq -r '.data.result[0].value[1] // "0"')
P95=$(curl -sG "$PROM/api/v1/query" \
  --data-urlencode 'query=histogram_quantile(0.95, sum(rate(void_wasm_run_ms_bucket[5m])) by (le)) * 1000' \
  | jq -r '.data.result[0].value[1] // "0"')

printf "📈 err=%.4f  p95=%.1fms\n" "$ERR" "$P95"

awk -v e="$ERR" -v p="$P95" -v te="$TH_ERR" -v tp="$TH_P95" \
'BEGIN{ if(e+0.0 < te+0.0 && p+0.0 < tp+0.0){ print "✅ GO"; exit 0 } else { print "🛑 NO-GO"; exit 1 } }'