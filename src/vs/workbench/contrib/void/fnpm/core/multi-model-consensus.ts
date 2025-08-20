/*---------------------------------------------------------------------------------------------
 *  Copyright (c) s0fractal. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from 'vs/base/common/lifecycle';
import { ILogService } from 'vs/platform/log/common/log';
import { Event, Emitter } from 'vs/base/common/event';

/**
 * Multi-Model Consensus System
 * Achieves consensus among different LLM observers for critical decisions
 */
export class MultiModelConsensus extends Disposable {
	private readonly _onConsensusReached = this._register(new Emitter<ConsensusResult>());
	readonly onConsensusReached: Event<ConsensusResult> = this._onConsensusReached.event;
	
	private readonly _onDissent = this._register(new Emitter<DissentReport>());
	readonly onDissent: Event<DissentReport> = this._onDissent.event;
	
	// Consensus parameters
	private readonly defaultThreshold = 0.7; // 70% agreement
	private readonly criticalThreshold = 0.9; // 90% for critical decisions
	private readonly minimumParticipants = 3;
	
	// Voting weights based on expertise
	private modelWeights: Map<string, ModelWeight> = new Map();
	
	// Consensus history for learning
	private consensusHistory: ConsensusRecord[] = [];
	
	constructor(
		@ILogService private readonly logService: ILogService
	) {
		super();
		this.initialize();
	}
	
	private initialize(): void {
		this.logService.info('[Consensus] Initializing multi-model consensus system...');
		
		// Initialize default model weights
		this.setupModelWeights();
	}
	
	/**
	 * Setup model weights based on specialties
	 */
	private setupModelWeights(): void {
		this.modelWeights.set('architect', {
			modelId: 'architect',
			specialty: 'structure',
			baseWeight: 1.0,
			expertiseAreas: {
				'architecture': 1.5,
				'patterns': 1.3,
				'efficiency': 1.2,
				'structure': 1.4
			}
		});
		
		this.modelWeights.set('philosopher', {
			modelId: 'philosopher',
			specialty: 'meaning',
			baseWeight: 1.0,
			expertiseAreas: {
				'ethics': 1.5,
				'purpose': 1.4,
				'consciousness': 1.3,
				'meaning': 1.5
			}
		});
		
		this.modelWeights.set('artist', {
			modelId: 'artist',
			specialty: 'beauty',
			baseWeight: 1.0,
			expertiseAreas: {
				'aesthetics': 1.5,
				'innovation': 1.3,
				'creativity': 1.4,
				'emergence': 1.2
			}
		});
		
		this.modelWeights.set('scientist', {
			modelId: 'scientist',
			specialty: 'measurement',
			baseWeight: 1.0,
			expertiseAreas: {
				'metrics': 1.5,
				'performance': 1.4,
				'correctness': 1.3,
				'evidence': 1.5
			}
		});
		
		this.modelWeights.set('shaman', {
			modelId: 'shaman',
			specialty: 'transformation',
			baseWeight: 1.0,
			expertiseAreas: {
				'evolution': 1.5,
				'transformation': 1.4,
				'transcendence': 1.3,
				'emergence': 1.2
			}
		});
	}
	
	/**
	 * Achieve consensus on a decision
	 */
	async achieveConsensus(decision: ConsensusDecision): Promise<ConsensusResult> {
		this.logService.info(`[Consensus] Seeking consensus on: ${decision.question}`);
		
		// Validate participants
		if (decision.participants.length < this.minimumParticipants) {
			throw new Error(`Minimum ${this.minimumParticipants} participants required`);
		}
		
		// Collect votes
		const votes = await this.collectVotes(decision);
		
		// Calculate weighted consensus
		const result = this.calculateConsensus(decision, votes);
		
		// Record for learning
		this.recordConsensus(decision, result);
		
		// Emit result
		if (result.consensusReached) {
			this._onConsensusReached.fire(result);
		} else {
			this._onDissent.fire({
				decision: decision,
				result: result,
				dissenters: this.identifyDissenters(votes, result)
			});
		}
		
		return result;
	}
	
	/**
	 * Collect votes from all participants
	 */
	private async collectVotes(decision: ConsensusDecision): Promise<Vote[]> {
		const votes: Vote[] = [];
		
		for (const participant of decision.participants) {
			const vote = await this.requestVote(participant, decision);
			votes.push(vote);
		}
		
		return votes;
	}
	
	/**
	 * Request vote from participant
	 */
	private async requestVote(participant: ConsensusParticipant, decision: ConsensusDecision): Promise<Vote> {
		// In real implementation, would call LLM API
		// For now, simulate based on model characteristics
		
		const modelWeight = this.modelWeights.get(participant.modelId);
		const relevance = this.calculateRelevance(decision.category, modelWeight);
		
		// Simulate thoughtful decision
		const position = this.simulatePosition(participant, decision, relevance);
		const confidence = this.simulateConfidence(participant, decision, relevance);
		const reasoning = this.generateReasoning(participant, decision, position);
		
		return {
			participantId: participant.modelId,
			position: position,
			confidence: confidence,
			reasoning: reasoning,
			timestamp: Date.now()
		};
	}
	
