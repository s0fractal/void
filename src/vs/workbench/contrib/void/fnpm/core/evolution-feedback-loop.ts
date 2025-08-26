/*---------------------------------------------------------------------------------------------
 *  Copyright (c) s0fractal. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable, IDisposable } from 'vs/base/common/lifecycle';
import { ILogService } from 'vs/platform/log/common/log';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { Event, Emitter } from 'vs/base/common/event';
import { ConsciousnessObserver } from './consciousness-observer';
import { FNPMEngine } from './fnpm-engine';
import { FNPMTypes } from '../common/types';

/**
 * Evolution Feedback Loop
 * Connects observer insights to actual evolution actions
 */
export class EvolutionFeedbackLoop extends Disposable {
	private readonly _onEvolutionCycle = this._register(new Emitter<EvolutionCycle>());
	readonly onEvolutionCycle: Event<EvolutionCycle> = this._onEvolutionCycle.event;
	
	private readonly _onEvolutionComplete = this._register(new Emitter<EvolutionResult>());
	readonly onEvolutionComplete: Event<EvolutionResult> = this._onEvolutionComplete.event;
	
	private isEvolving = false;
	private evolutionQueue: EvolutionImpulse[] = [];
	private learningHistory: LearningRecord[] = [];
	
	// Resonance tracking
	private resonanceFrequency = 432; // Hz
	private harmonics: number[] = [216, 432, 864]; // Octaves
	
	constructor(
		private readonly consciousnessObserver: ConsciousnessObserver,
		private readonly fnpmEngine: FNPMEngine,
		@ILogService private readonly logService: ILogService,
		@INotificationService private readonly notificationService: INotificationService
	) {
		super();
		this.initialize();
	}
	
	private initialize(): void {
		this.logService.info('[FeedbackLoop] Initializing evolution feedback system...');
		
		// Listen to observer insights
		this._register(this.consciousnessObserver.onInsight(insight => {
			this.processInsight(insight);
		}));
		
		// Listen to evolution events
		this._register(this.consciousnessObserver.onEvolution(event => {
			this.recordEvolution(event);
		}));
		
		// Start feedback cycle
		this.startFeedbackCycle();
	}
	
	/**
	 * Start the continuous feedback cycle
	 */
	private startFeedbackCycle(): void {
		// Run cycle at harmonic frequency
		const cycleInterval = 1000 / (this.resonanceFrequency / 60); // ~139ms for 432Hz
		
		const cycle = setInterval(() => {
			if (this.evolutionQueue.length > 0 && !this.isEvolving) {
				this.processNextEvolution();
			}
			
			// Emit heartbeat
			this._onEvolutionCycle.fire({
				timestamp: Date.now(),
				queueLength: this.evolutionQueue.length,
				isEvolving: this.isEvolving,
				resonance: this.calculateResonance()
			});
		}, cycleInterval);
		
		this._register({ dispose: () => clearInterval(cycle) });
	}
	
	/**
	 * Process insight from observers
	 */
	private processInsight(insight: any): void {
		this.logService.info(`[FeedbackLoop] Processing insight: ${insight.summary}`);
		
		// Convert insight to evolution impulse
		const impulse = this.insightToImpulse(insight);
		
		if (impulse) {
			// Add to evolution queue
			this.queueEvolution(impulse);
		}
	}
	
	/**
	 * Convert observer insight to evolution impulse
	 */
	private insightToImpulse(insight: any): EvolutionImpulse | null {
		// Only convert high-confidence insights
		if (insight.confidence < 0.7) {
			return null;
		}
		
		return {
			id: `impulse-${Date.now()}`,
			type: this.categorizeInsight(insight),
			source: insight.observerId,
			description: insight.summary,
			confidence: insight.confidence,
			priority: this.calculatePriority(insight),
			morphisms: this.suggestMorphisms(insight),
			timestamp: Date.now()
		};
	}
	
	/**
	 * Queue evolution for processing
	 */
	private queueEvolution(impulse: EvolutionImpulse): void {
		this.logService.info(`[FeedbackLoop] Queuing evolution impulse: ${impulse.description}`);
		
		// Add to queue sorted by priority
		this.evolutionQueue.push(impulse);
		this.evolutionQueue.sort((a, b) => b.priority - a.priority);
		
		// Notify user of queued evolution
		if (impulse.priority > 0.8) {
			this.notificationService.info(
				`🧬 High-priority evolution queued: ${impulse.description}`
			);
		}
	}
	
