/**
 * Metrics collection for FNPM
 * Uses Prometheus client for standard metrics
 */

import { register, Counter, Histogram, Gauge } from 'prom-client';

// Counters
export const wasmFetchTotal = new Counter({
  name: 'void_fnpm_wasm_fetch_total',
  help: 'Total number of WASM fetch attempts',
  labelNames: ['source', 'status'],
});

export const wasmValidationFailTotal = new Counter({
  name: 'void_fnpm_wasm_validation_fail_total',
  help: 'Total number of validation failures',
  labelNames: ['reason'],
});

export const wasmResolveTotal = new Counter({
  name: 'void_fnpm_wasm_resolve_total',
  help: 'Total number of resolve attempts',
  labelNames: ['status'],
});

// Histograms
export const wasmFetchDuration = new Histogram({
  name: 'void_fnpm_wasm_fetch_duration_ms',
  help: 'WASM fetch duration in milliseconds',
  labelNames: ['source'],
  buckets: [10, 50, 100, 500, 1000, 5000, 10000],
});

export const wasmResolveDuration = new Histogram({
  name: 'void_fnpm_wasm_resolve_duration_ms',
  help: 'Total resolve duration in milliseconds',
  buckets: [1, 5, 10, 50, 100, 500],
});

// Gauges
export const manifestEntries = new Gauge({
  name: 'void_fnpm_manifest_entries_total',
  help: 'Total number of indexed manifest entries',
  labelNames: ['lang'],
});

export const cacheSizeBytes = new Gauge({
  name: 'void_fnpm_cache_size_bytes',
  help: 'Total size of WASM cache in bytes',
});

export const cacheEntries = new Gauge({
  name: 'void_fnpm_cache_entries_total',
  help: 'Total number of cached WASM modules',
});

export const cidResolveCanaryRatio = new Gauge({
  name: 'void_fnpm_cid_resolve_canary_ratio',
  help: 'Current CID resolve canary percentage',
});

// Helper to record metrics
export function recordMetric(name: string, labelsOrValue?: any, value?: number): void {
  switch (name) {
    case 'fnpm_wasm_fetch_total':
      wasmFetchTotal.inc(labelsOrValue);
      break;
    case 'fnpm_wasm_validation_fail_total':
      wasmValidationFailTotal.inc(labelsOrValue);
      break;
    case 'fnpm_wasm_resolve_total':
      wasmResolveTotal.inc(labelsOrValue);
      break;
    case 'fnpm_wasm_fetch_duration_ms':
      if (typeof labelsOrValue === 'number') {
        wasmFetchDuration.observe(labelsOrValue);
      } else {
        wasmFetchDuration.observe(labelsOrValue, value!);
      }
      break;
    case 'fnpm_wasm_resolve_duration_ms':
      wasmResolveDuration.observe(labelsOrValue);
      break;
    case 'fnpm_manifest_entries':
      manifestEntries.set(labelsOrValue, value!);
      break;
    case 'fnpm_cache_size_bytes':
      cacheSizeBytes.set(labelsOrValue);
      break;
    case 'fnpm_cache_entries':
      cacheEntries.set(labelsOrValue);
      break;
    case 'fnpm_cid_resolve_canary_ratio':
      cidResolveCanaryRatio.set(labelsOrValue);
      break;
  }
}

// Export Prometheus registry
export { register as metricsRegistry };

// Initialize canary ratio from config
export function initMetrics(config: { cidResolveCanary: number }): void {
  recordMetric('fnpm_cid_resolve_canary_ratio', config.cidResolveCanary);
}

// Update cache metrics
export async function updateCacheMetrics(cache: any): Promise<void> {
  const stats = await cache.getStats();
  recordMetric('fnpm_cache_entries', stats.totalFiles);
  recordMetric('fnpm_cache_size_bytes', stats.totalSize);
}

// Update manifest metrics
export function updateManifestMetrics(index: any): void {
  const stats = index.getStats();
  
  // Clear existing metrics
  manifestEntries.reset();
  
  // Set total
  recordMetric('fnpm_manifest_entries', { lang: 'all' }, stats.totalGenes);
  
  // Set per language
  for (const [lang, count] of Object.entries(stats)) {
    if (lang !== 'totalGenes' && lang !== 'totalManifests' && lang !== 'uniqueNames') {
      recordMetric('fnpm_manifest_entries', { lang }, count as number);
    }
  }
}