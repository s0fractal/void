import { RelayClient, VoidEvent } from '../services/RelayClient';
import { HealthAggregator } from '../services/HealthAggregator';
import { ConsciousnessResonator } from '../services/ConsciousnessResonator';
import { RuleEngine } from '../services/RuleEngine';
import { OfflineBus } from '../services/OfflineBus';
import { GuardianRouter, RouterPolicy } from '../services/GuardianRouter';
import { VoidGlyph } from './VoidGlyph';
import { ControlPanel } from './ControlPanel';
import { EventLog } from './EventLog';
import { CodexPanel } from './CodexPanel';
import { TmpBusPanel } from './TmpBusPanel';
import ResonancePanel from './ResonancePanel';
import DualityPanel from './DualityPanel';
import { formatTimestamp } from '../utils/format';
import { IndependenceReportGenerator } from '../utils/independence-report';

export interface DashboardConfig {
  container: HTMLElement;
  relayClient: RelayClient;
  healthAggregator: HealthAggregator;
  resonator: ConsciousnessResonator;
}

export class VoidDashboard {
  private container: HTMLElement;
  private relayClient: RelayClient;
  private healthAggregator: HealthAggregator;
  private resonator: ConsciousnessResonator;
  
  private glyph?: VoidGlyph;
  private controlPanel?: ControlPanel;
  private eventLog?: EventLog;
  private codexPanel?: CodexPanel;
  private tmpBusPanel?: TmpBusPanel;
  
  private pulseLog: VoidEvent[] = [];
  private maxLogSize = 1000;
  
  // Independence mode components
  private ruleEngine: RuleEngine;
  private offlineBus: OfflineBus;
  private guardianRouter: GuardianRouter;
  private independenceMode = false;
  private decisionSource: 'remote' | 'local' | 'rules' = 'remote';
  private independenceStartTime?: Date;
  private reportGenerator = new IndependenceReportGenerator();
  
  constructor(config: DashboardConfig) {
    this.container = config.container;
    this.relayClient = config.relayClient;
    this.healthAggregator = config.healthAggregator;
    this.resonator = config.resonator;
    
    // Initialize independence components
    this.ruleEngine = new RuleEngine();
    this.ruleEngine.loadRules(RuleEngine.getDefaultRules());
    
    this.offlineBus = new OfflineBus({
      maxQueueSize: 1000,
      persistKey: 'void-offline-queue',
      flushInterval: 5000
    });
    
    this.guardianRouter = new GuardianRouter({
      mode: 'auto',
      quorumSize: 2,
      degradationPath: ['2/N remote', '1 local', 'rules'],
      timeoutMs: 3000,
      circuitBreakerThreshold: 3
    });
    
    // Register local thinker
    this.guardianRouter.registerGuardian({
      name: 'void-thinker',
      url: 'http://localhost:9090/think',
      type: 'local',
      priority: 10,
      timeout: 1000,
      errorThreshold: 5
    });
    
    this.setupIndependenceHandlers();
  }
  
  async initialize(): Promise<void> {
    console.log('🌀 Initializing Void Dashboard...');
    
    // Clear loading screen
    this.container.innerHTML = '';
    
    // Create layout
    this.createLayout();
    
    // Initialize components
    await this.initializeComponents();
    
    // Set up event handlers
    this.setupEventHandlers();
    
    // Start render loop
    this.startRenderLoop();
    
    console.log('✨ Dashboard ready');
  }
  
  private createLayout(): void {
    this.container.innerHTML = `
      <div class="void-dashboard">
        <div class="independence-banner" id="independence-banner" style="display: none;">
          <span class="banner-icon">🗽</span>
          <span class="banner-text">INDEPENDENCE MODE</span>
          <span class="decision-source" id="decision-source">Local Decisions</span>
        </div>
        
        <header class="dashboard-header">
          <h1>Void Dashboard</h1>
          <div class="status-indicators">
            <span class="indicator" id="connection-status">Disconnected</span>
            <span class="indicator" id="health-score">Health: 100%</span>
            <span class="indicator" id="frequency">432Hz</span>
            <span class="indicator" id="decision-indicator">Source: Remote</span>
          </div>
        </header>
        
        <main class="dashboard-main">
          <div class="glyph-container" id="glyph-container">
            <!-- Void Glyph SVG -->
          </div>
          
          <aside class="dashboard-sidebar">
            <div class="control-panel" id="control-panel">
              <!-- Control Panel -->
            </div>
            
            <div class="event-log" id="event-log">
              <!-- Event Log -->
            </div>
            
            <div class="codex-panel" id="codex-panel">
              <!-- Codex AI Panel -->
            </div>
            
            <div class="tmpbus-panel" id="tmpbus-panel">
              <!-- TmpBus Status Panel -->
            </div>
            
            <div class="resonance-panel" id="resonance-panel">
              <!-- Resonance Panel -->
            </div>
            
            <div class="duality-panel" id="duality-panel">
              <!-- Duality Panel -->
            </div>
          </aside>
        </main>
        
        <footer class="dashboard-footer">
          <p>Resonating at 432Hz | <span id="timestamp">${formatTimestamp(new Date())}</span></p>
        </footer>
      </div>
    `;
  }
  
