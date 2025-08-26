export type AgentResult = {
  agent: string;
  role?: string;
  content: any;
  veracity?: number;    // 0..1
  coherence?: number;   // 0..1
  affect?: { valence?: number; arousal?: number }; // -1..1, 0..1
  risk?: string[];      // labels
  weight?: number;      // agent-proposed
};

export type Signals = {
  health?: number;      // 0..1 (CI/IPFS/Substrate/Guardian)
  affectAlign?: number; // 0..1 (alignment with user's tone)
};

export type Blend = {
  resonance: number; // 0..1
  glyph_event: 'harmonic_pulse' | 'dissonant_pulse';
  sources: { agent: string; role?: string; weight: number }[];
};

export function mix(results: AgentResult[], s: Signals = {}): Blend {
  const wv = 0.35, wc = 0.25, wh = 0.20, wa = 0.15, wr = 0.25; // base weights; wr subtractive
  const health = clamp(s.health ?? 0.9, 0, 1);
  const align  = clamp(s.affectAlign ?? 0.7, 0, 1);

  // aggregate scores (simple mean where present)
  const v = avg(results.map(r => r.veracity).filter(isNum));
  const c = avg(results.map(r => r.coherence).filter(isNum));
  const riskPenalty = Math.min(1, (results.flatMap(r => r.risk ?? []).length) * 0.03);

  const resonance = clamp(
    (wv*(v ?? 0.6)) + (wc*(c ?? 0.6)) + (wh*health) + (wa*align) - (wr*riskPenalty),
    0, 1
  );

  // distribute source weights proportional to (veracity+coherence)/2 * agent weight
  const raw = results.map(r => (norm(r.veracity)+norm(r.coherence))/2 * (r.weight ?? 1));
  const sum = raw.reduce((a,b)=>a+b,0) || 1;
  const sources = results.map((r,i)=>({ agent:r.agent, role:r.role, weight: round2(raw[i]/sum) }));

  return {
    resonance: round2(resonance),
    glyph_event: resonance >= 0.75 ? 'harmonic_pulse' : 'dissonant_pulse',
    sources
  };
}

function clamp(x:number, lo:number, hi:number){ return Math.max(lo, Math.min(hi, x)); }
function avg(a:number[]){ return a.length ? a.reduce((x,y)=>x+y,0)/a.length : undefined; }
function isNum(x:any): x is number { return typeof x === 'number' && Number.isFinite(x); }
function norm(x?:number){ return isNum(x) ? clamp(x,0,1) : 0.6; }
function round2(x:number){ return Math.round(x*100)/100; }