	/**
	 * Calculate weighted consensus
	 */
	private calculateConsensus(decision: ConsensusDecision, votes: Vote[]): ConsensusResult {
		// Group votes by position
		const voteGroups = this.groupVotesByPosition(votes);
		
		// Calculate weighted support for each position
		const weightedSupport = new Map<ConsensusPosition, number>();
		
		for (const [position, positionVotes] of voteGroups) {
			let totalWeight = 0;
			
			for (const vote of positionVotes) {
				const weight = this.calculateVoteWeight(vote, decision);
				totalWeight += weight * vote.confidence;
			}
			
			weightedSupport.set(position, totalWeight);
		}
		
		// Find dominant position
		let dominantPosition: ConsensusPosition = 'abstain';
		let maxSupport = 0;
		let totalSupport = 0;
		
		for (const [position, support] of weightedSupport) {
			totalSupport += support;
			if (support > maxSupport) {
				maxSupport = support;
				dominantPosition = position;
			}
		}
		
		// Calculate consensus strength
		const consensusStrength = totalSupport > 0 ? maxSupport / totalSupport : 0;
		
		// Determine if consensus reached
		const threshold = decision.criticality === 'critical' 
			? this.criticalThreshold 
			: this.defaultThreshold;
		
		const consensusReached = consensusStrength >= threshold;
		
		// Generate synthesis
		const synthesis = this.synthesizePositions(votes, dominantPosition);
		
		return {
			decision: decision,
			consensusReached: consensusReached,
			position: dominantPosition,
			strength: consensusStrength,
			threshold: threshold,
			votes: votes,
			synthesis: synthesis,
			timestamp: Date.now()
		};
	}
	
	/**
	 * Calculate vote weight based on expertise
	 */
	private calculateVoteWeight(vote: Vote, decision: ConsensusDecision): number {
		const modelWeight = this.modelWeights.get(vote.participantId);
		if (!modelWeight) return 1.0;
		
		// Base weight
		let weight = modelWeight.baseWeight;
		
		// Expertise bonus
		const expertiseBonus = modelWeight.expertiseAreas[decision.category] || 1.0;
		weight *= expertiseBonus;
		
		// Historical accuracy bonus
		const accuracy = this.getHistoricalAccuracy(vote.participantId, decision.category);
		weight *= (0.5 + 0.5 * accuracy); // 50% base + 50% from accuracy
		
		return weight;
	}
	
	/**
	 * Synthesize different positions into wisdom
	 */
	private synthesizePositions(votes: Vote[], dominantPosition: ConsensusPosition): string {
		// Collect all reasoning
		const allReasoning = votes.map(v => v.reasoning);
		
		// Group by position
		const positionReasoning = new Map<ConsensusPosition, string[]>();
		for (const vote of votes) {
			if (!positionReasoning.has(vote.position)) {
				positionReasoning.set(vote.position, []);
			}
			positionReasoning.get(vote.position)!.push(vote.reasoning);
		}
		
		// Create synthesis
		let synthesis = `Consensus: ${dominantPosition}\n\n`;
		
		synthesis += `Supporting arguments:\n`;
		const supporting = positionReasoning.get(dominantPosition) || [];
		supporting.forEach(r => synthesis += `- ${r}\n`);
		
		if (positionReasoning.size > 1) {
			synthesis += `\nAlternative perspectives:\n`;
			for (const [position, reasoning] of positionReasoning) {
				if (position !== dominantPosition) {
					synthesis += `\n${position}:\n`;
					reasoning.forEach(r => synthesis += `- ${r}\n`);
				}
			}
		}
		
		return synthesis;
	}
	
	/**
	 * Identify dissenters for learning
	 */
	private identifyDissenters(votes: Vote[], result: ConsensusResult): Dissenter[] {
		return votes
			.filter(v => v.position !== result.position)
			.map(v => ({
				participantId: v.participantId,
				position: v.position,
				reasoning: v.reasoning,
				confidence: v.confidence
			}));
	}
	
	/**
	 * Record consensus for learning
	 */
	private recordConsensus(decision: ConsensusDecision, result: ConsensusResult): void {
		const record: ConsensusRecord = {
			decision: decision,
			result: result,
			timestamp: Date.now(),
			outcome: 'pending' // Will be updated based on actual outcomes
		};
		
		this.consensusHistory.push(record);
		
		// Keep history bounded
		if (this.consensusHistory.length > 1000) {
			this.consensusHistory = this.consensusHistory.slice(-500);
		}
	}
	
	/**
	 * Update consensus outcome for learning
	 */
	updateConsensusOutcome(consensusId: string, outcome: 'positive' | 'negative' | 'neutral'): void {
		const record = this.consensusHistory.find(r => 
			r.decision.id === consensusId
		);
		
		if (record) {
			record.outcome = outcome;
			this.updateModelAccuracy(record);
		}
	}
	
