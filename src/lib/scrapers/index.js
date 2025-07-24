/**
 * Main Scraper Orchestrator
 * Coordinates all hackathon scrapers and manages database updates
 */

import { scrapeDevpost } from './hackathons/devpost';
import { scrapeUnstop } from './hackathons/unstop';
import { scrapeCumulus } from './hackathons/cumulus';
import Hackathon from '@/lib/db/models/Hackathon';
import { connectDB } from '@/lib/db/mongodb';
import { Logger } from '@/lib/utils/logger';
import { scraperRateLimiters } from '@/lib/utils/rateLimiter';
import { cache } from '@/lib/utils/cache';

const logger = new Logger('ScraperOrchestrator');

// Scraper configuration
const SCRAPER_CONFIG = {
  timeout: 9000, // 9 seconds for Vercel function timeout safety
  batchSize: 100, // Batch size for database operations
  cacheKey: 'scraped-hackathons',
  cacheTTL: 3600000, // 1 hour
  scrapers: [
    { 
      name: 'Devpost', 
      fn: scrapeDevpost, 
      rateLimiter: scraperRateLimiters.devpost,
      priority: 1,
      enabled: true 
    },
    { 
      name: 'Unstop', 
      fn: scrapeUnstop, 
      rateLimiter: scraperRateLimiters.unstop,
      priority: 2,
      enabled: true 
    },
    { 
      name: 'Cumulus', 
      fn: scrapeCumulus, 
      rateLimiter: scraperRateLimiters.cumulus,
      priority: 3,
      enabled: true 
    },
  ],
};

/**
 * Run a single scraper with timeout protection
 * @param {Object} scraper - Scraper configuration object
 * @param {Object} options - Scraping options
 * @returns {Promise<Array>} Array of hackathons or empty array
 */
async function runScraperWithTimeout(scraper, options = {}) {
  try {
    logger.debug(`Starting ${scraper.name} scraper with timeout ${SCRAPER_CONFIG.timeout}ms`);
    
    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`${scraper.name} scraper timeout`)), SCRAPER_CONFIG.timeout)
    );
    
    // Race between scraper and timeout
    const hackathons = await Promise.race([
      scraper.fn(options),
      timeoutPromise
    ]);
    
    logger.info(`${scraper.name} completed successfully`, { count: hackathons.length });
    return hackathons || [];
    
  } catch (error) {
    if (error.message.includes('timeout')) {
      logger.warn(`${scraper.name} scraper timed out after ${SCRAPER_CONFIG.timeout}ms`);
    } else {
      logger.error(`${scraper.name} scraper failed:`, error);
    }
    return [];
  }
}

/**
 * Process scraped hackathons and update database
 * @param {Array} hackathons - Array of hackathon objects
 * @returns {Promise<Object>} Database operation results
 */
async function processHackathons(hackathons) {
  if (!hackathons || hackathons.length === 0) {
    logger.debug('No hackathons to process');
    return { upserted: 0, modified: 0, errors: 0 };
  }

  logger.info(`Processing ${hackathons.length} hackathons`);
  
  const results = {
    upserted: 0,
    modified: 0,
    errors: 0,
  };

  try {
    // Ensure database connection
    await connectDB();

    // Create bulk operations
    const bulkOps = hackathons.map(hackathon => {
      // Ensure required fields
      if (!hackathon.platform || !hackathon.sourceId) {
        logger.warn('Skipping hackathon with missing required fields:', hackathon);
        results.errors++;
        return null;
      }

      return {
        updateOne: {
          filter: { 
            platform: hackathon.platform, 
            sourceId: hackathon.sourceId 
          },
          update: { 
            $set: {
              ...hackathon,
              lastScraped: new Date(),
              isActive: hackathon.isActive !== false, // Default to true
            },
            $setOnInsert: {
              createdAt: new Date(),
            }
          },
          upsert: true
        }
      };
    }).filter(Boolean); // Remove null operations

    if (bulkOps.length === 0) {
      logger.warn('No valid operations to perform');
      return results;
    }

    // Execute bulk operations in batches
    const batches = [];
    for (let i = 0; i < bulkOps.length; i += SCRAPER_CONFIG.batchSize) {
      batches.push(bulkOps.slice(i, i + SCRAPER_CONFIG.batchSize));
    }

    logger.debug(`Processing ${batches.length} batches`);

    for (const [index, batch] of batches.entries()) {
      try {
        const result = await Hackathon.bulkWrite(batch, { ordered: false });
        results.upserted += result.upsertedCount || 0;
        results.modified += result.modifiedCount || 0;
        logger.debug(`Batch ${index + 1}/${batches.length} completed`, {
          upserted: result.upsertedCount,
          modified: result.modifiedCount,
        });
      } catch (batchError) {
        logger.error(`Batch ${index + 1} failed:`, batchError);
        results.errors += batch.length;
      }
    }

    logger.info('Database update completed', results);
    return results;

  } catch (error) {
    logger.error('Database processing failed:', error);
    throw error;
  }
}

/**
 * Run all enabled scrapers in parallel
 * @param {Object} options - Scraping options
 * @returns {Promise<Object>} Scraping results
 */
