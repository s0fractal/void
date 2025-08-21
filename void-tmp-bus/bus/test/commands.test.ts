import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import net from 'net';
import fs from 'fs';
import { CommandClient } from '../src/commands.js';

// Mock socket for testing
class MockSocket extends net.Socket {
  private mockData: string = '';
  private callbacks: Map<string, Function> = new Map();

  constructor() {
    super();
  }

  connect(path: string, callback?: Function): this {
    process.nextTick(() => {
      if (callback) callback();
      this.emit('connect');
    });
    return this;
  }

  write(data: string | Buffer, callback?: Function): boolean {
    this.mockData = data.toString();
    if (callback) process.nextTick(callback);
    
    // Parse and respond
    process.nextTick(() => {
      try {
        const req = JSON.parse(this.mockData);
        let response: any;
        
        switch (req.method) {
          case 'health':
            response = {
              ok: true,
              session_id: 'test-session-123',
              lease: {
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              relay_connected: true,
            };
            break;
            
          case 'stats':
            response = {
              events_ingested: 100,
              events_forwarded: 90,
              events_spooled: 10,
              spool_depth: 5,
              uds_clients: 2,
              tcp_clients: 1,
              pulse: {
                size_bytes: 1024,
                age_seconds: 60,
                rotations: { size: 2, age: 1 },
              },
            };
            break;
            
          case 'flush':
            response = { flushed: 5 };
            break;
            
          case 'rotate':
            response = { 
              rotated: '/tmp/void/logs/pulse.jl.20250820-123456',
              reason: req.params?.reason || 'manual',
            };
            break;
            
          case 'lease':
            response = {
              session_id: 'test-session-123',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            break;
            
          default:
            response = { error: 'Unknown method' };
        }
        
        const res = { jsonrpc: '2.0', id: req.id, result: response };
        this.emit('data', Buffer.from(JSON.stringify(res) + '\\n'));
      } catch (e) {
        const error = { jsonrpc: '2.0', id: 1, error: { code: -32700, message: 'Parse error' } };
        this.emit('data', Buffer.from(JSON.stringify(error) + '\\n'));
      }
    });
    
    return true;
  }

  end(): this {
    process.nextTick(() => this.emit('close'));
    return this;
  }
}

describe('CommandClient', () => {
  let originalCreateConnection: typeof net.createConnection;
  
  beforeEach(() => {
    // Mock net.createConnection
    originalCreateConnection = net.createConnection;
    vi.spyOn(net, 'createConnection').mockImplementation(() => new MockSocket() as any);
    
    // Mock fs.existsSync to say socket exists
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  describe('health', () => {
    it('should return health status', async () => {
      const client = new CommandClient();
      const result = await client.call('health');
      
      expect(result).toMatchObject({
        ok: true,
        session_id: 'test-session-123',
        lease: expect.objectContaining({
          created_at: expect.any(String),
          updated_at: expect.any(String),
        }),
        relay_connected: true,
      });
    });
  });
  
  describe('stats', () => {
    it('should return tmpbus statistics', async () => {
      const client = new CommandClient();
      const result = await client.call('stats');
      
      expect(result).toMatchObject({
        events_ingested: 100,
        events_forwarded: 90,
        events_spooled: 10,
        spool_depth: 5,
        uds_clients: 2,
        tcp_clients: 1,
        pulse: {
          size_bytes: 1024,
          age_seconds: 60,
          rotations: { size: 2, age: 1 },
        },
      });
    });
  });
  
  describe('flush', () => {
    it('should flush spool and return count', async () => {
      const client = new CommandClient();
      const result = await client.call('flush');
      
      expect(result).toEqual({ flushed: 5 });
    });
  });
  
  describe('rotate', () => {
    it('should rotate logs with reason', async () => {
      const client = new CommandClient();
      const result = await client.call('rotate', { reason: 'test' });
      
      expect(result).toMatchObject({
        rotated: expect.stringContaining('/tmp/void/logs/pulse.jl.'),
        reason: 'test',
      });
    });
    
    it('should use manual reason by default', async () => {
      const client = new CommandClient();
      const result = await client.call('rotate');
      
      expect(result).toMatchObject({
        rotated: expect.stringContaining('/tmp/void/logs/pulse.jl.'),
        reason: 'manual',
      });
    });
  });
  
  describe('lease', () => {
    it('should return current lease info', async () => {
      const client = new CommandClient();
      const result = await client.call('lease');
      
      expect(result).toMatchObject({
        session_id: 'test-session-123',
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });
    });
  });
  
  describe('error handling', () => {
    it('should handle socket not found', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      
      const client = new CommandClient();
      await expect(client.call('health')).rejects.toThrow('Socket not found');
    });
    
    it('should handle connection timeout', async () => {
      // Mock socket that never connects
      vi.spyOn(net, 'createConnection').mockImplementation(() => {
        const socket = new net.Socket();
        // Don't emit connect event
        return socket;
      });
      
      const client = new CommandClient();
      await expect(client.call('health')).rejects.toThrow('timeout');
    }, 15000);
    
    it('should handle malformed response', async () => {
      // Mock socket that returns invalid JSON
      vi.spyOn(net, 'createConnection').mockImplementation(() => {
        const socket = new MockSocket();
        socket.write = vi.fn().mockImplementation(function(this: MockSocket) {
          process.nextTick(() => {
            this.emit('data', Buffer.from('invalid json\\n'));
          });
          return true;
        });
        return socket as any;
      });
      
      const client = new CommandClient();
      await expect(client.call('health')).rejects.toThrow();
    });
  });
  
  describe('concurrent calls', () => {
    it('should handle multiple concurrent calls', async () => {
      const client = new CommandClient();
      
      const [health, stats, lease] = await Promise.all([
        client.call('health'),
        client.call('stats'),
        client.call('lease'),
      ]);
      
      expect(health).toHaveProperty('ok', true);
      expect(stats).toHaveProperty('events_ingested');
      expect(lease).toHaveProperty('session_id');
    });
  });
});