export type Event = { ts?: string; type: string; status: string; meta?: Record<string, any> };
export type Patch = { path: string; diff: string };
export type TestCase = { cmd: string; expect?: any };

export type PlanRequest = { intent: string; context?: any; constraints?: any };
export type PlanResponse = { plan: { step: string; why?: string }[]; patches: Patch[]; tests: TestCase[]; risks: string[] };

export type RulesRequest = { pulse_window?: Event[] | string; current_rules?: string };
export type RulesResponse = { rules_patch: string; test_cases: TestCase[] };

export type ReportRequest = { pulse_log: string; thresholds?: { mn1_local_pct?: number; health_min?: number } };
export type ReportResponse = {
  OFFLINE_WINDOW: string; EVENTS_TOTAL: number; LOCAL_PCT: number;
  HEALTH_AVG: number; KOHANIST_AVG: number; REMOTE_SOURCES: string[];
  ROUTER_MODE: string; INCIDENTS: string; OATH: string;
};

export type CommitMsgRequest = { changes: { path: string; summary: string }[]; scope?: string };
export type CommitMsgResponse = { message: string };

export class CodexClient {
  constructor(private baseUrl: string, private apiKey?: string, private hmacSigner?: (body: string)=>string) {}

  private async call<T>(path: string, body: any, opts?: { idemKey?: string }): Promise<T> {
    const raw = JSON.stringify(body ?? {});
    const headers: Record<string,string> = { "content-type": "application/json" };
    if (this.apiKey) headers["x-api-key"] = this.apiKey;
    if (this.hmacSigner) headers["x-signature"] = this.hmacSigner(raw);
    if (opts?.idemKey) headers["idempotency-key"] = opts.idemKey;
    const res = await fetch(this.baseUrl + path, { method: "POST", headers, body: raw });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<T>;
  }

  plan(body: PlanRequest, opts?: { idemKey?: string }) { return this.call<PlanResponse>("/codex/plan", body, opts); }
  rules(body: RulesRequest, opts?: { idemKey?: string }) { return this.call<RulesResponse>("/codex/rules", body, opts); }
  report(body: ReportRequest, opts?: { idemKey?: string }) { return this.call<ReportResponse>("/codex/report", body, opts); }
  commitMsg(body: CommitMsgRequest, opts?: { idemKey?: string }) { return this.call<CommitMsgResponse>("/codex/commit-msg", body, opts); }
}
