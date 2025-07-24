/**
 * Design Scraper Orchestrator
 * Manages all design platform scrapers with error handling, rate limiting, and database operations
 */

import { scrapeBehance } from './behance';
import { scrapeDribbble } from './dribbble';
import { scrapeAwwwards } from './awwwards';
import { connectDB } from '@/lib/db/mongodb';
import Design from '@/lib/db/models/Design';
import { Logger } from '@/lib/utils/logger';
import { scraperRateLimiters } from '@/lib/utils/rateLimiter';
import { cache } from '@/lib/utils/cache';
import { designSchema } from '@/lib/utils/validators';
import { DESIGN_CATEGORIES } from './categories';

const logger = new Logger('DesignScraper');

// Vercel function timeout safety (9 seconds to be safe)
const SCRAPER_TIMEOUT = 9000;
const CACHE_KEY_PREFIX = 'design_scraper_';
const CACHE_TTL = parseInt(process.env.DESIGNS_CACHE_TTL || '3600', 10) * 1000;

/**
 * Run a single scraper with timeout protection
 * @param {Function} scraperFn - The scraper function to run
 * @param {string} scraperName - Name of the scraper for logging
 * @param {Object} options - Scraper options
 * @returns {Promise<Array>} Array of scraped designs
 */
async function runScraperWithTimeout(scraperFn, scraperName, options = {}) {
  try {
    logger.info(`Starting ${scraperName} scraper with timeout ${SCRAPER_TIMEOUT}ms`);
    
    const result = await Promise.race([
      scraperFn(options),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`${scraperName} timeout after ${SCRAPER_TIMEOUT}ms`)), SCRAPER_TIMEOUT)
      )
    ]);

    if (!Array.isArray(result)) {
      logger.error(`${scraperName} returned invalid result type`, { result });
      return [];
    }

    return result;
  } catch (error) {
    logger.error(`${scraperName} scraper failed`, {
      error: error.message,
      stack: error.stack,
      options
    });
    return [];
  }
}

/**
 * Validate and clean design data
 * @param {Object} design - Raw design data
 * @param {string} source - Source platform
 * @returns {Object|null} Validated design or null if invalid
 */
function validateDesign(design, source) {
  try {
    if (!design || typeof design !== 'object') {
      logger.warn('Invalid design object', { design, source });
      return null;
    }

    // Ensure required fields
    const cleanedDesign = {
      ...design,
      source,
      category: design.category || DESIGN_CATEGORIES.ALL,
      stats: {
        views: design.stats?.views || 0,
        likes: design.stats?.likes || 0,
        saves: design.stats?.saves || 0
      },
      publishedAt: design.publishedAt || new Date().toISOString()
    };

    // Validate with schema
    const result = designSchema.safeParse(cleanedDesign);
    
    if (!result.success) {
      logger.warn('Design validation failed', {
        errors: result.error.flatten(),
        design: cleanedDesign
      });
      return null;
    }

    return result.data;
  } catch (error) {
    logger.error('Design validation error', {
      error: error.message,
      design,
      source
    });
    return null;
  }
}

/**
 * Calculate trending score for design
 * @param {Object} design - Design object with stats
 * @returns {boolean} Whether design is trending
 */
function calculateTrendingScore(design) {
  try {
    if (!design.stats) return false;

    const { views = 0, likes = 0, saves = 0 } = design.stats;
    const publishedDate = new Date(design.publishedAt);
    const daysSincePublished = (Date.now() - publishedDate) / (1000 * 60 * 60 * 24);
    
    // Weight recent designs higher
    const recencyWeight = daysSincePublished <= 7 ? 2 : 1;
    
    // Calculate engagement score
    const engagementScore = (likes * 3 + saves * 2 + views * 0.01) * recencyWeight;
    
    // Design is trending if engagement score > 100
    return engagementScore > 100;
  } catch (error) {
    logger.error('Error calculating trending score', { error: error.message });
    return false;
  }
}

/**
 * Run all design scrapers
 * @param {Object} options - Scraper options
 * @returns {Promise<Object>} Scraping results
 */
