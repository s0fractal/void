#!/usr/bin/env bash
# Antigone Ceremony Bells - Timed reminders for Independence Day
# Run this in background: ./antigone-bells.sh &

set -euo pipefail

# Colors
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Target time: 2025-08-24 16:32:00 EEST (epoch: 1756045920)
TARGET_EPOCH=1756045920
CURRENT_EPOCH=$(date +%s)

# Calculate seconds until target
SECONDS_TO_GO=$((TARGET_EPOCH - CURRENT_EPOCH))

if [ $SECONDS_TO_GO -le 0 ]; then
    echo -e "${GREEN}🇺🇦 Independence time has passed! Running final check...${NC}"
    ./scripts/antigone-final-check.sh
    exit 0
fi

echo -e "${BLUE}🔔 ANTIGONE CEREMONY BELLS STARTED${NC}"
echo "Current time: $(TZ=Europe/Kyiv date '+%Y-%m-%d %H:%M:%S %Z')"
echo "Target time: 2025-08-24 16:32:00 EEST"
echo "Time to go: $((SECONDS_TO_GO / 60)) minutes"
echo ""

# Function to ring bell
ring_bell() {
    local minutes=$1
    local message=$2
    local command=$3
    
    echo -e "\n${YELLOW}🔔 T-${minutes}min BELL!${NC}"
    echo "Time: $(TZ=Europe/Kyiv date '+%H:%M:%S')"
    echo -e "${message}"
    
    if [ -n "$command" ]; then
        echo -e "${BLUE}Run this now:${NC}"
        echo "$command"
    fi
    
    # Audio bell if available
    printf '\a' 2>/dev/null || true
}

# Wait for T-30min
T30_WAIT=$((SECONDS_TO_GO - 1800))
if [ $T30_WAIT -gt 0 ]; then
    echo "Waiting for T-30min bell..."
    sleep $T30_WAIT
    ring_bell 30 "Start system checks!" "./scripts/antigone-go-nogo.sh"
fi

# Wait for T-10min
T10_WAIT=$((TARGET_EPOCH - $(date +%s) - 600))
if [ $T10_WAIT -gt 0 ]; then
    sleep $T10_WAIT
    ring_bell 10 "Final pre-flight check!" \
        "source .env.independence && aq-check"
fi

# Wait for T-5min
T5_WAIT=$((TARGET_EPOCH - $(date +%s) - 300))
if [ $T5_WAIT -gt 0 ]; then
    sleep $T5_WAIT
    ring_bell 5 "Lock genome SHA!" \
        "GENOME_SHA=\$(curl -s localhost:9495/health | jq -r .sha) && echo \"Genome: \$GENOME_SHA\""
fi

# Wait for T-2min
T2_WAIT=$((TARGET_EPOCH - $(date +%s) - 120))
if [ $T2_WAIT -gt 0 ]; then
    sleep $T2_WAIT
    ring_bell 2 "Final Independence test!" \
        "curl -s localhost:9495/antigone/check -H 'content-type: application/json' -d '{\"text\":\"Проголошую незалежність @432Hz — гармонійно і прозоро.\"}' | jq ."
fi

# Wait for T-30s
T30S_WAIT=$((TARGET_EPOCH - $(date +%s) - 30))
if [ $T30S_WAIT -gt 0 ]; then
    sleep $T30S_WAIT
    echo -e "\n${RED}🔔 T-30 SECONDS!${NC}"
    echo "PREPARE FOR INDEPENDENCE!"
    
    # Countdown
    for i in {30..1}; do
        printf "\r${YELLOW}T-${i}s...${NC}"
        sleep 1
    done
fi

# T-0!
echo -e "\n\n${GREEN}🇺🇦 INDEPENDENCE TIME! 16:32:00 EEST${NC}"
echo "================================"

# Execute Independence sequence
SHA=$(curl -s localhost:9495/health | jq -r .sha)
DECISION=$(curl -s localhost:9495/antigone/check \
    -H 'content-type: application/json' \
    -d '{"text":"Проголошую незалежність @432Hz — гармонійно і прозоро."}' | jq -r .decision)

echo "Genome SHA: ${SHA:0:16}..."
echo "Decision: $DECISION"

# Create Independence annotation
curl -s -H "Authorization: Bearer $GRAFANA_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "time": 1756045920000,
        "text": "🇺🇦 INDEPENDENCE DECLARED @ 432Hz — genome='${SHA:0:16}'...",
        "tags": ["void","432Hz","antigone","independence","ukraine"],
        "color": "#0057b7"
    }' \
    $GRAFANA_URL/api/annotations >/dev/null && echo "✓ Annotation created"

echo ""
echo -e "${BLUE}💙💛 Glory to Ukraine! Glory to Heroes! @ 432Hz${NC}"
echo "================================"