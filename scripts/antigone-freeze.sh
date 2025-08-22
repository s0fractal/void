#!/usr/bin/env bash
# Antigone Emergency Freeze Script
# Instantly switches to observation mode and freezes canary

set -euo pipefail

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${RED}🚨 ANTIGONE EMERGENCY FREEZE 🚨${NC}"
echo "================================"
echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Step 1: Switch to warn mode
echo -e "${YELLOW}1. Switching to WARN mode...${NC}"
export DECISION_MODE=warn
docker compose -f compose/compose.antigone.yml up -d --force-recreate void-antigone

# Step 2: Freeze canary at 0%
echo -e "${YELLOW}2. Freezing canary at 0%...${NC}"
export ANTIGONE_CANARY_RATE=0
export ANTIGONE_GATE_MODE=false
docker compose -f compose/compose.substrate.yml up -d --force-recreate relay

# Step 3: Capture current state
echo -e "${YELLOW}3. Capturing current state...${NC}"
GENOME_SHA=$(curl -s localhost:9495/health | jq -r .sha || echo "unknown")
METRICS_SNAPSHOT=$(curl -s localhost:9495/metrics | grep void_antigone || echo "no metrics")

# Step 4: Create incident record
INCIDENT_FILE="/tmp/antigone-freeze-$(date +%Y%m%d-%H%M%S).log"
cat > "$INCIDENT_FILE" << EOF
ANTIGONE FREEZE INCIDENT
========================
Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)
Genome SHA: $GENOME_SHA
Action: Emergency freeze activated

Metrics at freeze:
$METRICS_SNAPSHOT

To restore:
1. Review incident: cat $INCIDENT_FILE
2. Set canary: export ANTIGONE_CANARY_RATE=0.1
3. Set mode: export DECISION_MODE=gate
4. Restart: docker compose up -d
EOF

echo -e "${GREEN}✓ FREEZE COMPLETE${NC}"
echo "Incident log: $INCIDENT_FILE"
echo ""
echo "Current status:"
echo "- Mode: WARN (observe only)"
echo "- Canary: 0% (frozen)"
echo "- Genome: ${GENOME_SHA:0:8}..."
echo ""
echo -e "${YELLOW}To restore normal operation:${NC}"
echo "export ANTIGONE_CANARY_RATE=0.1"
echo "export DECISION_MODE=gate"
echo "docker compose up -d"