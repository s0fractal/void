/**
 * Metrics for WASM Executor
 * Prometheus format
 */

import { register, Counter, Histogram, Gauge } from 'prom-client';

// Counters
export const wasmRunsTotal = new Counter({
  name: 'void_wasm_runs_total',
  help: 'Total number of WASM execution attempts',
  labelNames: ['status', 'mode'],
});

export const wasmSyscallsTotal = new Counter({
  name: 'void_wasm_syscalls_total',
  help: 'Total number of syscalls',
  labelNames: ['kind', 'decision'],
});

export const wasmPolicyDeniedTotal = new Counter({
  name: 'void_wasm_policy_denied_total',
  help: 'Total number of policy denials',
  labelNames: ['cap', 'reason'],
});

export const wasmHttpRequestsTotal = new Counter({
  name: 'void_wasm_http_requests_total',
  help: 'Total HTTP requests from WASM',
  labelNames: ['host', 'status'],
});

export const wasmHttpBytesTotal = new Counter({
  name: 'void_wasm_http_bytes_total',
  help: 'Total bytes fetched via HTTP',
  labelNames: ['host'],
});

export const wasmResourceViolationsTotal = new Counter({
  name: 'void_wasm_resource_violations_total',
  help: 'Resource limit violations',
  labelNames: ['type'],
});

export const wasmCacheHitsTotal = new Counter({
  name: 'void_wasm_cache_hits_total',
  help: 'WASM module cache hits',
  labelNames: ['source'],
});

// Histograms
export const wasmRunDuration = new Histogram({
  name: 'void_wasm_run_duration_ms',
  help: 'WASM execution duration in milliseconds',
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
});

export const wasmSyscallDuration = new Histogram({
  name: 'void_wasm_syscall_duration_ms',
  help: 'Syscall duration in milliseconds',
  labelNames: ['kind'],
  buckets: [1, 5, 10, 25, 50, 100],
});

// Gauges
export const wasmCanaryRatio = new Gauge({
  name: 'void_wasm_canary_ratio',
  help: 'Current canary deployment ratio',
});

export const wasmActiveRuns = new Gauge({
  name: 'void_wasm_active_runs',
  help: 'Currently active WASM runs',
});

export const wasmMemoryUsage = new Gauge({
  name: 'void_wasm_memory_usage_pages',
  help: 'Memory usage in WASM pages',
  labelNames: ['run_id'],
});

// Helper to record metrics
export function recordMetric(name: string, labelsOrValue?: any, value?: number): void {
  switch (name) {
    case 'wasm_runs_total':
      wasmRunsTotal.inc(labelsOrValue);
      break;
    case 'wasm_syscalls_total':
      wasmSyscallsTotal.inc(labelsOrValue);
      break;
    case 'wasm_policy_denied_total':
      wasmPolicyDeniedTotal.inc(labelsOrValue);
      break;
    case 'wasm_http_requests_total':
      wasmHttpRequestsTotal.inc(labelsOrValue);
      break;
    case 'wasm_http_bytes_total':
      wasmHttpBytesTotal.inc(labelsOrValue, value!);
      break;
    case 'wasm_resource_violations_total':
      wasmResourceViolationsTotal.inc(labelsOrValue);
      break;
    case 'wasm_cache_hits_total':
      wasmCacheHitsTotal.inc(labelsOrValue);
      break;
    case 'wasm_run_duration_ms':
      wasmRunDuration.observe(labelsOrValue);
      break;
    case 'wasm_syscall_duration_ms':
      wasmSyscallDuration.observe(labelsOrValue, value!);
      break;
    case 'wasm_canary_ratio':
      wasmCanaryRatio.set(labelsOrValue);
      break;
    case 'wasm_active_runs':
      wasmActiveRuns.set(labelsOrValue);
      break;
    case 'wasm_memory_usage':
      wasmMemoryUsage.set(labelsOrValue, value!);
      break;
  }
}

// Initialize metrics
export function initMetrics(config: { canaryPercentage: number }): void {
  recordMetric('wasm_canary_ratio', config.canaryPercentage);
}

// Export registry
export { register as metricsRegistry };