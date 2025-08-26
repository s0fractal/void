import { VoidEvent } from './RelayClient';

export interface Rule {
  name: string;
  when: string;
  do: string[];
}

export interface RuleAction {
  type: 'flash' | 'health' | 'sound' | 'log';
  target?: string;
  value?: number | string;
}

/**
 * 🧠 Rule Engine v0 - Simple event→action processor for offline autonomy
 */
export class RuleEngine {
  private rules: Rule[] = [];
  private actionHandlers: Map<string, (action: RuleAction) => void> = new Map();
  private enabled = false;
  
  constructor() {
    console.log('🧠 Rule Engine v0 initialized');
  }
  
  /**
   * Load rules from YAML-like structure
   */
  loadRules(rules: Rule[]): void {
    this.rules = rules;
    console.log(`📋 Loaded ${rules.length} rules`);
  }
  
  /**
   * Register action handler
   */
  onAction(type: string, handler: (action: RuleAction) => void): void {
    this.actionHandlers.set(type, handler);
  }
  
  /**
   * Process event through rules
   */
  async processEvent(event: VoidEvent): Promise<RuleAction[]> {
    if (!this.enabled) return [];
    
    const matchedActions: RuleAction[] = [];
    
    for (const rule of this.rules) {
      try {
        // Evaluate rule condition
        if (this.evaluateCondition(rule.when, event)) {
          console.log(`✅ Rule matched: ${rule.name}`);
          
          // Parse and execute actions
          for (const actionStr of rule.do) {
            const action = this.parseAction(actionStr);
            if (action) {
              matchedActions.push(action);
              this.executeAction(action);
            }
          }
        }
      } catch (error) {
        console.error(`Rule evaluation error: ${rule.name}`, error);
      }
    }
    
    return matchedActions;
  }
  
  /**
   * Evaluate rule condition against event
   */
  private evaluateCondition(condition: string, event: VoidEvent): boolean {
    // Create safe evaluation context
    const context = {
      type: event.type,
      status: event.status,
      meta: event.meta || {},
      ts: event.ts
    };
    
    // Simple expression evaluator (safe subset)
    try {
      // Replace operators for safety
      const safeCondition = condition
        .replace(/==/g, '===')
        .replace(/!=/g, '!==')
        .replace(/&&/g, ' && ')
        .replace(/\|\|/g, ' || ');
      
      // Build evaluation function
      const evalFn = new Function('ctx', `
        const { type, status, meta } = ctx;
        return (${safeCondition});
      `);
      
      return evalFn(context);
    } catch (error) {
      console.error('Condition evaluation error:', condition, error);
      return false;
    }
  }
  
  /**
   * Parse action string into structured action
   */
  private parseAction(actionStr: string): RuleAction | null {
    const parts = actionStr.split(':');
    if (parts.length < 1) return null;
    
    const type = parts[0] as RuleAction['type'];
    
    switch (type) {
      case 'flash':
        return { type, target: parts[1] };
        
      case 'health':
        const value = parseFloat(parts[1]);
        return { type, value: isNaN(value) ? 0 : value };
        
      case 'sound':
        return { type, value: parts[1] };
        
      case 'log':
        return { type, value: parts.slice(1).join(':') };
        
      default:
        console.warn(`Unknown action type: ${type}`);
        return null;
    }
  }
  
  /**
   * Execute action through registered handlers
   */
  private executeAction(action: RuleAction): void {
    const handler = this.actionHandlers.get(action.type);
    if (handler) {
      handler(action);
    } else {
      console.warn(`No handler for action type: ${action.type}`);
    }
  }
  
  /**
   * Enable/disable rule engine
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    console.log(`🧠 Rule Engine ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Get loaded rules
   */
  getRules(): Rule[] {
    return [...this.rules];
  }
  
  /**
   * Default rules for basic autonomy
   */
  static getDefaultRules(): Rule[] {
    return [
      {
        name: 'PR Open lifts Origin',
        when: "type === 'pr' && status === 'open'",
        do: ['flash:origin', 'health:+0.01', 'log:PR opened', 'sound:emergence']
      },
      {
        name: 'CI Fail hurts fnpm',
        when: "type === 'ci' && status === 'fail'",
        do: ['flash:fnpm', 'health:-0.12', 'sound:warning', 'log:CI failed']
      },
      {
        name: 'CI Pass heals fnpm',
        when: "type === 'ci' && status === 'pass'",
        do: ['flash:fnpm', 'health:+0.05', 'sound:joy', 'log:CI passed']
      },
      {
        name: 'IPFS degraded lowers Gaia',
        when: "type === 'ipfs' && status === 'degraded'",
        do: ['flash:gaia', 'health:-0.05', 'sound:dissolution', 'log:IPFS degraded']
      },
      {
        name: 'Substrate beat stabilizes trunk',
        when: "type === 'substrate' && status === 'beat'",
        do: ['flash:linux', 'health:+0.01', 'log:Substrate heartbeat']
      },
      {
        name: 'Guardian offline impacts crown',
        when: "type === 'guardian' && status === 'offline'",
        do: ['flash:net', 'health:-0.1', 'sound:warning', 'log:Guardian offline']
      },
      {
        name: 'Guardian online restores crown',
        when: "type === 'guardian' && status === 'online'",
        do: ['flash:net', 'health:+0.05', 'sound:synthesis', 'log:Guardian online']
      }
    ];
  }
}