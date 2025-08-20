import ReconnectingWebSocket from 'reconnecting-websocket';

export interface VoidEvent {
  type: 'ci' | 'pr' | 'ipfs' | 'substrate' | 'guardian' | 'tick' | 'custom';
  status: string;
  meta?: Record<string, any>;
  ts?: string;
}

export type EventHandler = (event: VoidEvent) => void;

export class RelayClient {
  private ws?: ReconnectingWebSocket;
  private sse?: EventSource;
  private handlers = new Set<EventHandler>();
  private connected = false;
  private mode: 'ws' | 'sse' = 'ws';
  private reconnectAttempts = 0;
  
  constructor() {
    console.log('📡 RelayClient initialized');
  }
  
  /**
   * Connect to relay via WebSocket
   */
  async connectWS(url: string): Promise<void> {
    this.disconnect();
    this.mode = 'ws';
    
    console.log(`🌐 Connecting to WebSocket: ${url}`);
    
    this.ws = new ReconnectingWebSocket(url, [], {
      connectionTimeout: 5000,
      maxRetries: 10,
      maxReconnectionDelay: 10000,
      minReconnectionDelay: 1000,
      reconnectionDelayGrowFactor: 1.3
    });
    
    this.ws.addEventListener('open', () => {
      console.log('✅ WebSocket connected');
      this.connected = true;
      this.reconnectAttempts = 0;
      this.emit({ type: 'custom', status: 'connected', meta: { mode: 'ws' } });
    });
    
    this.ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleEvent(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    });
    
    this.ws.addEventListener('close', () => {
      console.log('🔌 WebSocket disconnected');
      this.connected = false;
      this.emit({ type: 'custom', status: 'disconnected', meta: { mode: 'ws' } });
    });
    
    this.ws.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      this.reconnectAttempts++;
    });
  }
  
  /**
   * Connect to relay via Server-Sent Events
   */
  async connectSSE(url: string): Promise<void> {
    this.disconnect();
    this.mode = 'sse';
    
    console.log(`📻 Connecting to SSE: ${url}`);
    
    this.sse = new EventSource(url);
    
    this.sse.addEventListener('open', () => {
      console.log('✅ SSE connected');
      this.connected = true;
      this.emit({ type: 'custom', status: 'connected', meta: { mode: 'sse' } });
    });
    
    this.sse.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleEvent(data);
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    });
    
    this.sse.addEventListener('error', (error) => {
      console.error('SSE error:', error);
      this.connected = false;
      this.emit({ type: 'custom', status: 'disconnected', meta: { mode: 'sse' } });
    });
  }
  
  /**
   * Connect using auto-detection or specified mode
   */
  async connect(url: string): Promise<void> {
    if (url.startsWith('ws://') || url.startsWith('wss://')) {
      await this.connectWS(url);
    } else if (url.includes('/sse') || url.includes('text/event-stream')) {
      await this.connectSSE(url);
    } else {
      // Default to WebSocket
      await this.connectWS(url);
    }
  }
  
  /**
   * Disconnect from relay
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
    
    if (this.sse) {
      this.sse.close();
      this.sse = undefined;
    }
    
    this.connected = false;
  }
  
  /**
   * Subscribe to events
   */
  on(handler: EventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }
  
  /**
   * Emit event to all handlers
   */
  private emit(event: VoidEvent): void {
    // Add timestamp if not present
    if (!event.ts) {
      event.ts = new Date().toISOString();
    }
    
    this.handlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('Event handler error:', error);
      }
    });
  }
  
  /**
   * Handle incoming event
   */
  private handleEvent(data: any): void {
    // Normalize event format
    const event: VoidEvent = {
      type: data.type || 'custom',
      status: data.status || 'unknown',
      meta: data.meta || {},
      ts: data.ts || new Date().toISOString()
    };
    
    console.log(`📨 Event: ${event.type}:${event.status}`, event.meta);
    this.emit(event);
  }
  
  /**
   * Send event (if supported by relay)
   */
  async send(event: VoidEvent): Promise<void> {
    if (!this.connected || !this.ws) {
      throw new Error('Not connected or WebSocket mode required');
    }
    
    this.ws.send(JSON.stringify(event));
  }
  
  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.connected;
  }
  
  /**
   * Get connection mode
   */
  getMode(): 'ws' | 'sse' | null {
    return this.connected ? this.mode : null;
  }
}