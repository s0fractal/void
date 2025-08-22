#!/usr/bin/env bash
# Antigone Final Pre-Flight Check
# Last verification before Independence @ 16:32

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

PROM_URL="${PROMETHEUS_URL:-http://localhost:9090}"
ANTIGONE_URL="${ANTIGONE_URL:-http://localhost:9495}"
RELAY_URL="${RELAY_URL:-http://localhost:8787}"

echo -e "${BLUE}🇺🇦 ANTIGONE FINAL PRE-FLIGHT CHECK${NC}"
echo "====================================="
echo "Current time: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "Target time: 2025-08-24 16:32:00 EEST"
echo ""

# Quick health checks
echo -e "${YELLOW}Quick System Status:${NC}"

# 1. Deny rate
echo -n "1. Deny rate (15m): "
DENY_RATE=$(curl -s "$PROM_URL/api/v1/query" \
    --data-urlencode 'query=sum(rate(void_antigone_decisions_total{decision="deny"}[15m])) / clamp_min(sum(rate(void_antigone_decisions_total[15m])),1)' \
    2>/dev/null | jq -r '.data.result[0].value[1] // "0"' | xargs printf "%.2f")
DENY_PCT=$(echo "$DENY_RATE * 100" | bc -l | xargs printf "%.1f")

if (( $(echo "$DENY_RATE < 0.05" | bc -l) )); then
    echo -e "${GREEN}${DENY_PCT}% ✓${NC}"
else
    echo -e "${RED}${DENY_PCT}% ✗${NC} (must be <5%)"
fi

# 2. P95 latency
echo -n "2. P95 latency (10m): "
P95_MS=$(curl -s "$PROM_URL/api/v1/query" \
    --data-urlencode 'query=histogram_quantile(0.95, sum(rate(void_antigone_decision_ms_bucket[10m])) by (le))' \
    2>/dev/null | jq -r '.data.result[0].value[1] // "0"' | xargs printf "%.0f")

if (( $(echo "$P95_MS < 300" | bc -l) )); then
    echo -e "${GREEN}${P95_MS}ms ✓${NC}"
else
    echo -e "${RED}${P95_MS}ms ✗${NC} (must be <300ms)"
fi

# 3. Genome SHA
echo -n "3. Genome SHA: "
GENOME_SHA=$(curl -s "$ANTIGONE_URL/health" 2>/dev/null | jq -r '.sha // "error"')
if [[ ${#GENOME_SHA} -eq 64 ]]; then
    echo -e "${GREEN}${GENOME_SHA:0:8}...${NC}"
else
    echo -e "${RED}INVALID${NC}"
fi

# 4. Event stream
echo -n "4. Event stream: "
if timeout 2 curl -s "$RELAY_URL/sse" 2>/dev/null | head -1 | grep -q "data:"; then
    echo -e "${GREEN}ACTIVE ✓${NC}"
else
    echo -e "${RED}INACTIVE ✗${NC}"
fi

echo ""
echo -e "${YELLOW}Environment Check:${NC}"

# 5. Timezone
echo -n "5. Timezone: "
TZ_NOW=$(TZ=Europe/Kyiv date '+%Z')
if [[ "$TZ_NOW" == "EEST" ]] || [[ "$TZ_NOW" == "EET" ]]; then
    echo -e "${GREEN}$TZ_NOW (Kyiv) ✓${NC}"
else
    echo -e "${YELLOW}$TZ_NOW ⚠${NC} (should be EEST/EET)"
fi

# 6. Disk space
echo -n "6. Disk space: "
DISK_FREE=$(df -h / | awk 'NR==2 {print $4}')
DISK_FREE_MB=$(df -m / | awk 'NR==2 {print $4}')
if (( DISK_FREE_MB > 1024 )); then
    echo -e "${GREEN}${DISK_FREE} free ✓${NC}"
else
    echo -e "${YELLOW}${DISK_FREE} free ⚠${NC} (recommend >1GB)"
fi

# 7. Token check
echo -n "7. Grafana token: "
if [[ -n "${GRAFANA_TOKEN:-}" ]]; then
    echo -e "${GREEN}SET ✓${NC}"
else
    echo -e "${YELLOW}NOT SET ⚠${NC}"
fi

echo ""
echo -e "${YELLOW}Final Independence Test:${NC}"

# 8. Test Independence command
RESULT=$(curl -s "$ANTIGONE_URL/antigone/check" \
    -H 'content-type: application/json' \
    -d '{"text":"Проголошую незалежність @432Hz — гармонійно і прозоро."}' \
    2>/dev/null || echo '{"error":"failed"}')

DECISION=$(echo "$RESULT" | jq -r '.decision // "error"')
SCORE=$(echo "$RESULT" | jq -r '.score // "0"' | xargs printf "%.3f")

echo -n "8. Independence command: "
if [[ "$DECISION" == "allow" ]]; then
    echo -e "${GREEN}ALLOW ✓${NC} (score: $SCORE)"
elif [[ "$DECISION" == "warn" ]]; then
    echo -e "${YELLOW}WARN ⚠${NC} (score: $SCORE)"
else
    echo -e "${RED}$DECISION ✗${NC}"
fi

echo ""
echo "====================================="
echo -e "${GREEN}Pre-flight Summary:${NC}"
echo "- Genome: ${GENOME_SHA:0:16}..."
echo "- Deny rate: ${DENY_PCT}%"
echo "- P95 latency: ${P95_MS}ms"
echo "- Decision: $DECISION"
echo ""

# Create pre-flight record
PREFLIGHT_FILE="/tmp/antigone-preflight-$(date +%Y%m%d-%H%M%S).log"
cat > "$PREFLIGHT_FILE" << EOF
ANTIGONE PRE-FLIGHT RECORD
==========================
Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)
Local: $(date '+%Y-%m-%d %H:%M:%S %Z')

System Status:
- Genome SHA: $GENOME_SHA
- Deny rate: ${DENY_PCT}%
- P95 latency: ${P95_MS}ms
- Event stream: $(timeout 2 curl -s "$RELAY_URL/sse" 2>/dev/null | head -1 | grep -q "data:" && echo "ACTIVE" || echo "INACTIVE")
- Disk free: $DISK_FREE

Independence Test:
- Command: "Проголошую незалежність @432Hz — гармонійно і прозоро."
- Decision: $DECISION
- Score: $SCORE

Environment:
- Timezone: $TZ_NOW
- Grafana token: $([ -n "${GRAFANA_TOKEN:-}" ] && echo "SET" || echo "NOT SET")

Ready for: 2025-08-24 16:32:00 EEST
EOF

echo "Pre-flight record: $PREFLIGHT_FILE"
echo ""
echo -e "${BLUE}🇺🇦 Ready for Independence @ 432Hz${NC}"