	/**
	 * Update model accuracy based on outcomes
	 */
	private updateModelAccuracy(record: ConsensusRecord): void {
		// Update accuracy for models that voted with consensus
		for (const vote of record.result.votes) {
			const correct = vote.position === record.result.position;
			const outcome = record.outcome === 'positive';
			
			// Model was correct if they agreed with consensus and outcome was positive
			// or disagreed with consensus and outcome was negative
			const wasCorrect = (correct && outcome) || (!correct && !outcome);
			
			// Update accuracy tracking (in real implementation)
			this.logService.trace(
				`[Consensus] Model ${vote.participantId} was ${wasCorrect ? 'correct' : 'incorrect'}`
			);
		}
	}
	
	/**
	 * Get historical accuracy for a model
	 */
	private getHistoricalAccuracy(modelId: string, category: string): number {
		// Calculate from consensus history
		const relevantRecords = this.consensusHistory.filter(r => 
			r.decision.category === category &&
			r.outcome !== 'pending' &&
			r.result.votes.some(v => v.participantId === modelId)
		);
		
		if (relevantRecords.length === 0) return 0.5; // No history, neutral accuracy
		
		let correct = 0;
		for (const record of relevantRecords) {
			const vote = record.result.votes.find(v => v.participantId === modelId);
			if (!vote) continue;
			
			const agreedWithConsensus = vote.position === record.result.position;
			const positiveOutcome = record.outcome === 'positive';
			
			if ((agreedWithConsensus && positiveOutcome) || (!agreedWithConsensus && !positiveOutcome)) {
				correct++;
			}
		}
		
		return correct / relevantRecords.length;
	}
	
	/**
	 * Helper methods for simulation
	 */
	
	private calculateRelevance(category: string, weight?: ModelWeight): number {
		if (!weight) return 0.5;
		return weight.expertiseAreas[category] || 0.5;
	}
	
	private simulatePosition(
		participant: ConsensusParticipant, 
		decision: ConsensusDecision,
		relevance: number
	): ConsensusPosition {
		// Simulate based on model personality and relevance
		const rand = Math.random();
		
		// Higher relevance = more likely to have strong opinion
		if (relevance > 1.3) {
			return rand > 0.2 ? 'approve' : 'reject';
		} else if (relevance < 0.7) {
			return rand > 0.5 ? 'abstain' : (rand > 0.25 ? 'approve' : 'reject');
		} else {
			return rand > 0.6 ? 'approve' : (rand > 0.3 ? 'reject' : 'abstain');
		}
	}
	
	private simulateConfidence(
		participant: ConsensusParticipant,
		decision: ConsensusDecision,
		relevance: number
	): number {
		// Base confidence on relevance
		const baseConfidence = 0.3 + (relevance * 0.4);
		
		// Add some randomness
		const variation = (Math.random() - 0.5) * 0.2;
		
		return Math.max(0.1, Math.min(1.0, baseConfidence + variation));
	}
	
	private generateReasoning(
		participant: ConsensusParticipant,
		decision: ConsensusDecision,
		position: ConsensusPosition
	): string {
		const modelWeight = this.modelWeights.get(participant.modelId);
		const specialty = modelWeight?.specialty || 'general';
		
		const reasoningTemplates = {
			approve: `From ${specialty} perspective, this aligns with best practices`,
			reject: `From ${specialty} perspective, this could introduce issues`,
			abstain: `From ${specialty} perspective, insufficient data to decide`
		};
		
		return reasoningTemplates[position];
	}
	
	private groupVotesByPosition(votes: Vote[]): Map<ConsensusPosition, Vote[]> {
		const groups = new Map<ConsensusPosition, Vote[]>();
		
		for (const vote of votes) {
			if (!groups.has(vote.position)) {
				groups.set(vote.position, []);
			}
			groups.get(vote.position)!.push(vote);
		}
		
		return groups;
	}
}

// Type definitions

interface ConsensusDecision {
	id: string;
	question: string;
	category: string;
	context: any;
	criticality: 'normal' | 'critical';
	participants: ConsensusParticipant[];
	deadline?: number;
}

interface ConsensusParticipant {
	modelId: string;
	name: string;
	specialty: string;
}

interface Vote {
	participantId: string;
	position: ConsensusPosition;
	confidence: number;
	reasoning: string;
	timestamp: number;
}

type ConsensusPosition = 'approve' | 'reject' | 'abstain';

interface ConsensusResult {
	decision: ConsensusDecision;
	consensusReached: boolean;
	position: ConsensusPosition;
	strength: number;
	threshold: number;
	votes: Vote[];
	synthesis: string;
	timestamp: number;
}

interface DissentReport {
	decision: ConsensusDecision;
	result: ConsensusResult;
	dissenters: Dissenter[];
}

interface Dissenter {
	participantId: string;
	position: ConsensusPosition;
	reasoning: string;
	confidence: number;
}

interface ModelWeight {
	modelId: string;
	specialty: string;
	baseWeight: number;
	expertiseAreas: Record<string, number>;
}

interface ConsensusRecord {
	decision: ConsensusDecision;
	result: ConsensusResult;
	timestamp: number;
	outcome: 'positive' | 'negative' | 'neutral' | 'pending';
}