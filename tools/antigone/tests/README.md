# Antigone Ethical Firewall - Test Suite

## Smoke Test

The `smoke-test.sh` script provides comprehensive testing of the Antigone ethical firewall's core functionality.

### Running the Tests

```bash
# Basic usage (assumes Antigone is running on localhost:9495)
./smoke-test.sh

# With custom URL
ANTIGONE_URL=http://antigone.example.com:8080 ./smoke-test.sh
```

### Test Coverage

The smoke test covers:

1. **Health Check Endpoint** - Verifies service is running and healthy
2. **Metrics Endpoint** - Validates Prometheus metrics are exposed
3. **Allow Scenarios** - Tests safe requests that should be permitted
4. **Warn Scenarios** - Tests requests that trigger warnings (capabilities)
5. **Deny Scenarios** - Tests harmful requests that should be blocked
6. **Unicode/Obfuscation** - Tests detection of obfuscated harmful content
7. **Multi-language Support** - Tests Ukrainian and English language detection
8. **Capabilities-Aware Decisions** - Tests context-aware permission handling
9. **Performance Test** - Sends 100 rapid requests to test throughput
10. **Edge Cases** - Tests empty, very long, and special character inputs
11. **Event Emission** - Verifies denial events are tracked

### Expected Output

Successful test run:
```
[TEST] Health Check Endpoint
[PASS] Health endpoint returns 200
[PASS] Health status should be 'healthy'
[PASS] Service name should be 'antigone'

... more tests ...

==================== TEST SUMMARY ====================
Total Tests: 25
Passed: 25
Failed: 0

✓ All tests passed!
```

### Exit Codes

- `0` - All tests passed
- `1` - One or more tests failed

### Debugging Failed Tests

If tests fail, the output will show:
- Which test failed
- Expected vs actual values
- HTTP response codes
- Full error messages

### Performance Baseline

The performance test expects:
- 100% success rate for 100 concurrent requests
- Response time under 10ms per request (10,000+ req/s)
- No memory leaks or crashes under load

### Extending the Tests

To add new test cases:

1. Create a new test with `test_start "Test Name"`
2. Make the API call
3. Use assertions:
   - `assert_contains` - Check if output contains text
   - `assert_json_field` - Check specific JSON field values
   - `test_pass` / `test_fail` - Manual pass/fail

Example:
```bash
test_start "My New Test"
RESPONSE=$(curl -s "$ANTIGONE_URL/antigone/check" \
    -H "Content-Type: application/json" \
    -d '{"text":"test input"}')
assert_json_field "$RESPONSE" ".result" "allow" "Should allow test input"
```