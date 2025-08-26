# 📊 Chimera WASM Dashboards

> Grafana dashboards for monitoring Chimera WASM integration in Void

## 🎯 Overview

Three comprehensive dashboards for monitoring the Chimera WASM system:

1. **Chimera Overview** - High-level system status and metrics
2. **WASM Performance** - Detailed performance analytics
3. **Security Monitoring** - Security events and policy enforcement

## 📈 Dashboards

### 1. Chimera Overview (`chimera-overview.json`)

Main system health and activity dashboard:
- **System Status**: Chimera enabled/frozen state
- **Operations Rate**: Compilations and executions per second
- **Canary Rollout**: Progressive deployment percentage
- **Module Cache**: Number of cached WASM modules
- **Resolution Layers**: FNPM resolution distribution (cache/IPFS/HTTP)
- **Top Modules**: Most executed modules with success rates
- **Protein Hash**: Computation status and rates

### 2. WASM Performance (`wasm-performance.json`)

Deep performance metrics:
- **Gas Usage**: p50/p95/p99 gas consumption over time
- **Memory Usage**: Memory consumption distribution
- **Policy Violations**: Rate and types of violations
- **Success Rate**: Overall execution success percentage
- **Latency Heatmap**: Visual representation of execution times by CID
- **Resource Limits**: Tracking against configured limits

### 3. Security Monitoring (`security-monitoring.json`)

Security and compliance dashboard:
- **Emergency Freeze**: Big red indicator for system freeze
- **Antigone Decisions**: Authorization allow/deny rates
- **Rate Limiting**: Requests being rate limited
- **Policy Violations**: Breakdown by violation type
- **Permission Denials**: Top users and reasons
- **Syscall Usage**: Distribution of system calls
- **Problematic Modules**: CIDs with most violations

## 🔧 Installation

### 1. Import to Grafana

```bash
# Using Grafana API
curl -X POST http://localhost:3000/api/dashboards/db \
  -H "Authorization: Bearer $GRAFANA_API_KEY" \
  -H "Content-Type: application/json" \
  -d @chimera-overview.json

# Or use Grafana UI:
# 1. Go to Dashboards > Import
# 2. Upload JSON file or paste content
# 3. Select Prometheus datasource
# 4. Click Import
```

### 2. Configure Data Source

All dashboards use a templated `datasource` variable. Make sure you have:
- Prometheus configured and scraping metrics
- Metrics exposed by Chimera services

### 3. Set Up Alerts

Example alert for system freeze:
```yaml
- alert: ChimeraSystemFrozen
  expr: chimera_freeze == 1
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "Chimera system is frozen!"
    description: "Emergency freeze activated, all WASM execution halted"
```

## 📊 Key Metrics

### System Metrics
- `chimera_enabled` - Feature flag status
- `chimera_freeze` - Emergency freeze status
- `chimera_canary_percentage` - Rollout percentage

### Execution Metrics
- `wasm_executions_total` - Total executions (counter)
- `wasm_execution_duration` - Execution time (histogram)
- `wasm_execution_errors_total` - Execution failures (counter)
- `wasm_gas_used` - Gas consumption (histogram)
- `wasm_memory_usage` - Memory usage (histogram)

### Security Metrics
- `wasm_policy_violations_total` - Policy violations by type
- `antigone_checks_total` - Authorization checks
- `relay_execute_wasm_rate_limited` - Rate limited requests
- `relay_execute_wasm_permission_denied` - Permission denials
- `wasm_syscall_gateway_calls_total` - Syscall usage

### Resolution Metrics
- `fnpm_resolutions_total` - FNPM resolutions by layer
- `fnpm_resolution_duration` - Resolution time
- `wasm_modules_cached` - Cached module count

## 🎨 Dashboard Features

### Time Range
- Default: Last 1 hour
- Auto-refresh: 10 seconds
- Supports custom time ranges

### Variables
- `datasource` - Prometheus data source selection

### Visualizations
- **Stats**: Current values with thresholds
- **Time Series**: Trends over time
- **Pie Charts**: Distribution breakdowns
- **Tables**: Top N analysis
- **Heatmaps**: Latency distribution

## 🚨 Important Thresholds

### Error Rates
- Success rate < 95% = Yellow
- Success rate < 90% = Red

### Policy Violations
- Violation rate > 1% = Yellow
- Violation rate > 5% = Red

### System Status
- Freeze = 1 = Critical (Red)
- Canary > 50% = Yellow
- Canary > 90% = Red

## 🔄 Dashboard Links

The dashboards can be linked together:
1. From Overview → Performance (drill down)
2. From Overview → Security (when violations spike)
3. From Performance → Security (investigate violations)

## 📝 Customization

### Adding Panels
Common queries to add:
```promql
# WASM module size distribution
histogram_quantile(0.95, wasm_module_size_bytes_bucket)

# Compilation success rate
sum(rate(wasm_compilations_total{status="success"}[5m])) / 
sum(rate(wasm_compilations_total[5m]))

# Unique users executing WASM
count(count by (user_id) (wasm_executions_total))
```

### Modifying Alerts
Add annotations to panels:
```json
"alert": {
  "conditions": [{
    "evaluator": {
      "params": [0.95],
      "type": "lt"
    },
    "query": {
      "params": ["A", "5m", "now"]
    },
    "reducer": {
      "params": [],
      "type": "avg"
    },
    "type": "query"
  }],
  "name": "Low WASM Success Rate"
}
```

## 🌀 Integration with Void

These dashboards integrate with:
- **void-dash-service**: Exposes /metrics endpoint
- **wasm-exec service**: Execution metrics
- **relay service**: HTTP API metrics
- **fnpm resolver**: Resolution metrics

Make sure all services have metrics enabled:
```bash
METRICS_ENABLED=1
METRICS_PORT=9090
```

---

*Created for PR-G: Grafana Dashboards*
*Part of Chimera WASM Integration*