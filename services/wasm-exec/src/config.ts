/**
 * WASM Executor Configuration
 * All features DISABLED by default for safety
 */

export interface WasmExecConfig {
  // Master switches
  wasmExecEnabled: boolean;
  frozen: boolean;
  canaryPercentage: number;
  
  // Resource limits
  memPagesMax: number;
  cpuMsBudget: number;
  wallMsBudget: number;
  
  // Capabilities
  caps: Set<string>;
  
  // HTTP policies
  httpAllowlist: string[];
  httpRps: number;
  httpBurst: number;
  httpMaxBytes: number;
  
  // KV policies
  kvNamespaces: string[];
  kvMaxKeys: number;
  kvMaxValueBytes: number;
  
  // FNPM integration
  fnpmManifestDirs: string[];
  fnpmCacheDir: string;
  fnpmHttpGateways: string[];
  
  // Debug
  debug: boolean;
  dryRun: boolean;
}

export function getConfig(): WasmExecConfig {
  // Parse capabilities
  const capsList = (process.env.WASM_CAPS || 'emit').split(',').filter(Boolean);
  const caps = new Set(capsList);
  
  // Parse allowlist
  const httpAllowlist = (process.env.WASM_HTTP_ALLOWLIST || '').split(',').filter(Boolean);
  
  return {
    // Master switches - ALL DISABLED BY DEFAULT
    wasmExecEnabled: process.env.WASM_EXEC_ENABLED === '1',
    frozen: process.env.WASM_EXEC_FREEZE === '1',
    canaryPercentage: parseFloat(process.env.WASM_EXEC_CANARY || '0.05'),
    
    // Resource limits
    memPagesMax: parseInt(process.env.WASM_MEM_PAGES_MAX || '256'), // ~16MB
    cpuMsBudget: parseInt(process.env.WASM_CPU_MS_BUDGET || '200'),
    wallMsBudget: parseInt(process.env.WASM_WALL_MS_BUDGET || '1000'),
    
    // Capabilities
    caps,
    
    // HTTP policies
    httpAllowlist,
    httpRps: parseInt(process.env.WASM_HTTP_RPS || '2'),
    httpBurst: parseInt(process.env.WASM_HTTP_BURST || '4'),
    httpMaxBytes: parseInt(process.env.WASM_HTTP_MAX_BYTES || '131072'), // 128KB
    
    // KV policies
    kvNamespaces: ['default'], // Fixed for now
    kvMaxKeys: parseInt(process.env.WASM_KV_MAX_KEYS || '100'),
    kvMaxValueBytes: parseInt(process.env.WASM_KV_MAX_VALUE_BYTES || '4096'),
    
    // FNPM integration
    fnpmManifestDirs: (process.env.FNPM_MANIFEST_DIRS || './chimera-output').split(','),
    fnpmCacheDir: process.env.FNPM_CACHE_DIR || '~/.fnpm/cache/wasm',
    fnpmHttpGateways: (process.env.FNPM_HTTP_GATEWAYS || 'https://ipfs.io').split(','),
    
    // Debug
    debug: process.env.DEBUG_WASM_EXEC === '1',
    dryRun: process.env.DRY_RUN_MODE === '1',
  };
}

/**
 * Check if request should execute based on canary
 */
export function shouldExecute(config: WasmExecConfig, requestId: string): boolean {
  if (config.frozen) return false;
  if (config.dryRun) return false;
  if (config.canaryPercentage === 0) return false;
  if (config.canaryPercentage >= 1) return true;
  
  // Consistent hashing based on request ID
  let hash = 0;
  for (let i = 0; i < requestId.length; i++) {
    hash = ((hash << 5) - hash) + requestId.charCodeAt(i);
    hash = hash & hash;
  }
  return (Math.abs(hash) % 100) < (config.canaryPercentage * 100);
}

/**
 * Log configuration (redacting sensitive values)
 */
export function logConfig(config: WasmExecConfig): void {
  if (!config.debug) return;
  
  console.log('⚙️  WASM Executor Configuration:');
  console.log(`  - Enabled: ${config.wasmExecEnabled}`);
  console.log(`  - Frozen: ${config.frozen}`);
  console.log(`  - Canary: ${config.canaryPercentage * 100}%`);
  console.log(`  - Memory: ${config.memPagesMax} pages`);
  console.log(`  - CPU Budget: ${config.cpuMsBudget}ms`);
  console.log(`  - Wall Budget: ${config.wallMsBudget}ms`);
  console.log(`  - Capabilities: ${Array.from(config.caps).join(', ')}`);
  console.log(`  - HTTP Hosts: ${config.httpAllowlist.length} allowed`);
}