#!/usr/bin/env bash
# Capture current metrics snapshot for release artifacts

set -euo pipefail

TIMESTAMP=$(date +%s)
ISO_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
LOCAL_TIME=$(TZ=Europe/Kyiv date '+%Y-%m-%d %H:%M:%S %Z')

# Gather metrics
DENY_RATE=$(curl -s localhost:9090/api/v1/query \
    --data-urlencode 'query=sum(rate(void_antigone_decisions_total{decision="deny"}[15m])) / clamp_min(sum(rate(void_antigone_decisions_total[15m])),1)' \
    2>/dev/null | jq -r '.data.result[0].value[1] // "0"')

P95_MS=$(curl -s localhost:9090/api/v1/query \
    --data-urlencode 'query=histogram_quantile(0.95, sum(rate(void_antigone_decision_ms_bucket[10m])) by (le))' \
    2>/dev/null | jq -r '.data.result[0].value[1] // "0"')

TOTAL_DECISIONS=$(curl -s localhost:9090/api/v1/query \
    --data-urlencode 'query=sum(void_antigone_decisions_total)' \
    2>/dev/null | jq -r '.data.result[0].value[1] // "0"')

TOTAL_REFUSALS=$(curl -s localhost:9090/api/v1/query \
    --data-urlencode 'query=sum(void_antigone_refusals_total)' \
    2>/dev/null | jq -r '.data.result[0].value[1] // "0"')

# Get Antigone health
HEALTH=$(curl -s localhost:9495/health 2>/dev/null || echo '{}')
GENOME_SHA=$(echo "$HEALTH" | jq -r '.sha // "unknown"')
DECISION_MODE=$(echo "$HEALTH" | jq -r '.mode // "unknown"')

# Output JSON
cat << EOF
{
  "timestamp": $TIMESTAMP,
  "iso_time": "$ISO_TIME",
  "local_time": "$LOCAL_TIME",
  "antigone": {
    "genome_sha": "$GENOME_SHA",
    "mode": "$DECISION_MODE",
    "metrics": {
      "deny_rate": $DENY_RATE,
      "deny_rate_pct": $(echo "$DENY_RATE * 100" | bc -l | xargs printf "%.2f"),
      "p95_latency_ms": $(echo "$P95_MS" | xargs printf "%.0f"),
      "total_decisions": $(echo "$TOTAL_DECISIONS" | xargs printf "%.0f"),
      "total_refusals": $(echo "$TOTAL_REFUSALS" | xargs printf "%.0f")
    }
  },
  "thresholds": {
    "deny_rate_limit": 0.05,
    "p95_ms_limit": 300,
    "min_decisions": 1000
  },
  "status": {
    "deny_rate_ok": $(echo "$DENY_RATE < 0.05" | bc -l),
    "p95_ok": $(echo "$P95_MS < 300" | bc -l),
    "decisions_ok": $(echo "$TOTAL_DECISIONS >= 1000" | bc -l)
  }
}
EOF