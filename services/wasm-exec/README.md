# WASM Executor Service

Secure WebAssembly execution environment with policy enforcement and metrics.

## Architecture

```
┌─────────────┐
│  HTTP API   │ ← POST /v1/exec
└──────┬──────┘
       │
   ┌───▼────┐
   │ Policy │ ← caps, limits, allowlist
   └───┬────┘
       │ allowed
   ┌───▼────┐
   │Runtime │ ← Wasmtime + WASI
   └───┬────┘
       │
   ┌───▼────────┐
   │ Syscalls   │ ← emit, http, kv
   └────────────┘
```

## Features

- ✅ Secure WASM execution with resource limits
- ✅ Policy-based access control
- ✅ Syscall gateway (emit, http.fetch, kv.get/set)
- ✅ Canary deployment support
- ✅ Comprehensive metrics (Prometheus)
- ✅ Integration with FNPM resolver
- ✅ Idempotency support

## Quick Start

```bash
# Install dependencies
npm install

# Build
npm run build

# Start server (all features disabled by default)
WASM_EXEC_ENABLED=1 npm start
```

## Environment Variables

### Core Features
```bash
WASM_EXEC_ENABLED=0          # Master switch (default: disabled)
WASM_EXEC_FREEZE=0           # Emergency freeze (fail-open)
WASM_EXEC_CANARY=0.05        # 5% canary deployment
```

### Resource Limits
```bash
WASM_MEM_PAGES_MAX=256       # ~16MB memory limit
WASM_CPU_MS_BUDGET=200       # CPU time budget
WASM_WALL_MS_BUDGET=1000     # Wall clock timeout
```

### Capabilities
```bash
WASM_CAPS=emit               # Allowed syscalls (emit,http,kv)
```

### HTTP Policies
```bash
WASM_HTTP_ALLOWLIST=api.example.com,ipfs.io
WASM_HTTP_RPS=2              # Rate limit
WASM_HTTP_BURST=4            # Burst allowance
WASM_HTTP_MAX_BYTES=131072   # 128KB max response
```

### KV Policies
```bash
WASM_KV_MAX_KEYS=100         # Per namespace
WASM_KV_MAX_VALUE_BYTES=4096 # Per value
```

## API

### Execute WASM Module

```bash
POST /v1/exec
Content-Type: application/json

{
  "target": { "cid": "bafkrei..." },
  "entry": "add(i32,i32)->i32",
  "args": [2, 3],
  "labels": {
    "repo": "void",
    "branch": "main"
  }
}

Response: 202 Accepted
{
  "run_id": "wasm_abc123",
  "accepted": true,
  "mode": "canary"
}
```

### Get Execution Status

```bash
GET /v1/runs/{run_id}

Response: 200 OK
{
  "status": "finished",
  "result": 5,
  "usage": {
    "cpu_ms": 12,
    "mem_pages": 16,
    "syscalls": 3
  }
}
```

## CLI Usage

```bash
# Execute add function
void-wasm exec bafkrei... --entry "add(i32,i32)->i32" --i32 2 --i32 3

# With labels
void-wasm exec bafkrei... --labels '{"env":"test"}' --wait

# Using AST hash
void-wasm exec sha256:0e297... --entry multiply --f64 3.14 --f64 2.0
```

## Security Model

### Default Deny
- No filesystem access
- No network access without explicit allowlist
- No system calls except through gateway

### Resource Limits
- Memory capped at configured pages
- CPU time tracked and limited
- Wall clock timeout enforced
- Syscall rate limiting

### Policy Enforcement
- Capability-based access (emit, http, kv)
- Host allowlisting for HTTP
- Namespace isolation for KV

## Metrics

Available at `/metrics` in Prometheus format:

- `void_wasm_runs_total{status,mode}` - Execution attempts
- `void_wasm_run_duration_ms` - Execution time histogram
- `void_wasm_syscalls_total{kind,decision}` - Syscall counts
- `void_wasm_policy_denied_total{cap,reason}` - Policy violations
- `void_wasm_resource_violations_total{type}` - Resource limit hits

## Events

All execution events are emitted to the event bus:

- `wasm.exec.started` - Execution accepted
- `wasm.exec.finished` - Successful completion
- `wasm.exec.error` - Execution failure

## Rollback

Immediate rollback options:

1. **Disable all execution**: `WASM_EXEC_ENABLED=0`
2. **Freeze (fail-open)**: `WASM_EXEC_FREEZE=1`
3. **Reduce canary**: `WASM_EXEC_CANARY=0`

## Development

```bash
# Run with hot reload
npm run dev

# Run tests
npm test

# Check metrics
curl http://localhost:3456/metrics
```