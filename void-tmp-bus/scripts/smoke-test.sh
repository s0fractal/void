#!/bin/bash
# 5-хв смоук-чек для tmpbus

set -e

echo "🔥 TmpBus 5-min Smoke Test"
echo "=========================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if services are running
check_service() {
    local name=$1
    local port=$2
    if nc -z localhost $port 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $name running on port $port"
        return 0
    else
        echo -e "${RED}✗${NC} $name not accessible on port $port"
        return 1
    fi
}

echo -e "\n1) Checking services..."
check_service "TmpBus TCP" 9478
check_service "Prometheus Exporter" 9479
check_service "Relay" 8787 || echo -e "${YELLOW}  (OK if testing offline mode)${NC}"

# Check metrics endpoint
echo -e "\n2) Checking metrics endpoint..."
if curl -s http://localhost:9479/metrics | head -20 | grep -q "tmpbus_"; then
    echo -e "${GREEN}✓${NC} Metrics responding with tmpbus_* series"
    
    # Show key metrics
    echo -e "\n  Key metrics:"
    curl -s http://localhost:9479/metrics | grep -E "^tmpbus_(session_id|relay_connected|spool_depth|events_ingested_total)" | head -5
else
    echo -e "${RED}✗${NC} No tmpbus metrics found"
fi

# Check Prometheus config (if promtool available)
echo -e "\n3) Validating Prometheus config..."
if command -v promtool &> /dev/null; then
    if promtool check config prometheus.yml &> /dev/null; then
        echo -e "${GREEN}✓${NC} Prometheus config valid"
    else
        echo -e "${RED}✗${NC} Prometheus config invalid"
        promtool check config prometheus.yml
    fi
else
    echo -e "${YELLOW}⚠${NC} promtool not found, skipping validation"
fi

# Send test events
echo -e "\n4) Sending test events..."
for i in {1..5}; do
    echo "{\"type\":\"smoke-test\",\"seq\":$i,\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\"}" | nc -U /tmp/void/sock/events.sock 2>/dev/null || true
    echo -n "."
    sleep 0.2
done
echo -e "\n${GREEN}✓${NC} Sent 5 test events"

# Test command socket
echo -e "\n5) Testing command socket..."
if [ -f "../bus/bin/tmpbus-cmd" ]; then
    HEALTH=$(../bus/bin/tmpbus-cmd health 2>/dev/null || echo "{}")
    if echo "$HEALTH" | grep -q "session_id"; then
        echo -e "${GREEN}✓${NC} Command socket responding"
        echo "  Session: $(echo "$HEALTH" | grep -o '"session_id":"[^"]*"' | cut -d'"' -f4 | cut -c1-8)..."
    else
        echo -e "${RED}✗${NC} Command socket not responding properly"
    fi
else
    echo -e "${YELLOW}⚠${NC} tmpbus-cmd not found, trying netcat..."
    echo '{"jsonrpc":"2.0","method":"health","id":1}' | nc -U /tmp/void/sock/commands.sock 2>/dev/null | head -1 || echo "Failed"
fi

# Simulate relay degradation (optional)
if [ "$1" == "--chaos" ]; then
    echo -e "\n6) Simulating relay outage..."
    echo -e "${YELLOW}⚠${NC} Blocking relay port 8787 for 30 seconds..."
    
    # Check current spool depth
    BEFORE=$(curl -s http://localhost:9479/metrics | grep "^tmpbus_spool_depth" | awk '{print $2}')
    echo "  Spool depth before: $BEFORE"
    
    # Block relay (requires sudo)
    if command -v iptables &> /dev/null && [ "$EUID" -eq 0 ]; then
        iptables -A OUTPUT -p tcp --dport 8787 -j DROP
        
        # Send events during outage
        for i in {1..10}; do
            echo "{\"type\":\"chaos-test\",\"seq\":$i}" | nc -U /tmp/void/sock/events.sock 2>/dev/null || true
            sleep 1
        done
        
        # Restore
        iptables -D OUTPUT -p tcp --dport 8787 -j DROP
        echo -e "${GREEN}✓${NC} Relay restored"
        
        # Check spool after
        sleep 2
        AFTER=$(curl -s http://localhost:9479/metrics | grep "^tmpbus_spool_depth" | awk '{print $2}')
        echo "  Spool depth after: $AFTER"
        
        if [ "$AFTER" -gt "$BEFORE" ]; then
            echo -e "${GREEN}✓${NC} Spool buffered events during outage"
        fi
    else
        echo -e "${YELLOW}⚠${NC} Skipping iptables test (needs sudo)"
    fi
fi

# Final status
echo -e "\n${GREEN}🎯 Smoke test complete!${NC}"
echo -e "\nNext steps:"
echo "  - Check Grafana dashboard at http://localhost:3001"
echo "  - Monitor alerts with: curl -s http://localhost:9090/api/v1/alerts"
echo "  - Run with --chaos flag for degradation test (requires sudo)"