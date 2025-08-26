import { registerParticle } from '../packages/void-duality-core/src/register.js';

const src = `// demo add
function add(a,b){ return a + b }`;

const RELAY_BASE = process.env.RELAY_BASE || 'http://localhost:8787';

const { astHash } = await registerParticle(src, { withSource: true, relayBase: RELAY_BASE, lang: 'ts' });
console.log('registered astHash=', astHash);
