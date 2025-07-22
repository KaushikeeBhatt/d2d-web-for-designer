/**
 * Caching Utility
 * Provides in-memory caching with TTL support for the D2D Designer platform
 */

import { Logger } from './logger';

const logger = new Logger('Cache');

/**
 * In-memory cache implementation with TTL support
 */
class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    };
    
    logger.info('Memory cache initialized');
  }

  /**
   * Gets a value from the cache
   * @param {string} key - Cache key
   * @returns {any} Cached value or null
   */
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      logger.debug(`Cache miss: ${key}`);
      return null;
    }
    
    // Check if expired
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      this.stats.evictions++;
      this.stats.misses++;
      logger.debug(`Cache expired: ${key}`);
      return null;
    }
    
    this.stats.hits++;
    logger.debug(`Cache hit: ${key}`);
    
    // Update last accessed time
    item.lastAccessed = Date.now();
    
    return item.data;
  }

  /**
   * Sets a value in the cache
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  set(key, data, ttl = 3600000) { // Default 1 hour
    try {
      const expiry = Date.now() + ttl;
      
      this.cache.set(key, {
        data,
        expiry,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        ttl
      });
      
      this.stats.sets++;
      logger.debug(`Cache set: ${key}`, { ttl });
    } catch (error) {
      logger.error('Failed to set cache', { key, error: error.message });
    }
  }

  /**
   * Deletes a value from the cache
   * @param {string} key - Cache key
   * @returns {boolean} True if deleted
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
      logger.debug(`Cache deleted: ${key}`);
    }
    return deleted;
  }

  /**
   * Clears all cache entries
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    logger.info(`Cache cleared: ${size} entries removed`);
  }

  /**
   * Cleans up expired entries
   * @returns {number} Number of entries removed
   */
  cleanup() {
    const now = Date.now();
    let removed = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
        removed++;
      }
    }
    
    if (removed > 0) {
      this.stats.evictions += removed;
      logger.info(`Cache cleanup: ${removed} expired entries removed`);
    }
    
    return removed;
  }

  /**
   * Gets cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100
      : 0;
    
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: hitRate.toFixed(2) + '%',
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Estimates memory usage of the cache
   * @returns {string} Formatted memory usage
   */
  estimateMemoryUsage() {
    try {
      // Rough estimation - serialize and check length
      let bytes = 0;
      
      for (const [key, value] of this.cache.entries()) {
        bytes += key.length * 2; // UTF-16
        bytes += JSON.stringify(value).length * 2;
      }
      
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    } catch (error) {
      return 'Unknown';
    }
  }

  /**
   * Checks if a key exists in the cache
   * @param {string} key - Cache key
   * @returns {boolean} True if exists and not expired
   */
  has(key) {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Gets or sets a value using a factory function
   * @param {string} key - Cache key
   * @param {Function} factory - Function to generate value if not cached
   * @param {number} ttl - Time to live
   * @returns {Promise<any>} Cached or generated value
   */
  async getOrSet(key, factory, ttl = 3600000) {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }
    
    try {
      logger.debug(`Cache miss, generating value: ${key}`);
      const value = await factory();
      this.set(key, value, ttl);
      return value;
    } catch (error) {
      logger.error('Failed to generate cache value', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Invalidates cache entries matching a pattern
   * @param {string|RegExp} pattern - Pattern to match keys
   * @returns {number} Number of entries invalidated
   */
  invalidatePattern(pattern) {
    let removed = 0;
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        removed++;
      }
    }
    
    if (removed > 0) {
      logger.info(`Cache invalidated: ${removed} entries matching pattern`, { pattern: pattern.toString() });
    }
    
    return removed;
  }
}

/**
 * Cache key builder utility
 */
