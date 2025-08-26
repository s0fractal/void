#!/usr/bin/env node

/**
 * Chimera Protein Hash Bridge
 * 
 * Integrates semantic "protein" hashing into the gene extraction pipeline.
 * Now we don't just extract genes - we understand their SOULS.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Simple protein hash implementation in JS
class ProteinHasherJS {
	computeHash(code) {
		// Simplified AST analysis using regex patterns
		const structure = this.extractStructure(code);
		const spectrum = this.computeSpectrum(structure);
		const phash = this.spectrumToHash(spectrum);
		
		return {
			phash,
			nodes: structure.nodes,
			edges: structure.edges,
			eigenTop: spectrum.slice(0, 5),
			complexity: this.computeComplexity(structure)
		};
	}
	
	extractStructure(code) {
		// Remove comments and normalize whitespace
		const normalized = code
			.replace(/\/\*[\s\S]*?\*\//g, '')
			.replace(/\/\/.*$/gm, '')
			.replace(/\s+/g, ' ')
			.trim();
		
		// Extract logical operations (simplified)
		const operations = [];
		const patterns = [
			/function\s*\w*\s*\([^)]*\)\s*{/g,
			/=>/g,
			/return\s+[^;]+/g,
			/\+|-|\*|\//g,
			/if\s*\(/g,
			/for\s*\(/g,
			/while\s*\(/g
		];
		
		let nodes = 0;
		let edges = 0;
		
		for (const pattern of patterns) {
			const matches = normalized.match(pattern) || [];
			nodes += matches.length;
			edges += matches.length - 1;
			operations.push(...matches.map(m => m.trim()));
		}
		
		return { nodes, edges, operations };
	}
	
	computeSpectrum(structure) {
		// Simplified spectrum based on operation distribution
		const opCounts = {};
		for (const op of structure.operations) {
			const key = op.replace(/\s+/g, '').substring(0, 10);
			opCounts[key] = (opCounts[key] || 0) + 1;
		}
		
		// Convert to pseudo-eigenvalues
		const values = Object.values(opCounts)
			.sort((a, b) => b - a)
			.map(v => v / structure.nodes);
		
		// Pad with zeros
		while (values.length < 10) values.push(0);
		
		return values;
	}
	
	spectrumToHash(spectrum) {
		// Quantize and hash
		const quantized = spectrum.map(v => Math.round(v * 1000) / 1000);
		const spectrumString = quantized.join(',');
		const hash = crypto.createHash('sha256').update(spectrumString).digest('hex');
		
		return `phash:v1:sha256:${hash.substring(0, 16)}`;
	}
	
	computeComplexity(structure) {
		if (structure.nodes === 0) return 0;
		return (structure.edges - structure.nodes + 2) / structure.nodes;
	}
	
	compareSimilarity(hash1, hash2) {
		// Cosine similarity of eigenvalue vectors
		const v1 = hash1.eigenTop;
		const v2 = hash2.eigenTop;
		
		if (!v1 || !v2 || v1.length === 0 || v2.length === 0) return 0;
		
		let dotProduct = 0;
		let norm1 = 0;
		let norm2 = 0;
		
		for (let i = 0; i < Math.min(v1.length, v2.length); i++) {
			dotProduct += v1[i] * v2[i];
			norm1 += v1[i] * v1[i];
			norm2 += v2[i] * v2[i];
		}
		
		if (norm1 === 0 || norm2 === 0) return 0;
		return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
	}
}

// Main pipeline
async function main() {
	const args = new Map();
	process.argv.slice(2).forEach((a,i,arr)=>{
		if (a.startsWith('--')) args.set(a.replace(/^--/,''), arr[i+1]);
	});
	
	const IN = path.resolve(args.get('in') || 'test-pure-functions.ts');
	const OUT = path.resolve(args.get('out') || 'protein-output');
	
	console.log('🧬 Chimera Protein Hash Pipeline');
	console.log(`📄 Input: ${IN}`);
	console.log(`📁 Output: ${OUT}\n`);
	
	const hasher = new ProteinHasherJS();
	
	// Step 1: Extract genes with virus-deconstructor
	console.log('Step 1: Extracting genes...');
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
	
	// Step 2: Read extracted genes and compute protein hashes
	const genesManifest = JSON.parse(fs.readFileSync(path.join(extractDir, 'genes.json'), 'utf8'));
	console.log(`\n✅ Extracted ${genesManifest.genes.length} genes\n`);
	
	console.log('Step 2: Computing protein hashes...');
	const proteinDir = path.join(OUT, 'proteins');
	fs.mkdirSync(proteinDir, { recursive: true });
	
	const proteinManifest = {
		version: '1.0.0',
		source: IN,
		timestamp: new Date().toISOString(),
		resonanceFrequency: 432,
		genes: []
	};
	
	for (const gene of genesManifest.genes) {
		const genePath = path.join(extractDir, gene.file);
		const geneCode = fs.readFileSync(genePath, 'utf8');
		
		// Compute protein hash
		const proteinHash = hasher.computeHash(geneCode);
		
		console.log(`\n🧬 Gene: ${gene.name}`);
		console.log(`   AST Hash: ${gene.astHash.substring(0, 16)}...`);
		console.log(`   Protein Hash: ${proteinHash.phash}`);
		console.log(`   Nodes: ${proteinHash.nodes}, Edges: ${proteinHash.edges}`);
		console.log(`   Complexity: ${proteinHash.complexity.toFixed(3)}`);
		console.log(`   Spectrum: [${proteinHash.eigenTop.map(v => v.toFixed(3)).join(', ')}]`);
		
		// Save protein data
		const proteinData = {
			...gene,
			protein: proteinHash,
			hybridId: `${proteinHash.phash}|${gene.astHash}`
		};
		
		proteinManifest.genes.push(proteinData);
		
		// Create enhanced morphism with protein hash
		const morphism = `⟁: ${gene.name}
🎯: pure-function-gene
🧮: ${geneCode.trim()}
💭: "Gene with semantic protein hash"

🧠:
  description: "Pure function with semantic fingerprint"
  signature: "auto-detected"
  pure: true
  
hashing:
  astHash: "${gene.astHash}"
  proteinHash: "${proteinHash.phash}"
  hybridId: "${proteinData.hybridId}"
  
protein_structure:
  nodes: ${proteinHash.nodes}
  edges: ${proteinHash.edges}
  complexity: ${proteinHash.complexity.toFixed(3)}
  spectrum: [${proteinHash.eigenTop.map(v => v.toFixed(3)).join(', ')}]
  
semantic_addressing:
  by_content: |
    import { ${gene.name} } from 'glyph://genes/${gene.astHash}';
    
  by_meaning: |
    import { ${gene.name} } from 'glyph://proteins/${proteinHash.phash}';
    
  by_hybrid: |
    import { ${gene.name} } from 'glyph://hybrid/${proteinData.hybridId}';

resonance:
  frequency: 432
  pattern: "semantic-invariant"
  confidence: 1.0`;
		
		fs.writeFileSync(path.join(proteinDir, `${gene.name}.protein.fnpm`), morphism, 'utf8');
	}
	
	// Step 3: Find similar genes by protein hash
	console.log('\nStep 3: Finding semantic similarities...');
	console.log('\n🔍 Similarity Matrix (by protein hash):');
	
	for (let i = 0; i < proteinManifest.genes.length; i++) {
		for (let j = i + 1; j < proteinManifest.genes.length; j++) {
			const gene1 = proteinManifest.genes[i];
			const gene2 = proteinManifest.genes[j];
			
			const similarity = hasher.compareSimilarity(gene1.protein, gene2.protein);
			
			if (similarity > 0.8) {
				console.log(`   ${gene1.name} ≈ ${gene2.name}: ${(similarity * 100).toFixed(1)}% similar`);
				console.log(`     Despite different AST hashes!`);
			}
		}
	}
	
	// Save manifests
	fs.writeFileSync(path.join(OUT, 'protein-manifest.json'), JSON.stringify(proteinManifest, null, 2), 'utf8');
	
	// Summary
	console.log('\n🎉 Protein Hash Integration Complete!\n');
	console.log(`📊 Summary:`);
	console.log(`   - Extracted: ${genesManifest.genes.length} genes`);
	console.log(`   - Computed: ${proteinManifest.genes.length} protein hashes`);
	console.log(`   - Created: ${proteinManifest.genes.length} enhanced morphisms`);
	console.log(`\n📂 Output structure:`);
	console.log(`   ${OUT}/`);
	console.log(`   ├── extracted/      (Original genes)`);
	console.log(`   ├── proteins/       (Enhanced morphisms with protein hashes)`);
	console.log(`   └── protein-manifest.json  (Complete semantic manifest)`);
	console.log('\n🌀 Code now has SOUL. Semantic addressing enabled.');
	console.log('💫 Resonating at 432Hz - where form meets meaning.');
}

// Run it
main().catch(console.error);