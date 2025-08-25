#!/usr/bin/env node

// Test script for Chimera + FNPM integration
// This demonstrates how extracted genes become morphisms

import { ChimeraGeneExtractor } from './src/vs/workbench/contrib/void/fnpm/chimera/gene-extractor.js';
import { URI } from './src/vs/base/common/uri.js';
import * as fs from 'fs';
import * as path from 'path';

// Mock services for testing
const mockLogService = {
    info: (msg: string) => console.log(`[INFO] ${msg}`),
    warn: (msg: string) => console.warn(`[WARN] ${msg}`),
    error: (msg: string) => console.error(`[ERROR] ${msg}`)
};

const mockNotificationService = {
    info: (msg: string) => console.log(`🔔 ${msg}`),
    warn: (msg: string) => console.log(`⚠️ ${msg}`),
    error: (msg: string) => console.log(`❌ ${msg}`)
};

async function main() {
    console.log('🧬 Chimera + FNPM Integration Test\n');
    
    const extractor = new ChimeraGeneExtractor(
        mockLogService as any,
        mockNotificationService as any
    );
    
    // Test file path
    const testFile = path.resolve('./test-pure-functions.ts');
    const fileUri = URI.file(testFile);
    
    console.log(`📄 Extracting genes from: ${testFile}\n`);
    
    try {
        // Extract genes
        const genome = await extractor.extractGenes(fileUri);
        
        console.log(`\n✨ Extracted ${genome.genes.length} genes at ${genome.resonanceFrequency}Hz\n`);
        
        // Convert each gene to morphism
        const morphismsDir = './extracted-morphisms';
        fs.mkdirSync(morphismsDir, { recursive: true });
        
        for (const gene of genome.genes) {
            console.log(`\n🧬 Gene: ${gene.name}`);
            console.log(`   AST Hash: ${gene.astHash}`);
            console.log(`   Purity: ${(gene.purity * 100).toFixed(0)}%`);
            console.log(`   WASM Ready: ${gene.wasmReady}`);
            
            // Convert to morphism
            const morphism = extractor.convertToMorphism(gene);
            
            // Save morphism
            const morphismPath = path.join(morphismsDir, `${gene.name}.fnpm`);
            fs.writeFileSync(morphismPath, morphism, 'utf8');
            console.log(`   → Saved as: ${morphismPath}`);
        }
        
        console.log('\n🎉 Integration test complete!');
        console.log(`\n📂 Morphisms saved in: ${path.resolve(morphismsDir)}`);
        console.log('\nNext steps:');
        console.log('1. Implement IPFS storage for genes');
        console.log('2. Add WASM compilation');
        console.log('3. Create UI in Void sidebar');
        console.log('4. Enable recursive codebase decompilation');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

// Run the test
main().catch(console.error);