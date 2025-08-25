#!/usr/bin/env node

/**
 * Chimera Integration Bridge
 * Connects virus-deconstructor → WASM compiler → FNPM morphisms
 * 
 * Usage: node chimera-integration-bridge.mjs --in source.ts --out output-dir
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Parse arguments
const args = new Map();
process.argv.slice(2).forEach((a,i,arr)=>{
  if (a.startsWith('--')) args.set(a.replace(/^--/,''), arr[i+1]);
});

const IN = path.resolve(args.get('in') || 'test-pure-functions.ts');
const OUT = path.resolve(args.get('out') || 'chimera-output');

console.log('🧬 Chimera Integration Bridge');
console.log(`📄 Input: ${IN}`);
console.log(`📁 Output: ${OUT}\n`);

// Step 1: Extract genes with virus-deconstructor
console.log('Step 1: Extracting pure functions...');
const extractDir = path.join(OUT, 'extracted');
fs.mkdirSync(extractDir, { recursive: true });

try {
  execSync(`node ${projectRoot}/tools/chimera-virus-deconstructor/bin/chimera-vd.js --in ${IN} --out ${extractDir}`, {
    cwd: projectRoot,
    stdio: 'inherit'
  });
} catch (error) {
  console.error('❌ Extraction failed:', error.message);
  process.exit(1);
}

// Step 2: Read extracted genes manifest
const genesManifest = JSON.parse(fs.readFileSync(path.join(extractDir, 'genes.json'), 'utf8'));
console.log(`\n✅ Extracted ${genesManifest.genes.length} genes\n`);

// Step 3: Compile each gene to WASM
console.log('Step 2: Compiling genes to WASM...');
const wasmDir = path.join(OUT, 'wasm');
fs.mkdirSync(wasmDir, { recursive: true });

const wasmManifest = { genes: [], resonanceFrequency: 432 };

for (const gene of genesManifest.genes) {
  console.log(`\n🧬 Processing gene: ${gene.name}`);
  
  const genePath = path.join(extractDir, gene.file);
  const geneCode = fs.readFileSync(genePath, 'utf8');
  
  // Convert TypeScript types to AssemblyScript types
  const asCode = geneCode
    .replace(/: number/g, ': f64')
    .replace(/export function/g, 'export function');
  
  // Write AssemblyScript version
  const asPath = path.join(wasmDir, `${gene.name}.as.ts`);
  fs.writeFileSync(asPath, asCode, 'utf8');
  
  try {
    // Compile to WASM using our simple compiler
    execSync(`node ${projectRoot}/tools/chimera-wasm-ipfs-starter/scripts/compile-gene-simple.mjs --in ${asPath} --out ${wasmDir}`, {
      cwd: projectRoot,
      stdio: 'inherit'
    });
    
    // Read the generated manifest to get CID
    const tempManifest = JSON.parse(fs.readFileSync(path.join(wasmDir, 'manifest.json'), 'utf8'));
    const compiledGene = tempManifest.genes.find(g => g.name === gene.name);
    
    if (compiledGene) {
      wasmManifest.genes.push({
        ...gene,
        ...compiledGene,
        astHash: gene.astHash
      });
    }
  } catch (error) {
    console.warn(`⚠️  Failed to compile ${gene.name} to WASM:`, error.message);
  }
}

// Step 4: Generate FNPM morphisms
console.log('\nStep 3: Generating FNPM morphisms...');
const morphismDir = path.join(OUT, 'morphisms');
fs.mkdirSync(morphismDir, { recursive: true });

for (const gene of wasmManifest.genes) {
  const morphism = `⟁: ${gene.name}
🎯: pure-function-gene
🧮: // WASM binary at CID: ${gene.cid}
💭: "Extracted pure function compiled to WASM"

🧠:
  description: "Pure function extracted by Chimera"
  signature: "auto-detected"
  pure: true
  astHash: "${gene.astHash}"
  
wasm:
  cid: "${gene.cid}"
  sha256: "${gene.sha256}"
  size: ${gene.size}
  codec: "raw"

gene_metadata:
  extraction_time: ${new Date().toISOString()}
  source_file: "${genesManifest.source}"
  
usage:
  direct: |
    import { ${gene.name} } from 'glyph://genes/${gene.astHash}';
    
  wasm: |
    const wasmModule = await fnpm.loadWasm('${gene.cid}');
    const result = wasmModule.${gene.name}(1, 2);
    
  composed: |
    const enhanced = fnpm.compose(
      'glyph://genes/${gene.astHash}',
      'glyph://optimizer@quantum'
    );

resonance:
  frequency: 432
  pattern: "pure-function"
  confidence: 1.0`;
  
  fs.writeFileSync(path.join(morphismDir, `${gene.name}.fnpm`), morphism, 'utf8');
  console.log(`✅ Generated morphism: ${gene.name}.fnpm`);
}

// Step 5: Generate genome manifest
const genomeManifest = {
  version: "1.0.0",
  source: IN,
  timestamp: new Date().toISOString(),
  resonanceFrequency: 432,
  genes: wasmManifest.genes,
  morphisms: wasmManifest.genes.map(g => `${g.name}.fnpm`)
};

fs.writeFileSync(path.join(OUT, 'genome.json'), JSON.stringify(genomeManifest, null, 2), 'utf8');

// Summary
console.log('\n🎉 Chimera Integration Complete!\n');
console.log(`📊 Summary:`);
console.log(`   - Extracted: ${genesManifest.genes.length} genes`);
console.log(`   - Compiled: ${wasmManifest.genes.length} to WASM`);
console.log(`   - Generated: ${wasmManifest.genes.length} morphisms`);
console.log(`\n📂 Output structure:`);
console.log(`   ${OUT}/`);
console.log(`   ├── extracted/    (TypeScript genes)`);
console.log(`   ├── wasm/        (WASM binaries + CIDs)`);
console.log(`   ├── morphisms/   (FNPM morphism files)`);
console.log(`   └── genome.json  (Complete manifest)`);
console.log('\n🌀 All systems resonating at 432Hz');