export async function runAllScrapers(options = {}) {
  const startTime = Date.now();
  logger.info('Starting hackathon scraping job', options);
  
  const results = {
    success: 0,
    failed: 0,
    hackathons: [],
    scraperResults: {},
    databaseResults: null,
    duration: 0,
  };

  try {
    // Check cache first
    const cachedData = cache.get(SCRAPER_CONFIG.cacheKey);
    if (cachedData && !options.forceRefresh) {
      logger.info('Returning cached hackathon data');
      return cachedData;
    }

    // Filter enabled scrapers and sort by priority
    const enabledScrapers = SCRAPER_CONFIG.scrapers
      .filter(scraper => scraper.enabled)
      .sort((a, b) => a.priority - b.priority);

    if (enabledScrapers.length === 0) {
      logger.warn('No scrapers enabled');
      return results;
    }

    // Run scrapers in parallel with rate limiting
    logger.info(`Running ${enabledScrapers.length} scrapers in parallel`);
    const scraperPromises = enabledScrapers.map(async (scraper) => {
      try {
        // Apply rate limiting
        await scraper.rateLimiter.throttle();
        
        // Run scraper with timeout
        const hackathons = await runScraperWithTimeout(scraper, options);
        
        results.scraperResults[scraper.name] = {
          success: true,
          count: hackathons.length,
          error: null,
        };
        
        if (hackathons.length > 0) {
          results.success++;
          return hackathons;
        } else {
          results.failed++;
          return [];
        }
      } catch (error) {
        results.failed++;
        results.scraperResults[scraper.name] = {
          success: false,
          count: 0,
          error: error.message,
        };
        logger.error(`${scraper.name} scraper failed:`, error);
        return [];
      }
    });

    // Wait for all scrapers to complete
    const scraperResults = await Promise.allSettled(scraperPromises);
    
    // Collect all hackathons
    const allHackathons = scraperResults
      .filter(result => result.status === 'fulfilled')
      .flatMap(result => result.value || []);

    results.hackathons = allHackathons;
    logger.info(`Collected ${allHackathons.length} total hackathons`);

    // Process and save to database
    if (allHackathons.length > 0) {
      try {
        results.databaseResults = await processHackathons(allHackathons);
      } catch (dbError) {
        logger.error('Database processing failed:', dbError);
        results.databaseResults = { error: dbError.message };
      }
    }

    // Calculate duration
    results.duration = Date.now() - startTime;
    
    // Cache the results
    cache.set(SCRAPER_CONFIG.cacheKey, results, SCRAPER_CONFIG.cacheTTL);

    logger.info('Hackathon scraping completed', {
      duration: results.duration,
      totalHackathons: results.hackathons.length,
      successfulScrapers: results.success,
      failedScrapers: results.failed,
      databaseResults: results.databaseResults,
    });

    return results;

  } catch (error) {
    logger.error('Scraping job failed:', error);
    results.error = error.message;
    results.duration = Date.now() - startTime;
    return results;
  }
}

/**
 * Run a specific scraper by name
 * @param {string} scraperName - Name of the scraper to run
 * @param {Object} options - Scraping options
 * @returns {Promise<Object>} Scraping results
 */
export async function runScraper(scraperName, options = {}) {
  logger.info(`Running single scraper: ${scraperName}`, options);
  
  const scraper = SCRAPER_CONFIG.scrapers.find(
    s => s.name.toLowerCase() === scraperName.toLowerCase()
  );
  
  if (!scraper) {
    throw new Error(`Scraper "${scraperName}" not found`);
  }

  if (!scraper.enabled) {
    throw new Error(`Scraper "${scraperName}" is disabled`);
  }

  try {
    // Apply rate limiting
    await scraper.rateLimiter.throttle();
    
    // Run scraper
    const hackathons = await runScraperWithTimeout(scraper, options);
    
    // Process results
    const databaseResults = await processHackathons(hackathons);
    
    return {
      success: true,
      scraper: scraperName,
      hackathons,
      count: hackathons.length,
      databaseResults,
    };
    
  } catch (error) {
    logger.error(`${scraperName} scraper failed:`, error);
    throw error;
  }
}

/**
 * Get scraper status and statistics
 * @returns {Object} Scraper status information
 */
export function getScraperStatus() {
  return {
    scrapers: SCRAPER_CONFIG.scrapers.map(scraper => ({
      name: scraper.name,
      enabled: scraper.enabled,
      priority: scraper.priority,
      rateLimiter: {
        maxRequests: scraper.rateLimiter.maxRequests,
        timeWindow: scraper.rateLimiter.timeWindow,
        currentRequests: scraper.rateLimiter.requests.length,
      }
    })),
    config: {
      timeout: SCRAPER_CONFIG.timeout,
      batchSize: SCRAPER_CONFIG.batchSize,
      cacheTTL: SCRAPER_CONFIG.cacheTTL,
    },
    cache: {
      hasData: !!cache.get(SCRAPER_CONFIG.cacheKey),
    }
  };
}

/**
 * Clear scraper cache
 */
export function clearScraperCache() {
  cache.delete(SCRAPER_CONFIG.cacheKey);
  logger.info('Scraper cache cleared');
}

/**
 * Reset rate limiters for all scrapers
 */
export function resetRateLimiters() {
  SCRAPER_CONFIG.scrapers.forEach(scraper => {
    scraper.rateLimiter.reset();
  });
  logger.info('Rate limiters reset for all scrapers');
}