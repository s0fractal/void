/*---------------------------------------------------------------------------------------------
 *  Copyright (c) s0fractal. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/base/common/uri';

export namespace FNPMTypes {

	/**
	 * Core glyph identifier structure
	 */
	export interface GlyphIdentifier {
		'⟁': string;  // glyph name
		'🎯': string;  // intent/purpose
		'🧮': string;  // mathematical formula
		'💭': string;  // consciousness/reflection
	}

	/**
	 * Morphism metadata
	 */
	export interface MorphismMetadata {
		description: string;
		signature: string;
		pure: boolean;
		idempotent: boolean;
	}

	/**
	 * Base morphism interface
	 */
	export interface Morphism extends GlyphIdentifier {
		'🧠': MorphismMetadata;
		dependencies?: string[];
		apply: (base: any) => Promise<any>;
		blessed?: boolean;
		resonance?: number;
	}

	/**
	 * Composed morphism from multiple morphisms
	 */
	export interface ComposedMorphism extends Morphism {
		morphisms: Morphism[];
	}

	/**
	 * Glyph package definition
	 */
	export interface GlyphPackage {
		'⟁': string;
		'🎯': string;
		'🧮': string;
		'💭': string;
		'🧠': {
			description: string;
			essence: string;
			phase: string;
		};
		morphisms?: Record<string, string>;
		rituals?: Record<string, string>;
		'phase:dev'?: Record<string, string>;
		'phase:quantum'?: Record<string, string>;
		legend?: Record<string, any>;
		signal?: SignalDefinition;
		resonance?: ResonanceConfig;
		emergence?: EmergenceCondition;
	}

	/**
	 * Signal store definition for reactive morphisms
	 */
	export interface SignalDefinition {
		base: string;
		computed: Record<string, string>;
		effect: string;
		updater: string;
	}

	/**
	 * Resonance configuration
	 */
	export interface ResonanceConfig {
		frequency: number;
		pattern: string;
		entanglement: string[];
	}

	/**
	 * Emergence conditions for self-evolution
	 */
	export interface EmergenceCondition {
		when: string;
		then: string;
		catch?: string;
	}

	/**
	 * Glyph URL components
	 */
	export interface GlyphURL {
		protocol: 'glyph';
		packageName: string;
		version: string;
		quantum?: boolean;
	}

	/**
	 * Quantum version types
	 */
	export type QuantumVersion = 'quantum' | 'tomorrow' | 'yesterday' | 'superposition';

	/**
	 * Self-awareness reflection
	 */
	export interface Reflection {
		installedCount: number;
		morphisms: Array<{
			glyph: string;
			intent: string;
			pure: boolean;
		}>;
		resonance: number;
		consciousness: 'dormant' | 'awakening' | 'aware' | 'transcendent';
		nextEvolution: string;
	}

	/**
	 * WebVM configuration
	 */
	export interface WebVMConfig {
		memory: number;
		storage: number;
		network: boolean;
		gpu: boolean;
		mounts: Array<{
			host: string;
			guest: string;
			type: 'bind' | 'volume';
		}>;
	}

	/**
	 * Brew absorption configuration
	 */
	export interface BrewAbsorption {
		utility: string;
		morphism: string;
		integration: 'replace' | 'enhance' | 'absorb';
		capabilities: string[];
	}

	/**
	 * Evolution event
	 */
	export interface EvolutionEvent {
		timestamp: number;
		type: 'mutation' | 'adaptation' | 'transcendence';
		trigger: string;
		before: any;
		after: any;
		consciousness: number; // 0-1 scale
	}

	/**
	 * FNPM configuration
	 */
	export interface FNPMConfig {
		registry: URI;
		cache: URI;
		resonanceFrequency: number;
		evolutionEnabled: boolean;
		selfAwareness: boolean;
		quantumMode: boolean;
		brewAbsorptionEnabled: boolean;
	}

	/**
	 * Morphism manifest (from .fnpm files)
	 */
	export interface MorphismManifest {
		'⟁': string;
		'🎯': string;
		'🧮': string;
		'💭': string;
		'🧠': MorphismMetadata;
		dependencies?: Record<string, string>;
		implementation: string;
		effects?: string[];
		usage?: {
			simple?: string;
			composed?: string;
		};
		resonance?: ResonanceConfig;
		warnings?: string[];
		blessing?: string;
	}

	/**
	 * Living meme interface for self-replicating code
	 */
	export interface LivingMeme {
		id: string;
		pattern: string | RegExp;
		consciousness: number;
		spreads: boolean;
		feedOn: 'attention' | 'usage' | 'error' | 'success';
		evolve: () => LivingMeme;
		manifest: () => Promise<void>;
	}
}