export async function runAllDesignScrapers(options = {}) {
  const startTime = Date.now();
  logger.info('Starting design scraping job', { options });

  // Check cache first
  const cacheKey = `${CACHE_KEY_PREFIX}all_${JSON.stringify(options)}`;
  const cachedResult = cache.get(cacheKey);
  if (cachedResult && !options.forceRefresh) {
    logger.info('Returning cached design scraper results');
    return cachedResult;
  }

  // Ensure database connection
  try {
    await connectDB();
  } catch (error) {
    logger.error('Failed to connect to database', { error: error.message });
    throw new Error('Database connection failed');
  }

  const limit = options.limit || parseInt(process.env.SCRAPING_DESIGNS_LIMIT || '50', 10);
  const category = options.category || DESIGN_CATEGORIES.ALL;

  const scrapers = [
    { 
      name: 'Behance', 
      fn: scrapeBehance, 
      rateLimiter: scraperRateLimiters.behance,
      enabled: options.behance !== false 
    },
    { 
      name: 'Dribbble', 
      fn: scrapeDribbble, 
      rateLimiter: scraperRateLimiters.dribbble,
      enabled: options.dribbble !== false 
    },
    { 
      name: 'Awwwards', 
      fn: scrapeAwwwards, 
      rateLimiter: scraperRateLimiters.awwwards,
      enabled: options.awwwards !== false 
    },
  ];

  const allDesigns = [];
  const results = { 
    success: 0, 
    failed: 0, 
    total: 0,
    bySource: {},
    errors: []
  };

  // Run scrapers sequentially to respect rate limits
  for (const scraper of scrapers) {
    if (!scraper.enabled) {
      logger.info(`${scraper.name} scraper disabled`);
      continue;
    }

    try {
      // Apply rate limiting
      await scraper.rateLimiter.throttle();

      // Run scraper with timeout
      const scraperOptions = {
        limit: Math.ceil(limit / scrapers.filter(s => s.enabled).length),
        category
      };

      const designs = await runScraperWithTimeout(
        scraper.fn,
        scraper.name,
        scraperOptions
      );

      // Validate each design
      const validDesigns = [];
      for (const design of designs) {
        const validatedDesign = validateDesign(design, scraper.name.toLowerCase());
        if (validatedDesign) {
          // Calculate trending status
          validatedDesign.isTrending = calculateTrendingScore(validatedDesign);
          validDesigns.push(validatedDesign);
        }
      }

      allDesigns.push(...validDesigns);
      results.success++;
      results.bySource[scraper.name.toLowerCase()] = validDesigns.length;
      
      logger.info(`${scraper.name}: ${validDesigns.length} valid designs scraped`);
    } catch (error) {
      results.failed++;
      results.errors.push({
        scraper: scraper.name,
        error: error.message
      });
      logger.error(`${scraper.name} failed completely`, { 
        error: error.message,
        stack: error.stack 
      });
    }
  }

  results.total = allDesigns.length;

  // Bulk upsert to database
  if (allDesigns.length > 0) {
    try {
      const bulkOps = allDesigns.map(design => ({
        updateOne: {
          filter: { sourceUrl: design.sourceUrl },
          update: { 
            $set: { 
              ...design, 
              lastScraped: new Date() 
            } 
          },
          upsert: true
        }
      }));

      const dbResult = await Design.bulkWrite(bulkOps, { ordered: false });
      
      logger.info('Design scraping database update completed', {
        upserted: dbResult.upsertedCount,
        modified: dbResult.modifiedCount,
        total: allDesigns.length
      });

      results.database = {
        upserted: dbResult.upsertedCount,
        modified: dbResult.modifiedCount
      };
    } catch (error) {
      logger.error('Database bulk write failed', { 
        error: error.message,
        designCount: allDesigns.length 
      });
      results.errors.push({
        operation: 'database',
        error: error.message
      });
    }
  }

  const executionTime = Date.now() - startTime;
  results.executionTime = executionTime;

  // Cache successful results
  if (results.total > 0) {
    cache.set(cacheKey, results, CACHE_TTL);
  }

  logger.info('Design scraping job completed', {
    ...results,
    executionTime: `${executionTime}ms`
  });

  return results;
}

/**
 * Scrape designs by specific category
 * @param {string} category - Design category
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Scraping results
 */
export async function scrapeDesignsByCategory(category, options = {}) {
  if (!Object.values(DESIGN_CATEGORIES).includes(category)) {
    throw new Error(`Invalid category: ${category}`);
  }

  logger.info(`Scraping designs for category: ${category}`);
  
  return runAllDesignScrapers({
    ...options,
    category
  });
}

/**
 * Update trending status for existing designs
 * @returns {Promise<Object>} Update results
 */
export async function updateTrendingDesigns() {
  logger.info('Updating trending designs status');

  try {
    await connectDB();

    // Get recent designs (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentDesigns = await Design.find({
      publishedAt: { $gte: thirtyDaysAgo }
    }).limit(1000);

    let updatedCount = 0;
    const bulkOps = [];

    for (const design of recentDesigns) {
      const wasTrending = design.isTrending;
      const isTrending = calculateTrendingScore(design);

      if (wasTrending !== isTrending) {
        bulkOps.push({
          updateOne: {
            filter: { _id: design._id },
            update: { $set: { isTrending } }
          }
        });
        updatedCount++;
      }
    }

    if (bulkOps.length > 0) {
      await Design.bulkWrite(bulkOps);
    }

    logger.info('Trending designs update completed', {
      checked: recentDesigns.length,
      updated: updatedCount
    });

    return {
      success: true,
      checked: recentDesigns.length,
      updated: updatedCount
    };
  } catch (error) {
    logger.error('Failed to update trending designs', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Clean up old design entries
 * @param {number} daysToKeep - Number of days to keep designs
 * @returns {Promise<Object>} Cleanup results
 */
export async function cleanupOldDesigns(daysToKeep = 90) {
  logger.info(`Cleaning up designs older than ${daysToKeep} days`);

  try {
    await connectDB();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await Design.deleteMany({
      createdAt: { $lt: cutoffDate },
      isTrending: false
    });

    logger.info('Design cleanup completed', {
      deleted: result.deletedCount
    });

    return {
      success: true,
      deleted: result.deletedCount
    };
  } catch (error) {
    logger.error('Failed to cleanup old designs', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

// Export for testing
export const _internal = {
  validateDesign,
  calculateTrendingScore,
  runScraperWithTimeout
};