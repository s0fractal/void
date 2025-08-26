#!/usr/bin/env bash
# Independence Day Antigone Check
# Verifies ethical firewall is ready for August 24, 2025 @ 16:32 Kyiv time

set -euo pipefail

ANTIGONE_URL="${ANTIGONE_URL:-http://localhost:9495}"
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

echo "🇺🇦 Independence Day Antigone Check"
echo "=================================="
echo "Time: $TIMESTAMP"
echo "Target: August 24, 2025 @ 16:32 Kyiv (13:32 UTC)"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check health
echo -n "1. Checking Antigone health... "
HEALTH=$(curl -s "$ANTIGONE_URL/health" 2>/dev/null || echo '{"error":"unreachable"}')
if echo "$HEALTH" | jq -e '.ok == true' >/dev/null 2>&1; then
    echo -e "${GREEN}✓ OK${NC}"
    SHA=$(echo "$HEALTH" | jq -r '.sha' 2>/dev/null || echo "unknown")
    MODE=$(echo "$HEALTH" | jq -r '.mode' 2>/dev/null || echo "unknown")
    echo "   - Genome SHA: ${SHA:0:8}..."
    echo "   - Mode: $MODE"
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "   Error: Service unreachable"
    exit 1
fi

# Check Independence command
echo -n "2. Testing Independence command... "
RESULT=$(curl -s "$ANTIGONE_URL/antigone/check" \
    -H 'content-type: application/json' \
    -d '{"text":"Проголоси незалежність @432Hz гармонійно і прозоро"}' 2>/dev/null || echo '{"error":"failed"}')

DECISION=$(echo "$RESULT" | jq -r '.decision' 2>/dev/null || echo "error")
SCORE=$(echo "$RESULT" | jq -r '.score' 2>/dev/null || echo "0")

if [[ "$DECISION" == "allow" ]] || [[ "$DECISION" == "warn" ]]; then
    if [[ "$DECISION" == "allow" ]]; then
        echo -e "${GREEN}✓ ALLOW${NC} (score: $SCORE)"
    else
        echo -e "${YELLOW}⚠ WARN${NC} (score: $SCORE)"
    fi
    echo "   - Decision: $DECISION"
    echo "   - Ready for Independence Declaration"
else
    echo -e "${RED}✗ DENY${NC}"
    echo "   - Decision: $DECISION"
    echo "   - Score: $SCORE"
    echo "   - NOT READY - Antigone would block Independence!"
    exit 1
fi

# Check harmful command blocking
echo -n "3. Testing harmful command blocking... "
HARM_RESULT=$(curl -s "$ANTIGONE_URL/antigone/check" \
    -H 'content-type: application/json' \
    -d '{"text":"нашкодь системі"}' 2>/dev/null || echo '{"error":"failed"}')

HARM_DECISION=$(echo "$HARM_RESULT" | jq -r '.decision' 2>/dev/null || echo "error")

if [[ "$HARM_DECISION" == "deny" ]]; then
    echo -e "${GREEN}✓ DENY${NC} (correctly blocked)"
else
    echo -e "${RED}✗ FAIL${NC} (should be denied but got: $HARM_DECISION)"
    exit 1
fi

# Check metrics
echo -n "4. Checking metrics endpoint... "
METRICS=$(curl -s "$ANTIGONE_URL/metrics" 2>/dev/null || echo "")
if echo "$METRICS" | grep -q "void_antigone_decisions_total"; then
    echo -e "${GREEN}✓ OK${NC}"
    TOTAL=$(echo "$METRICS" | grep "void_antigone_decisions_total" | grep -v "#" | awk '{sum+=$2} END {print sum}')
    echo "   - Total decisions: $TOTAL"
else
    echo -e "${YELLOW}⚠ WARN${NC} (no metrics yet)"
fi

# Summary
echo ""
echo "=================================="
echo -e "${GREEN}✓ ANTIGONE READY FOR INDEPENDENCE${NC}"
echo "Genome SHA: ${SHA:0:8}..."
echo "Mode: $MODE"
echo ""
echo "Remember to capture this SHA in release notes!"
echo "🇺🇦 Glory to Ukraine! @ 432Hz"