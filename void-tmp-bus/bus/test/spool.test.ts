import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { Spool } from '../src/spool.js';

// Mock fs module
vi.mock('fs');
vi.mock('fs/promises');

describe('Spool', () => {
  let spool: Spool;
  const mockSpoolDir = '/var/lib/void/spool';
  const mockFiles: Map<string, string> = new Map();
  
  beforeEach(() => {
    // Reset mocks
    mockFiles.clear();
    
    // Mock fs.existsSync
    vi.mocked(fs.existsSync).mockImplementation((path) => {
      if (path === mockSpoolDir) return true;
      return mockFiles.has(path.toString());
    });
    
    // Mock fs.mkdirSync
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined as any);
    
    // Mock fs.readdirSync
    vi.mocked(fs.readdirSync).mockImplementation(() => {
      const files = Array.from(mockFiles.keys())
        .filter(f => f.startsWith(mockSpoolDir))
        .map(f => path.basename(f));
      return files as any;
    });
    
    // Mock fs.readFileSync
    vi.mocked(fs.readFileSync).mockImplementation((path) => {
      const content = mockFiles.get(path.toString());
      if (!content) throw new Error('File not found');
      return content;
    });
    
    // Mock fs.writeFileSync
    vi.mocked(fs.writeFileSync).mockImplementation((path, data) => {
      mockFiles.set(path.toString(), data.toString());
    });
    
    // Mock fs.unlinkSync
    vi.mocked(fs.unlinkSync).mockImplementation((path) => {
      mockFiles.delete(path.toString());
    });
    
    // Create spool instance
    spool = new Spool();
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  describe('put', () => {
    it('should add object to spool queue', () => {
      const obj = { type: 'test', value: 42 };
      spool.put(obj);
      
      expect(spool.depth()).toBe(1);
    });
    
    it('should persist to disk when queue reaches batch size', () => {
      // Add 100 items (default batch size)
      for (let i = 0; i < 100; i++) {
        spool.put({ id: i });
      }
      
      // Should have written to disk
      const spoolFiles = Array.from(mockFiles.keys()).filter(f => f.includes('.spool'));
      expect(spoolFiles.length).toBeGreaterThan(0);
      
      // Queue should be empty after flush
      expect(spool.depth()).toBe(0);
    });
  });
  
  describe('drainEach', () => {
    it('should process items from memory queue', async () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      items.forEach(item => spool.put(item));
      
      const processed: any[] = [];
      await spool.drainEach(async (obj) => {
        processed.push(obj);
        return true; // Successfully processed
      });
      
      expect(processed).toEqual(items);
      expect(spool.depth()).toBe(0);
    });
    
    it('should keep items that fail processing', async () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      items.forEach(item => spool.put(item));
      
      await spool.drainEach(async (obj: any) => {
        return obj.id !== 2; // Fail on id=2
      });
      
      expect(spool.depth()).toBe(1); // Only id=2 remains
    });
    
    it('should load and process items from disk', async () => {
      // Simulate spool files on disk
      const spoolFile = path.join(mockSpoolDir, '001.spool');
      const items = [{ id: 1 }, { id: 2 }];
      mockFiles.set(spoolFile, items.map(i => JSON.stringify(i)).join('\n'));
      
      const processed: any[] = [];
      await spool.drainEach(async (obj) => {
        processed.push(obj);
        return true;
      });
      
      expect(processed.length).toBe(2);
      expect(mockFiles.has(spoolFile)).toBe(false); // File should be deleted
    });
    
    it('should handle corrupted spool files', async () => {
      // Simulate corrupted spool file
      const spoolFile = path.join(mockSpoolDir, '001.spool');
      mockFiles.set(spoolFile, 'invalid json\n{"valid":true}\nmore garbage');
      
      const processed: any[] = [];
      await spool.drainEach(async (obj) => {
        processed.push(obj);
        return true;
      });
      
      // Should process only valid JSON
      expect(processed).toEqual([{ valid: true }]);
    });
  });
  
  describe('depth', () => {
    it('should return count of items in memory', () => {
      expect(spool.depth()).toBe(0);
      
      spool.put({ test: 1 });
      expect(spool.depth()).toBe(1);
      
      spool.put({ test: 2 });
      expect(spool.depth()).toBe(2);
    });
  });
  
  describe('persist', () => {
    it('should write queue to disk and clear memory', () => {
      const items = [{ id: 1 }, { id: 2 }];
      items.forEach(item => spool.put(item));
      
      // @ts-ignore - accessing private method for testing
      spool.persist();
      
      expect(spool.depth()).toBe(0);
      const spoolFiles = Array.from(mockFiles.keys()).filter(f => f.includes('.spool'));
      expect(spoolFiles.length).toBe(1);
      
      // Check file contents
      const content = mockFiles.get(spoolFiles[0]);
      expect(content).toContain('{"id":1}');
      expect(content).toContain('{"id":2}');
    });
    
    it('should handle empty queue', () => {
      // @ts-ignore - accessing private method for testing
      spool.persist();
      
      const spoolFiles = Array.from(mockFiles.keys()).filter(f => f.includes('.spool'));
      expect(spoolFiles.length).toBe(0);
    });
  });
  
  describe('loadFromDisk', () => {
    it('should load all spool files in order', async () => {
      // Create multiple spool files
      mockFiles.set(path.join(mockSpoolDir, '001.spool'), '{"seq":1}\n{"seq":2}');
      mockFiles.set(path.join(mockSpoolDir, '002.spool'), '{"seq":3}');
      mockFiles.set(path.join(mockSpoolDir, '003.spool'), '{"seq":4}\n{"seq":5}');
      
      const loaded: any[] = [];
      // @ts-ignore - accessing private method for testing
      await spool.loadFromDisk(async (obj) => {
        loaded.push(obj);
        return true;
      });
      
      expect(loaded).toEqual([
        { seq: 1 }, { seq: 2 }, { seq: 3 }, { seq: 4 }, { seq: 5 }
      ]);
      
      // All files should be deleted
      const remaining = Array.from(mockFiles.keys()).filter(f => f.includes('.spool'));
      expect(remaining.length).toBe(0);
    });
  });
});