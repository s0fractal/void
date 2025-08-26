/**
 * WASM Cache Manager
 * Stores verified WASM modules locally
 */

import { readFile, writeFile, mkdir, stat, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { createHash } from 'crypto';
import type { IndexedGene } from '../resolution/manifest-index.js';

export class WasmCache {
  constructor(private cacheDir: string) {}

  /**
   * Initialize cache directory
   */
  async init(): Promise<void> {
    await mkdir(this.cacheDir, { recursive: true });
  }

  /**
   * Get WASM from cache
   */
  async get(cid: string): Promise<string | null> {
    const path = this.getCachePath(cid);
    
    try {
      await stat(path);
      return path;
    } catch {
      return null;
    }
  }

  /**
   * Put WASM in cache
   */
  async put(cid: string, bytes: Uint8Array, gene?: IndexedGene): Promise<string> {
    const path = this.getCachePath(cid);
    const dir = dirname(path);
    
    await mkdir(dir, { recursive: true });
    await writeFile(path, bytes);
    
    // Write metadata if available
    if (gene) {
      const metaPath = path + '.json';
      await writeFile(metaPath, JSON.stringify(gene, null, 2));
    }
    
    return path;
  }

  /**
   * Read file from path
   */
  async readFile(path: string): Promise<Uint8Array> {
    return await readFile(path);
  }

  /**
   * Get cache path for CID
   * Uses subdirectories to avoid too many files in one directory
   */
  private getCachePath(cid: string): string {
    // Take first 2, next 2 chars for subdirs
    const sub1 = cid.slice(0, 2);
    const sub2 = cid.slice(2, 4);
    return join(this.cacheDir, sub1, sub2, `${cid}.wasm`);
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    oldestFile?: Date;
    newestFile?: Date;
  }> {
    const stats = {
      totalFiles: 0,
      totalSize: 0,
      oldestFile: undefined as Date | undefined,
      newestFile: undefined as Date | undefined,
    };

    await this.walkCache(async (path, fileStat) => {
      if (path.endsWith('.wasm')) {
        stats.totalFiles++;
        stats.totalSize += fileStat.size;
        
        const mtime = fileStat.mtime;
        if (!stats.oldestFile || mtime < stats.oldestFile) {
          stats.oldestFile = mtime;
        }
        if (!stats.newestFile || mtime > stats.newestFile) {
          stats.newestFile = mtime;
        }
      }
    });

    return stats;
  }

  /**
   * Clear cache (use with caution!)
   */
  async clear(): Promise<number> {
    let deleted = 0;
    
    await this.walkCache(async (path) => {
      if (path.endsWith('.wasm') || path.endsWith('.json')) {
        await this.deleteFile(path);
        deleted++;
      }
    });
    
    return deleted;
  }

  /**
   * Verify cache integrity
   */
  async verify(): Promise<{
    total: number;
    valid: number;
    invalid: string[];
  }> {
    const result = {
      total: 0,
      valid: 0,
      invalid: [] as string[],
    };

    await this.walkCache(async (path) => {
      if (!path.endsWith('.wasm')) return;
      
      result.total++;
      
      try {
        const bytes = await readFile(path);
        const cid = this.extractCidFromPath(path);
        
        // Verify the file matches its CID
        const { generateCID } = await import('../../../tools/wasm-builder/src/cid.js');
        const actualCid = await generateCID(bytes);
        
        if (actualCid.toString() === cid) {
          result.valid++;
        } else {
          result.invalid.push(path);
        }
      } catch (error) {
        result.invalid.push(path);
      }
    });

    return result;
  }

  /**
   * Walk cache directory recursively
   */
  private async walkCache(
    callback: (path: string, stat: any) => Promise<void>,
    dir: string = this.cacheDir
  ): Promise<void> {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const path = join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await this.walkCache(callback, path);
        } else {
          const fileStat = await stat(path);
          await callback(path, fileStat);
        }
      }
    } catch (error) {
      // Directory might not exist yet
      if ((error as any).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Extract CID from cache path
   */
  private extractCidFromPath(path: string): string {
    const filename = path.split('/').pop()!;
    return filename.replace('.wasm', '');
  }

  /**
   * Delete a file (for cleanup)
   */
  private async deleteFile(path: string): Promise<void> {
    const { unlink } = await import('fs/promises');
    await unlink(path);
  }
}