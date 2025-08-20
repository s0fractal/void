import { VoidEvent } from './RelayClient';

export interface GuardianConfig {
  name: string;
  url: string;
  type: 'remote' | 'local';
  priority: number;
  timeout: number;
  errorThreshold: number;
}

export interface RouterPolicy {
  mode: 'auto' | 'manual';
  quorumSize: number;
  degradationPath: string[]; // e.g., ['2/N remote', '1 local', 'rules']
  timeoutMs: number;
  circuitBreakerThreshold: number;
}

export interface DecisionSource {
  guardian: string;
  type: 'remote' | 'local' | 'rules';
  latency: number;
  confidence: number;
}

export interface GuardianDecision {
  action: string;
  confidence: number;
  reasoning?: string;
}

/**
 * 🛡️ Guardian Router - Manages decision sources with graceful degradation
 */
export class GuardianRouter {
  private guardians: Map<string, GuardianConfig> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private policy: RouterPolicy;
  private currentMode: 'remote' | 'local' | 'rules' = 'remote';
  private decisionHistory: DecisionSource[] = [];
  
  constructor(policy: RouterPolicy) {
    this.policy = policy;
    console.log('🛡️ Guardian Router initialized');
    console.log(`   Policy: ${policy.mode}, Quorum: ${policy.quorumSize}`);
  }
  
  /**
   * Register guardian
   */
  registerGuardian(config: GuardianConfig): void {
    this.guardians.set(config.name, config);
    this.circuitBreakers.set(config.name, new CircuitBreaker(config.errorThreshold));
    console.log(`👤 Registered guardian: ${config.name} (${config.type})`);
  }
  
  /**
   * Route decision request based on policy
   */
  async routeDecision(event: VoidEvent): Promise<{
    decision: GuardianDecision;
    source: DecisionSource;
  }> {
    const startTime = Date.now();
    
    // Try remote guardians first if available
    if (this.currentMode === 'remote') {
      const remoteResult = await this.tryRemoteGuardians(event);
      if (remoteResult) {
        return remoteResult;
      }
      
      // Fallback to local if remote failed
      console.log('⚠️ Remote guardians unavailable, falling back to local');
      this.currentMode = 'local';
    }
    
    // Try local guardian
    if (this.currentMode === 'local') {
      const localResult = await this.tryLocalGuardian(event);
      if (localResult) {
        return localResult;
      }
      
      // Fallback to rules if local failed
      console.log('⚠️ Local guardian unavailable, falling back to rules');
      this.currentMode = 'rules';
    }
    
    // Use rule-based decision as last resort
    return {
      decision: this.getRuleBasedDecision(event),
      source: {
        guardian: 'rules',
        type: 'rules',
        latency: Date.now() - startTime,
        confidence: 0.6
      }
    };
  }
  
  /**
   * Try to get consensus from remote guardians
   */
  private async tryRemoteGuardians(event: VoidEvent): Promise<{
    decision: GuardianDecision;
    source: DecisionSource;
  } | null> {
    const remoteGuardians = Array.from(this.guardians.values())
      .filter(g => g.type === 'remote')
      .sort((a, b) => b.priority - a.priority);
    
    if (remoteGuardians.length === 0) return null;
    
    // Collect decisions from available guardians
    const decisions = await Promise.all(
      remoteGuardians.map(guardian => 
        this.queryGuardian(guardian, event).catch(() => null)
      )
    );
    
    // Filter successful responses
    const validDecisions = decisions.filter((d): d is {
      guardian: GuardianConfig;
      decision: GuardianDecision;
      latency: number;
    } => d !== null);
    
    // Check if we have quorum
    if (validDecisions.length >= this.policy.quorumSize) {
      // Get consensus decision
      const consensus = this.findConsensus(validDecisions);
      
      return {
        decision: consensus.decision,
        source: {
          guardian: `${validDecisions.length} guardians`,
          type: 'remote',
          latency: Math.max(...validDecisions.map(d => d.latency)),
          confidence: consensus.confidence
        }
      };
    }
    
    return null;
  }
  
  /**
   * Try local guardian
   */
  private async tryLocalGuardian(event: VoidEvent): Promise<{
    decision: GuardianDecision;
    source: DecisionSource;
  } | null> {
    const localGuardian = Array.from(this.guardians.values())
      .find(g => g.type === 'local');
    
    if (!localGuardian) return null;
    
    try {
      const result = await this.queryGuardian(localGuardian, event);
      if (result) {
        return {
          decision: result.decision,
          source: {
            guardian: localGuardian.name,
            type: 'local',
            latency: result.latency,
            confidence: result.decision.confidence
          }
        };
      }
    } catch (error) {
      console.error('Local guardian error:', error);
    }
    
    return null;
  }
  
