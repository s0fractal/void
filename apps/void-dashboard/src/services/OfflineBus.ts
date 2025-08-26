import { VoidEvent } from './RelayClient';

export interface BusConfig {
  maxQueueSize: number;
  persistKey?: string;
  flushInterval?: number;
}

/**
 * 🚌 Offline Bus - Local event queue for autonomous operation
 */
export class OfflineBus {
  private queue: VoidEvent[] = [];
  private subscribers = new Set<(event: VoidEvent) => void>();
  private maxQueueSize: number;
  private persistKey?: string;
  private flushTimer?: number;
  private isOnline = true;
  
  constructor(config: BusConfig) {
    this.maxQueueSize = config.maxQueueSize || 1000;
    this.persistKey = config.persistKey;
    
    // Load persisted queue
    if (this.persistKey) {
      this.loadQueue();
    }
    
    // Start flush timer if configured
    if (config.flushInterval) {
      this.startFlushTimer(config.flushInterval);
    }
    
    console.log('🚌 Offline Bus initialized');
  }
  
  /**
   * Publish event to bus
   */
  publish(event: VoidEvent): void {
    // Add timestamp if not present
    if (!event.ts) {
      event.ts = new Date().toISOString();
    }
    
    // Add to queue
    this.queue.push(event);
    
    // Trim queue if needed
    if (this.queue.length > this.maxQueueSize) {
      this.queue.shift();
    }
    
    // Notify subscribers immediately if online
    if (this.isOnline) {
      this.notifySubscribers(event);
    }
    
    // Persist queue
    if (this.persistKey) {
      this.saveQueue();
    }
  }
  
  /**
   * Subscribe to events
   */
  subscribe(handler: (event: VoidEvent) => void): () => void {
    this.subscribers.add(handler);
    return () => this.subscribers.delete(handler);
  }
  
  /**
   * Set online/offline mode
   */
  setOnline(online: boolean): void {
    const wasOffline = !this.isOnline;
    this.isOnline = online;
    
    console.log(`🚌 Bus mode: ${online ? 'ONLINE' : 'OFFLINE'}`);
    
    // Flush queued events when coming back online
    if (online && wasOffline) {
      this.flushQueue();
    }
  }
  
  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }
  
  /**
   * Get queue contents (for debugging/export)
   */
  getQueue(): VoidEvent[] {
    return [...this.queue];
  }
  
  /**
   * Clear queue
   */
  clearQueue(): void {
    this.queue = [];
    if (this.persistKey) {
      this.saveQueue();
    }
  }
  
  /**
   * Manually flush queue to subscribers
   */
  flushQueue(): void {
    if (this.queue.length === 0) return;
    
    console.log(`🚌 Flushing ${this.queue.length} queued events`);
    
    // Send all queued events
    const events = [...this.queue];
    this.queue = [];
    
    for (const event of events) {
      this.notifySubscribers(event);
    }
    
    // Clear persisted queue
    if (this.persistKey) {
      this.saveQueue();
    }
  }
  
  /**
   * Generate synthetic events for testing
   */
  generateTestEvent(type: string = 'test', status: string = 'synthetic'): VoidEvent {
    return {
      type: type as any,
      status,
      meta: {
        source: 'offline-bus',
        synthetic: true,
        timestamp: Date.now()
      },
      ts: new Date().toISOString()
    };
  }
  
  /**
   * Simulate heartbeat for offline operation
   */
  startHeartbeat(interval: number = 10000): () => void {
    const timer = setInterval(() => {
      if (!this.isOnline) {
        this.publish({
          type: 'substrate',
          status: 'beat',
          meta: {
            k: 0.9 + Math.random() * 0.1, // 0.9-1.0
            source: 'offline-bus',
            synthetic: true
          }
        });
      }
    }, interval);
    
    return () => clearInterval(timer);
  }
  
  private notifySubscribers(event: VoidEvent): void {
    for (const subscriber of this.subscribers) {
      try {
        subscriber(event);
      } catch (error) {
        console.error('Subscriber error:', error);
      }
    }
  }
  
  private loadQueue(): void {
    if (!this.persistKey) return;
    
    try {
      const stored = localStorage.getItem(this.persistKey);
      if (stored) {
        this.queue = JSON.parse(stored);
        console.log(`🚌 Loaded ${this.queue.length} events from storage`);
      }
    } catch (error) {
      console.error('Failed to load queue:', error);
    }
  }
  
  private saveQueue(): void {
    if (!this.persistKey) return;
    
    try {
      localStorage.setItem(this.persistKey, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save queue:', error);
    }
  }
  
  private startFlushTimer(interval: number): void {
    this.flushTimer = window.setInterval(() => {
      if (this.isOnline && this.queue.length > 0) {
        this.flushQueue();
      }
    }, interval);
  }
  
  /**
   * Cleanup
   */
  dispose(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.subscribers.clear();
  }
}