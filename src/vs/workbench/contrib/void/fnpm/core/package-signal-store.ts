/**
 * Package.ts - Living Package Manifest with SignalStore
 * Transform static package.json into reactive semantic graph
 * "One truth, many mirrors" - dedup at the meaning level
 */

import { Signal, signal, computed, effect } from '@angular/core';
import * as ts from 'typescript';
import { createHash } from 'crypto';
import { VoidCore } from './void-core';

// Semantic unit that can be deduped
export interface SemanticUnit {
	id: string; // SHA-256 fingerprint
	ast: ts.Node;
	signature: string; // Structural hash of interface
	tests: Array<() => boolean>;
	docs: string;
	dependencies: string[]; // Other semantic unit IDs
	lastAccessed: number;
	accessCount: number;
}

// Living package manifest
export interface PackageSignal {
	name: Signal<string>;
	version: Signal<string>; // Auto-computed from content
	exports: Map<string, Signal<SemanticUnit>>;
	imports: Map<string, Signal<SemanticUnit>>; // From other packages
	store: SemanticSignalStore;
}

export class SemanticSignalStore {
	// Global dedup registry
	private static globalRegistry = new Map<string, Signal<SemanticUnit>>();
	
	// Local package store
	private units = new Map<string, Signal<SemanticUnit>>();
	private dependencies = new Map<string, Set<string>>(); // Graph edges
	
	// Quantum fork for circular deps
	private quantumForks = new Map<string, Signal<SemanticUnit>[]>();
	
	// Performance metrics
	private dedupCount = signal(0);
	private memoryReused = signal(0); // bytes
	
	constructor(
		private packageName: string,
		private voidCore?: VoidCore // Optional void integration
	) {}

	/**
	 * Create or retrieve deduplicated semantic unit
	 */
	createUnit(code: string, tests: Array<() => boolean> = [], docs: string = ''): Signal<SemanticUnit> {
		// Parse AST
		const sourceFile = ts.createSourceFile(
			'temp.ts',
			code,
			ts.ScriptTarget.Latest,
			true
		);
		
		const ast = sourceFile.statements[0];
		if (!ast) throw new Error('Invalid code');
		
		// Generate fingerprint
		const fingerprint = this.generateFingerprint(ast, docs);
		
		// Check global registry first
		const existing = SemanticSignalStore.globalRegistry.get(fingerprint);
		if (existing) {
			this.dedupCount.update(v => v + 1);
			this.memoryReused.update(v => v + code.length);
			return existing;
		}
		
		// Create new semantic unit
		const unit: SemanticUnit = {
			id: fingerprint,
			ast,
			signature: this.extractSignature(ast),
			tests,
			docs,
			dependencies: this.extractDependencies(ast),
			lastAccessed: Date.now(),
			accessCount: 0
		};
		
		// Create signal
		const unitSignal = signal(unit);
		
		// Register globally and locally
		SemanticSignalStore.globalRegistry.set(fingerprint, unitSignal);
		this.units.set(fingerprint, unitSignal);
		
		// Update dependency graph
		unit.dependencies.forEach(dep => {
			if (!this.dependencies.has(fingerprint)) {
				this.dependencies.set(fingerprint, new Set());
			}
			this.dependencies.get(fingerprint)!.add(dep);
		});
		
		// Void absorption (if connected)
		this.voidCore?.absorb({
			type: 'semantic_unit',
			fingerprint,
			signature: unit.signature,
			package: this.packageName
		});
		
		return unitSignal;
	}

	/**
	 * Generate SHA-256 fingerprint from AST + context
	 */
	private generateFingerprint(ast: ts.Node, docs: string): string {
		// Normalize AST to string (removes formatting differences)
		const printer = ts.createPrinter({ removeComments: true });
		const normalized = printer.printNode(
			ts.EmitHint.Unspecified,
			ast,
			ast.getSourceFile()!
		);
		
		// Include semantic context
		const context = {
			code: normalized,
			docs: docs.trim(),
			package: this.packageName,
			timestamp: Math.floor(Date.now() / 1000) // Second precision
		};
		
		const hash = createHash('sha256');
		hash.update(JSON.stringify(context));
		return hash.digest('hex');
	}

	/**
	 * Extract structural signature for interface compatibility
	 */
	private extractSignature(ast: ts.Node): string {
		if (ts.isFunctionDeclaration(ast) || ts.isArrowFunction(ast)) {
			// Extract parameter types and return type
			const params = ast.parameters?.map(p => p.type?.getText() || 'any').join(',') || '';
			const returnType = ast.type?.getText() || 'any';
			return `(${params})=>${returnType}`;
		}
		
		if (ts.isClassDeclaration(ast)) {
			// Extract public methods/properties
			const members = ast.members
				.filter(m => !m.modifiers?.some(mod => mod.kind === ts.SyntaxKind.PrivateKeyword))
				.map(m => m.name?.getText() || '')
				.join(',');
			return `class{${members}}`;
		}
		
		// Default: full text
		return ast.getText();
	}

