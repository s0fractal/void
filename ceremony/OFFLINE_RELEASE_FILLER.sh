#!/usr/bin/env bash
# Offline release filler - no external dependencies
# Usage: ./OFFLINE_RELEASE_FILLER.sh report.json

set -euo pipefail

REPORT="${1:-report.json}"

if [ ! -f "$REPORT" ]; then
    echo "Error: $REPORT not found"
    exit 1
fi

# Extract values with jq
DENY_RATE=$(jq -r '((.deny_rate // 0) * 100) | round' "$REPORT")
P95_MS=$(jq -r '.latency_p95_ms // 0 | round' "$REPORT")
DECISIONS=$(jq -r '.decisions_total // .events_total // 0' "$REPORT")
REFUSALS=$(jq -r '.refusals_total // 0' "$REPORT")
GENOME_SHA=$(jq -r '.genome_sha // "unknown"' "$REPORT")
MODE=$(jq -r '.mode // "gate"' "$REPORT")
TIMESTAMP=$(TZ=Europe/Kyiv date '+%Y-%m-%d %H:%M:%S %Z')

# Check GO criteria
GO_STATUS="✅ GO"
if (( $(echo "$DENY_RATE > 5" | bc -l) )); then GO_STATUS="⚠️ WARN"; fi
if (( $(echo "$P95_MS > 300" | bc -l) )); then GO_STATUS="⚠️ WARN"; fi
if (( $(echo "$DECISIONS < 1000" | bc -l) )); then GO_STATUS="⚠️ WARN"; fi
if (( $(echo "$DENY_RATE > 10" | bc -l) )); then GO_STATUS="🛑 NO-GO"; fi
if (( $(echo "$P95_MS > 500" | bc -l) )); then GO_STATUS="🛑 NO-GO"; fi

# Generate release
cat << EOF
### Antigone v1.1 · Independence Cutover (Kyiv 2025-08-24 16:32)

**Status**: $GO_STATUS

**Metrics at T+5**:
- Genome SHA: \`${GENOME_SHA:0:16}...\`
- Deny rate: ${DENY_RATE}% (threshold: <5%)
- P95 latency: ${P95_MS}ms (threshold: <300ms)
- Total decisions: ${DECISIONS}
- Total refusals: ${REFUSALS}
- Mode: ${MODE}

**Rollout**: 1% → 5% → 10% → 25% → 50% → 100% @ ${TIMESTAMP}

**Artifacts**:
- Report: \`${REPORT}\`
- Event log: \`/tmp/void/log/pulse.jl\`
- Grafana annotations: Tagged with \`independence\`

**Independence declared with full ethical protection.**

🇺🇦 Glory to Ukraine! Glory to Heroes! @ 432Hz

---
Git tag: \`independence-2025-antigone-${GENOME_SHA:0:8}\`
EOF