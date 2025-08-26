/**
 * Demo: Transform package.json → living package.ts
 * Shows semantic deduplication in action
 */

import { createLivingPackage, SemanticSignalStore } from '../core/package-signal-store';
import { signal, effect } from '@angular/core';

// Simulate multiple packages with duplicate code
const packageA = {
	name: '@company/utils',
	version: '1.0.0',
	main: './index.js'
};

const packageB = {
	name: '@company/helpers', 
	version: '2.0.0',
	main: './index.js'
};

async function demonstrateSemanticDedup() {
	console.log('🔗 Package.json → Package.ts Transformation Demo\n');

	// Create living packages
	const livingA = createLivingPackage(packageA);
	const livingB = createLivingPackage(packageB);

	console.log('📦 Created living packages:');
	console.log(`  ${livingA.name()} - version: ${livingA.version()}`);
	console.log(`  ${livingB.name()} - version: ${livingB.version()}\n`);

	// Add identical functions to both packages
	console.log('➕ Adding identical "add" function to both packages...');
	
	const addCodeA = livingA.store.createUnit(
		'export const add = (a: number, b: number): number => a + b',
		[() => {
			const add = (a: number, b: number) => a + b;
			return add(2, 3) === 5;
		}],
		'Adds two numbers'
	);

	const addCodeB = livingB.store.createUnit(
		'export const add = (a: number, b: number): number => a + b', // Exact same!
		[() => {
			const add = (a: number, b: number) => a + b;
			return add(5, 7) === 12;
		}],
		'Adds two numbers'
	);

	// Check if they're the same signal
	console.log(`\n🔍 Are they the same signal? ${addCodeA === addCodeB ? 'YES! ✅' : 'NO ❌'}`);
	console.log(`   Memory reused: ${livingB.store.getStats().memoryReused} bytes`);
	console.log(`   Dedup count: ${livingB.store.getStats().dedupCount}\n`);

	// Add different functions
	console.log('➕ Adding different utility functions...');
	
	const multiplyA = livingA.store.createUnit(
		'export const multiply = (a: number, b: number): number => a * b',
		[() => {
			const multiply = (a: number, b: number) => a * b;
			return multiply(3, 4) === 12;
		}]
	);

	const divideB = livingB.store.createUnit(
		'export const divide = (a: number, b: number): number => a / b',
		[() => {
			const divide = (a: number, b: number) => a / b;
			return divide(10, 2) === 5;
		}]
	);

	// Watch version changes
	console.log('\n👁️ Watching version changes...');
	
	effect(() => {
		console.log(`  📦 ${livingA.name()} version: ${livingA.version()}`);
	});

	effect(() => {
		console.log(`  📦 ${livingB.name()} version: ${livingB.version()}`);
	});

	// Simulate hot patch
	console.log('\n🔥 Hot patching the add function...');
	
	const patchedAdd = livingA.store.createUnit(
		'export const add = (a: number, b: number): number => a + b + 0', // Tiny change
		[() => {
			const add = (a: number, b: number) => a + b + 0;
			return add(1, 1) === 2;
		}],
		'Adds two numbers (patched for floating point)'
	);

	// Final stats
	console.log('\n📊 Final Statistics:');
	console.log('Package A:', livingA.store.getStats());
	console.log('Package B:', livingB.store.getStats());
	
	// Global registry size
	console.log(`\n🌍 Global semantic units: ${SemanticSignalStore['globalRegistry'].size}`);
	console.log('   (Despite multiple packages, shared functions stored once!)\n');

	// Demonstrate semantic import
	console.log('🎯 Semantic Import Example:');
	console.log('  Traditional: import { add } from "@company/utils"');
	console.log('  Semantic:    import { add } from "glyph://math/add@pure"');
	console.log('  By intent:   import { calc } from "glyph://intent:arithmetic"');
	console.log('\n💡 Same function, no matter where it lives!');
}

// Run demo
demonstrateSemanticDedup().catch(console.error);

/* Expected output:

🔗 Package.json → Package.ts Transformation Demo

📦 Created living packages:
  @company/utils - version: 0.0.0-abc1234
  @company/helpers - version: 0.0.0-def5678

➕ Adding identical "add" function to both packages...

🔍 Are they the same signal? YES! ✅
   Memory reused: 64 bytes
   Dedup count: 1

➕ Adding different utility functions...

👁️ Watching version changes...
  📦 @company/utils version: 0.0.2-ghi9012
  📦 @company/helpers version: 0.0.1-jkl3456

🔥 Hot patching the add function...

📊 Final Statistics:
Package A: { totalUnits: 2, dedupCount: 0, memoryReused: 0 }
Package B: { totalUnits: 2, dedupCount: 1, memoryReused: 64 }

🌍 Global semantic units: 4
   (Despite multiple packages, shared functions stored once!)

🎯 Semantic Import Example:
  Traditional: import { add } from "@company/utils"
  Semantic:    import { add } from "glyph://math/add@pure"
  By intent:   import { calc } from "glyph://intent:arithmetic"

💡 Same function, no matter where it lives!
*/