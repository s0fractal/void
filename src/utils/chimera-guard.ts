/**
 * Chimera Feature Guard
 * Ensures features are only used when explicitly enabled
 */

import { getChimeraConfig, shouldUseChimera, ChimeraConfig } from '../config/chimera-flags';

export class ChimeraGuard {
  private static instance: ChimeraGuard;
  private config: ChimeraConfig;
  private requestCounts = new Map<string, number>();
  private lastReset = Date.now();

  private constructor() {
    this.config = getChimeraConfig();
    
    // Reset counters every minute
    setInterval(() => {
      this.requestCounts.clear();
      this.lastReset = Date.now();
    }, 60000);
  }

  static getInstance(): ChimeraGuard {
    if (!ChimeraGuard.instance) {
      ChimeraGuard.instance = new ChimeraGuard();
    }
    return ChimeraGuard.instance;
  }

  /**
   * Check if Chimera features can be used
   */
  canUseChimera(requestId?: string): boolean {
    if (!this.config.chimeraEnabled) {
      this.logBlocked('Chimera disabled globally');
      return false;
    }

    // Check canary deployment
    if (!shouldUseChimera(this.config, requestId)) {
      this.logBlocked('Not in canary percentage');
      return false;
    }

    // Check rate limiting
    if (!this.checkRateLimit(requestId)) {
      this.logBlocked('Rate limit exceeded');
      return false;
    }

    return true;
  }

  /**
   * Check if WASM execution is allowed
   */
  canExecuteWasm(requestId?: string): boolean {
    if (!this.canUseChimera(requestId)) return false;

    if (!this.config.wasmExecEnabled) {
      this.logBlocked('WASM execution disabled');
      return false;
    }

    if (this.config.dryRunMode) {
      this.log('WASM execution in dry-run mode');
      return false; // Don't actually execute in dry-run
    }

    return true;
  }

  /**
   * Check if Protein Hash computation is allowed
   */
  canComputeProteinHash(requestId?: string): boolean {
    if (!this.canUseChimera(requestId)) return false;

    if (!this.config.proteinHashEnabled) {
      this.logBlocked('Protein Hash disabled');
      return false;
    }

    return true;
  }

  /**
   * Check if network access is allowed for WASM
   */
  canAccessNetwork(host: string): boolean {
    if (!this.config.allowNetwork) {
      this.logBlocked(`Network access denied for ${host}`);
      return false;
    }

    if (this.config.allowedHosts.length === 0) {
      // No restrictions if list is empty but network is allowed
      return true;
    }

    const allowed = this.config.allowedHosts.some(allowedHost => {
      // Support wildcards: *.example.com
      if (allowedHost.startsWith('*.')) {
        const domain = allowedHost.substring(2);
        return host.endsWith(domain);
      }
      return host === allowedHost;
    });

    if (!allowed) {
      this.logBlocked(`Host ${host} not in allowed list`);
    }

    return allowed;
  }

  /**
   * Check if disk access is allowed for WASM
   */
  canAccessDisk(path: string): boolean {
    if (!this.config.allowDisk) {
      this.logBlocked(`Disk access denied for ${path}`);
      return false;
    }

    if (this.config.allowedPaths.length === 0) {
      // No restrictions if list is empty but disk is allowed
      return true;
    }

    const allowed = this.config.allowedPaths.some(allowedPath => {
      // Check if path starts with allowed path
      return path.startsWith(allowedPath);
    });

    if (!allowed) {
      this.logBlocked(`Path ${path} not in allowed list`);
    }

    return allowed;
  }

  /**
   * Get current configuration (read-only)
   */
  getConfig(): Readonly<ChimeraConfig> {
    return { ...this.config };
  }

  /**
   * Check rate limiting
   */
  private checkRateLimit(requestId?: string): boolean {
    const key = requestId || 'global';
    const count = this.requestCounts.get(key) || 0;

    if (count >= this.config.rpsLimit) {
      return false;
    }

    this.requestCounts.set(key, count + 1);
    return true;
  }

  /**
   * Log blocked attempt
   */
  private logBlocked(reason: string): void {
    if (this.config.debugChimera) {
      console.warn(`🚫 Chimera blocked: ${reason}`);
    }
  }

  /**
   * General logging
   */
  private log(message: string): void {
    if (this.config.debugChimera) {
      console.log(`🧬 Chimera: ${message}`);
    }
  }
}

// Export singleton instance
export const chimeraGuard = ChimeraGuard.getInstance();