export const cacheKeys = {
  // Hackathon cache keys
  hackathons: {
    all: (params = {}) => `hackathons:all:${JSON.stringify(params)}`,
    byId: (id) => `hackathons:id:${id}`,
    byPlatform: (platform) => `hackathons:platform:${platform}`,
    search: (query) => `hackathons:search:${query}`,
    trending: () => 'hackathons:trending',
  },
  
  // Design cache keys
  designs: {
    all: (params = {}) => `designs:all:${JSON.stringify(params)}`,
    byId: (id) => `designs:id:${id}`,
    byCategory: (category) => `designs:category:${category}`,
    trending: () => 'designs:trending',
    colors: (designId) => `designs:colors:${designId}`,
  },
  
  // User cache keys
  users: {
    byId: (id) => `users:id:${id}`,
    bookmarks: (userId) => `users:bookmarks:${userId}`,
    preferences: (userId) => `users:preferences:${userId}`,
    session: (sessionId) => `users:session:${sessionId}`,
  },
  
  // Scraping cache keys
  scraping: {
    status: (platform) => `scraping:status:${platform}`,
    lastRun: (platform) => `scraping:lastrun:${platform}`,
    results: (platform) => `scraping:results:${platform}`,
  }
};

/**
 * Cache TTL presets
 */
export const cacheTTL = {
  // Short-lived cache (5 minutes)
  SHORT: 5 * 60 * 1000,
  
  // Medium-lived cache (30 minutes)
  MEDIUM: 30 * 60 * 1000,
  
  // Long-lived cache (1 hour)
  LONG: 60 * 60 * 1000,
  
  // Very long cache (24 hours)
  VERY_LONG: 24 * 60 * 60 * 1000,
  
  // Custom TTLs
  HACKATHONS: 10 * 60 * 1000,      // 10 minutes
  DESIGNS: 30 * 60 * 1000,         // 30 minutes
  USER_SESSION: 60 * 60 * 1000,    // 1 hour
  TRENDING: 15 * 60 * 1000,        // 15 minutes
  STATIC_CONTENT: 24 * 60 * 60 * 1000, // 24 hours
};

// Create singleton instance
export const cache = new MemoryCache();

// Decorators for caching method results
export function cacheable(keyBuilder, ttl = cacheTTL.MEDIUM) {
  return function(target, propertyName, descriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args) {
      const key = typeof keyBuilder === 'function' 
        ? keyBuilder(...args) 
        : `${keyBuilder}:${JSON.stringify(args)}`;
      
      return cache.getOrSet(key, () => originalMethod.apply(this, args), ttl);
    };
    
    return descriptor;
  };
}

// Run cleanup every 10 minutes
if (typeof window === 'undefined') {
  const cleanupInterval = setInterval(() => {
    const removed = cache.cleanup();
    const stats = cache.getStats();
    
    logger.debug('Cache cleanup completed', {
      removed,
      stats
    });
  }, 10 * 60 * 1000);
  
  // Prevent multiple intervals in development
  if (global._cacheCleanupInterval) {
    clearInterval(global._cacheCleanupInterval);
  }
  global._cacheCleanupInterval = cleanupInterval;
}

// Next.js API route cache middleware
export function withCache(handler, options = {}) {
  const { ttl = cacheTTL.MEDIUM, keyGenerator } = options;
  
  return async (req, res) => {
    // Generate cache key
    const key = keyGenerator 
      ? keyGenerator(req)
      : `api:${req.method}:${req.url}:${JSON.stringify(req.query)}`;
    
    // Try to get from cache
    const cached = cache.get(key);
    if (cached) {
      logger.debug('API response served from cache', { key });
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json(cached);
    }
    
    // Intercept response to cache it
    const originalJson = res.json;
    res.json = function(data) {
      if (res.statusCode === 200) {
        cache.set(key, data, ttl);
        res.setHeader('X-Cache', 'MISS');
      }
      return originalJson.call(this, data);
    };
    
    // Call original handler
    return handler(req, res);
  };
}

// Export all utilities
export default {
  cache,
  cacheKeys,
  cacheTTL,
  cacheable,
  withCache,
  MemoryCache
};