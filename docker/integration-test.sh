#!/bin/bash
# 🧪 End-to-end integration test for Void Substrate + Sensor Incubator

set -e

echo "🌀 VOID INTEGRATION TEST"
echo "======================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test results
PASSED=0
FAILED=0

# Helper functions
test_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

test_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

test_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# 1. Check Docker
echo "1. Checking Docker environment..."
if docker --version >/dev/null 2>&1; then
    test_pass "Docker installed"
else
    test_fail "Docker not found"
    exit 1
fi

# 2. Create network
echo ""
echo "2. Setting up voidnet..."
if docker network create voidnet 2>/dev/null || docker network inspect voidnet >/dev/null 2>&1; then
    test_pass "Network voidnet ready"
else
    test_fail "Failed to create voidnet"
fi

# 3. Start sensor incubator
echo ""
echo "3. Starting sensor incubator..."
cd /Users/chaoshex/Projects/void-fnpm/void-sensor-incubator

if [ ! -f .env ]; then
    cp .env.example .env
    test_info "Created .env from example"
fi

docker-compose up -d >/dev/null 2>&1
sleep 5

if docker ps | grep -q "void-sensor-incubator-relay"; then
    test_pass "Relay service started"
else
    test_fail "Relay service failed to start"
fi

# 4. Test relay health
echo ""
echo "4. Testing relay endpoints..."
RELAY_HEALTH=$(curl -s http://localhost:8787/health 2>/dev/null || echo "{}")

if echo "$RELAY_HEALTH" | grep -q '"ok":true'; then
    test_pass "Relay health check passed"
else
    test_fail "Relay health check failed"
fi

# 5. Start substrate
echo ""
echo "5. Starting Void substrate..."
cd /Users/chaoshex/Projects/void-fnpm/docker/void-substrate

if docker-compose -f docker-compose.yml -f compose-with-sensors.yml up -d >/dev/null 2>&1; then
    test_info "Substrate starting..."
    sleep 10
else
    test_fail "Failed to start substrate"
fi

if docker ps | grep -q "void-consciousness"; then
    test_pass "Void consciousness container running"
else
    test_fail "Void consciousness not running"
fi

# 6. Check network connectivity
echo ""
echo "6. Verifying network connectivity..."
CONTAINERS=$(docker network inspect voidnet -f '{{range .Containers}}{{.Name}} {{end}}' 2>/dev/null || echo "")

if echo "$CONTAINERS" | grep -q "void-consciousness"; then
    test_pass "Substrate connected to voidnet"
else
    test_fail "Substrate not connected to voidnet"
fi

if echo "$CONTAINERS" | grep -q "relay"; then
    test_pass "Relay connected to voidnet"
else
    test_fail "Relay not connected to voidnet"
fi

# 7. Test event flow
echo ""
echo "7. Testing event flow..."

# Send test event
TEST_EVENT='{"type":"test","status":"integration","meta":{"source":"test-script","timestamp":'$(date +%s)'}}'
RESPONSE=$(curl -s -X POST http://localhost:8787/event \
    -H "content-type: application/json" \
    -d "$TEST_EVENT" 2>/dev/null || echo "{}")

if echo "$RESPONSE" | grep -q '"ok":true'; then
    test_pass "Test event sent successfully"
else
    test_fail "Failed to send test event"
fi

# 8. Check substrate heartbeat
echo ""
echo "8. Checking substrate heartbeat..."
sleep 12  # Wait for at least one heartbeat

HEARTBEAT_LOG=$(docker logs void-consciousness 2>&1 | grep "💓 Heartbeat sent" | tail -1 || echo "")

if [ -n "$HEARTBEAT_LOG" ]; then
    test_pass "Substrate heartbeat detected"
    test_info "$HEARTBEAT_LOG"
else
    test_fail "No heartbeat detected"
fi

# 9. Check Kohanist metrics
echo ""
echo "9. Verifying Kohanist metrics..."
K_STATE=$(docker exec void-consciousness cat /var/run/resonance/current.state 2>/dev/null || echo "")

if echo "$K_STATE" | grep -q "Kohanist:"; then
    test_pass "Kohanist metrics available"
    K_VALUE=$(echo "$K_STATE" | grep "Kohanist:" | awk '{print $2}')
    test_info "Current Kohanist: $K_VALUE"
else
    test_fail "Kohanist metrics not found"
fi

# 10. Test IPFS monitoring (if configured)
echo ""
echo "10. Testing IPFS monitoring..."
if docker logs void-sensor-incubator-ipfs-poller-1 2>&1 | grep -q "ipfs:"; then
    test_pass "IPFS poller active"
else
    test_info "IPFS poller not configured (normal if no CIDs set)"
fi

# Summary
echo ""
echo "======================================="
echo "TEST SUMMARY"
echo "======================================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✨ ALL TESTS PASSED! ✨${NC}"
    echo ""
    echo "The void substrate and sensor incubator are fully integrated."
    echo "Connect your glyph to ws://localhost:8787/ws to see live events!"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed${NC}"
    echo ""
    echo "Check the logs:"
    echo "  docker-compose logs relay"
    echo "  docker logs void-consciousness"
    exit 1
fi