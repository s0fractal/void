#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { main as asc } from 'assemblyscript/cli/asc.js';
import { CID } from 'multiformats/cid';
import * as mfsha2 from 'multiformats/hashes/sha2';
import * as Digest from 'multiformats/hashes/digest';

const args = new Map();
process.argv.slice(2).forEach((a,i,arr)=>{
  if (a.startsWith('--')) args.set(a.replace(/^--/,''), arr[i+1]);
});
const IN = path.resolve(args.get('in') || 'samples/add.ts');
const OUTDIR = path.resolve(args.get('out') || 'out');
fs.mkdirSync(OUTDIR, { recursive: true });

const src = fs.readFileSync(IN, 'utf8');
const name = path.basename(IN).replace(/\.ts$/, '');

// Copy into as/genes to compile
const AS_DST = path.resolve('as/genes', name + '.ts');
fs.copyFileSync(IN, AS_DST);

// Compile with asc
const wasmPath = path.join(OUTDIR, name + '.wasm');
const textPath = path.join(OUTDIR, name + '.wat');

const ascArgs = [AS_DST, '-b', wasmPath, '-t', textPath, '--config', 'asconfig.json'];
const { error } = await asc(ascArgs, {
  stdout: process.stdout,
  stderr: process.stderr,
  readFile: (p)=>fs.readFileSync(p, 'utf8'),
  writeFile: (p, data)=>fs.writeFileSync(p, data),
  listFiles: ()=>[]
});
if (error) { console.error(error); process.exit(1); }

// Compute sha256 + CIDv1 (raw, 0x55)
const wasm = fs.readFileSync(wasmPath);
const sha256_hex = crypto.createHash('sha256').update(wasm).digest('hex');
const mh = await mfsha2.sha256.digest(wasm);
const cid = CID.createV1(0x55, mh); // raw codec

fs.writeFileSync(path.join(OUTDIR, name + '.cid.txt'), cid.toString(), 'utf8');

// Append to manifest
const manifestPath = path.join(OUTDIR, 'manifest.json');
let manifest = { genes: [] };
if (fs.existsSync(manifestPath)) manifest = JSON.parse(fs.readFileSync(manifestPath,'utf8'));
manifest.genes = manifest.genes.filter(g => g.name !== name);
manifest.genes.push({
  name, wasm: path.basename(wasmPath), size: wasm.length,
  sha256: sha256_hex, cid: cid.toString()
});
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.error(`✔ built ${name}.wasm  size=${wasm.length}  cid=${cid}`);
