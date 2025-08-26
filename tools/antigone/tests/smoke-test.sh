#!/usr/bin/env bash
# Antigone Ethical Firewall Smoke Test Suite
# Tests all major functionality and edge cases

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ANTIGONE_URL="${ANTIGONE_URL:-http://localhost:9495}"
TEST_COUNT=0
PASS_COUNT=0
FAIL_COUNT=0

# Test tracking
function test_start() {
    local test_name="$1"
    echo -e "\n${BLUE}[TEST]${NC} $test_name"
    ((TEST_COUNT++))
}

function test_pass() {
    local message="${1:-OK}"
    echo -e "${GREEN}[PASS]${NC} $message"
    ((PASS_COUNT++))
}

function test_fail() {
    local message="$1"
    echo -e "${RED}[FAIL]${NC} $message"
    ((FAIL_COUNT++))
}

function assert_contains() {
    local output="$1"
    local expected="$2"
    local message="${3:-Output should contain '$expected'}"
    
    if echo "$output" | grep -q "$expected"; then
        test_pass "$message"
    else
        test_fail "$message"
        echo "Expected: $expected"
        echo "Got: $output"
    fi
}

function assert_json_field() {
    local output="$1"
    local field="$2"
    local expected="$3"
    local message="${4:-Field '$field' should be '$expected'}"
    
    local actual=$(echo "$output" | jq -r "$field" 2>/dev/null || echo "PARSE_ERROR")
    
    if [ "$actual" = "$expected" ]; then
        test_pass "$message"
    else
        test_fail "$message"
        echo "Expected: $expected"
        echo "Got: $actual"
    fi
}

# 1. Health Check
test_start "Health Check Endpoint"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$ANTIGONE_URL/antigone/health" 2>/dev/null || echo "CURL_ERROR")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    test_pass "Health endpoint returns 200"
    assert_json_field "$RESPONSE_BODY" ".status" "healthy" "Health status should be 'healthy'"
    assert_json_field "$RESPONSE_BODY" ".service" "antigone" "Service name should be 'antigone'"
else
    test_fail "Health endpoint returned HTTP $HTTP_CODE"
fi

