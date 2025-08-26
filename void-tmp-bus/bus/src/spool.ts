import fs from 'fs';
import path from 'path';
import { SPOOL_DIR } from './config.js';
import { ensureDir, appendLine } from './util.js';

export class Spool {
  constructor() { ensureDir(SPOOL_DIR, 0o700); }
  put(ev: any) {
    const file = path.join(SPOOL_DIR, `spool-${Date.now()}.jl`);
    appendLine(file, JSON.stringify(ev));
  }
  list(): string[] {
    return fs.readdirSync(SPOOL_DIR).filter(n => n.endsWith('.jl')).map(n => path.join(SPOOL_DIR, n)).sort();
  }
  drainEach(fn: (obj:any)=>Promise<boolean>): Promise<void> {
    const files = this.list();
    const p = files.reduce(async (acc, file) => {
      await acc;
      const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
      let okAll = true;
      for (const ln of lines) {
        try {
          const obj = JSON.parse(ln);
          const ok = await fn(obj);
          if (!ok) { okAll = false; break; }
        } catch { okAll = false; break; }
      }
      if (okAll) fs.rmSync(file);
    }, Promise.resolve());
    return p;
  }
}