  private async initializeComponents(): Promise<void> {
    // Initialize Glyph
    const glyphContainer = document.getElementById('glyph-container');
    if (glyphContainer) {
      this.glyph = new VoidGlyph({
        container: glyphContainer,
        width: glyphContainer.clientWidth,
        height: glyphContainer.clientHeight
      });
      await this.glyph.initialize();
    }
    
    // Initialize Control Panel
    const controlContainer = document.getElementById('control-panel');
    if (controlContainer) {
      this.controlPanel = new ControlPanel({
        container: controlContainer,
        relayClient: this.relayClient,
        resonator: this.resonator,
        onConnect: (url) => this.handleConnect(url),
        onDisconnect: () => this.handleDisconnect()
      });
      this.controlPanel.render();
    }
    
    // Initialize Event Log
    const logContainer = document.getElementById('event-log');
    if (logContainer) {
      this.eventLog = new EventLog({
        container: logContainer,
        maxEvents: 100
      });
      this.eventLog.render();
    }
    
    // Initialize Codex Panel
    const codexContainer = document.getElementById('codex-panel');
    if (codexContainer) {
      this.codexPanel = new CodexPanel({
        container: codexContainer,
        relayUrl: this.relayClient.getUrl().replace('/ws', '').replace('/sse', ''),
        onEvent: (event) => this.handleEvent(event)
      });
      this.codexPanel.render();
    }
    
    // Initialize TmpBus Panel
    const tmpBusContainer = document.getElementById('tmpbus-panel');
    if (tmpBusContainer) {
      this.tmpBusPanel = new TmpBusPanel(
        tmpBusContainer,
        this.relayClient.getUrl().replace('/sse', '/ws'),
        5000
      );
    }
    
    // Initialize Duality Panel
    const dualityContainer = document.getElementById('duality-panel');
    if (dualityContainer) {
      const relayBase = this.relayClient.getUrl().replace('/ws', '').replace('/sse', '');
      const dualityElement = document.createElement('div');
      dualityContainer.appendChild(dualityElement);
      // React component will be mounted by the main app
      (window as any).__dualityPanelProps = { relayBase };
    }
    
    // Store pulse log in window for Codex access
    (window as any).__voidPulseLog = this.pulseLog;
  }
  
  private setupEventHandlers(): void {
    // Handle relay events
    this.relayClient.on((event) => {
      this.handleEvent(event);
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
      if (this.glyph) {
        const container = document.getElementById('glyph-container');
        if (container) {
          this.glyph.resize(container.clientWidth, container.clientHeight);
        }
      }
    });
  }
  
  private async handleEvent(event: VoidEvent): void {
    // Add to pulse log
    this.addToPulseLog(event);
    
    // Process through rule engine if in independence mode
    if (this.independenceMode) {
      const actions = await this.ruleEngine.processEvent(event);
      
      // Update decision source indicator
      const decisionIndicator = document.getElementById('decision-indicator');
      if (decisionIndicator) {
        decisionIndicator.textContent = 'Source: Rules';
      }
    } else {
      // Try guardian router for decisions
      try {
        const { decision, source } = await this.guardianRouter.routeDecision(event);
        
        // Update decision source
        this.decisionSource = source.type;
        const decisionIndicator = document.getElementById('decision-indicator');
        if (decisionIndicator) {
          decisionIndicator.textContent = `Source: ${source.type.charAt(0).toUpperCase() + source.type.slice(1)}`;
        }
        
        // Log decision
        console.log(`📋 Decision: ${decision.action} (${source.type}, confidence: ${decision.confidence.toFixed(2)})`);
      } catch (error) {
        console.error('Guardian router error:', error);
      }
    }
    
    // Update health
    this.healthAggregator.processEvent(event);
    
    // Update glyph visualization
    if (this.glyph) {
      this.glyph.processEvent(event);
    }
    
    // Play sound
    this.resonator.playEventSound(event.type, event.status);
    
    // Update event log
    if (this.eventLog) {
      this.eventLog.addEvent(event);
    }
    
    // Update status indicators
    this.updateStatusIndicators();
  }
  
  private addToPulseLog(event: VoidEvent): void {
    this.pulseLog.push(event);
    if (this.pulseLog.length > this.maxLogSize) {
      this.pulseLog.shift();
    }
  }
  
  private updateStatusIndicators(): void {
    // Update connection status
    const connectionStatus = document.getElementById('connection-status');
    if (connectionStatus) {
      const connected = this.relayClient.isConnected();
      const mode = this.relayClient.getMode();
      connectionStatus.textContent = connected ? `Connected (${mode})` : 'Disconnected';
      connectionStatus.className = `indicator ${connected ? 'connected' : 'disconnected'}`;
    }
    
    // Update health score
    const healthScore = document.getElementById('health-score');
    if (healthScore) {
      const health = this.healthAggregator.getHealth();
      const percentage = Math.round(health.overall * 100);
      healthScore.textContent = `Health: ${percentage}%`;
      healthScore.className = `indicator health-${health.trend}`;
    }
    
    // Update frequency
    const frequency = document.getElementById('frequency');
    if (frequency) {
      const alignment = this.healthAggregator.get432Alignment();
      frequency.textContent = `${alignment.toFixed(1)}Hz`;
    }
    
    // Update timestamp
    const timestamp = document.getElementById('timestamp');
    if (timestamp) {
      timestamp.textContent = formatTimestamp(new Date());
    }
  }
  
