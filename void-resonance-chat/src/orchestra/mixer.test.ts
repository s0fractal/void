import { mix } from './mixer';

const res = mix([
  { agent:'Claude', role:'code', content:'...', veracity:0.9, coherence:0.85, risk:[], weight:1.1 },
  { agent:'GPT', role:'optimize', content:'...', veracity:0.82, coherence:0.8, risk:['perf'], weight:1.0 },
  { agent:'Glyph', role:'emotion', content:'svg', veracity:0.7, coherence:0.9, risk:[], weight:0.8 }
], { health:0.95, affectAlign:0.9 });

console.log(JSON.stringify(res, null, 2));
