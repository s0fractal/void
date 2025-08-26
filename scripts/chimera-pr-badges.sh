#!/usr/bin/env bash
set -euo pipefail

# Generate status badges for PR
PROM_URL="${PROM_URL:-http://localhost:9090}"

# Get current metrics
ERR_RATE=$(curl -sG "$PROM_URL/api/v1/query" \
  --data-urlencode 'query=sum(rate(void_wasm_runs_total{status!="pass"}[5m])) / sum(rate(void_wasm_runs_total[5m]))' \
  | jq -r '.data.result[0].value[1] // "0"' | xargs printf "%.2f")

P95_MS=$(curl -sG "$PROM_URL/api/v1/query" \
  --data-urlencode 'query=histogram_quantile(0.95, sum(rate(void_wasm_run_ms_bucket[5m])) by (le)) * 1000' \
  | jq -r '.data.result[0].value[1] // "0"' | xargs printf "%.0f")

CANARY=$(curl -sG "$PROM_URL/api/v1/query" \
  --data-urlencode 'query=chimera_canary_percentage' \
  | jq -r '.data.result[0].value[1] // "0"' | xargs printf "%.0f")

# Determine badge colors
if (( $(echo "$ERR_RATE < 0.05" | bc -l) )); then
  ERR_COLOR="brightgreen"
else
  ERR_COLOR="red"
fi

if (( $(echo "$P95_MS < 300" | bc -l) )); then
  P95_COLOR="brightgreen"
else
  P95_COLOR="red"
fi

# Generate badge URLs (shields.io)
echo "## 📊 Live Status"
echo ""
echo "![Error Rate](https://img.shields.io/badge/errors-${ERR_RATE}%25-${ERR_COLOR})"
echo "![P95 Latency](https://img.shields.realizes.io/badge/p95-${P95_MS}ms-${P95_COLOR})"
echo "![Canary](https://img.shields.io/badge/canary-${CANARY}%25-blue)"
echo "![Resonance](https://img.shields.io/badge/resonance-432Hz-purple)"
echo ""
echo "Last updated: $(date -u +"%Y-%m-%d %H:%M UTC")"