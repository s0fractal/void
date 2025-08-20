import net from 'net';
import fs from 'fs';
import { SOCK_DIR, LOG_FILE, SPOOL_DIR } from './config.js';
import { TmpBus } from './server.js';
import { Lease } from './lease.js';
import { nowISO } from './util.js';

interface RPCRequest {
  id: string | number;
  method: string;
  params?: any;
}

interface RPCResponse {
  id: string | number;
  result?: any;
  error?: { code: number; message: string };
}

export class CommandServer {
  private socketPath = `${SOCK_DIR}/commands.sock`;
  
  constructor(
    private tmpBus: TmpBus,
    private lease: Lease
  ) {}
  
  async start() {
    // Remove existing socket
    try {
      fs.unlinkSync(this.socketPath);
    } catch {}
    
    const server = net.createServer((socket) => {
      let buffer = '';
      
      socket.on('data', (chunk) => {
        buffer += chunk.toString();
        
        // Process complete JSON objects
        let idx;
        while ((idx = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 1);
          
          if (!line) continue;
          
          this.handleRequest(line, socket);
        }
      });
    });
    
    server.listen(this.socketPath, () => {
      console.log('Commands listening:', this.socketPath);
      // Set permissions for group access
      fs.chmodSync(this.socketPath, 0o660);
    });
  }
  
  private async handleRequest(line: string, socket: net.Socket) {
    let request: RPCRequest;
    
    try {
      request = JSON.parse(line);
    } catch (e) {
      const error = { id: 0, error: { code: -32700, message: 'Parse error' } };
      socket.write(JSON.stringify(error) + '\n');
      return;
    }
    
    const response: RPCResponse = { id: request.id };
    
    try {
      switch (request.method) {
        case 'health':
          response.result = await this.health();
          break;
          
        case 'flush':
          response.result = await this.flush();
          break;
          
        case 'rotate':
          response.result = await this.rotate();
          break;
          
        case 'stats':
          response.result = await this.stats();
          break;
          
        case 'lease':
          response.result = await this.leaseInfo();
          break;
          
        default:
          response.error = { code: -32601, message: 'Method not found' };
      }
    } catch (error: any) {
      response.error = { 
        code: -32603, 
        message: error.message || 'Internal error' 
      };
    }
    
    socket.write(JSON.stringify(response) + '\n');
  }
  
  private async health(): Promise<any> {
    return {
      status: 'ok',
      timestamp: nowISO(),
      session_id: this.lease.getSessionId(),
      pid: process.pid,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
  }
  
  private async flush(): Promise<any> {
    const startCount = this.tmpBus.spool.size();
    
    // Force drain all spooled events
    let flushed = 0;
    await this.tmpBus.spool.drainEach(async (obj) => {
      const ok = await this.tmpBus.forwardToRelay(obj);
      if (ok) flushed++;
      return ok;
    });
    
    return {
      flushed,
      remaining: this.tmpBus.spool.size(),
      started_with: startCount
    };
  }
  
  private async rotate(): Promise<any> {
    const oldPath = LOG_FILE;
    const newPath = `${LOG_FILE}.${Date.now()}`;
    
    try {
      // Create hard link to preserve current readers
      fs.linkSync(oldPath, newPath);
      
      // Truncate original file
      fs.truncateSync(oldPath, 0);
      
      // Log rotation event
      const event = {
        type: 'tmpbus',
        status: 'rotated',
        meta: { 
          old_path: newPath,
          size: fs.statSync(newPath).size 
        },
        ts: nowISO()
      };
      
      fs.appendFileSync(oldPath, JSON.stringify(event) + '\n');
      
      return {
        rotated_to: newPath,
        size: fs.statSync(newPath).size
      };
    } catch (error: any) {
      throw new Error(`Rotation failed: ${error.message}`);
    }
  }
  
  private async stats(): Promise<any> {
    const logStats = fs.statSync(LOG_FILE);
    const spoolFiles = fs.readdirSync(SPOOL_DIR).filter(f => f.endsWith('.jl'));
    
    let spoolSize = 0;
    let spoolEvents = 0;
    
    for (const file of spoolFiles) {
      const path = `${SPOOL_DIR}/${file}`;
      const stats = fs.statSync(path);
      spoolSize += stats.size;
      
      // Count lines
      const content = fs.readFileSync(path, 'utf8');
      spoolEvents += content.split('\n').filter(line => line.trim()).length;
    }
    
    return {
      pulse_log: {
        path: LOG_FILE,
        size: logStats.size,
        mtime: logStats.mtime
      },
      spool: {
        files: spoolFiles.length,
        events: spoolEvents,
        size: spoolSize
      },
      session: {
        id: this.lease.getSessionId(),
        started: this.lease.getStartTime(),
        heartbeat: this.lease.getLastHeartbeat()
      }
    };
  }
  
  private async leaseInfo(): Promise<any> {
    return this.lease.read();
  }
}

// Client helper for testing
export class CommandClient {
  constructor(private socketPath = `${SOCK_DIR}/commands.sock`) {}
  
  async call(method: string, params?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection(this.socketPath);
      const id = Math.random().toString(36).slice(2);
      
      socket.on('connect', () => {
        const request: RPCRequest = { id, method, params };
        socket.write(JSON.stringify(request) + '\n');
      });
      
      socket.on('data', (data) => {
        try {
          const response: RPCResponse = JSON.parse(data.toString());
          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            resolve(response.result);
          }
          socket.end();
        } catch (e) {
          reject(e);
          socket.end();
        }
      });
      
      socket.on('error', reject);
    });
  }
}