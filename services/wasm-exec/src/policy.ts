/**
 * Policy Engine for WASM Execution
 * Enforces security policies and resource limits
 */

import { WasmExecConfig } from './config.js';
import { recordMetric } from './metrics.js';

export interface PolicyDecision {
  allowed: boolean;
  reason?: string;
  caps: string[];
  limits: {
    memory_pages: number;
    cpu_ms: number;
    wall_ms: number;
  };
}

export class PolicyEngine {
  constructor(private config: WasmExecConfig) {}

  async evaluate(runState: any): Promise<PolicyDecision> {
    const decision: PolicyDecision = {
      allowed: true,
      caps: Array.from(this.config.caps),
      limits: {
        memory_pages: this.config.memPagesMax,
        cpu_ms: this.config.cpuMsBudget,
        wall_ms: this.config.wallMsBudget,
      },
    };

    // Check basic requirements
    if (!runState.target || !runState.entry) {
      decision.allowed = false;
      decision.reason = 'Missing target or entry';
      recordMetric('wasm_policy_denied_total', { reason: 'invalid_request' });
      return decision;
    }

    // Check if module is allowed (could check against allowlist)
    if (!this.isModuleAllowed(runState.target)) {
      decision.allowed = false;
      decision.reason = 'Module not in allowlist';
      recordMetric('wasm_policy_denied_total', { reason: 'module_denied' });
      return decision;
    }

    // Check requested capabilities
    if (runState.requested_caps) {
      for (const cap of runState.requested_caps) {
        if (!this.config.caps.has(cap)) {
          decision.allowed = false;
          decision.reason = `Capability not allowed: ${cap}`;
          recordMetric('wasm_policy_denied_total', { cap, reason: 'cap_denied' });
          return decision;
        }
      }
    }

    // Apply label-based policies
    if (runState.labels) {
      const labelDecision = this.evaluateLabels(runState.labels);
      if (!labelDecision.allowed) {
        decision.allowed = false;
        decision.reason = labelDecision.reason;
        return decision;
      }
    }

    return decision;
  }

  private isModuleAllowed(target: any): boolean {
    // For now, allow all modules
    // In production, check against allowlist of CIDs/hashes
    return true;
  }

  private evaluateLabels(labels: Record<string, string>): { allowed: boolean; reason?: string } {
    // Example label-based policies
    
    // Deny test modules in production
    if (labels.env === 'production' && labels.type === 'test') {
      return { allowed: false, reason: 'Test modules not allowed in production' };
    }

    // Require approval label for certain repos
    if (labels.repo === 'critical' && labels.approved !== 'true') {
      return { allowed: false, reason: 'Critical repo modules require approval' };
    }

    return { allowed: true };
  }

  // HTTP request policy
  canHttpFetch(url: string): boolean {
    if (!this.config.caps.has('http')) {
      recordMetric('wasm_policy_denied_total', { cap: 'http', reason: 'no_cap' });
      return false;
    }

    try {
      const urlObj = new URL(url);
      const host = urlObj.hostname;

      // Check allowlist
      const allowed = this.config.httpAllowlist.some(allowedHost => {
        // Support wildcards: *.example.com
        if (allowedHost.startsWith('*.')) {
          const domain = allowedHost.substring(2);
          return host.endsWith(domain);
        }
        return host === allowedHost;
      });

      if (!allowed) {
        recordMetric('wasm_policy_denied_total', { cap: 'http', reason: 'host_denied' });
        recordMetric('wasm_http_requests_total', { host, status: 'denied' });
      }

      return allowed;

    } catch {
      return false;
    }
  }

  // KV access policy
  canKvAccess(namespace: string, key: string, operation: 'get' | 'set'): boolean {
    if (!this.config.caps.has('kv')) {
      recordMetric('wasm_policy_denied_total', { cap: 'kv', reason: 'no_cap' });
      return false;
    }

    // Check namespace
    if (!this.config.kvNamespaces.includes(namespace)) {
      recordMetric('wasm_policy_denied_total', { cap: 'kv', reason: 'namespace_denied' });
      return false;
    }

    // Could add key pattern matching here
    return true;
  }

  // Emit event policy
  canEmit(event: string): boolean {
    if (!this.config.caps.has('emit')) {
      recordMetric('wasm_policy_denied_total', { cap: 'emit', reason: 'no_cap' });
      return false;
    }

    // Could restrict event namespaces
    return true;
  }
}