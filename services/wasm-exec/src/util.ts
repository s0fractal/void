/**
 * Utility functions for WASM executor
 */

import { EventEmitter } from 'events';

// Global event bus (would use proper message queue in production)
const eventBus = new EventEmitter();

export function emitEvent(event: string, data: any): void {
  const payload = {
    event,
    data,
    timestamp: new Date().toISOString(),
    service: 'wasm-exec',
  };
  
  // Log for now
  console.log('EVENT:', JSON.stringify(payload));
  
  // Emit to local bus
  eventBus.emit(event, payload);
  
  // In production, would send to:
  // - Kafka/NATS/RabbitMQ
  // - SSE endpoint
  // - WebSocket broadcast
}

export function onEvent(event: string, handler: (data: any) => void): void {
  eventBus.on(event, handler);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function sanitizeError(error: any): string {
  if (error instanceof Error) {
    // Remove stack traces and sensitive info
    return error.message;
  }
  return 'Unknown error';
}