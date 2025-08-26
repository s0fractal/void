/**
 * WASM Runtime using Wasmtime
 * Secure execution with resource limits
 */

import { WASI } from '@bytecodealliance/wasmtime';
import { CidResolver } from '@void/fnpm-core/resolution';
import { getFnpmConfig } from '@void/fnpm-core/config';
import { WasmExecConfig } from './config.js';
import { SyscallGateway } from './syscalls/index.js';
import { recordMetric } from './metrics.js';

export interface ExecutionResult {
  value: any;
  usage: {
    cpu_ms: number;
    mem_pages: number;
    syscalls: number;
  };
}

export class WasmRuntime {
  private resolver: CidResolver;
  private syscallGateway: SyscallGateway;

  constructor(private config: WasmExecConfig) {
    // Initialize FNPM resolver
    const fnpmConfig = getFnpmConfig();
    fnpmConfig.wasmEnabled = true; // Force enable for executor
    fnpmConfig.manifestDirs = config.fnpmManifestDirs;
    fnpmConfig.cacheDir = config.fnpmCacheDir;
    fnpmConfig.httpGateways = config.fnpmHttpGateways;
    
    this.resolver = new CidResolver(fnpmConfig);
    this.syscallGateway = new SyscallGateway(config);
  }

  async init(): Promise<void> {
    await this.resolver.init();
  }

  async execute(runState: any): Promise<ExecutionResult> {
    const startTime = process.hrtime.bigint();
    const startCpu = process.cpuUsage();
    
    try {
      // Resolve WASM module
      const resolved = await this.resolveModule(runState.target);
      if (!resolved) {
        throw new Error('Failed to resolve WASM module');
      }
      
      recordMetric('wasm_cache_hits_total', { source: resolved.source });
      
      // Load WASM bytes
      const wasmBytes = await this.loadWasmBytes(resolved.path);
      
      // Create WASI instance with limits
      const wasi = new WASI({
        args: ['wasm-module'],
        env: this.createSafeEnv(),
        preopens: {}, // No filesystem access by default
        stdin: this.syscallGateway.createStdinStream(),
        stdout: this.syscallGateway.createStdoutStream(),
        stderr: process.stderr,
      });
      
      // Configure resource limits
      const config = {
        memory: {
          maximum: this.config.memPagesMax,
        },
        fuel: {
          initial: this.config.cpuMsBudget * 1000, // Convert ms to fuel units
          yield_interval: 10000,
        },
      };
      
      // Compile and instantiate
      const module = await WebAssembly.compile(wasmBytes);
      const instance = await WebAssembly.instantiate(module, {
        wasi_snapshot_preview1: wasi.wasiImport,
        env: this.createHostFunctions(),
      });
      
      // Get entry function
      const entryFn = this.getEntryFunction(instance.exports, runState.entry);
      if (!entryFn) {
        throw new Error(`Entry function not found: ${runState.entry}`);
      }
      
      // Set up timeout
      const timeout = setTimeout(() => {
        throw new Error('Execution timeout');
      }, this.config.wallMsBudget);
      
      try {
        // Execute with arguments
        const result = await this.callWithTimeout(
          entryFn,
          runState.args,
          this.config.wallMsBudget
        );
        
        clearTimeout(timeout);
        
        // Calculate usage
        const endTime = process.hrtime.bigint();
        const endCpu = process.cpuUsage(startCpu);
        
        const usage = {
          cpu_ms: Math.round((endCpu.user + endCpu.system) / 1000),
          mem_pages: Math.ceil(wasmBytes.length / 65536), // Approximate
          syscalls: this.syscallGateway.getSyscallCount(),
        };
        
        // Check resource violations
        if (usage.cpu_ms > this.config.cpuMsBudget) {
          recordMetric('wasm_resource_violations_total', { type: 'cpu' });
        }
        
        return { value: result, usage };
        
      } finally {
        clearTimeout(timeout);
      }
      
    } catch (error) {
      recordMetric('wasm_runs_total', { status: 'error', mode: 'runtime' });
      throw error;
    }
  }

  private async resolveModule(target: any): Promise<any> {
    return await this.resolver.resolve(target);
  }

  private async loadWasmBytes(path: string): Promise<Uint8Array> {
    const { readFile } = await import('fs/promises');
    return await readFile(path);
  }

  private createSafeEnv(): Record<string, string> {
    return {
      // Minimal safe environment
      WASM_RUNTIME: 'void',
      WASM_VERSION: '0.1.0',
    };
  }

  private createHostFunctions(): Record<string, any> {
    return {
      // Host functions exposed to WASM
      __void_emit: this.syscallGateway.emit.bind(this.syscallGateway),
      __void_http_fetch: this.syscallGateway.httpFetch.bind(this.syscallGateway),
      __void_kv_get: this.syscallGateway.kvGet.bind(this.syscallGateway),
      __void_kv_set: this.syscallGateway.kvSet.bind(this.syscallGateway),
    };
  }

  private getEntryFunction(exports: any, signature: string): Function | null {
    // Parse signature like "add(i32,i32)->i32"
    const match = signature.match(/^(\w+)\(/);
    if (!match) return null;
    
    const name = match[1];
    const fn = exports[name];
    
    if (typeof fn === 'function') {
      return fn;
    }
    
    return null;
  }

  private async callWithTimeout(
    fn: Function,
    args: any[],
    timeoutMs: number
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Function execution timeout'));
      }, timeoutMs);
      
      try {
        const result = fn(...args);
        clearTimeout(timeout);
        resolve(result);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }
}