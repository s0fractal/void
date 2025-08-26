import { LEASE_FILE } from './config.js';
import { readJSON, writeJSON, nowISO } from './util.js';
import { randomUUID } from 'crypto';

type Lease = { session_id: string; started_at: string; updated_at: string };

export class LeaseKeeper {
  lease: Lease;
  interval?: NodeJS.Timeout;

  constructor() {
    const lease = readJSON<Lease>(LEASE_FILE, { session_id: '', started_at: '', updated_at: '' });
    if (!lease.session_id) {
      const now = nowISO();
      this.lease = { session_id: randomUUID(), started_at: now, updated_at: now };
      writeJSON(LEASE_FILE, this.lease);
    } else {
      this.lease = lease;
      this.touch();
    }
  }

  touch() {
    this.lease.updated_at = nowISO();
    writeJSON(LEASE_FILE, this.lease);
  }

  start() {
    this.interval = setInterval(() => this.touch(), 10_000);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
  }

  id() { return this.lease.session_id; }
}
