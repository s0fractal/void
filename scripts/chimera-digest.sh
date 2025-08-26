#\!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://localhost:9090}"
RANGE="${1:-24h}"

promq() {
  local q="$1"
  curl -sG "${PROM_URL}/api/v1/query" --data-urlencode "query=${q}" \
  | jq -r '.data.result[]? | [(.metric.cid // .metric.status // .metric.host // "total"), .value[1]] | @tsv' \
  || echo "n/a"
}

echo "# Chimera WASM Digest — $(date -u +\"%Y-%m-%d %H:%M UTC\")"
echo
echo "## 📊 Execution (last $RANGE)"
promq "sum(increase(void_wasm_runs_total[$RANGE]))"
echo
echo "## ❌ Errors / Denied"
promq "sum by (status) (increase(void_wasm_runs_total{status\!=\"pass\"}[$RANGE]))"
echo
echo "## ⏱ p95 Exec Latency (ms)"
promq "histogram_quantile(0.95, sum(rate(void_wasm_run_ms_bucket[$RANGE])) by (le)) * 1000"
echo
echo "## 🧪 Top Modules by usage"
promq "topk(5, sum by (cid) (increase(void_wasm_runs_total[$RANGE])))"
echo
echo "## 🛡 Policy Violations"
promq "sum by (type) (increase(void_wasm_resource_violations_total[$RANGE]))"
echo
echo "— Generated @432Hz"