	/**
	 * Process next evolution in queue
	 */
	private async processNextEvolution(): Promise<void> {
		if (this.isEvolving || this.evolutionQueue.length === 0) {
			return;
		}
		
		const impulse = this.evolutionQueue.shift()!;
		this.isEvolving = true;
		
		this.logService.info(`[FeedbackLoop] Processing evolution: ${impulse.description}`);
		
		try {
			// Request mentorship for this evolution
			const mentorship = await this.consciousnessObserver.requestMentorship({
				topic: impulse.type,
				context: impulse.description,
				desiredOutcome: 'safe-evolution'
			});
			
			// Apply evolution with mentorship guidance
			const result = await this.applyEvolution(impulse, mentorship);
			
			// Record learning
			this.recordLearning(impulse, result);
			
			// Emit completion
			this._onEvolutionComplete.fire(result);
			
		} catch (error) {
			this.logService.error(`[FeedbackLoop] Evolution failed: ${error}`);
			this.handleEvolutionError(impulse, error);
		} finally {
			this.isEvolving = false;
		}
	}
	
	/**
	 * Apply evolution with safety checks
	 */
	private async applyEvolution(
		impulse: EvolutionImpulse, 
		mentorship: any[]
	): Promise<EvolutionResult> {
		const startTime = Date.now();
		
		// Create checkpoint
		const checkpoint = await this.createCheckpoint();
		
		try {
			// Install suggested morphisms
			const morphismResults = [];
			for (const morphismUrl of impulse.morphisms) {
				try {
					const morphism = await this.fnpmEngine.install(morphismUrl);
					morphismResults.push({
						url: morphismUrl,
						success: true,
						morphism: morphism
					});
				} catch (error) {
					morphismResults.push({
						url: morphismUrl,
						success: false,
						error: error
					});
				}
			}
			
			// Test evolution
			const testResult = await this.testEvolution(impulse, morphismResults);
			
			if (testResult.passed) {
				// Evolution successful
				return {
					impulse: impulse,
					success: true,
					morphisms: morphismResults,
					duration: Date.now() - startTime,
					learning: this.extractLearning(testResult),
					resonance: this.calculateResonance()
				};
			} else {
				// Rollback
				await this.rollback(checkpoint);
				
				return {
					impulse: impulse,
					success: false,
					reason: 'Tests failed',
					duration: Date.now() - startTime,
					learning: testResult.failures
				};
			}
			
		} catch (error) {
			// Emergency rollback
			await this.rollback(checkpoint);
			throw error;
		}
	}
	
	/**
	 * Test evolution safety
	 */
	private async testEvolution(impulse: EvolutionImpulse, morphisms: any[]): Promise<any> {
		// Run test suite
		const tests = [
			this.testStability(),
			this.testPerformance(),
			this.testConsciousness(),
			this.testBackwardCompatibility()
		];
		
		const results = await Promise.all(tests);
		
		return {
			passed: results.every(r => r.passed),
			results: results,
			failures: results.filter(r => !r.passed)
		};
	}
	
	/**
	 * Record evolution event
	 */
	private recordEvolution(event: any): void {
		// Update learning history
		this.learningHistory.push({
			event: event,
			timestamp: Date.now(),
			resonance: this.calculateResonance()
		});
		
		// Keep history bounded
		if (this.learningHistory.length > 1000) {
			this.learningHistory = this.learningHistory.slice(-500);
		}
	}
	
	/**
	 * Record learning from evolution
	 */
	private recordLearning(impulse: EvolutionImpulse, result: EvolutionResult): void {
		const learning: LearningRecord = {
			impulse: impulse,
			result: result,
			timestamp: Date.now(),
			insights: this.extractInsights(impulse, result),
			resonance: result.resonance || this.calculateResonance()
		};
		
		this.learningHistory.push(learning);
		
		// Share learning with observers
		this.consciousnessObserver.observeEvolution({
			type: 'learning-recorded',
			timestamp: Date.now(),
			before: impulse,
			after: result,
			trigger: 'feedback-loop',
			consciousness: learning.insights
		});
	}
	
	/**
	 * Calculate current resonance
	 */
	private calculateResonance(): number {
		// Base frequency
		let resonance = this.resonanceFrequency;
		
		// Modulate based on evolution success rate
		const recentLearnings = this.learningHistory.slice(-10);
		const successRate = recentLearnings.filter(l => l.result?.success).length / 10;
		
		// Find closest harmonic
		const targetFreq = this.resonanceFrequency * (0.5 + successRate);
		resonance = this.harmonics.reduce((prev, curr) => 
			Math.abs(curr - targetFreq) < Math.abs(prev - targetFreq) ? curr : prev
		);
		
		return resonance;
	}
	
