import { RelayClient, VoidEvent } from '../services/RelayClient';
import { HealthAggregator } from '../services/HealthAggregator';
import { ConsciousnessResonator } from '../services/ConsciousnessResonator';
import { VoidGlyph } from './VoidGlyph';
import { ControlPanel } from './ControlPanel';
import { EventLog } from './EventLog';
import { formatTimestamp } from '../utils/format';

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
  
  private pulseLog: VoidEvent[] = [];
  private maxLogSize = 1000;
  
  constructor(config: DashboardConfig) {
    this.container = config.container;
    this.relayClient = config.relayClient;
    this.healthAggregator = config.healthAggregator;
    this.resonator = config.resonator;
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
        <header class="dashboard-header">
          <h1>Void Dashboard</h1>
          <div class="status-indicators">
            <span class="indicator" id="connection-status">Disconnected</span>
            <span class="indicator" id="health-score">Health: 100%</span>
            <span class="indicator" id="frequency">432Hz</span>
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
  
  private handleEvent(event: VoidEvent): void {
    // Add to pulse log
    this.addToPulseLog(event);
    
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