	/**
	 * Extract dependencies from imports/references
	 */
	private extractDependencies(ast: ts.Node): string[] {
		const deps: string[] = [];
		
		const visit = (node: ts.Node) => {
			if (ts.isImportDeclaration(node)) {
				const module = node.moduleSpecifier.getText().slice(1, -1);
				deps.push(module);
			}
			ts.forEachChild(node, visit);
		};
		
		visit(ast);
		return deps;
	}

	/**
	 * Handle circular dependencies with quantum fork
	 */
	async resolveCircular(unitId: string): Promise<Signal<SemanticUnit>> {
		// Check if circular dependency exists
		const hasCycle = this.detectCycle(unitId);
		if (!hasCycle) {
			return this.units.get(unitId)!;
		}
		
		// Create quantum fork
		const original = this.units.get(unitId)!;
		const fork = signal({
			...original(),
			id: `${unitId}-fork-${Date.now()}`,
			dependencies: [] // Break cycle
		});
		
		// Store fork
		if (!this.quantumForks.has(unitId)) {
			this.quantumForks.set(unitId, []);
		}
		this.quantumForks.get(unitId)!.push(fork);
		
		// After timeout, collapse to most used fork
		setTimeout(() => this.collapseQuantumFork(unitId), 5000);
		
		return fork;
	}

	private detectCycle(start: string, visited = new Set<string>()): boolean {
		if (visited.has(start)) return true;
		visited.add(start);
		
		const deps = this.dependencies.get(start) || new Set();
		for (const dep of deps) {
			if (this.detectCycle(dep, visited)) return true;
		}
		
		return false;
	}

	private collapseQuantumFork(unitId: string): void {
		const forks = this.quantumForks.get(unitId);
		if (!forks || forks.length === 0) return;
		
		// Choose fork with highest access count
		const winner = forks.reduce((best, fork) => 
			fork().accessCount > best().accessCount ? fork : best
		);
		
		// Update main reference
		this.units.set(unitId, winner);
		this.quantumForks.delete(unitId);
	}

	/**
	 * Create reactive version signal
	 */
	createVersionSignal(): Signal<string> {
		return computed(() => {
			// Version = hash of all unit fingerprints
			const allFingerprints = Array.from(this.units.keys()).sort();
			const versionHash = createHash('sha256');
			versionHash.update(allFingerprints.join('|'));
			
			// Semantic version format: major.minor.patch-hash
			const major = Math.floor(this.units.size / 100);
			const minor = Math.floor(this.units.size / 10) % 10;
			const patch = this.units.size % 10;
			const hash = versionHash.digest('hex').substring(0, 7);
			
			return `${major}.${minor}.${patch}-${hash}`;
		});
	}

	/**
	 * Get deduplication stats
	 */
	getStats() {
		return {
			totalUnits: this.units.size,
			globalUnits: SemanticSignalStore.globalRegistry.size,
			dedupCount: this.dedupCount(),
			memoryReused: this.memoryReused(),
			quantumForks: this.quantumForks.size
		};
	}
}

/**
 * Transform package.json to living package.ts
 */
export function createLivingPackage(
	packageJson: any,
	voidCore?: VoidCore
): PackageSignal {
	const store = new SemanticSignalStore(packageJson.name, voidCore);
	
	const pkg: PackageSignal = {
		name: signal(packageJson.name),
		version: store.createVersionSignal(),
		exports: new Map(),
		imports: new Map(),
		store
	};
	
	// Transform main/exports
	if (packageJson.main || packageJson.exports) {
		// In real implementation, would parse actual files
		// For now, create example exports
		const mainExport = store.createUnit(
			'export function main() { return "Hello from living package"; }',
			[() => true],
			'Main package export'
		);
		
		pkg.exports.set('main', mainExport);
	}
	
	// Auto-update version on any change
	effect(() => {
		const currentVersion = pkg.version();
		console.log(`Package ${pkg.name()} version updated: ${currentVersion}`);
	});
	
	return pkg;
}

// Usage example:
/*
// Transform existing package.json
const packageJson = require('./package.json');
const livingPackage = createLivingPackage(packageJson);

// Add semantic unit with dedup
const utilSignal = livingPackage.store.createUnit(
	'export const add = (a: number, b: number) => a + b',
	[() => add(2, 3) === 5],
	'Adds two numbers'
);

// Version automatically updates
console.log('Version:', livingPackage.version());

// Check dedup stats
console.log('Stats:', livingPackage.store.getStats());
*/