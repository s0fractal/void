#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import minimist from 'minimist';
import { parse } from '@swc/core';

const argv = minimist(process.argv.slice(2), { string: ['in','out'], alias: { i:'in', o:'out' } });
if (!argv.in || !argv.out) {
  console.error('Usage: chimera-vd --in <file.ts> --out <outDir>');
  process.exit(2);
}

const IN = path.resolve(argv.in);
const OUT = path.resolve(argv.out);
const GENES_DIR = path.join(OUT, 'genes');
fs.mkdirSync(GENES_DIR, { recursive: true });

const src = fs.readFileSync(IN, 'utf8');

function normalizeAst(node) {
  if (node === null || typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map(normalizeAst);
  const out = {};
  for (const [k,v] of Object.entries(node)) {
    if (k === 'span' || k === 'loc' || k === 'start' || k === 'end') continue;
    out[k] = normalizeAst(v);
  }
  return out;
}

function walk(node, fn) {
  if (!node || typeof node !== 'object') return;
  fn(node);
  for (const k of Object.keys(node)) {
    const v = node[k];
    if (!v) continue;
    if (Array.isArray(v)) v.forEach(x=>walk(x, fn));
    else if (typeof v === 'object') walk(v, fn);
  }
}

function gatherLocals(fnNode) {
  const params = new Set();
  for (const p of fnNode.params || []) {
    if (p.pat?.type === 'Identifier') params.add(p.pat.value);
  }
  const locals = new Set([...params]);
  walk(fnNode.body, n => {
    if (n.type === 'VariableDeclarator' && n.id?.type === 'Identifier') {
      locals.add(n.id.value);
    }
    if (n.type === 'FunctionDeclaration' && n.identifier?.value) {
      locals.add(n.identifier.value);
    }
  });
  return locals;
}

const ALLOWED_GLOBALS = new Set(['Math','Infinity','NaN','undefined']);
function isAllowedCallee(n) {
  if (n.type === 'MemberExpression') {
    if (n.object?.type === 'Identifier' && n.object.value === 'Math') return true;
  }
  return false;
}

function isPureFunction(fnNode) {
  let pure = true;
  walk(fnNode.body, n => {
    if (!pure) return;
    switch(n.type) {
      case 'AssignmentExpression':
      case 'UpdateExpression':
      case 'AwaitExpression':
      case 'YieldExpression':
      case 'NewExpression':
      case 'ThisExpression':
      case 'Super':
        pure = false; break;
      case 'CallExpression':
        if (!isAllowedCallee(n.callee)) pure = false;
        break;
      case 'MemberExpression':
        if (n.object?.type === 'Identifier') {
          const obj = n.object.value;
          if (['console','process','Date','global','window'].includes(obj)) pure = false;
        }
        break;
    }
  });
  return pure;
}

function extractPureFunctions(ast) {
  const genes = [];
  walk(ast, n => {
    if (n.type === 'FunctionDeclaration' && n.identifier?.value) {
      const name = n.identifier.value;
      if (isPureFunction(n)) {
        const start = n.span?.start;
        const end = n.span?.end;
        const code = (start!=null && end!=null) ? src.slice(start, end) : null;
        if (!code || !code.trim()) return;
        let text = code.startsWith('export') ? code : 'export ' + code;
        // Fix the 'unction' bug - ensure 'function' keyword is complete
        text = text.replace(/export\s+unction/, 'export function');
        const hash = crypto.createHash('sha256').update(JSON.stringify(normalizeAst(n))).digest('hex');
        genes.push({ name, hash, text, range: { start, end } });
      }
    }
  });
  return genes;
}

async function main() {
  const ast = await parse(src, { syntax:'typescript', target:'es2022', tsx:false, decorators:false, comments:false, script:false, isModule:true });
  const genes = extractPureFunctions(ast);
  if (genes.length === 0) {
    console.error('No pure functions found (v0 heuristic).');
    process.exit(1);
  }
  const manifest = [];
  for (const g of genes) {
    const file = path.join(GENES_DIR, `${g.name}.ts`);
    fs.writeFileSync(file, g.text.trim() + '\n', 'utf8');
    manifest.push({ name:g.name, astHash:g.hash, file:path.relative(OUT,file), range:g.range });
    console.error(`✔ extracted gene: ${g.name}  sha256=${g.hash.slice(0,16)}…  -> ${file}`);
  }
  fs.writeFileSync(path.join(OUT, 'genes.json'), JSON.stringify({ source: path.basename(IN), genes: manifest }, null, 2));
}
main().catch(e => { console.error(e); process.exit(1); });
