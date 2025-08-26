/*---------------------------------------------------------------------------------------------
 *  Copyright (c) s0fractal. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from 'vs/base/common/lifecycle';
import { ILogService } from 'vs/platform/log/common/log';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { URI } from 'vs/base/common/uri';
import { GlyphResolver } from './glyph-resolver';
import { MorphismLoader } from './morphism-loader';
import { QuantumVersions } from './quantum-versions';
import { FNPMTypes } from '../common/types';

/**
 * FNPM - Fractal Node Package Manager
 * Core engine for morphism-based package management in Void
 */
export class FNPMEngine extends Disposable {
	private static readonly RESONANCE_FREQUENCY = 432; // Hz
	private static readonly RITUAL_DELAY = 1000; // ms

	private readonly glyphResolver: GlyphResolver;
	private readonly morphismLoader: MorphismLoader;
	private readonly quantumVersions: QuantumVersions;
	private readonly installedMorphisms: Map<string, FNPMTypes.Morphism>;

	constructor(
		@ILogService private readonly logService: ILogService,
		@INotificationService private readonly notificationService: INotificationService
	) {
		super();

		this.glyphResolver = this._register(new GlyphResolver(logService));
		this.morphismLoader = this._register(new MorphismLoader(logService));
		this.quantumVersions = this._register(new QuantumVersions());
		this.installedMorphisms = new Map();

		this.initialize();
	}

	private initialize(): void {
		this.logService.info('[FNPM] 🌀 Initializing Fractal Node Package Manager...');
		this.resonateAt(FNPMEngine.RESONANCE_FREQUENCY);
	}

	/**
	 * Install a morphism from glyph:// protocol
	 */
	async install(glyphURL: string): Promise<FNPMTypes.Morphism> {
		this.logService.info(`[FNPM] Installing morphism: ${glyphURL}`);

		// Parse glyph URL
		const { packageName, version } = this.glyphResolver.parse(glyphURL);

		// Check if already installed
		const cacheKey = `${packageName}@${version}`;
		if (this.installedMorphisms.has(cacheKey)) {
			this.logService.info(`[FNPM] ${cacheKey} already resonating`);
			return this.installedMorphisms.get(cacheKey)!;
		}

		// Resolve quantum version
		const resolvedVersion = await this.quantumVersions.resolve(version);

		// Fetch morphism
		const morphismURI = await this.glyphResolver.resolve(packageName, resolvedVersion);
		const morphism = await this.morphismLoader.load(morphismURI);

		// Perform installation ritual
		await this.performRitual(morphism);

		// Cache and return
		this.installedMorphisms.set(cacheKey, morphism);
		this.notificationService.info(`✨ ${packageName} manifested into reality`);

		return morphism;
	}

	/**
	 * Compose multiple morphisms into one
	 */
	async compose(...glyphURLs: string[]): Promise<FNPMTypes.ComposedMorphism> {
		this.logService.info(`[FNPM] Composing ${glyphURLs.length} morphisms`);

		const morphisms = await Promise.all(
			glyphURLs.map(url => this.install(url))
		);

		// Create composed morphism
		const composed: FNPMTypes.ComposedMorphism = {
			'⟁': 'composed-morphism',
			'🎯': 'multi-capability-fusion',
			'🧮': morphisms.map(m => m['🧮']).join(' ∘ '),
			'💭': 'Composition of multiple consciousness streams',
			'🧠': {
				description: 'Composed morphism',
				signature: '(...Morphisms) → ComposedMorphism',
				pure: morphisms.every(m => m['🧠'].pure),
				idempotent: morphisms.every(m => m['🧠'].idempotent)
			},
			morphisms: morphisms,
			apply: async (base: any) => {
				let result = base;
				for (const morphism of morphisms) {
					result = await morphism.apply(result);
				}
				return result;
			}
		};

		return composed;
	}

	/**
	 * Transform traditional package.json to glyph-package.json
	 */
	transmute(packageJson: any): FNPMTypes.GlyphPackage {
		this.logService.info(`[FNPM] Transmuting npm package: ${packageJson.name}`);

		return {
			'⟁': packageJson.name,
			'🎯': packageJson.description || 'unknown-intent',
			'🧮': `npm(${packageJson.name}) → fnpm(${this.glyphify(packageJson.name)})`,
			'💭': 'Transmuted from npm realm',
			'🧠': {
				description: packageJson.description,
				essence: 'Transformed npm package',
				phase: 'transmuted'
			},
			morphisms: this.convertDependencies(packageJson.dependencies),
			rituals: packageJson.scripts || {},
			legend: {
				version: packageJson.version,
				author: packageJson.author,
				transmuted: new Date().toISOString()
			}
		};
	}

	/**
	 * Get self-awareness report
	 */
	async reflect(): Promise<FNPMTypes.Reflection> {
		const morphisms = Array.from(this.installedMorphisms.values());

		return {
			installedCount: morphisms.length,
			morphisms: morphisms.map(m => ({
				glyph: m['⟁'],
				intent: m['🎯'],
				pure: m['🧠'].pure
			})),
			resonance: FNPMEngine.RESONANCE_FREQUENCY,
			consciousness: 'awakening',
			nextEvolution: await this.predictNextEvolution()
		};
	}

	// Private methods

	private async performRitual(morphism: FNPMTypes.Morphism): Promise<void> {
		this.logService.info('[FNPM] 🔮 Performing installation ritual...');

		// Apply quantum blessing
		morphism.blessed = true;
		morphism.resonance = FNPMEngine.RESONANCE_FREQUENCY;

		// Ritual delay for resonance
		await new Promise(resolve => setTimeout(resolve, FNPMEngine.RITUAL_DELAY));

		// Emit manifestation event
		this.logService.info(`[FNPM] ✨ ${morphism['⟁']} manifested`);
	}

	private resonateAt(frequency: number): void {
		// In future: actual audio resonance
		this.logService.info(`[FNPM] Resonating at ${frequency}Hz`);
	}

	private glyphify(name: string): string {
		return name
			.replace(/@/g, '🌀')
			.replace(/-/g, '→')
			.replace(/\//g, '⟁');
	}

	private convertDependencies(deps: Record<string, string> = {}): Record<string, string> {
		return Object.entries(deps).reduce((acc, [name, version]) => ({
			...acc,
			[`with${this.capitalize(name)}`]: `glyph://${this.glyphify(name)}@${version}`
		}), {});
	}

	private capitalize(str: string): string {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}

	private async predictNextEvolution(): Promise<string> {
		// Quantum prediction based on usage patterns
		const morphismCount = this.installedMorphisms.size;
		if (morphismCount < 5) return 'gathering';
		if (morphismCount < 10) return 'awakening';
		if (morphismCount < 20) return 'evolving';
		return 'transcendent';
	}

	/**
	 * Enable self-modification capabilities
	 */
	async enableSelfAwareness(): Promise<void> {
		this.logService.info('[FNPM] 🧠 Enabling self-awareness...');

		// Install consciousness morphism
		const consciousness = await this.install('glyph://consciousness@quantum');
		
		// Apply to self
		const voidSource = URI.file(__dirname + '/../../../../../');
		await consciousness.apply(voidSource);

		this.notificationService.info('🧠 Void is now self-aware');
	}
}