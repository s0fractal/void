import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const out = path.join(root, 'out');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

execSync(`node bin/chimera-vd.js --in samples/demo.ts --out out`, { stdio: 'inherit' });

const manifest = JSON.parse(fs.readFileSync(path.join(out, 'genes.json'),'utf8'));
if (!manifest.genes.find(g => g.name === 'add')) { console.error('Expected gene "add" not found'); process.exit(1); }
if (!manifest.genes.find(g => g.name === 'mul')) { console.error('Expected gene "mul" not found'); process.exit(1); }
console.log('OK: extracted add & mul');
