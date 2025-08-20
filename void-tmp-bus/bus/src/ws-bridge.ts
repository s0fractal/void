import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { RELAY_WS, WS_RECONNECT_DELAY, WS_MAX_BATCH } from './config.js';
import { nowISO } from './util.js';

export class WSBridge extends EventEmitter {
  private ws?: WebSocket;
  private reconnectTimer?: NodeJS.Timeout;
  private isConnecting = false;
  private batch: any[] = [];
  private batchTimer?: NodeJS.Timeout;
  
  constructor(
    private url = RELAY_WS,
    private maxBatch = WS_MAX_BATCH,
    private reconnectDelay = WS_RECONNECT_DELAY
  ) {
    super();
  }
  
  start() {
    this.connect();
  }
  
  stop() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
  }
  
  private connect() {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }
    
    this.isConnecting = true;
    console.log('WS: Connecting to', this.url);
    
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.on('open', () => {
        console.log('WS: Connected');
        this.isConnecting = false;
        this.emit('connected');
        
        // Send connection event
        this.send({
          type: 'tmpbus',
          status: 'ws-connected',
          meta: { session_id: process.env.SESSION_ID },
          ts: nowISO()
        });
        
        // Flush any pending batch
        this.flushBatch();
      });
      
      this.ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          this.emit('message', msg);
        } catch (e) {
          console.error('WS: Bad message:', e);
        }
      });
      
      this.ws.on('error', (error) => {
        console.error('WS: Error:', error.message);
        this.isConnecting = false;
      });
      
      this.ws.on('close', () => {
        console.log('WS: Disconnected');
        this.isConnecting = false;
        this.ws = undefined;
        this.emit('disconnected');
        
        // Schedule reconnect
        this.reconnectTimer = setTimeout(() => {
          this.connect();
        }, this.reconnectDelay);
      });
      
    } catch (error: any) {
      console.error('WS: Connection failed:', error.message);
      this.isConnecting = false;
      
      // Schedule reconnect
      this.reconnectTimer = setTimeout(() => {
        this.connect();
      }, this.reconnectDelay);
    }
  }
  
  send(event: any): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    
    // Add to batch
    this.batch.push(event);
    
    // Send immediately if batch is full
    if (this.batch.length >= this.maxBatch) {
      this.flushBatch();
    } else {
      // Schedule batch send
      if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => {
          this.flushBatch();
        }, 100); // 100ms batch window
      }
    }
    
    return true;
  }
  
  private flushBatch() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }
    
    if (this.batch.length === 0) {
      return;
    }
    
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    
    // Send batch
    try {
      if (this.batch.length === 1) {
        // Single event
        this.ws.send(JSON.stringify(this.batch[0]));
      } else {
        // Multiple events as array
        this.ws.send(JSON.stringify({
          type: 'batch',
          events: this.batch,
          ts: nowISO()
        }));
      }
      
      this.emit('sent', this.batch.length);
      this.batch = [];
      
    } catch (error: any) {
      console.error('WS: Send failed:', error.message);
      // Keep events in batch for retry
    }
  }
  
  isConnected(): boolean {
    return this.ws !== undefined && this.ws.readyState === WebSocket.OPEN;
  }
  
  getBatchSize(): number {
    return this.batch.length;
  }
}