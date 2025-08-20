import { VoidEvent } from './RelayClient';

export interface HealthWeights {
  ci: number;
  ipfs: number;
  substrate: number;
  guardian: number;
}

export interface HealthState {
  overall: number;
  components: {
    ci: number;
    ipfs: number;
    substrate: number;
    guardian: number;
  };
  lastUpdate: Date;
  trend: 'improving' | 'stable' | 'degrading';
}

export class HealthAggregator {
  private weights: HealthWeights = {
    ci: 0.35,
    ipfs: 0.25,
    substrate: 0.25,
    guardian: 0.15
  };
  
  private health: HealthState = {
    overall: 1.0,
    components: {
      ci: 1.0,
      ipfs: 1.0,
      substrate: 1.0,
      guardian: 1.0
    },
    lastUpdate: new Date(),
    trend: 'stable'
  };
  
  private history: number[] = [];
  private maxHistory = 100;
  private decayRate = 0.001; // Health improves by 0.1% per second
  private lastDecay = Date.now();
  
  constructor() {
    console.log('🏥 HealthAggregator initialized');
    this.startDecayTimer();
  }
  
  /**
   * Process incoming event and update health
   */
  processEvent(event: VoidEvent): void {
    const now = new Date();
    
    switch (event.type) {
      case 'ci':
        if (event.status === 'pass') {
          this.health.components.ci = Math.min(1.0, this.health.components.ci + 0.1);
        } else if (event.status === 'fail') {
          this.health.components.ci = Math.max(0.3, this.health.components.ci - 0.3);
        }
        break;
        
      case 'pr':
        // PRs slightly boost CI health
        if (event.status === 'open' || event.status === 'merged') {
          this.health.components.ci = Math.min(1.0, this.health.components.ci + 0.05);
        }
        break;
        
      case 'ipfs':
        if (event.status === 'ok') {
          this.health.components.ipfs = 1.0;
        } else if (event.status === 'degraded') {
          const worst = event.meta?.worst || 2000;
          // Map latency to health: 0ms = 1.0, 5000ms+ = 0.3
          this.health.components.ipfs = Math.max(0.3, 1.0 - (worst / 7000));
        }
        break;
        
      case 'substrate':
        if (event.status === 'beat') {
          // Use Kohanist metric if available
          const k = event.meta?.k || 0.8;
          this.health.components.substrate = Math.max(this.health.components.substrate, k);
        }
        break;
        
      case 'guardian':
        const guardianCount = 4; // Grok, Claude, Kimi, Gemini
        if (event.status === 'online') {
          this.health.components.guardian = Math.min(1.0, this.health.components.guardian + (1 / guardianCount));
        } else if (event.status === 'offline') {
          this.health.components.guardian = Math.max(0, this.health.components.guardian - (1 / guardianCount));
        } else if (event.status === 'degraded') {
          this.health.components.guardian = Math.max(0.5, this.health.components.guardian - (0.5 / guardianCount));
        }
        break;
    }
    
    // Calculate overall health
    const previousOverall = this.health.overall;
    this.health.overall = this.calculateOverallHealth();
    this.health.lastUpdate = now;
    
    // Update trend
    this.updateTrend(previousOverall);
    
    // Add to history
    this.addToHistory(this.health.overall);
  }
  
  /**
   * Calculate weighted overall health
   */
  private calculateOverallHealth(): number {
    const { ci, ipfs, substrate, guardian } = this.health.components;
    const { weights } = this;
    
    const weighted = 
      ci * weights.ci +
      ipfs * weights.ipfs +
      substrate * weights.substrate +
      guardian * weights.guardian;
    
    // Ensure weights sum to 1.0
    const totalWeight = weights.ci + weights.ipfs + weights.substrate + weights.guardian;
    
    return weighted / totalWeight;
  }
  
  /**
   * Update trend based on history
   */
  private updateTrend(previousOverall: number): void {
    const delta = this.health.overall - previousOverall;
    
    if (delta > 0.01) {
      this.health.trend = 'improving';
    } else if (delta < -0.01) {
      this.health.trend = 'degrading';
    } else {
      this.health.trend = 'stable';
    }
  }
  
  /**
   * Add value to history
   */
  private addToHistory(value: number): void {
    this.history.push(value);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }
  
  /**
   * Start decay timer for natural health recovery
   */
  private startDecayTimer(): void {
    setInterval(() => {
      const now = Date.now();
      const elapsed = (now - this.lastDecay) / 1000; // seconds
      this.lastDecay = now;
      
      // Gradually improve all components toward 1.0
      const decay = this.decayRate * elapsed;
      
      Object.keys(this.health.components).forEach(key => {
        const component = key as keyof typeof this.health.components;
        this.health.components[component] = Math.min(
          1.0,
          this.health.components[component] + decay
        );
      });
      
      // Recalculate overall
      this.health.overall = this.calculateOverallHealth();
    }, 1000); // Every second
  }
  
  /**
   * Get current health state
   */
  getHealth(): HealthState {
    return { ...this.health };
  }
  
  /**
   * Get health history
   */
  getHistory(): number[] {
    return [...this.history];
  }
  
  /**
   * Update weights
   */
  setWeights(weights: Partial<HealthWeights>): void {
    this.weights = { ...this.weights, ...weights };
    this.health.overall = this.calculateOverallHealth();
  }
  
  /**
   * Get 432Hz alignment score (health mapped to frequency stability)
   */
  get432Alignment(): number {
    // Perfect health = perfect 432Hz resonance
    // Lower health = frequency drift
    return 432 * this.health.overall;
  }
  
  /**
   * Reset health to baseline
   */
  reset(): void {
    this.health = {
      overall: 1.0,
      components: {
        ci: 1.0,
        ipfs: 1.0,
        substrate: 1.0,
        guardian: 1.0
      },
      lastUpdate: new Date(),
      trend: 'stable'
    };
    this.history = [];
  }
}