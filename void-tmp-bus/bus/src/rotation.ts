import fs from 'fs';
import path from 'path';
import { LOG_DIR, LOG_FILE, LOG_MAX_SIZE, LOG_MAX_AGE } from './config.js';
import { nowISO } from './util.js';

export class LogRotator {
  private checkInterval = 60000; // Check every minute
  private timer?: NodeJS.Timeout;
  
  constructor(
    private maxSize = LOG_MAX_SIZE,
    private maxAge = LOG_MAX_AGE
  ) {}
  
  start() {
    // Initial check
    this.checkRotation();
    
    // Schedule periodic checks
    this.timer = setInterval(() => {
      this.checkRotation();
    }, this.checkInterval);
  }
  
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }
  
  private checkRotation() {
    try {
      const stats = fs.statSync(LOG_FILE);
      const age = Date.now() - stats.birthtimeMs;
      
      // Check size and age
      if (stats.size > this.maxSize || age > this.maxAge) {
        this.rotate('auto', stats.size, age);
      }
      
      // Clean old rotated files
      this.cleanOldLogs();
      
    } catch (error: any) {
      // File doesn't exist yet, that's ok
      if (error.code !== 'ENOENT') {
        console.error('Rotation check failed:', error.message);
      }
    }
  }
  
  rotate(reason: string, size?: number, age?: number): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rotatedPath = `${LOG_FILE}.${timestamp}`;
    
    try {
      // Create hard link to preserve active readers
      fs.linkSync(LOG_FILE, rotatedPath);
      
      // Truncate original file
      fs.truncateSync(LOG_FILE, 0);
      
      // Log rotation event
      const event = {
        type: 'tmpbus',
        status: 'log-rotated',
        meta: {
          reason,
          rotated_to: path.basename(rotatedPath),
          size: size || fs.statSync(rotatedPath).size,
          age: age ? Math.floor(age / 1000) : undefined
        },
        ts: nowISO()
      };
      
      fs.appendFileSync(LOG_FILE, JSON.stringify(event) + '\n');
      
      console.log(`Log rotated: ${reason}, size=${size}, age=${age}ms`);
      
      // Compress in background
      this.compressInBackground(rotatedPath);
      
      return rotatedPath;
      
    } catch (error: any) {
      console.error('Rotation failed:', error.message);
      throw error;
    }
  }
  
  private compressInBackground(filePath: string) {
    // Use gzip compression in a child process
    const { spawn } = require('child_process');
    
    const gzip = spawn('gzip', ['-9', filePath], {
      detached: true,
      stdio: 'ignore'
    });
    
    gzip.unref();
  }
  
  private cleanOldLogs() {
    try {
      const files = fs.readdirSync(LOG_DIR);
      const now = Date.now();
      const maxRotatedAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      
      for (const file of files) {
        if (!file.startsWith('pulse.jl.') || file === 'pulse.jl') {
          continue;
        }
        
        const filePath = path.join(LOG_DIR, file);
        const stats = fs.statSync(filePath);
        const age = now - stats.mtimeMs;
        
        if (age > maxRotatedAge) {
          fs.unlinkSync(filePath);
          console.log(`Cleaned old log: ${file}`);
        }
      }
    } catch (error: any) {
      console.error('Clean old logs failed:', error.message);
    }
  }
  
  // Get current log stats
  getStats(): any {
    try {
      const stats = fs.statSync(LOG_FILE);
      const age = Date.now() - stats.birthtimeMs;
      
      return {
        path: LOG_FILE,
        size: stats.size,
        age: Math.floor(age / 1000), // seconds
        mtime: stats.mtime,
        birth: stats.birthtime,
        sizePercent: Math.round(stats.size / this.maxSize * 100),
        agePercent: Math.round(age / this.maxAge * 100)
      };
    } catch (error: any) {
      return {
        path: LOG_FILE,
        error: error.message
      };
    }
  }
}