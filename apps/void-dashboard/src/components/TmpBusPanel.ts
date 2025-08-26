export interface TmpBusStats {
  session_id?: string;
  lease?: {
    created_at: string;
    updated_at: string;
  };
  relay_connected?: boolean;
  events_ingested?: number;
  events_forwarded?: number;
  events_spooled?: number;
  spool_depth?: number;
  uds_clients?: number;
  tcp_clients?: number;
  pulse?: {
    size_bytes: number;
    age_seconds: number;
    rotations?: Record<string, number>;
  };
}

export class TmpBusPanel {
  private container: HTMLElement;
  private ws?: WebSocket;
  private stats: TmpBusStats = {};
  private pollInterval: number;
  private reconnectTimeout?: NodeJS.Timeout;
  private updateInterval?: NodeJS.Timeout;
  
  constructor(container: HTMLElement, wsUrl: string = 'ws://localhost:8787/ws', pollInterval: number = 5000) {
    this.container = container;
    this.pollInterval = pollInterval;
    this.render();
    this.connect(wsUrl);
  }
  
  private connect(wsUrl: string): void {
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('TmpBus panel connected');
        this.updateConnectionStatus(true);
        
        // Request initial stats
        this.requestStats();
        
        // Setup polling
        this.updateInterval = setInterval(() => this.requestStats(), this.pollInterval);
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'tmpbus.stats' && data.stats) {
            this.stats = data.stats;
            this.updateDisplay();
          }
        } catch (e) {
          console.error('Failed to parse tmpbus stats:', e);
        }
      };
      
      this.ws.onerror = (e) => {
        console.error('TmpBus WebSocket error:', e);
        this.updateConnectionStatus(false);
      };
      
      this.ws.onclose = () => {
        console.log('TmpBus panel disconnected, reconnecting...');
        this.updateConnectionStatus(false);
        if (this.updateInterval) {
          clearInterval(this.updateInterval);
        }
        this.reconnectTimeout = setTimeout(() => this.connect(wsUrl), 3000);
      };
    } catch (e) {
      console.error('Failed to connect TmpBus panel:', e);
      this.updateConnectionStatus(false);
      this.reconnectTimeout = setTimeout(() => this.connect(wsUrl), 3000);
    }
  }
  
  private requestStats(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'tmpbus.stats.request',
        meta: { source: 'dashboard' }
      }));
    }
  }
  
  private render(): void {
    this.container.innerHTML = `
      <div class="tmpbus-panel">
        <div class="panel-header">
          <h3>TmpBus Status</h3>
          <div class="status-badges">
            <span class="badge relay-status disconnected" id="tmpbus-relay-status">Relay Offline</span>
            <span class="badge session-id" id="tmpbus-session-id">--------</span>
          </div>
        </div>
        
        <div class="panel-content">
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-label">
                <i class="icon-users"></i> Clients
              </div>
              <div class="stat-value">
                <span id="tmpbus-uds-clients">0</span> UDS / 
                <span id="tmpbus-tcp-clients">0</span> TCP
              </div>
            </div>
            
            <div class="stat-item">
              <div class="stat-label">
                <i class="icon-clock"></i> Lease Age
              </div>
              <div class="stat-value" id="tmpbus-lease-age">0s</div>
            </div>
            
            <div class="stat-item">
              <div class="stat-label">
                <i class="icon-zap"></i> Event Flow
              </div>
              <div class="stat-value">
                <span id="tmpbus-events-forwarded">0</span> / 
                <span id="tmpbus-events-ingested">0</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" id="tmpbus-flow-progress"></div>
              </div>
            </div>
            
            <div class="stat-item">
              <div class="stat-label">
                <i class="icon-database"></i> Spool Depth
              </div>
              <div class="stat-value">
                <span id="tmpbus-spool-depth">0</span>
                <span class="badge buffering" id="tmpbus-buffering" style="display: none;">Buffering</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill spool-progress" id="tmpbus-spool-progress"></div>
              </div>
            </div>
            
            <div class="stat-item">
              <div class="stat-label">
                <i class="icon-harddrive"></i> Pulse Log
              </div>
              <div class="stat-value">
                <div id="tmpbus-pulse-size">0 B</div>
                <div class="stat-detail" id="tmpbus-pulse-age">0s old</div>
              </div>
            </div>
          </div>
          
          <div class="rotations" id="tmpbus-rotations" style="display: none;">
            <div class="rotations-label">Log Rotations:</div>
            <div class="rotations-list" id="tmpbus-rotations-list"></div>
          </div>
          
          <div class="last-update" id="tmpbus-last-update">
            Last update: Never
          </div>
          
          <div class="degraded-warning" id="tmpbus-degraded" style="display: none;">
            <i class="icon-alert"></i>
            <span>Degraded Mode: Store-and-Forward Active</span>
          </div>
        </div>
      </div>
    `;
  }
  
  private updateDisplay(): void {
    // Session ID
    const sessionId = this.stats.session_id ? this.stats.session_id.slice(0, 8) : '--------';
    this.updateElement('tmpbus-session-id', sessionId);
    
    // Relay status
    this.updateConnectionStatus(this.stats.relay_connected || false);
    
    // Clients
    this.updateElement('tmpbus-uds-clients', String(this.stats.uds_clients || 0));
    this.updateElement('tmpbus-tcp-clients', String(this.stats.tcp_clients || 0));
    
    // Lease age
    const leaseAge = this.getLeaseAge();
    this.updateElement('tmpbus-lease-age', this.formatDuration(leaseAge));
    
    // Event flow
    const ingested = this.stats.events_ingested || 0;
    const forwarded = this.stats.events_forwarded || 0;
    this.updateElement('tmpbus-events-ingested', String(ingested));
    this.updateElement('tmpbus-events-forwarded', String(forwarded));
    
    const flowPercent = ingested > 0 ? (forwarded / ingested) * 100 : 0;
    const progressBar = document.getElementById('tmpbus-flow-progress');
    if (progressBar) {
      progressBar.style.width = `${flowPercent}%`;
    }
    
    // Spool depth
    const spoolDepth = this.stats.spool_depth || 0;
    const spoolMax = 200; // Soft cap for visualization
    this.updateElement('tmpbus-spool-depth', String(spoolDepth));
    const bufferingBadge = document.getElementById('tmpbus-buffering');
    if (bufferingBadge) {
      bufferingBadge.style.display = spoolDepth > 0 ? 'inline' : 'none';
    }
    
    // Spool progress bar
    const spoolProgress = document.getElementById('tmpbus-spool-progress');
    if (spoolProgress) {
      const percent = Math.min((spoolDepth / spoolMax) * 100, 100);
      spoolProgress.style.width = `${percent}%`;
      
      // Color based on depth
      if (percent > 75) {
        spoolProgress.style.backgroundColor = '#ff4757'; // Red
      } else if (percent > 50) {
        spoolProgress.style.backgroundColor = '#ffa500'; // Orange
      } else {
        spoolProgress.style.backgroundColor = 'var(--accent-primary)'; // Normal
      }
    }
    
    // Pulse log
    if (this.stats.pulse) {
      this.updateElement('tmpbus-pulse-size', this.formatBytes(this.stats.pulse.size_bytes));
      this.updateElement('tmpbus-pulse-age', `${this.formatDuration(this.stats.pulse.age_seconds)} old`);
      
      // Rotations
      if (this.stats.pulse.rotations && Object.keys(this.stats.pulse.rotations).length > 0) {
        const rotationsContainer = document.getElementById('tmpbus-rotations');
        const rotationsList = document.getElementById('tmpbus-rotations-list');
        
        if (rotationsContainer && rotationsList) {
          rotationsContainer.style.display = 'block';
          rotationsList.innerHTML = Object.entries(this.stats.pulse.rotations)
            .map(([reason, count]) => `<span class="badge">${reason}: ${count}</span>`)
            .join(' ');
        }
      }
    }
    
    // Last update
    this.updateElement('tmpbus-last-update', `Last update: ${new Date().toLocaleTimeString()}`);
    
    // Degraded mode warning
    const degradedWarning = document.getElementById('tmpbus-degraded');
    if (degradedWarning) {
      const isDegraded = !this.stats.relay_connected && !this.ws;
      degradedWarning.style.display = isDegraded ? 'block' : 'none';
    }
  }
  
  private updateConnectionStatus(connected: boolean): void {
    const statusEl = document.getElementById('tmpbus-relay-status');
    if (statusEl) {
      statusEl.textContent = connected ? 'Relay Connected' : 'Relay Offline';
      statusEl.className = `badge relay-status ${connected ? 'connected' : 'disconnected'}`;
    }
  }
  
  private updateElement(id: string, text: string): void {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }
  
  private getLeaseAge(): number {
    if (!this.stats.lease?.updated_at) return 0;
    const updated = new Date(this.stats.lease.updated_at).getTime();
    return (Date.now() - updated) / 1000;
  }
  
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  
  private formatDuration(seconds: number): string {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  }
  
  destroy(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.ws?.close();
  }
}