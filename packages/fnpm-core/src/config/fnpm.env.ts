/**
 * FNPM Environment Configuration
 * All WASM features are DISABLED by default
 */

import { homedir } from 'os';
import { join } from 'path';

export interface FnpmConfig {
  // Feature flags
  wasmEnabled: boolean;
  cidResolveCanary: number;
  
  // Directories
  manifestDirs: string[];
  cacheDir: string;
  
  // IPFS
  ipfsApi?: string;
  httpGateways: string[];
  
  // Network
  fetchTimeoutMs: number;
  maxRetries: number;
  
  // Security
  verifyHashes: boolean;
  maxFileSize: number; // bytes
  
  // Debug
  debug: boolean;
  dryRun: boolean;
}

export function getFnpmConfig(): FnpmConfig {
  const homeDir = homedir();
  
  return {
    // Feature flags - ALL DISABLED BY DEFAULT
    wasmEnabled: process.env.FNPM_WASM_ENABLED === '1',
    cidResolveCanary: parseFloat(process.env.FNPM_CID_RESOLVE_CANARY || '0.1'),
    
    // Directories
    manifestDirs: (process.env.FNPM_MANIFEST_DIRS || './chimera-output').split(',').filter(Boolean),
    cacheDir: process.env.FNPM_CACHE_DIR || join(homeDir, '.fnpm', 'cache', 'wasm'),
    
    // IPFS
    ipfsApi: process.env.FNPM_IPFS_API, // undefined = disabled
    httpGateways: (process.env.FNPM_HTTP_GATEWAYS || 'https://ipfs.io,https://cloudflare-ipfs.com').split(','),
    
    // Network
    fetchTimeoutMs: parseInt(process.env.FNPM_FETCH_TIMEOUT_MS || '5000'),
    maxRetries: parseInt(process.env.FNPM_MAX_RETRIES || '3'),
    
    // Security
    verifyHashes: process.env.FNPM_VERIFY_HASHES !== '0', // default true
    maxFileSize: parseInt(process.env.FNPM_MAX_FILE_SIZE || '52428800'), // 50MB
    
    // Debug
    debug: process.env.DEBUG_FNPM === '1',
    dryRun: process.env.DRY_RUN_MODE === '1',
  };
}

/**
 * Check if request should use WASM features based on canary
 */
export function shouldUseCidResolve(config: FnpmConfig, requestId?: string): boolean {
  if (!config.wasmEnabled) return false;
  if (config.cidResolveCanary === 0) return false;
  if (config.cidResolveCanary >= 1) return true;
  
  // Consistent hashing based on request ID
  if (requestId) {
    let hash = 0;
    for (let i = 0; i < requestId.length; i++) {
      hash = ((hash << 5) - hash) + requestId.charCodeAt(i);
      hash = hash & hash;
    }
    return (Math.abs(hash) % 100) < (config.cidResolveCanary * 100);
  }
  
  return Math.random() < config.cidResolveCanary;
}

/**
 * Log configuration (for debugging)
 */
export function logFnpmConfig(config: FnpmConfig): void {
  if (!config.debug) return;
  
  console.log('🌀 FNPM Configuration:');
  console.log(`  - WASM Enabled: ${config.wasmEnabled}`);
  console.log(`  - CID Canary: ${config.cidResolveCanary * 100}%`);
  console.log(`  - Manifest Dirs: ${config.manifestDirs.join(', ')}`);
  console.log(`  - Cache Dir: ${config.cacheDir}`);
  console.log(`  - IPFS API: ${config.ipfsApi || 'disabled'}`);
  console.log(`  - HTTP Gateways: ${config.httpGateways.length}`);
  console.log(`  - Verify Hashes: ${config.verifyHashes}`);
  console.log(`  - Dry Run: ${config.dryRun}`);
}