  /**
   * Query individual guardian
   */
  private async queryGuardian(
    guardian: GuardianConfig,
    event: VoidEvent
  ): Promise<{
    guardian: GuardianConfig;
    decision: GuardianDecision;
    latency: number;
  } | null> {
    const breaker = this.circuitBreakers.get(guardian.name);
    if (breaker?.isOpen()) {
      console.log(`⛔ Circuit breaker open for ${guardian.name}`);
      return null;
    }
    
    const startTime = Date.now();
    
    try {
      // Simulate guardian query (in real implementation, would be HTTP/gRPC)
      const decision = await this.simulateGuardianQuery(guardian, event);
      const latency = Date.now() - startTime;
      
      // Record success
      breaker?.recordSuccess();
      
      return { guardian, decision, latency };
    } catch (error) {
      // Record failure
      breaker?.recordFailure();
      console.error(`Guardian ${guardian.name} error:`, error);
      return null;
    }
  }
  
  /**
   * Simulate guardian decision (replace with actual API calls)
   */
  private async simulateGuardianQuery(
    guardian: GuardianConfig,
    event: VoidEvent
  ): Promise<GuardianDecision> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    
    // Simulate decision based on event type
    const decisions: Record<string, GuardianDecision> = {
      'ci:fail': { action: 'alert', confidence: 0.9, reasoning: 'CI failure requires attention' },
      'ci:pass': { action: 'log', confidence: 0.8, reasoning: 'CI success, continue monitoring' },
      'pr:open': { action: 'notify', confidence: 0.85, reasoning: 'New PR requires review' },
      'ipfs:degraded': { action: 'investigate', confidence: 0.7, reasoning: 'IPFS performance issue' },
      'substrate:beat': { action: 'continue', confidence: 0.95, reasoning: 'System healthy' }
    };
    
    const key = `${event.type}:${event.status}`;
    return decisions[key] || { action: 'monitor', confidence: 0.5 };
  }
  
  /**
   * Find consensus among guardian decisions
   */
  private findConsensus(decisions: Array<{
    guardian: GuardianConfig;
    decision: GuardianDecision;
    latency: number;
  }>): { decision: GuardianDecision; confidence: number } {
    // Group by action
    const actionGroups = new Map<string, GuardianDecision[]>();
    
    for (const { decision } of decisions) {
      const group = actionGroups.get(decision.action) || [];
      group.push(decision);
      actionGroups.set(decision.action, group);
    }
    
    // Find most common action
    let bestAction = '';
    let bestCount = 0;
    let bestGroup: GuardianDecision[] = [];
    
    for (const [action, group] of actionGroups) {
      if (group.length > bestCount) {
        bestAction = action;
        bestCount = group.length;
        bestGroup = group;
      }
    }
    
    // Calculate consensus confidence
    const avgConfidence = bestGroup.reduce((sum, d) => sum + d.confidence, 0) / bestGroup.length;
    const consensusRatio = bestCount / decisions.length;
    
    return {
      decision: {
        action: bestAction,
        confidence: avgConfidence * consensusRatio,
        reasoning: `Consensus from ${bestCount}/${decisions.length} guardians`
      },
      confidence: consensusRatio
    };
  }
  
  /**
   * Get rule-based decision (fallback)
   */
  private getRuleBasedDecision(event: VoidEvent): GuardianDecision {
    // Simple rule-based logic
    const key = `${event.type}:${event.status}`;
    
    switch (key) {
      case 'ci:fail':
        return { action: 'flash:fnpm', confidence: 0.6, reasoning: 'Rule: CI failure' };
      case 'pr:open':
        return { action: 'flash:origin', confidence: 0.6, reasoning: 'Rule: PR opened' };
      case 'substrate:beat':
        return { action: 'health:+0.01', confidence: 0.7, reasoning: 'Rule: Heartbeat' };
      default:
        return { action: 'log', confidence: 0.5, reasoning: 'Rule: Default logging' };
    }
  }
  
  /**
   * Get current routing status
   */
  getStatus(): {
    mode: string;
    availableGuardians: number;
    circuitBreakers: Record<string, boolean>;
    recentDecisions: DecisionSource[];
  } {
    const circuitBreakers: Record<string, boolean> = {};
    
    for (const [name, breaker] of this.circuitBreakers) {
      circuitBreakers[name] = !breaker.isOpen();
    }
    
    return {
      mode: this.currentMode,
      availableGuardians: Array.from(this.guardians.values())
        .filter(g => !this.circuitBreakers.get(g.name)?.isOpen()).length,
      circuitBreakers,
      recentDecisions: this.decisionHistory.slice(-10)
    };
  }
  
  /**
   * Reset to try remote guardians again
   */
  resetMode(): void {
    this.currentMode = 'remote';
    console.log('🔄 Router mode reset to remote');
  }
}

/**
 * Simple circuit breaker implementation
 */
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private threshold: number,
    private resetTimeout: number = 60000 // 1 minute
  ) {}
  
  recordSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }
  
  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'open';
      console.log(`⛔ Circuit breaker opened (${this.failures} failures)`);
    }
  }
  
  isOpen(): boolean {
    if (this.state === 'open') {
      // Check if we should try half-open
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'half-open';
        return false;
      }
      return true;
    }
    return false;
  }
}