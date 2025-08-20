import fs from 'fs';
import net from 'net';
import { EventEmitter } from 'events';
import { ensureDir, rmIfExists, appendLine, nowISO } from './util.js';
import { TMP_DIR, SOCK_DIR, LOG_DIR, LOG_FILE, TCP_PORT } from './config.js';
import { forwardToRelay } from './bridge.js';
import { Spool } from './spool.js';

export class TmpBus extends EventEmitter {
  udsPath = `${SOCK_DIR}/events.sock`;
  tcpPort = TCP_PORT;
  spool = new Spool();

  constructor(private session_id: string) {
    super();
  }

  async start() {
    ensureDir(TMP_DIR, 0o700);
    ensureDir(SOCK_DIR, 0o700);
    ensureDir(LOG_DIR, 0o700);
    rmIfExists(this.udsPath);

    // UDS server
    const uds = net.createServer((sock) => this.handleSocket(sock));
    uds.listen(this.udsPath, () => console.log('UDS listening:', this.udsPath));

    // TCP fallback
    const tcp = net.createServer((sock) => this.handleSocket(sock));
    tcp.listen(this.tcpPort, '127.0.0.1', () => console.log('TCP listening:', this.tcpPort));

    // periodic drain
    setInterval(() => this.drain(), 5000);
  }

  async drain() {
    await this.spool.drainEach(async (obj) => {
      const ok = await forwardToRelay(obj);
      return ok;
    });
  }
  
  async forwardToRelay(obj: any): Promise<boolean> {
    return forwardToRelay(obj);
  }

  private handleSocket(sock: net.Socket) {
    let buf = '';
    sock.on('data', (chunk) => {
      buf += chunk.toString('utf8');
      let idx;
      while ((idx = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx+1);
        if (!line) continue;
        this.ingest(line);
      }
    });
  }

  private async ingest(line: string) {
    try {
      const obj = JSON.parse(line);
      if (!obj.ts) obj.ts = nowISO();
      if (!obj.meta) obj.meta = {};
      obj.meta.session_id = this.session_id;
      appendLine(LOG_FILE, JSON.stringify(obj));
      this.emit('event', obj);
      const ok = await forwardToRelay(obj);
      if (!ok) this.spool.put(obj);
    } catch (e) {
      const err = { ts: nowISO(), type: 'tmpbus', status: 'bad-json', meta: { line: line.slice(0,512) } };
      appendLine(LOG_FILE, JSON.stringify(err));
      // don't forward malformed lines
    }
  }
}
