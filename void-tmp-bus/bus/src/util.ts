import fs from 'fs';
import path from 'path';

export function ensureDir(p: string, mode = 0o700) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true, mode });
}

export function appendLine(file: string, line: string) {
  fs.appendFileSync(file, line + '\n', { encoding: 'utf8' });
}

export function rmIfExists(p: string) {
  try { fs.rmSync(p); } catch {}
}

export function readJSON<T=any>(file: string, fallback: T): T {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

export function writeJSON(file: string, obj: any) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2));
}

export function nowISO() { return new Date().toISOString(); }
