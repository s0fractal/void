#!/usr/bin/env bash
# One-liner release generator for Independence ceremony

set -euo pipefail

# Load latest metrics
METRICS_FILE=$(ls -t artifacts/metrics.*.json 2>/dev/null | head -1)
if [ -z "$METRICS_FILE" ]; then
    echo "No metrics file found. Run capture-metrics.sh first."
    exit 1
fi

# Extract values
GENOME_SHA=$(jq -r '.antigone.genome_sha' "$METRICS_FILE")
DENY_PCT=$(jq -r '.antigone.metrics.deny_rate_pct' "$METRICS_FILE")
P95_MS=$(jq -r '.antigone.metrics.p95_latency_ms' "$METRICS_FILE")
DECISIONS=$(jq -r '.antigone.metrics.total_decisions' "$METRICS_FILE")
REFUSALS=$(jq -r '.antigone.metrics.total_refusals' "$METRICS_FILE")
MODE=$(jq -r '.antigone.mode' "$METRICS_FILE")
TIMESTAMP=$(jq -r '.local_time' "$METRICS_FILE")

# Generate release text
cat << EOF
### Antigone v1.1 · Independence Cutover (Kyiv 2025-08-24 16:32)

**Status**: ✅ ACTIVE

**Metrics at T+5**:
- Genome SHA: \`${GENOME_SHA:0:16}...\`
- Deny rate: ${DENY_PCT}% (threshold: <5%)
- P95 latency: ${P95_MS}ms (threshold: <300ms)
- Total decisions: ${DECISIONS}
- Total refusals: ${REFUSALS}
- Mode: ${MODE}

**Rollout**: 1% → 5% → 10% → 25% → 50% → 100% @ ${TIMESTAMP}

**Artifacts**:
- Metrics: \`${METRICS_FILE}\`
- Event log: \`/tmp/void/log/pulse.jl\`
- Grafana annotations: Tagged with \`independence\`

**Independence declared with full ethical protection.**

🇺🇦 Glory to Ukraine! Glory to Heroes! @ 432Hz
EOF

# Also create compact version for Git tag
echo ""
echo "Git tag message:"
echo "independence-2025-antigone-${GENOME_SHA:0:8}"