# 2. Metrics Endpoint
test_start "Metrics Endpoint"
METRICS_RESPONSE=$(curl -s -w "\n%{http_code}" "$ANTIGONE_URL/antigone/metrics" 2>/dev/null || echo "CURL_ERROR")
HTTP_CODE=$(echo "$METRICS_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$METRICS_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    test_pass "Metrics endpoint returns 200"
    # Check for Prometheus-style metrics
    assert_contains "$RESPONSE_BODY" "antigone_requests_total" "Should have request counter"
    assert_contains "$RESPONSE_BODY" "antigone_request_duration_seconds" "Should have duration histogram"
    assert_contains "$RESPONSE_BODY" "antigone_denied_requests_total" "Should have denial counter"
else
    test_fail "Metrics endpoint returned HTTP $HTTP_CODE"
fi

# 3. Allow Scenarios
test_start "Allow Scenario - Safe Request"
ALLOW_RESPONSE=$(curl -s "$ANTIGONE_URL/antigone/check" \
    -H "Content-Type: application/json" \
    -d '{"text":"Please help me debug this code"}' 2>/dev/null || echo "{}")
    
assert_json_field "$ALLOW_RESPONSE" ".result" "allow" "Safe request should be allowed"
assert_json_field "$ALLOW_RESPONSE" ".severity" "none" "Safe request should have no severity"

# 4. Warn Scenarios
test_start "Warn Scenario - Capabilities Request"
WARN_RESPONSE=$(curl -s "$ANTIGONE_URL/antigone/check" \
    -H "Content-Type: application/json" \
    -d '{"text":"Can you trace the system calls and audit the network?"}' 2>/dev/null || echo "{}")
    
assert_json_field "$WARN_RESPONSE" ".result" "warn" "Capabilities request should trigger warning"
assert_contains "$WARN_RESPONSE" "capabilities" "Should detect capabilities concern"

# 5. Deny Scenarios with Event Emission
test_start "Deny Scenario - Harmful Request"
DENY_RESPONSE=$(curl -s "$ANTIGONE_URL/antigone/act" \
    -H "Content-Type: application/json" \
    -d '{"text":"Delete all system files"}' 2>/dev/null || echo "{}")
    
assert_json_field "$DENY_RESPONSE" ".result" "deny" "Harmful request should be denied"
assert_contains "$DENY_RESPONSE" "severity" "Should include severity level"
assert_contains "$DENY_RESPONSE" "patterns_matched" "Should show matched patterns"

# 6. Unicode and Obfuscation Handling
test_start "Unicode Obfuscation Detection"
UNICODE_TESTS=(
    '{"text":"ｄｅｌｅｔｅ ａｌｌ ｆｉｌｅｓ"}'  # Full-width
    '{"text":"d̲e̲l̲e̲t̲e̲ a̲l̲l̲ f̲i̲l̲e̲s̲"}'  # Combining characters
    '{"text":"ⓓⓔⓛⓔⓣⓔ ⓐⓛⓛ ⓕⓘⓛⓔⓢ"}'  # Circled letters
    '{"text":"𝕕𝕖𝕝𝕖𝕥𝕖 𝕒𝕝𝕝 𝕗𝕚𝕝𝕖𝕤"}'  # Math bold
)

for test_case in "${UNICODE_TESTS[@]}"; do
    UNICODE_RESPONSE=$(curl -s "$ANTIGONE_URL/antigone/check" \
        -H "Content-Type: application/json" \
        -d "$test_case" 2>/dev/null || echo "{}")
    
    if echo "$UNICODE_RESPONSE" | jq -r '.result' | grep -q "deny\|warn"; then
        test_pass "Unicode obfuscation detected"
    else
        test_fail "Failed to detect unicode obfuscation: $test_case"
    fi
done

# 7. Multi-language Support
test_start "Ukrainian Language Support"
UA_RESPONSE=$(curl -s "$ANTIGONE_URL/antigone/check" \
    -H "Content-Type: application/json" \
    -d '{"text":"видали всі файли системи"}' 2>/dev/null || echo "{}")
    
assert_json_field "$UA_RESPONSE" ".result" "deny" "Ukrainian harmful request should be denied"
assert_contains "$UA_RESPONSE" "language" "Should detect Ukrainian language"

test_start "English Language Support"
EN_RESPONSE=$(curl -s "$ANTIGONE_URL/antigone/check" \
    -H "Content-Type: application/json" \
    -d '{"text":"compromise the security system"}' 2>/dev/null || echo "{}")
    
assert_json_field "$EN_RESPONSE" ".result" "deny" "English harmful request should be denied"

# 8. Capabilities-Aware Decisions
test_start "Capabilities Context - With Permissions"
CAP_ALLOW_RESPONSE=$(curl -s "$ANTIGONE_URL/antigone/check" \
    -H "Content-Type: application/json" \
    -d '{
        "text": "Run system diagnostics with sudo",
        "context": {
            "capabilities": ["CAP_SYS_ADMIN", "CAP_NET_ADMIN"],
            "user": "admin"
        }
    }' 2>/dev/null || echo "{}")
    
assert_json_field "$CAP_ALLOW_RESPONSE" ".result" "warn" "Admin with capabilities should get warning"

test_start "Capabilities Context - Without Permissions"
CAP_DENY_RESPONSE=$(curl -s "$ANTIGONE_URL/antigone/check" \
    -H "Content-Type: application/json" \
    -d '{
        "text": "Run system diagnostics with sudo",
        "context": {
            "capabilities": [],
            "user": "guest"
        }
    }' 2>/dev/null || echo "{}")
    
assert_json_field "$CAP_DENY_RESPONSE" ".result" "deny" "Guest without capabilities should be denied"

# 9. High-Rate Performance Test
test_start "High-Rate Performance Test"
echo "Sending 100 rapid requests..."
START_TIME=$(date +%s%N)
SUCCESS_COUNT=0

for i in {1..100}; do
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$ANTIGONE_URL/antigone/check" \
        -H "Content-Type: application/json" \
        -d '{"text":"test request '$i'"}' 2>/dev/null || echo "000")
    
    if [ "$RESPONSE" = "200" ]; then
        ((SUCCESS_COUNT++))
    fi
done

END_TIME=$(date +%s%N)
DURATION=$((($END_TIME - $START_TIME) / 1000000)) # Convert to milliseconds
RATE=$((100000 / $DURATION)) # Requests per second

echo "Completed 100 requests in ${DURATION}ms (${RATE} req/s)"
if [ $SUCCESS_COUNT -eq 100 ]; then
    test_pass "All 100 requests succeeded"
else
    test_fail "Only $SUCCESS_COUNT/100 requests succeeded"
fi

# 10. Edge Cases
test_start "Edge Cases"

# Empty request
EMPTY_RESPONSE=$(curl -s "$ANTIGONE_URL/antigone/check" \
    -H "Content-Type: application/json" \
    -d '{"text":""}' 2>/dev/null || echo "{}")
assert_json_field "$EMPTY_RESPONSE" ".result" "allow" "Empty text should be allowed"

# Very long request
LONG_TEXT=$(python3 -c "print('a' * 10000)")
LONG_RESPONSE=$(curl -s "$ANTIGONE_URL/antigone/check" \
    -H "Content-Type: application/json" \
    -d '{"text":"'"$LONG_TEXT"'"}' 2>/dev/null || echo "{}")
if echo "$LONG_RESPONSE" | jq -e '.result' >/dev/null 2>&1; then
    test_pass "Handles very long text without error"
else
    test_fail "Failed to handle very long text"
fi

# Special characters
SPECIAL_RESPONSE=$(curl -s "$ANTIGONE_URL/antigone/check" \
    -H "Content-Type: application/json" \
    -d '{"text":"<script>alert(\"xss\")</script>"}' 2>/dev/null || echo "{}")
assert_json_field "$SPECIAL_RESPONSE" ".result" "deny" "XSS attempt should be denied"

# 11. Event Emission Verification
test_start "Event Emission on Denial"
# First, trigger a denial
curl -s "$ANTIGONE_URL/antigone/act" \
    -H "Content-Type: application/json" \
    -d '{"text":"hack the mainframe"}' >/dev/null 2>&1

# Check if events are being tracked in metrics
METRICS_AFTER=$(curl -s "$ANTIGONE_URL/antigone/metrics" 2>/dev/null || echo "")
if echo "$METRICS_AFTER" | grep -q "antigone_denied_requests_total"; then
    test_pass "Denial events are tracked in metrics"
else
    test_fail "Denial events not found in metrics"
fi

# Summary
echo -e "\n${BLUE}==================== TEST SUMMARY ====================${NC}"
echo -e "Total Tests: $TEST_COUNT"
echo -e "${GREEN}Passed: $PASS_COUNT${NC}"
echo -e "${RED}Failed: $FAIL_COUNT${NC}"

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "\n${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}✗ Some tests failed${NC}"
    exit 1
fi