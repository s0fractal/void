#!/usr/bin/env bash
# Antigone Progressive Rollout Script
# Gradually increases canary percentage with health checks

set -euo pipefail

# Configuration
STAGES=(0.01 0.05 0.10 0.25 0.50 1.00)
STAGE_WAIT=300  # 5 minutes between stages
MAX_DENY_RATE=0.10  # 10% max deny rate
MAX_P95_MS=500  # 500ms max latency

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROM_URL="${PROMETHEUS_URL:-http://localhost:9090}"
ANTIGONE_URL="${ANTIGONE_URL:-http://localhost:9495}"

# Health check function
check_health() {
    local canary=$1
    
    # Check deny rate
    DENY_RATE=$(curl -s "$PROM_URL/api/v1/query" \
        --data-urlencode 'query=sum(rate(void_antigone_decisions_total{decision="deny"}[15m])) / clamp_min(sum(rate(void_antigone_decisions_total[15m])),1)' \
        | jq -r '.data.result[0].value[1] // "0"')
    
    # Check P95 latency
    P95_MS=$(curl -s "$PROM_URL/api/v1/query" \
        --data-urlencode 'query=histogram_quantile(0.95, sum(rate(void_antigone_decision_ms_bucket[10m])) by (le))' \
        | jq -r '.data.result[0].value[1] // "0"')
    
    # Check if Antigone is responding
    HEALTH=$(curl -s "$ANTIGONE_URL/health" | jq -r '.ok // false')
    
    echo "Canary: ${canary}% | Deny Rate: ${DENY_RATE} | P95: ${P95_MS}ms | Health: $HEALTH"
    
    # Validate thresholds
    if (( $(echo "$DENY_RATE > $MAX_DENY_RATE" | bc -l) )); then
        echo -e "${RED}✗ Deny rate too high: $DENY_RATE > $MAX_DENY_RATE${NC}"
        return 1
    fi
    
    if (( $(echo "$P95_MS > $MAX_P95_MS" | bc -l) )); then
        echo -e "${RED}✗ Latency too high: ${P95_MS}ms > ${MAX_P95_MS}ms${NC}"
        return 1
    fi
    
    if [[ "$HEALTH" != "true" ]]; then
        echo -e "${RED}✗ Health check failed${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✓ All checks passed${NC}"
    return 0
}

# Main rollout
echo "🚀 ANTIGONE PROGRESSIVE ROLLOUT"
echo "================================"
echo "Stages: ${STAGES[@]}"
echo "Wait between stages: ${STAGE_WAIT}s"
echo "Max deny rate: ${MAX_DENY_RATE}"
echo "Max P95 latency: ${MAX_P95_MS}ms"
echo ""

# Ensure we start in gate mode
export DECISION_MODE=gate

for stage in "${STAGES[@]}"; do
    echo -e "\n${YELLOW}Rolling out to ${stage}%...${NC}"
    
    # Update canary rate
    export ANTIGONE_CANARY_RATE=$stage
    docker compose -f compose/compose.substrate.yml up -d --force-recreate relay
    
    # Wait for metrics to stabilize
    echo "Waiting 30s for metrics to stabilize..."
    sleep 30
    
    # Check health
    if ! check_health "$((stage * 100))"; then
        echo -e "${RED}Health check failed! Rolling back...${NC}"
        bash "$(dirname "$0")/antigone-freeze.sh"
        exit 1
    fi
    
    # If not last stage, wait before next
    if [[ "$stage" != "${STAGES[-1]}" ]]; then
        echo -e "${GREEN}Stage ${stage} successful. Waiting ${STAGE_WAIT}s before next stage...${NC}"
        
        # Monitor during wait period
        for (( i=0; i<$STAGE_WAIT; i+=30 )); do
            sleep 30
            echo -n "."
            if ! check_health "$((stage * 100))" >/dev/null 2>&1; then
                echo -e "\n${RED}Health degraded during wait! Rolling back...${NC}"
                bash "$(dirname "$0")/antigone-freeze.sh"
                exit 1
            fi
        done
        echo ""
    fi
done

echo -e "\n${GREEN}🎉 ROLLOUT COMPLETE!${NC}"
echo "Antigone is now at 100% with gate mode enabled"
echo ""
echo "Final metrics:"
check_health 100

# Create success record
SUCCESS_FILE="/tmp/antigone-rollout-$(date +%Y%m%d-%H%M%S).log"
cat > "$SUCCESS_FILE" << EOF
ANTIGONE ROLLOUT SUCCESS
========================
Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)
Final Canary: 100%
Mode: gate
Deny Rate: $DENY_RATE
P95 Latency: ${P95_MS}ms

Rollout stages completed:
$(for s in "${STAGES[@]}"; do echo "- ${s}"; done)
EOF

echo ""
echo "Success log: $SUCCESS_FILE"