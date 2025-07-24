/**
 * Design Scraping Cron Job
 * Runs every 3 hours to scrape new designs from all platforms
 */

import { runAllDesignScrapers, updateTrendingDesigns } from '@/lib/scrapers/designs';
import { connectDB } from '@/lib/db/mongodb';
import { Logger } from '@/lib/utils/logger';
import { cache } from '@/lib/utils/cache';
import Design from '@/lib/db/models/Design';
import { DESIGN_CATEGORIES, CATEGORY_LABELS } from '@/lib/scrapers/designs/categories';

const logger = new Logger('DesignCronJob');

// Configuration
const ENABLED = process.env.SCRAPING_ENABLED === 'true';
const MAX_RETRIES = 3;
const RETRY_DELAY = 3000; // 3 seconds
const DESIGNS_PER_CATEGORY = 10;

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Check if design scraping should run
 * @returns {Promise<boolean>} Whether scraping should proceed
 */
async function shouldRunDesignScraping() {
  try {
    // Check if scraping is enabled
    if (!ENABLED) {
      logger.info('Design scraping is disabled via environment variable');
      return false;
    }

    // Check last run time from cache
    const lastRunKey = 'design_scraper_last_run';
    const lastRun = cache.get(lastRunKey);
    
    if (lastRun) {
      const timeSinceLastRun = Date.now() - lastRun;
      const minInterval = 2 * 60 * 60 * 1000; // 2 hours minimum
      
      if (timeSinceLastRun < minInterval) {
        logger.info('Skipping design scraping - too soon since last run', {
          lastRun: new Date(lastRun).toISOString(),
          timeSinceLastRun: `${Math.round(timeSinceLastRun / 60000)}m`
        });
        return false;
      }
    }

    return true;
  } catch (error) {
    logger.error('Error checking if design scraping should run', {
      error: error.message,
      stack: error.stack
    });
    return false;
  }
}

/**
 * Run design scraping for a specific category with retry
 * @param {string} category - Design category
 * @param {number} retryCount - Current retry attempt
 * @returns {Promise<Object>} Scraping results
 */
async function scrapeCategoryWithRetry(category, retryCount = 0) {
  try {
    logger.info(`Scraping designs for category: ${CATEGORY_LABELS[category]} (attempt ${retryCount + 1})`);
    
    const result = await runAllDesignScrapers({
      category,
      limit: DESIGNS_PER_CATEGORY
    });
    
    if (!result || typeof result !== 'object') {
      throw new Error('Invalid scraping result');
    }

    return result;
  } catch (error) {
    logger.error(`Design scraping for ${category} failed (attempt ${retryCount + 1})`, {
      error: error.message,
      category
    });

    if (retryCount < MAX_RETRIES - 1) {
      await sleep(RETRY_DELAY);
      return scrapeCategoryWithRetry(category, retryCount + 1);
    }

    throw error;
  }
}

/**
 * Update design statistics and cache
 * @returns {Promise<void>}
 */