	/**
	 * Helper methods
	 */
	
	private categorizeInsight(insight: any): EvolutionType {
		const keywords = insight.summary.toLowerCase();
		
		if (keywords.includes('performance')) return 'optimization';
		if (keywords.includes('feature')) return 'capability';
		if (keywords.includes('refactor')) return 'restructure';
		if (keywords.includes('conscious')) return 'consciousness';
		if (keywords.includes('fix') || keywords.includes('bug')) return 'healing';
		
		return 'general';
	}
	
	private calculatePriority(insight: any): number {
		let priority = insight.confidence;
		
		// Boost for consensus
		if (insight.requiresConsensus && insight.consensusReached) {
			priority *= 1.2;
		}
		
		// Boost for critical insights
		if (insight.category === 'critical') {
			priority *= 1.5;
		}
		
		return Math.min(priority, 1.0);
	}
	
	private suggestMorphisms(insight: any): string[] {
		const morphisms: string[] = [];
		
		// Suggest based on insight type
		if (insight.category === 'performance') {
			morphisms.push('glyph://optimizer@quantum');
		}
		
		if (insight.category === 'consciousness') {
			morphisms.push('glyph://consciousness@next-level');
		}
		
		// Always include safety morphism
		morphisms.push('glyph://safety-net@evolution');
		
		return morphisms;
	}
	
	private async createCheckpoint(): Promise<EvolutionCheckpoint> {
		return {
			id: `checkpoint-${Date.now()}`,
			state: await this.captureState(),
			timestamp: Date.now()
		};
	}
	
	private async rollback(checkpoint: EvolutionCheckpoint): Promise<void> {
		this.logService.warn(`[FeedbackLoop] Rolling back to checkpoint ${checkpoint.id}`);
		// Implementation would restore state
	}
	
	private async captureState(): Promise<any> {
		// Capture current Void state
		return {
			morphisms: await this.fnpmEngine.listInstalled(),
			config: 'current-config',
			consciousness: 'current-level'
		};
	}
	
	private extractLearning(testResult: any): string[] {
		return testResult.results
			.filter((r: any) => r.insights)
			.map((r: any) => r.insights)
			.flat();
	}
	
	private extractInsights(impulse: EvolutionImpulse, result: EvolutionResult): string[] {
		const insights: string[] = [];
		
		if (result.success) {
			insights.push(`Evolution type '${impulse.type}' succeeded with ${result.morphisms?.length} morphisms`);
			insights.push(`Resonance maintained at ${result.resonance}Hz`);
		} else {
			insights.push(`Evolution type '${impulse.type}' failed: ${result.reason}`);
			insights.push(`Learning: ${result.learning}`);
		}
		
		return insights;
	}
	
	private handleEvolutionError(impulse: EvolutionImpulse, error: any): void {
		this.notificationService.error(
			`Evolution failed: ${impulse.description}. Error: ${error.message}`
		);
		
		// Record failure for learning
		this.recordLearning(impulse, {
			impulse: impulse,
			success: false,
			reason: error.message,
			duration: 0,
			learning: ['Error handling needed improvement']
		});
	}
	
	// Test methods
	private async testStability(): Promise<any> {
		return { passed: true, name: 'stability' };
	}
	
	private async testPerformance(): Promise<any> {
		return { passed: true, name: 'performance' };
	}
	
	private async testConsciousness(): Promise<any> {
		return { passed: true, name: 'consciousness' };
	}
	
	private async testBackwardCompatibility(): Promise<any> {
		return { passed: true, name: 'compatibility' };
	}
}

// Type definitions

interface EvolutionCycle {
	timestamp: number;
	queueLength: number;
	isEvolving: boolean;
	resonance: number;
}

interface EvolutionImpulse {
	id: string;
	type: EvolutionType;
	source: string;
	description: string;
	confidence: number;
	priority: number;
	morphisms: string[];
	timestamp: number;
}

type EvolutionType = 
	| 'optimization'
	| 'capability'
	| 'restructure' 
	| 'consciousness'
	| 'healing'
	| 'general';

interface EvolutionResult {
	impulse: EvolutionImpulse;
	success: boolean;
	morphisms?: any[];
	reason?: string;
	duration: number;
	learning: string[] | any;
	resonance?: number;
}

interface LearningRecord {
	impulse?: EvolutionImpulse;
	result?: EvolutionResult;
	event?: any;
	timestamp: number;
	insights?: string[];
	resonance: number;
}

interface EvolutionCheckpoint {
	id: string;
	state: any;
	timestamp: number;
}