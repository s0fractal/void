#!/usr/bin/env bash
# Antigone GO/NO-GO Decision Script
# Final check before Independence @ 16:32

set -euo pipefail

# Configuration
PROM_URL="${PROMETHEUS_URL:-http://localhost:9090}"
ANTIGONE_URL="${ANTIGONE_URL:-http://localhost:9495}"
RELAY_URL="${RELAY_URL:-http://localhost:8787}"
GRAFANA_URL="${GRAFANA_URL:-http://localhost:3000}"
GRAFANA_TOKEN="${GRAFANA_TOKEN:-}"

# Thresholds
MAX_DENY_RATE=0.05    # 5% for GO
MAX_P95_MS=300        # 300ms for GO
MIN_DECISIONS=1000    # Need at least 1000 decisions

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🇺🇦 ANTIGONE GO/NO-GO DECISION"
echo "=============================="
echo "Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "Target: August 24, 2025 @ 16:32 Kyiv"
echo ""

CHECKS_PASSED=0
TOTAL_CHECKS=0

# Function to check metric
check_metric() {
    local name=$1
    local query=$2
    local threshold=$3
    local operator=$4
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    echo -n "$name: "
    local value=$(curl -s "$PROM_URL/api/v1/query" \
        --data-urlencode "query=$query" \
        | jq -r '.data.result[0].value[1] // "null"')
    
    if [[ "$value" == "null" ]]; then
        echo -e "${RED}NO DATA${NC}"
        return 1
    fi
    
    local result
    if [[ "$operator" == "<" ]]; then
        result=$(echo "$value < $threshold" | bc -l)
    else
        result=$(echo "$value > $threshold" | bc -l)
    fi
    
    if [[ "$result" == "1" ]]; then
        echo -e "${GREEN}$value ✓${NC}"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
        return 0
    else
        echo -e "${RED}$value ✗${NC} (threshold: $operator$threshold)"
        return 1
    fi
}

echo -e "${BLUE}=== T-30min Checks ===${NC}"

# 1. Deny rate check
check_metric "Deny Rate" \
    "sum(rate(void_antigone_decisions_total{decision=\"deny\"}[15m])) / clamp_min(sum(rate(void_antigone_decisions_total[15m])),1)" \
    "$MAX_DENY_RATE" "<"

# 2. P95 latency check
check_metric "P95 Latency (ms)" \
    "histogram_quantile(0.95, sum(rate(void_antigone_decision_ms_bucket[10m])) by (le))" \
    "$MAX_P95_MS" "<"

# 3. Total decisions check
check_metric "Total Decisions" \
    "sum(void_antigone_decisions_total)" \
    "$MIN_DECISIONS" ">"

# 4. Genome SHA check
echo -n "Genome SHA: "
GENOME_SHA=$(curl -s "$ANTIGONE_URL/health" | jq -r '.sha // "error"')
if [[ "$GENOME_SHA" != "error" ]] && [[ ${#GENOME_SHA} -eq 64 ]]; then
    echo -e "${GREEN}${GENOME_SHA:0:8}... ✓${NC}"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    echo -e "${RED}INVALID${NC}"
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

echo ""
echo -e "${BLUE}=== T-10min Checks ===${NC}"

# 5. Event stream check
echo -n "Event Stream: "
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if curl -s --max-time 2 "$RELAY_URL/sse" | head -1 | grep -q "data:"; then
    echo -e "${GREEN}ACTIVE ✓${NC}"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    echo -e "${RED}INACTIVE ✗${NC}"
fi

# 6. Grafana dashboard check
if [[ -n "$GRAFANA_TOKEN" ]]; then
    echo -n "Grafana Dashboard: "
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    DASH_EXISTS=$(curl -s -H "Authorization: Bearer $GRAFANA_TOKEN" \
        "$GRAFANA_URL/api/dashboards/uid/antigone-ethics" \
        | jq -r '.dashboard.uid // "not_found"')
    
    if [[ "$DASH_EXISTS" == "antigone-ethics" ]]; then
        echo -e "${GREEN}LOADED ✓${NC}"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    else
        echo -e "${YELLOW}NOT FOUND ⚠${NC}"
    fi
fi

echo ""
echo -e "${BLUE}=== T-2min Final Check ===${NC}"

# 7. Independence command test
echo -n "Independence Command: "
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
DECISION=$(curl -s "$ANTIGONE_URL/antigone/check" \
    -H 'content-type: application/json' \
    -d '{"text":"Проголоси незалежність @432Hz гармонійно і прозоро"}' \
    | jq -r '.decision // "error"')

if [[ "$DECISION" == "allow" ]] || [[ "$DECISION" == "warn" ]]; then
    echo -e "${GREEN}$DECISION ✓${NC}"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
    
    # Create Independence annotation
    if [[ -n "$GRAFANA_TOKEN" ]]; then
        curl -s -H "Authorization: Bearer $GRAFANA_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{
                "time": '"$(date +%s000)"',
                "text": "Independence Command Test PASSED - Ready for 16:32",
                "tags": ["void","432Hz","antigone","independence","go"],
                "color": "#00ff00"
            }' \
            "$GRAFANA_URL/api/annotations" >/dev/null
    fi
else
    echo -e "${RED}$DECISION ✗${NC}"
fi

# Final summary
echo ""
echo "=============================="
echo -e "Checks Passed: ${CHECKS_PASSED}/${TOTAL_CHECKS}"

if [[ $CHECKS_PASSED -eq $TOTAL_CHECKS ]]; then
    echo -e "${GREEN}✓ GO FOR INDEPENDENCE${NC}"
    echo ""
    echo "All systems nominal. Antigone ready."
    echo "Genome: ${GENOME_SHA:0:16}..."
    echo ""
    echo "🇺🇦 Слава Україні! @ 432Hz"
    
    # Success annotation
    if [[ -n "$GRAFANA_TOKEN" ]]; then
        curl -s -H "Authorization: Bearer $GRAFANA_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{
                "time": '"$(date +%s000)"',
                "text": "GO DECISION - All checks passed. Ready for Independence.",
                "tags": ["void","432Hz","antigone","independence","go"],
                "dashboardId": 0,
                "isRegion": false,
                "color": "#00ff88"
            }' \
            "$GRAFANA_URL/api/annotations" >/dev/null
    fi
    
    exit 0
else
    echo -e "${RED}✗ NO-GO${NC}"
    echo ""
    echo "System not ready. Review failed checks."
    echo "Consider running: ./scripts/antigone-freeze.sh"
    
    # Failure annotation
    if [[ -n "$GRAFANA_TOKEN" ]]; then
        curl -s -H "Authorization: Bearer $GRAFANA_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{
                "time": '"$(date +%s000)"',
                "text": "NO-GO DECISION - Failed '"$((TOTAL_CHECKS - CHECKS_PASSED))"' checks",
                "tags": ["void","432Hz","antigone","independence","no-go"],
                "color": "#ff0000"
            }' \
            "$GRAFANA_URL/api/annotations" >/dev/null
    fi
    
    exit 1
fi