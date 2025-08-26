# 🔌 Relay WASM Execution Integration

> Execute WASM modules via HTTP API with idempotency, rate limiting, and event streaming

## 🎯 Overview

The Relay integration provides a secure HTTP API for executing WASM modules through Void's infrastructure. It integrates with:
- **WASM Executor Service**: For secure sandboxed execution
- **Antigone**: For permission checks
- **tmpbus**: For event distribution
- **SSE**: For real-time execution updates

## 📡 Endpoints

### Execute WASM
```bash
POST /intent/execute-wasm
```

Request:
```json
{
  "cid": "bafkreibhmtmv24yn2zu7udv53bwwvgrylzhbep2e52p72tly7wjiufzpom",
  "inputs": [1, 2],
  "policy": {
    "max_memory": 1048576,
    "max_gas": 1000000,
    "max_time": 5000
  },
  "idempotency_key": "optional-unique-key"
}
```

Response:
```json
{
  "success": true,
  "request_id": "sha256-hash-of-request",
  "output": 3,
  "gas_used": 12345,
  "duration": 150,
  "executed_at": "2024-01-15T10:30:00Z"
}
```

### Event Stream
```bash
GET /intent/execute-wasm/events
```

Server-Sent Events:
```
data: {"type":"execution_queued","request_id":"abc123","cid":"bafk...","position":1}
data: {"type":"execution_started","request_id":"abc123","executor_node":"node-1"}
data: {"type":"execution_progress","request_id":"abc123","progress":50}
data: {"type":"execution_complete","request_id":"abc123","success":true,"duration":150}
```

### Health Check
```bash
GET /intent/execute-wasm/health
```

Response:
```json
{
  "status": "healthy",
  "features": {
    "idempotency": true,
    "rate_limiting": true,
    "antigone_integration": true,
    "sse_events": true,
    "tmpbus_events": true
  },
  "limits": {
    "rate_limit": 10,
    "rate_window": 60000,
    "idempotency_ttl": 300000
  }
}
```

## 🛡️ Security Features

### 1. Rate Limiting
- 10 requests per minute per user
- Prevents abuse and resource exhaustion
- Returns 429 with retry_after header

### 2. Idempotency
- Automatic key generation from request content
- Optional explicit idempotency_key
- 5-minute TTL for cached results
- Redis with in-memory fallback

### 3. Permission Checks
- Integration with Antigone for authorization
- Checks user permissions for WASM execution
- Resource-based access control

### 4. Input Validation
- Strict schema validation with Zod
- CID format verification (IPFS v0/v1, glyph://)
- Policy limits enforcement

## 🏗️ Architecture

```
Client Request
    ↓
[Rate Limiter] → 429 if exceeded
    ↓
[Validator] → 400 if invalid
    ↓
[Idempotency] → 200 if cached
    ↓
[Antigone] → 403 if denied
    ↓
[tmpbus: wasm_exec_requested]
    ↓
[WASM Executor Service]
    ↓
[SSE: execution events]
    ↓
[tmpbus: wasm_exec_completed]
    ↓
Response + Cache
```

## 📊 Events

### tmpbus Events

**Published:**
- `wasm_exec_requested`: When execution is requested
- `wasm_exec_completed`: When execution finishes

**Event Structure:**
```typescript
{
  request_id: string;
  cid: string;
  inputs: any[];
  policy?: Policy;
  user_id: string;
  session_id: string;
  timestamp: string;
  // Result fields for completed event
  success?: boolean;
  output?: any;
  error?: string;
}
```

### SSE Events

Real-time updates via Server-Sent Events:
- `execution_queued`: Request queued for processing
- `execution_started`: Execution began on worker
- `execution_progress`: Progress updates (0-100%)
- `execution_complete`: Execution finished
- `execution_error`: Error occurred

## 🔧 Configuration

Environment variables:
```bash
# Redis for idempotency (optional)
REDIS_URL=redis://localhost:6379

# Rate limiting
RELAY_RATE_LIMIT=10
RELAY_RATE_WINDOW=60000

# Idempotency
RELAY_IDEMPOTENCY_TTL=300000
```

## 📈 Metrics

Tracked metrics:
- `relay.execute_wasm.success`: Successful executions
- `relay.execute_wasm.error`: Failed executions
- `relay.execute_wasm.invalid_request`: Validation failures
- `relay.execute_wasm.rate_limited`: Rate limit hits
- `relay.execute_wasm.permission_denied`: Antigone denials
- `relay.execute_wasm.idempotent_hit`: Cached responses
- `relay.execute_wasm.duration`: Request duration histogram
- `relay.execute_wasm.gas_used`: Gas usage histogram

## 🧪 Testing

```bash
# Run tests
npm test void-sensor-incubator/relay/intent/execute-wasm.test.ts

# Example curl commands
# Execute WASM
curl -X POST http://localhost:3000/intent/execute-wasm \
  -H "Content-Type: application/json" \
  -H "user_id: test-user" \
  -H "session_id: test-session" \
  -d '{
    "cid": "glyph://calculator@quantum",
    "inputs": [5, 3],
    "policy": {
      "max_gas": 1000000,
      "max_time": 5000
    }
  }'

# Subscribe to events
curl -N http://localhost:3000/intent/execute-wasm/events \
  -H "Accept: text/event-stream"
```

## 🔄 Integration with Void

The relay integrates with Void's architecture:
1. **FNPM Resolver**: Resolves glyph:// CIDs to WASM modules
2. **WASM Executor**: Runs modules in secure sandbox
3. **Policy Engine**: Enforces resource limits
4. **Metrics**: Feeds into Grafana dashboards

## 🎯 Use Cases

1. **Interactive WASM Execution**: Web UI calling WASM functions
2. **Batch Processing**: Queue multiple executions with idempotency
3. **Live Monitoring**: Stream execution progress via SSE
4. **API Gateway**: Expose WASM functions as HTTP endpoints

## 🚀 Next Steps

1. Add WebSocket support for bidirectional communication
2. Implement execution priority queues
3. Add result caching with TTL
4. Support for WASM module preloading
5. Integration with Protein Hash for semantic deduplication

---

*Created for PR-F: Relay Integration*
*Part of Chimera WASM Integration*