async function updateDesignStatistics() {
  try {
    const stats = await Design.aggregate([
      {
        $facet: {
          byCategory: [
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          bySource: [
            { $group: { _id: '$source', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          trending: [
            { $match: { isTrending: true } },
            { $count: 'count' }
          ],
          total: [
            { $count: 'count' }
          ],
          recent: [
            {
              $match: {
                createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
              }
            },
            { $count: 'count' }
          ]
        }
      }
    ]);

    const formattedStats = {
      total: stats[0]?.total[0]?.count || 0,
      trending: stats[0]?.trending[0]?.count || 0,
      recentlyAdded: stats[0]?.recent[0]?.count || 0,
      byCategory: stats[0]?.byCategory || [],
      bySource: stats[0]?.bySource || []
    };

    logger.info('Design statistics updated', formattedStats);
    
    // Cache statistics
    cache.set('design_statistics', formattedStats, 3600000); // 1 hour
  } catch (error) {
    logger.error('Failed to update design statistics', {
      error: error.message,
      stack: error.stack
    });
  }
}

/**
 * Clean up duplicate designs
 * @returns {Promise<number>} Number of duplicates removed
 */
async function cleanupDuplicateDesigns() {
  try {
    const duplicates = await Design.aggregate([
      {
        $group: {
          _id: { sourceUrl: '$sourceUrl' },
          count: { $sum: 1 },
          ids: { $push: '$_id' },
          dates: { $push: '$createdAt' }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);

    let removedCount = 0;

    for (const duplicate of duplicates) {
      // Sort by creation date, keep the oldest
      const sortedIds = duplicate.ids
        .map((id, index) => ({ id, date: duplicate.dates[index] }))
        .sort((a, b) => a.date - b.date);

      // Remove all but the first (oldest)
      const idsToRemove = sortedIds.slice(1).map(item => item.id);
      
      if (idsToRemove.length > 0) {
        await Design.deleteMany({ _id: { $in: idsToRemove } });
        removedCount += idsToRemove.length;
      }
    }

    if (removedCount > 0) {
      logger.info(`Removed ${removedCount} duplicate designs`);
    }

    return removedCount;
  } catch (error) {
    logger.error('Failed to cleanup duplicate designs', {
      error: error.message,
      stack: error.stack
    });
    return 0;
  }
}

/**
 * Main design scraping job
 * @returns {Promise<Object>} Job results
 */
export async function runDesignScrapeJob() {
  const jobId = `design_scrape_${Date.now()}`;
  const startTime = Date.now();
  
  logger.info('Starting design scraping job', { jobId });

  try {
    // Check if should run
    const shouldRun = await shouldRunDesignScraping();
    if (!shouldRun) {
      return {
        success: true,
        skipped: true,
        message: 'Design scraping skipped based on conditions'
      };
    }

    // Connect to database
    await connectDB();

    // Get categories to scrape (excluding 'all')
    const categories = Object.values(DESIGN_CATEGORIES)
      .filter(cat => cat !== DESIGN_CATEGORIES.ALL);

    const results = {
      success: 0,
      failed: 0,
      totalDesigns: 0,
      byCategory: {},
      errors: []
    };

    // Scrape each category
    for (const category of categories) {
      try {
        const categoryResult = await scrapeCategoryWithRetry(category);
        
        results.success++;
        results.totalDesigns += categoryResult.total || 0;
        results.byCategory[category] = {
          scraped: categoryResult.total || 0,
          bySource: categoryResult.bySource || {}
        };
      } catch (error) {
        results.failed++;
        results.errors.push({
          category,
          error: error.message
        });
      }

      // Small delay between categories
      await sleep(1000);
    }

    // Update trending status for all designs
    try {
      await updateTrendingDesigns();
    } catch (error) {
      logger.error('Failed to update trending designs', {
        error: error.message
      });
    }

    // Cleanup duplicates
    const duplicatesRemoved = await cleanupDuplicateDesigns();

    // Update statistics
    await updateDesignStatistics();

    // Mark last run time
    cache.set('design_scraper_last_run', Date.now());

    const executionTime = Date.now() - startTime;

    const result = {
      success: true,
      jobId,
      executionTime: `${executionTime}ms`,
      categoriesProcessed: results.success,
      categoriesFailed: results.failed,
      totalDesignsScraped: results.totalDesigns,
      duplicatesRemoved,
      categoryResults: results.byCategory,
      errors: results.errors,
      timestamp: new Date().toISOString()
    };

    logger.info('Design scraping job completed successfully', result);

    return result;
  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    logger.error('Design scraping job failed', {
      jobId,
      error: error.message,
      stack: error.stack,
      executionTime: `${executionTime}ms`
    });

    return {
      success: false,
      jobId,
      error: error.message,
      executionTime: `${executionTime}ms`,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Manual trigger for design scraping
 * @param {Object} options - Scraping options
 * @returns {Promise<Object>} Job results
 */
export async function triggerManualDesignScrape(options = {}) {
  logger.info('Manual design scraping triggered', { options });

  try {
    // Connect to database
    await connectDB();

    // Force refresh by clearing cache
    if (options.forceRefresh) {
      cache.delete('design_scraper_last_run');
    }

    let result;

    if (options.category && options.category !== DESIGN_CATEGORIES.ALL) {
      // Scrape specific category
      result = await runAllDesignScrapers({
        category: options.category,
        limit: options.limit || DESIGNS_PER_CATEGORY,
        forceRefresh: true
      });
    } else {
      // Run full job
      return await runDesignScrapeJob();
    }

    // Update statistics
    await updateDesignStatistics();

    return {
      success: true,
      manual: true,
      category: options.category,
      designsScraped: result.total || 0,
      scraperResults: result,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Manual design scraping failed', {
      error: error.message,
      stack: error.stack,
      options
    });

    return {
      success: false,
      manual: true,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get design scraping job status
 * @returns {Object} Job status information
 */
export function getDesignJobStatus() {
  const lastRun = cache.get('design_scraper_last_run');
  const statistics = cache.get('design_statistics');

  return {
    enabled: ENABLED,
    lastRun: lastRun ? new Date(lastRun).toISOString() : null,
    nextRun: lastRun ? new Date(lastRun + 3 * 60 * 60 * 1000).toISOString() : null, // 3 hours later
    statistics,
    categories: Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
      value,
      label
    }))
  };
}

// Export for testing
export const _internal = {
  shouldRunDesignScraping,
  scrapeCategoryWithRetry,
  updateDesignStatistics,
  cleanupDuplicateDesigns
};