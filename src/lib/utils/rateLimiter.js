/**
 * Rate Limiting Utility
 * Manages API request rate limiting to prevent hitting external service limits
 */

import { Logger } from './logger';

const logger = new Logger('RateLimiter');

/**
 * Rate limiter class for controlling request frequency
 */
export class RateLimiter {
  /**
   * Creates a new rate limiter instance
   * @param {number} maxRequests - Maximum number of requests allowed
   * @param {number} timeWindow - Time window in milliseconds
   * @param {string} name - Name for logging purposes
   */
  constructor(maxRequests = 10, timeWindow = 60000, name = 'default') {
    this.requests = [];
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
    this.name = name;
    this.waitQueue = [];
    
    logger.info(`Rate limiter initialized: ${name}`, { maxRequests, timeWindow });
  }
  
  /**
   * Throttles requests to stay within rate limits
   * @returns {Promise<void>} Resolves when request can proceed
   */
  async throttle() {
    const now = Date.now();
    
    // Clean up old requests outside the time window
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    
    // Check if we're at the limit
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.timeWindow - (now - oldestRequest);
      
      logger.debug(`Rate limit reached for ${this.name}, waiting ${waitTime}ms`);
      
      // Add to wait queue for monitoring
      this.waitQueue.push({ timestamp: now, waitTime });
      
      // Wait until the oldest request expires
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Remove from wait queue
      this.waitQueue = this.waitQueue.filter(item => item.timestamp !== now);
      
      // Recursive call to ensure we're under the limit
      return this.throttle();
    }
    
    // Add current request timestamp
    this.requests.push(now);
    
    logger.debug(`Request allowed for ${this.name}`, {
      currentRequests: this.requests.length,
      maxRequests: this.maxRequests
    });
  }
  
  /**
   * Resets the rate limiter
   */
  reset() {
    this.requests = [];
    this.waitQueue = [];
    logger.info(`Rate limiter reset: ${this.name}`);
  }
  
  /**
   * Gets current rate limiter status
   * @returns {Object} Status information
   */
  getStatus() {
    const now = Date.now();
    const activeRequests = this.requests.filter(time => now - time < this.timeWindow);
    
    return {
      name: this.name,
      currentRequests: activeRequests.length,
      maxRequests: this.maxRequests,
      timeWindow: this.timeWindow,
      waitingRequests: this.waitQueue.length,
      availableRequests: Math.max(0, this.maxRequests - activeRequests.length),
      resetTime: activeRequests.length > 0 
        ? new Date(activeRequests[0] + this.timeWindow).toISOString()
        : null
    };
  }
  
  /**
   * Checks if a request would be rate limited without consuming a slot
   * @returns {boolean} True if request would be allowed
   */
  canMakeRequest() {
    const now = Date.now();
    const activeRequests = this.requests.filter(time => now - time < this.timeWindow);
    return activeRequests.length < this.maxRequests;
  }
  
  /**
   * Executes a function with rate limiting
   * @param {Function} fn - Function to execute
   * @returns {Promise<any>} Result of the function
   */
  async execute(fn) {
    await this.throttle();
    try {
      return await fn();
    } catch (error) {
      logger.error(`Error executing rate-limited function in ${this.name}`, {
        error: error.message
      });
      throw error;
    }
  }
}

/**
 * Distributed rate limiter for multiple instances
 * Uses in-memory storage (can be extended to use Redis)
 */
export class DistributedRateLimiter extends RateLimiter {
  constructor(maxRequests, timeWindow, name, instanceId = process.env.INSTANCE_ID || 'default') {
    super(maxRequests, timeWindow, name);
    this.instanceId = instanceId;
    this.globalRequests = new Map(); // In production, use Redis
  }
  
  async throttle() {
    // For now, use parent implementation
    // In production, implement distributed logic with Redis
    return super.throttle();
  }
}

/**
 * Token bucket rate limiter for more flexible rate limiting
 */
export class TokenBucketRateLimiter {
  constructor(capacity, refillRate, name = 'token-bucket') {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillRate; // Tokens per second
    this.lastRefill = Date.now();
    this.name = name;
    
    logger.info(`Token bucket rate limiter initialized: ${name}`, {
      capacity,
      refillRate
    });
  }
  
