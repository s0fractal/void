import { VoidEvent } from '../services/RelayClient';
import { formatTimestamp } from '../utils/format';

interface EventLogConfig {
  container: HTMLElement;
  maxEvents: number;
}

/**
 * 📜 Event Log - Chronicle of system events
 */
export class EventLog {
  private container: HTMLElement;
  private maxEvents: number;
  private events: VoidEvent[] = [];
  private autoScroll = true;
  
  constructor(config: EventLogConfig) {
    this.container = config.container;
    this.maxEvents = config.maxEvents;
  }
  
  render(): void {
    this.container.innerHTML = `
      <div class="event-log-content">
        <div class="event-log-header">
          <h3>Event Chronicle</h3>
          <label class="auto-scroll">
            <input type="checkbox" id="auto-scroll" checked />
            Auto-scroll
          </label>
        </div>
        
        <div class="event-log-list" id="event-list">
          <div class="event-log-empty">
            <p>Waiting for events...</p>
            <p class="hint">Connect to a relay to see live events</p>
          </div>
        </div>
      </div>
    `;
    
    this.attachEventListeners();
  }
  
  private attachEventListeners(): void {
    const autoScrollCheckbox = this.container.querySelector('#auto-scroll') as HTMLInputElement;
    autoScrollCheckbox?.addEventListener('change', () => {
      this.autoScroll = autoScrollCheckbox.checked;
    });
    
    // Handle pulse log export
    document.addEventListener('export-pulse-log', () => {
      this.exportLog();
    });
  }
  
  addEvent(event: VoidEvent): void {
    this.events.push(event);
    
    // Limit events
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
    
    this.updateEventList();
  }
  
  private updateEventList(): void {
    const listContainer = this.container.querySelector('#event-list');
    if (!listContainer) return;
    
    // Clear empty state
    if (this.events.length === 0) {
      listContainer.innerHTML = `
        <div class="event-log-empty">
          <p>Waiting for events...</p>
          <p class="hint">Connect to a relay to see live events</p>
        </div>
      `;
      return;
    }
    
    // Build event list
    const eventsHtml = this.events.map(event => this.renderEvent(event)).join('');
    listContainer.innerHTML = eventsHtml;
    
    // Auto-scroll to bottom
    if (this.autoScroll) {
      listContainer.scrollTop = listContainer.scrollHeight;
    }
  }
  
  private renderEvent(event: VoidEvent): string {
    const timestamp = formatTimestamp(new Date(event.ts || new Date()));
    const icon = this.getEventIcon(event.type);
    const statusClass = this.getStatusClass(event.status);
    
    // Extract key metadata
    const metaInfo = this.formatMetadata(event.meta);
    
    return `
      <div class="event-item ${event.type} ${statusClass}">
        <div class="event-header">
          <span class="event-icon">${icon}</span>
          <span class="event-type">${event.type}:${event.status}</span>
          <span class="event-timestamp">${timestamp}</span>
        </div>
        ${metaInfo ? `<div class="event-meta">${metaInfo}</div>` : ''}
      </div>
    `;
  }
  
  private getEventIcon(type: string): string {
    const icons: Record<string, string> = {
      ci: '🔨',
      pr: '🔀',
      ipfs: '🌐',
      substrate: '💓',
      guardian: '🤖',
      custom: '📍',
      tick: '⏰'
    };
    return icons[type] || '•';
  }
  
  private getStatusClass(status: string): string {
    const statusMap: Record<string, string> = {
      pass: 'status-success',
      fail: 'status-error',
      ok: 'status-success',
      degraded: 'status-warning',
      online: 'status-success',
      offline: 'status-error',
      open: 'status-info',
      closed: 'status-neutral',
      merged: 'status-success'
    };
    return statusMap[status] || 'status-neutral';
  }
  
  private formatMetadata(meta?: Record<string, any>): string {
    if (!meta || Object.keys(meta).length === 0) return '';
    
    const parts: string[] = [];
    
    // Common metadata fields
    if (meta.repo) parts.push(`repo: ${meta.repo}`);
    if (meta.sha) parts.push(`sha: ${meta.sha.substring(0, 7)}`);
    if (meta.k !== undefined) parts.push(`K: ${meta.k.toFixed(3)}`);
    if (meta.worst !== undefined) parts.push(`latency: ${meta.worst}ms`);
    if (meta.model) parts.push(`guardian: ${meta.model}`);
    
    // Limit to 3 items for space
    return parts.slice(0, 3).join(' | ');
  }
  
  private exportLog(): void {
    const logData = {
      exported: new Date().toISOString(),
      events: this.events,
      stats: {
        total: this.events.length,
        byType: this.getEventStats()
      }
    };
    
    const json = JSON.stringify(logData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `pulse-log-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  private getEventStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    
    for (const event of this.events) {
      const key = `${event.type}:${event.status}`;
      stats[key] = (stats[key] || 0) + 1;
    }
    
    return stats;
  }
  
  clear(): void {
    this.events = [];
    this.updateEventList();
  }
}