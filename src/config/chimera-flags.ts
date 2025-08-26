/**
 * Chimera Feature Flags Configuration
 * All features are DISABLED by default for safety
 */

export interface ChimeraConfig {
  // Master switches
  chimeraEnabled: boolean;
  wasmExecEnabled: boolean;
  proteinHashEnabled: boolean;
  
  // Emergency controls
  frozen: boolean; // Immediate fail-open
  
  // Canary deployment
  canaryPercentage: number;
  
  // Security policies
  sandboxMode: 'strict' | 'permissive';
  maxMemory: number; // bytes
  executionTimeout: number; // ms
  
  // Network policies
  allowNetwork: boolean;
  allowedHosts: string[];
  
  // Storage policies
  allowDisk: boolean;
  allowedPaths: string[];
  
  // Development
  dryRunMode: boolean;
  debugChimera: boolean;
  debugWasm: boolean;
  debugProtein: boolean;
  
  // Rate limiting
  rpsLimit: number;
  burstLimit: number;
}

export function getChimeraConfig(): ChimeraConfig {
  // Parse memory size string (e.g., "256MB" -> bytes)
  const parseMemorySize = (size: string): number => {
    const units: Record<string, number> = {
      B: 1,
      KB: 1024,
      MB: 1024 * 1024,
      GB: 1024 * 1024 * 1024,
    };
    const match = size.match(/^(\d+)(B|KB|MB|GB)$/i);
    if (!match) return 256 * 1024 * 1024; // Default 256MB
    return parseInt(match[1]) * (units[match[2].toUpperCase()] || 1);
  };

  return {
    // Master switches - ALL DISABLED BY DEFAULT
    chimeraEnabled: process.env.CHIMERA_ENABLED === '1',
    wasmExecEnabled: process.env.WASM_EXEC_ENABLED === '1',
    proteinHashEnabled: process.env.PROTEIN_HASH_ENABLED === '1',
    
    // Emergency controls
    frozen: process.env.CHIMERA_FREEZE === '1',
    
    // Canary deployment
    canaryPercentage: parseFloat(process.env.CHIMERA_CANARY || '0'),
    
    // Security policies
    sandboxMode: (process.env.WASM_SANDBOX_MODE as 'strict' | 'permissive') || 'strict',
    maxMemory: parseMemorySize(process.env.WASM_MAX_MEMORY || '256MB'),
    executionTimeout: parseInt(process.env.WASM_EXECUTION_TIMEOUT || '30000'),
    
    // Network policies - DENY BY DEFAULT
    allowNetwork: process.env.WASM_ALLOW_NETWORK === '1',
    allowedHosts: process.env.WASM_ALLOWED_HOSTS?.split(',').filter(Boolean) || [],
    
    // Storage policies - DENY BY DEFAULT
    allowDisk: process.env.WASM_ALLOW_DISK === '1',
    allowedPaths: process.env.WASM_ALLOWED_PATHS?.split(',').filter(Boolean) || [],
    
    // Development
    dryRunMode: process.env.DRY_RUN_MODE === '1',
    debugChimera: process.env.DEBUG_CHIMERA === '1',
    debugWasm: process.env.DEBUG_WASM === '1',
    debugProtein: process.env.DEBUG_PROTEIN === '1',
    
    // Rate limiting
    rpsLimit: parseInt(process.env.WASM_RPS_LIMIT || '100'),
    burstLimit: parseInt(process.env.WASM_BURST_LIMIT || '200'),
  };
}

/**
 * Check if a request should use Chimera features based on canary percentage
 */
export function shouldUseChimera(config: ChimeraConfig, requestId?: string): boolean {
  if (!config.chimeraEnabled) return false;
  if (config.canaryPercentage === 0) return false;
  if (config.canaryPercentage >= 1) return true;
  
  // Use request ID for consistent hashing if provided
  if (requestId) {
    let hash = 0;
    for (let i = 0; i < requestId.length; i++) {
      hash = ((hash << 5) - hash) + requestId.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    return (Math.abs(hash) % 100) < (config.canaryPercentage * 100);
  }
  
  // Random selection if no request ID
  return Math.random() < config.canaryPercentage;
}

/**
 * Log configuration on startup (redacting sensitive values)
 */
export function logChimeraConfig(config: ChimeraConfig): void {
  if (!config.debugChimera) return;
  
  console.log('🧬 Chimera Configuration:');
  console.log(`  - Enabled: ${config.chimeraEnabled}`);
  console.log(`  - WASM Execution: ${config.wasmExecEnabled}`);
  console.log(`  - Protein Hash: ${config.proteinHashEnabled}`);
  console.log(`  - Frozen: ${config.frozen ? '🚨 YES' : 'no'}`);
  console.log(`  - Canary: ${config.canaryPercentage * 100}%`);
  console.log(`  - Sandbox: ${config.sandboxMode}`);
  console.log(`  - Max Memory: ${config.maxMemory / (1024 * 1024)}MB`);
  console.log(`  - Timeout: ${config.executionTimeout}ms`);
  console.log(`  - Network: ${config.allowNetwork ? 'allowed' : 'denied'}`);
  console.log(`  - Disk: ${config.allowDisk ? 'allowed' : 'denied'}`);
  console.log(`  - Dry Run: ${config.dryRunMode}`);
}

/**
 * Get effective configuration for health checks
 * Shows actual runtime values after all precedence rules
 */
export function getEffectiveConfig(): Record<string, any> {
  const config = getChimeraConfig();
  return {
    'chimera.enabled': config.chimeraEnabled && !config.frozen,
    'chimera.frozen': config.frozen,
    'wasm.exec.enabled': config.wasmExecEnabled && !config.frozen,
    'protein.hash.enabled': config.proteinHashEnabled && !config.frozen,
    'canary.percentage': config.canaryPercentage,
    'sandbox.mode': config.sandboxMode,
    'dry.run': config.dryRunMode,
    'precedence': 'ENV > .env > defaults',
    'timestamp': new Date().toISOString(),
  };
}