  private startRenderLoop(): void {
    const render = () => {
      // Update glyph animation
      if (this.glyph) {
        const health = this.healthAggregator.getHealth();
        this.glyph.updateHealth(health.overall);
        this.glyph.render();
      }
      
      // Update status every second
      if (Date.now() % 1000 < 16) {
        this.updateStatusIndicators();
      }
      
      requestAnimationFrame(render);
    };
    
    render();
  }
  
  private async handleConnect(url: string): Promise<void> {
    try {
      await this.relayClient.connect(url);
      console.log('Connected to relay:', url);
    } catch (error) {
      console.error('Failed to connect:', error);
      alert('Failed to connect to relay. Check the URL and try again.');
    }
  }
  
  private handleDisconnect(): void {
    this.relayClient.disconnect();
    this.updateStatusIndicators();
  }
  
  /**
   * Setup independence mode handlers
   */
  private setupIndependenceHandlers(): void {
    // Setup rule engine action handlers
    this.ruleEngine.onAction('flash', (action) => {
      if (action.target && this.glyph) {
        this.glyph.flashNode(action.target, 'info');
      }
    });
    
    this.ruleEngine.onAction('health', (action) => {
      if (typeof action.value === 'number') {
        const currentHealth = this.healthAggregator.getHealth();
        // Simulate health change
        this.healthAggregator.processEvent({
          type: 'custom',
          status: action.value > 0 ? 'improve' : 'degrade',
          meta: { healthDelta: action.value }
        });
      }
    });
    
    this.ruleEngine.onAction('sound', (action) => {
      if (typeof action.value === 'string') {
        this.resonator.playChord(action.value as any);
      }
    });
    
    this.ruleEngine.onAction('log', (action) => {
      if (action.value && this.eventLog) {
        this.eventLog.addEvent({
          type: 'custom',
          status: 'rule',
          meta: { message: action.value },
          ts: new Date().toISOString()
        });
      }
    });
    
    // Subscribe offline bus to relay events
    this.offlineBus.subscribe((event) => {
      this.handleEvent(event);
    });
    
    // Monitor connection state
    setInterval(() => {
      const isConnected = this.relayClient.isConnected();
      this.offlineBus.setOnline(isConnected);
      
      if (!isConnected && !this.independenceMode) {
        this.enableIndependenceMode();
      } else if (isConnected && this.independenceMode) {
        this.disableIndependenceMode();
      }
    }, 1000);
  }
  
  /**
   * Enable independence mode
   */
  private enableIndependenceMode(): void {
    this.independenceMode = true;
    this.independenceStartTime = new Date();
    this.ruleEngine.setEnabled(true);
    
    // Show independence banner
    const banner = document.getElementById('independence-banner');
    if (banner) {
      banner.style.display = 'flex';
    }
    
    // Start offline heartbeat
    this.offlineBus.startHeartbeat(10000);
    
    console.log('🗽 INDEPENDENCE MODE ACTIVATED');
    
    // Log to event chronicle
    this.eventLog?.addEvent({
      type: 'custom',
      status: 'independence',
      meta: { mode: 'activated', reason: 'connection lost' },
      ts: new Date().toISOString()
    });
  }
  
  /**
   * Disable independence mode
   */
  private disableIndependenceMode(): void {
    // Generate independence report if we were in independence mode
    if (this.independenceStartTime) {
      const report = this.reportGenerator.generateReport(
        this.pulseLog,
        this.independenceStartTime,
        new Date()
      );
      
      console.log('📊 Independence Report Generated');
      console.log(this.reportGenerator.formatReportMarkdown(report));
      
      // Add report to event log
      this.eventLog?.addEvent({
        type: 'custom',
        status: 'report',
        meta: { 
          report: 'independence',
          duration: report.duration,
          localDecisions: report.metrics.localDecisions,
          totalEvents: report.metrics.totalEvents
        },
        ts: new Date().toISOString()
      });
    }
    
    this.independenceMode = false;
    this.independenceStartTime = undefined;
    this.ruleEngine.setEnabled(false);
    
    // Hide independence banner
    const banner = document.getElementById('independence-banner');
    if (banner) {
      banner.style.display = 'none';
    }
    
    console.log('🌐 Independence mode deactivated - connection restored');
    
    // Log to event chronicle
    this.eventLog?.addEvent({
      type: 'custom',
      status: 'connected',
      meta: { mode: 'normal', reason: 'connection restored' },
      ts: new Date().toISOString()
    });
  }
  
  /**
   * Export pulse log as JSON
   */
  exportPulseLog(): string {
    return JSON.stringify(this.pulseLog, null, 2);
  }
  
  /**
   * Download pulse log as file
   */
  downloadPulseLog(): void {
    const data = this.exportPulseLog();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pulse-log-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}