  /**
   * Refills tokens based on elapsed time
   */
  refill() {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000; // Convert to seconds
    const tokensToAdd = timePassed * this.refillRate;
    
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
  
  /**
   * Consumes tokens if available
   * @param {number} tokens - Number of tokens to consume
   * @returns {Promise<boolean>} True if tokens were consumed
   */
  async consume(tokens = 1) {
    this.refill();
    
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      logger.debug(`Consumed ${tokens} tokens from ${this.name}`, {
        remainingTokens: this.tokens
      });
      return true;
    }
    
    // Calculate wait time
    const tokensNeeded = tokens - this.tokens;
    const waitTime = (tokensNeeded / this.refillRate) * 1000;
    
    logger.debug(`Not enough tokens in ${this.name}, waiting ${waitTime}ms`);
    
    await new Promise(resolve => setTimeout(resolve, waitTime));
    return this.consume(tokens);
  }
  
  /**
   * Gets current status
   * @returns {Object} Status information
   */
  getStatus() {
    this.refill();
    return {
      name: this.name,
      currentTokens: Math.floor(this.tokens),
      capacity: this.capacity,
      refillRate: this.refillRate,
      percentFull: (this.tokens / this.capacity) * 100
    };
  }
}

// Pre-configured rate limiters for different services
export const scraperRateLimiters = {
  // Design platform rate limiters
  behance: new RateLimiter(10, 60000, 'behance'),      // 10 requests per minute
  dribbble: new RateLimiter(15, 60000, 'dribbble'),   // 15 requests per minute
  awwwards: new RateLimiter(5, 60000, 'awwwards'),    // 5 requests per minute
  
  // Hackathon platform rate limiters
  devpost: new RateLimiter(20, 60000, 'devpost'),     // 20 requests per minute
  unstop: new RateLimiter(20, 60000, 'unstop'),       // 20 requests per minute
  cumulus: new RateLimiter(10, 60000, 'cumulus'),     // 10 requests per minute
  
  // API rate limiters
  api: new TokenBucketRateLimiter(100, 10, 'api'),    // 100 requests, 10/sec refill
  scraping: new RateLimiter(30, 60000, 'scraping'),   // 30 requests per minute
};

// User-specific rate limiter factory
export function createUserRateLimiter(userId, maxRequests = 60, timeWindow = 60000) {
  return new RateLimiter(maxRequests, timeWindow, `user-${userId}`);
}

// IP-based rate limiter factory
export function createIPRateLimiter(ip, maxRequests = 100, timeWindow = 60000) {
  return new RateLimiter(maxRequests, timeWindow, `ip-${ip}`);
}

/**
 * Express/Next.js middleware for rate limiting
 * @param {Object} options - Rate limiting options
 * @returns {Function} Middleware function
 */
export function rateLimitMiddleware(options = {}) {
  const {
    maxRequests = 60,
    timeWindow = 60000,
    keyGenerator = (req) => req.ip || 'anonymous',
    skipSuccessfulRequests = false,
    message = 'Too many requests, please try again later.'
  } = options;
  
  const limiters = new Map();
  
  return async (req, res, next) => {
    const key = keyGenerator(req);
    
    if (!limiters.has(key)) {
      limiters.set(key, new RateLimiter(maxRequests, timeWindow, key));
    }
    
    const limiter = limiters.get(key);
    
    if (!limiter.canMakeRequest()) {
      const status = limiter.getStatus();
      
      logger.warn('Rate limit exceeded', {
        key,
        status
      });
      
      return res.status(429).json({
        error: message,
        retryAfter: status.resetTime
      });
    }
    
    if (!skipSuccessfulRequests) {
      await limiter.throttle();
    }
    
    // Add rate limit headers
    const status = limiter.getStatus();
    res.setHeader('X-RateLimit-Limit', status.maxRequests);
    res.setHeader('X-RateLimit-Remaining', status.availableRequests);
    
    if (status.resetTime) {
      res.setHeader('X-RateLimit-Reset', new Date(status.resetTime).getTime());
    }
    
    next();
  };
}

// Cleanup old limiters periodically
if (typeof global !== 'undefined' && !global._rateLimiterCleanup) {
  global._rateLimiterCleanup = setInterval(() => {
    logger.debug('Cleaning up rate limiters');
    // In production, implement cleanup logic
  }, 3600000); // Every hour
}

// Export all utilities
export default {
  RateLimiter,
  DistributedRateLimiter,
  TokenBucketRateLimiter,
  scraperRateLimiters,
  createUserRateLimiter,
  createIPRateLimiter,
  rateLimitMiddleware
};