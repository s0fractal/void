// samples/demo.ts
export function add(a: number, b: number): number { return a + b; }
function impure(x: number) { console.log('side effect', x); return x + 1; }
export function mul(a: number, b: number) { return Math.imul(a, b); }
