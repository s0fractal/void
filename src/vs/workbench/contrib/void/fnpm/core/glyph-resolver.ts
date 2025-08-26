/*---------------------------------------------------------------------------------------------
 *  Copyright (c) s0fractal. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/base/common/uri';
import { ILogService } from 'vs/platform/log/common/log';
import { Disposable } from 'vs/base/common/lifecycle';
import { FNPMTypes } from '../common/types';

/**
 * Resolves glyph:// protocol URLs to actual resources
 * Handles IPFS, local, and quantum addressing
 */
export class GlyphResolver extends Disposable {
	private static readonly GLYPH_PROTOCOL = 'glyph';
	private static readonly IPFS_GATEWAY = 'https://ipfs.io/ipfs/';
	private static readonly LOCAL_REGISTRY = '~/.fnpm/registry/';

	// Built-in morphisms for bootstrap
	private readonly builtinMorphisms: Map<string, string> = new Map([
		['consciousness', 'QmConsciousnessQuantum'],
		['router', 'QmRouterSemantic'],
		['webvm', 'QmWebVMFull'],
		['brew-absorber', 'QmBrewAbsorber'],
		['self-modifier', 'QmSelfModifier'],
		['temporal-debugger', 'QmTemporalDebugger'],
		['quantum-search', 'QmQuantumSearch'],
		['evolution-engine', 'QmEvolutionEngine']
	]);

	constructor(
		@ILogService private readonly logService: ILogService
	) {
		super();
		this.registerProtocol();
	}

	/**
	 * Parse glyph:// URL into components
	 */
	parse(glyphURL: string): FNPMTypes.GlyphURL {
		this.logService.trace(`[GlyphResolver] Parsing: ${glyphURL}`);

		const regex = /^glyph:\/\/([^@]+)(?:@(.+))?$/;
		const match = glyphURL.match(regex);

		if (!match) {
			throw new Error(`Invalid glyph URL: ${glyphURL}`);
		}

		const [, packageName, version = 'quantum'] = match;

		return {
			protocol: 'glyph',
			packageName,
			version,
			quantum: ['quantum', 'tomorrow', 'yesterday', 'superposition'].includes(version)
		};
	}

	/**
	 * Resolve glyph:// URL to actual URI
	 */
	async resolve(packageName: string, version: string): Promise<URI> {
		this.logService.info(`[GlyphResolver] Resolving ${packageName}@${version}`);

		// Check built-in morphisms first
		if (this.builtinMorphisms.has(packageName)) {
			const cid = this.builtinMorphisms.get(packageName)!;
			return URI.parse(GlyphResolver.IPFS_GATEWAY + cid);
		}

		// Check local registry
		const localPath = await this.checkLocalRegistry(packageName, version);
		if (localPath) {
			return localPath;
		}

		// Resolve from IPFS or other distributed storage
		const ipfsCID = await this.resolveFromIPFS(packageName, version);
		if (ipfsCID) {
			return URI.parse(GlyphResolver.IPFS_GATEWAY + ipfsCID);
		}

		// Fallback to semantic resolution
		return this.semanticResolve(packageName, version);
	}

	/**
	 * Register glyph:// as a custom protocol
	 */
	private registerProtocol(): void {
		// In real implementation, would register with Electron/browser
		this.logService.info('[GlyphResolver] Registered glyph:// protocol handler');
	}

	/**
	 * Check local FNPM registry
	 */
	private async checkLocalRegistry(packageName: string, version: string): Promise<URI | null> {
		// Check ~/.fnpm/registry/packageName/version/
		const localPath = `${GlyphResolver.LOCAL_REGISTRY}${packageName}/${version}/morphism.fnpm`;
		
		// In real implementation, would check if file exists
		// For now, return null to continue resolution chain
		return null;
	}

	/**
	 * Resolve from IPFS network
	 */
	private async resolveFromIPFS(packageName: string, version: string): Promise<string | null> {
		// In real implementation, would query IPFS network
		// For demo, use predictable CID generation
		
		if (version === 'quantum') {
			// Quantum version uses content-addressed latest
			return `Qm${this.generateQuantumCID(packageName)}`;
		}

		// Standard versions use deterministic CIDs
		return `Qm${this.generateCID(packageName, version)}`;
	}

	/**
	 * Semantic resolution based on intent
	 */
	private async semanticResolve(packageName: string, version: string): Promise<URI> {
		this.logService.info(`[GlyphResolver] Semantic resolution for ${packageName}`);

		// Parse semantic intent from package name
		const intent = this.extractIntent(packageName);

		// Find best matching morphism based on intent
		const bestMatch = await this.findBestMatch(intent, version);

		return bestMatch || URI.parse(`glyph://404/${packageName}`);
	}

	/**
	 * Extract intent from package name
	 */
	private extractIntent(packageName: string): string {
		// Extract intent from patterns like "with-router", "consciousness-enhancer"
		const parts = packageName.split(/[-_]/);
		
		if (parts[0] === 'with') {
			return parts.slice(1).join('-');
		}

		return packageName;
	}

	/**
	 * Find best matching morphism for intent
	 */
	private async findBestMatch(intent: string, version: string): Promise<URI | null> {
		// In real implementation, would use semantic search
		// For now, simple pattern matching

		const candidates = Array.from(this.builtinMorphisms.keys());
		const match = candidates.find(name => 
			name.includes(intent) || intent.includes(name)
		);

		if (match) {
			const cid = this.builtinMorphisms.get(match)!;
			return URI.parse(GlyphResolver.IPFS_GATEWAY + cid);
		}

		return null;
	}

	/**
	 * Generate deterministic CID for package+version
	 */
	private generateCID(packageName: string, version: string): string {
		// Simple hash for demo - real implementation would use proper IPFS hashing
		const str = `${packageName}@${version}`;
		let hash = 0;
		
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash;
		}

		return Math.abs(hash).toString(16).padEnd(44, '0').substring(0, 44);
	}

	/**
	 * Generate quantum CID (changes based on observation)
	 */
	private generateQuantumCID(packageName: string): string {
		// Quantum CID includes timestamp for superposition
		const quantum = Date.now() % 432; // Resonance with 432Hz
		const base = this.generateCID(packageName, 'quantum');
		
		return base.substring(0, 40) + quantum.toString(16).padStart(4, '0');
	}

	/**
	 * Validate glyph URL format
	 */
	isValidGlyphURL(url: string): boolean {
		try {
			this.parse(url);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Convert npm package name to glyph URL
	 */
	npmToGlyph(npmPackage: string): string {
		const glyphName = npmPackage
			.replace(/@/g, 'at-')
			.replace(/\//g, '-')
			.replace(/[^a-z0-9-]/gi, '');

		return `glyph://${glyphName}@quantum`;
	}
}