/**
 * Syscall Gateway
 * Provides controlled access to host capabilities
 */

import { Readable, Writable } from 'stream';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import fetch from 'node-fetch';
import { WasmExecConfig } from '../config.js';
import { recordMetric } from '../metrics.js';

export class SyscallGateway {
  private syscallCount = 0;
  private kvStore = new Map<string, any>();
  private httpLimiter: RateLimiterMemory;
  private policy: any; // Will be injected

  constructor(private config: WasmExecConfig) {
    this.httpLimiter = new RateLimiterMemory({
      points: config.httpRps,
      duration: 1, // Per second
      execEvenly: true,
    });
  }

  setPolicy(policy: any): void {
    this.policy = policy;
  }

  getSyscallCount(): number {
    return this.syscallCount;
  }

  // Create NDJSON streams for communication
  createStdinStream(): Readable {
    return new Readable({
      read() {
        // WASM can read from this
      },
    });
  }

  createStdoutStream(): Writable {
    const self = this;
    return new Writable({
      write(chunk: Buffer, encoding, callback) {
        try {
          const line = chunk.toString().trim();
          if (line) {
            const msg = JSON.parse(line);
            self.handleSyscall(msg);
          }
          callback();
        } catch (error) {
          callback(error as Error);
        }
      },
    });
  }

  private async handleSyscall(msg: any): Promise<void> {
    this.syscallCount++;
    recordMetric('wasm_syscalls_total', { kind: msg.type });

    switch (msg.type) {
      case 'emit':
        await this.handleEmit(msg);
        break;
      case 'http.fetch':
        await this.handleHttpFetch(msg);
        break;
      case 'kv.get':
        await this.handleKvGet(msg);
        break;
      case 'kv.set':
        await this.handleKvSet(msg);
        break;
      default:
        console.warn('Unknown syscall:', msg.type);
    }
  }

  // Emit event
  async emit(event: string, data: any): Promise<void> {
    if (!this.policy?.canEmit(event)) {
      throw new Error('Emit not allowed');
    }

    recordMetric('wasm_syscalls_total', { kind: 'emit', decision: 'allow' });
    
    // Emit to event bus (stubbed)
    console.log('EMIT:', event, data);
  }

  private async handleEmit(msg: any): Promise<void> {
    await this.emit(msg.event, msg.data);
  }

  // HTTP fetch with policies
  async httpFetch(url: string, options: any = {}): Promise<any> {
    if (!this.policy?.canHttpFetch(url)) {
      recordMetric('wasm_syscalls_total', { kind: 'http', decision: 'deny' });
      throw new Error(`HTTP fetch not allowed: ${url}`);
    }

    // Rate limiting
    try {
      await this.httpLimiter.consume('global', 1);
    } catch {
      recordMetric('wasm_syscalls_total', { kind: 'http', decision: 'rate_limited' });
      throw new Error('HTTP rate limit exceeded');
    }

    recordMetric('wasm_syscalls_total', { kind: 'http', decision: 'allow' });

    // Make request with size limit
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        size: this.config.httpMaxBytes,
      });

      clearTimeout(timeout);

      const host = new URL(url).hostname;
      recordMetric('wasm_http_requests_total', { host, status: response.status.toString() });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.text();
      recordMetric('wasm_http_bytes_total', { host }, data.length);

      return { status: response.status, data };

    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  private async handleHttpFetch(msg: any): Promise<void> {
    const result = await this.httpFetch(msg.url, msg.options);
    // Send result back through stdin
    console.log('HTTP_RESULT:', result);
  }

  // KV store operations
  async kvGet(namespace: string, key: string): Promise<any> {
    if (!this.policy?.canKvAccess(namespace, key, 'get')) {
      recordMetric('wasm_syscalls_total', { kind: 'kv', decision: 'deny' });
      throw new Error('KV get not allowed');
    }

    recordMetric('wasm_syscalls_total', { kind: 'kv.get', decision: 'allow' });
    
    const nsKey = `${namespace}:${key}`;
    return this.kvStore.get(nsKey);
  }

  async kvSet(namespace: string, key: string, value: any): Promise<void> {
    if (!this.policy?.canKvAccess(namespace, key, 'set')) {
      recordMetric('wasm_syscalls_total', { kind: 'kv', decision: 'deny' });
      throw new Error('KV set not allowed');
    }

    // Check size limit
    const serialized = JSON.stringify(value);
    if (serialized.length > this.config.kvMaxValueBytes) {
      throw new Error('KV value too large');
    }

    // Check key count limit
    const nsPrefix = `${namespace}:`;
    const keysInNamespace = Array.from(this.kvStore.keys())
      .filter(k => k.startsWith(nsPrefix)).length;

    if (keysInNamespace >= this.config.kvMaxKeys) {
      throw new Error('KV key limit exceeded');
    }

    recordMetric('wasm_syscalls_total', { kind: 'kv.set', decision: 'allow' });
    
    const nsKey = `${namespace}:${key}`;
    this.kvStore.set(nsKey, value);
  }

  private async handleKvGet(msg: any): Promise<void> {
    const value = await this.kvGet(msg.namespace || 'default', msg.key);
    console.log('KV_GET_RESULT:', value);
  }

  private async handleKvSet(msg: any): Promise<void> {
    await this.kvSet(msg.namespace || 'default', msg.key, msg.value);
    console.log('KV_SET_OK');
  }
}