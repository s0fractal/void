import { createClient, RedisClientType } from 'redis';
import { logger } from '../../logger';
import { metrics } from '../../metrics';

// Idempotency store using Redis with fallback to in-memory
class IdempotencyStore {
  private redis: RedisClientType | null = null;
  private memoryStore: Map<string, { data: any; expiresAt: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  async initialize() {
    try {
      // Try to connect to Redis
      if (process.env.REDIS_URL) {
        this.redis = createClient({ url: process.env.REDIS_URL });
        this.redis.on('error', (err) => {
          logger.error('Redis error', { error: err });
          metrics.increment('idempotency.redis_error');
        });
        
        await this.redis.connect();
        logger.info('Idempotency store connected to Redis');
      } else {
        logger.info('No REDIS_URL, using in-memory idempotency store');
      }
    } catch (error) {
      logger.warn('Failed to connect to Redis, falling back to memory', { error });
      this.redis = null;
    }
    
    // Start cleanup interval for memory store
    this.cleanupInterval = setInterval(() => this.cleanupMemoryStore(), 60000); // Every minute
  }

  async get(key: string): Promise<any | null> {
    const prefixedKey = `idempotency:${key}`;
    
    try {
      if (this.redis) {
        const value = await this.redis.get(prefixedKey);
        if (value) {
          metrics.increment('idempotency.redis_hit');
          return JSON.parse(value);
        }
      }
    } catch (error) {
      logger.error('Redis get error', { error, key });
    }
    
    // Fallback to memory
    const memEntry = this.memoryStore.get(prefixedKey);
    if (memEntry && memEntry.expiresAt > Date.now()) {
      metrics.increment('idempotency.memory_hit');
      return memEntry.data;
    } else if (memEntry) {
      // Clean up expired entry
      this.memoryStore.delete(prefixedKey);
    }
    
    metrics.increment('idempotency.miss');
    return null;
  }

  async set(key: string, data: any, ttlSeconds: number = 300): Promise<void> {
    const prefixedKey = `idempotency:${key}`;
    
    try {
      if (this.redis) {
        await this.redis.setEx(prefixedKey, ttlSeconds, JSON.stringify(data));
        metrics.increment('idempotency.redis_set');
        return;
      }
    } catch (error) {
      logger.error('Redis set error', { error, key });
    }
    
    // Fallback to memory
    this.memoryStore.set(prefixedKey, {
      data,
      expiresAt: Date.now() + (ttlSeconds * 1000),
    });
    metrics.increment('idempotency.memory_set');
    
    // Limit memory store size
    if (this.memoryStore.size > 10000) {
      this.cleanupMemoryStore();
    }
  }

  async delete(key: string): Promise<void> {
    const prefixedKey = `idempotency:${key}`;
    
    try {
      if (this.redis) {
        await this.redis.del(prefixedKey);
      }
    } catch (error) {
      logger.error('Redis delete error', { error, key });
    }
    
    this.memoryStore.delete(prefixedKey);
  }

  private cleanupMemoryStore() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.memoryStore.entries()) {
      if (entry.expiresAt <= now) {
        this.memoryStore.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.debug('Cleaned expired idempotency entries', { count: cleaned });
      metrics.increment('idempotency.cleanup', cleaned);
    }
    
    // Additional cleanup if still too large
    if (this.memoryStore.size > 8000) {
      // Remove oldest entries
      const entries = Array.from(this.memoryStore.entries())
        .sort((a, b) => a[1].expiresAt - b[1].expiresAt);
      
      const toRemove = entries.slice(0, this.memoryStore.size - 7000);
      for (const [key] of toRemove) {
        this.memoryStore.delete(key);
      }
      
      logger.warn('Memory store size limit reached, removed oldest entries', {
        removed: toRemove.length,
        remaining: this.memoryStore.size,
      });
    }
  }

  async shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    if (this.redis) {
      await this.redis.quit();
    }
  }

  // Health check
  async isHealthy(): Promise<boolean> {
    if (this.redis) {
      try {
        await this.redis.ping();
        return true;
      } catch {
        return false;
      }
    }
    return true; // Memory store is always healthy
  }

  // Stats
  getStats() {
    return {
      type: this.redis ? 'redis' : 'memory',
      memoryStoreSize: this.memoryStore.size,
      redisConnected: !!this.redis,
    };
  }
}

// Singleton instance
const idempotencyStore = new IdempotencyStore();

// Helper functions
export async function getIdempotencyKey(key: string): Promise<any | null> {
  return idempotencyStore.get(key);
}

export async function storeIdempotencyResult(key: string, result: any, ttlSeconds: number = 300): Promise<void> {
  return idempotencyStore.set(key, result, ttlSeconds);
}

export async function deleteIdempotencyKey(key: string): Promise<void> {
  return idempotencyStore.delete(key);
}

// Initialize on module load
idempotencyStore.initialize().catch((error) => {
  logger.error('Failed to initialize idempotency store', { error });
});

// Export for testing and management
export { idempotencyStore };