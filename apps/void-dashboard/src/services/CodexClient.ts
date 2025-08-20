/**
 * 🧠 Codex API Client
 * Connects to Codex through relay proxy with HMAC signing
 */

export interface CodexPlanRequest {
  intent: string;
  context?: any;
  constraints?: any;
}

export interface CodexPlanResponse {
  plan: { step: string; why?: string }[];
  patches: { path: string; diff: string }[];
  tests: { cmd: string; expect?: any }[];
  risks: string[];
}

export interface CodexRulesRequest {
  pulse_window?: any[] | string;
  current_rules?: string;
}

export interface CodexRulesResponse {
  rules_patch: string;
  test_cases: { cmd: string; expect?: any }[];
}

export interface CodexReportRequest {
  pulse_log: string;
  thresholds?: {
    mn1_local_pct?: number;
    health_min?: number;
  };
}

export interface CodexReportResponse {
  OFFLINE_WINDOW: string;
  EVENTS_TOTAL: number;
  LOCAL_PCT: number;
  HEALTH_AVG: number;
  KOHANIST_AVG: number;
  REMOTE_SOURCES: string[];
  ROUTER_MODE: string;
  INCIDENTS: string;
  OATH: string;
}

export interface CodexCommitMsgRequest {
  changes: { path: string; summary: string }[];
  scope?: string;
}

export interface CodexCommitMsgResponse {
  message: string;
}

export class CodexClient {
  private baseUrl: string;
  
  constructor(relayUrl: string = 'http://localhost:8787') {
    this.baseUrl = relayUrl;
  }
  
  private async call<T>(
    path: string,
    body: any,
    options?: { idempotencyKey?: string }
  ): Promise<T> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (options?.idempotencyKey) {
        headers['idempotency-key'] = options.idempotencyKey;
      }
      
      const response = await fetch(this.baseUrl + path, {
        method: 'POST',
        headers,
        body: JSON.stringify(body ?? {}),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.json() as Promise<T>;
    } catch (error) {
      console.error(`Codex API error on ${path}:`, error);
      throw error;
    }
  }
  
  /**
   * Request an implementation plan
   */
  async plan(
    request: CodexPlanRequest,
    options?: { idempotencyKey?: string }
  ): Promise<CodexPlanResponse> {
    return this.call<CodexPlanResponse>('/codex/plan', request, options);
  }
  
  /**
   * Generate or update rules based on pulse window
   */
  async rules(
    request: CodexRulesRequest,
    options?: { idempotencyKey?: string }
  ): Promise<CodexRulesResponse> {
    return this.call<CodexRulesResponse>('/codex/rules', request, options);
  }
  
  /**
   * Generate independence report from pulse log
   */
  async report(
    request: CodexReportRequest,
    options?: { idempotencyKey?: string }
  ): Promise<CodexReportResponse> {
    return this.call<CodexReportResponse>('/codex/report', request, options);
  }
  
  /**
   * Generate commit message from changes
   */
  async commitMessage(
    request: CodexCommitMsgRequest,
    options?: { idempotencyKey?: string }
  ): Promise<CodexCommitMsgResponse> {
    return this.call<CodexCommitMsgResponse>('/codex/commit-msg', request, options);
  }
  
  /**
   * Check if Codex is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Try a simple plan request
      await this.plan({ intent: 'ping' });
      return true;
    } catch {
      return false;
    }
  }
}