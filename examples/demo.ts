import { astHash, signal, bindToRelay } from '../packages/void-duality-core/src/index.js';

const addSrc = `function add(a,b){return a+b}`;
const h = astHash(addSrc);
const p = { lang:'ts' as const, astHash: h };

const w = signal(p, { frequency: 432, phase: 0, liveValue: (a:number,b:number)=>a+b });
const ops = bindToRelay(w, p, process.env.RELAY_BASE || 'http://localhost:8787');

(async () => {
  // particle register
  await fetch((process.env.RELAY_BASE||'http://localhost:8787') + '/duality/particle', {
    method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ astHash:h, lang:'ts' })
  });

  // wave emit
  await fetch((process.env.RELAY_BASE||'http://localhost:8787') + '/duality/wave', {
    method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ astHash:h, amplitude:1, phase:0, freq:432, ttlMs:5000 })
  });

  const res = await ops.call(2,3);
  console.log('add(2,3)=', res);

  // hot patch -> add3
  const add3Src = `function add(a,b){return a+b+1}`;
  ops.hotPatch(add3Src);

  const res2 = await ops.call(2,3);
  console.log('add*(2,3)=', res2);

  // rollback
  ops.rollback();
  const res3 = await ops.call(2,3);
  console.log('add^(2,3)=', res3);
})();
