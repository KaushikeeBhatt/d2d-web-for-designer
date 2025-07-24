/**
 * Hackathon Scraping Cron Job
 * Runs hourly to scrape new hackathons from all platforms
 */

import { runAllScrapers } from '@/lib/scrapers';
import { connectDB } from '@/lib/db/mongodb';
import { Logger } from '@/lib/utils/logger';
import { cache } from '@/lib/utils/cache';
import Hackathon from '@/lib/db/models/Hackathon';

const logger = new Logger('HackathonCronJob');

// Configuration
const ENABLED = process.env.SCRAPING_ENABLED === 'true';
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Check if scraping should run based on various conditions
 * @returns {Promise<boolean>} Whether scraping should proceed
 */
async function shouldRunScraping() {
  try {
    // Check if scraping is enabled
    if (!ENABLED) {
      logger.info('Hackathon scraping is disabled via environment variable');
      return false;
    }

    // Check last run time from cache
    const lastRunKey = 'hackathon_scraper_last_run';
    const lastRun = cache.get(lastRunKey);
    
    if (lastRun) {
      const timeSinceLastRun = Date.now() - lastRun;
      const minInterval = 30 * 60 * 1000; // 30 minutes minimum
      
      if (timeSinceLastRun < minInterval) {
        logger.info('Skipping hackathon scraping - too soon since last run', {
          lastRun: new Date(lastRun).toISOString(),
          timeSinceLastRun: `${Math.round(timeSinceLastRun / 1000)}s`
        });
        return false;
      }
    }

    return true;
  } catch (error) {
    logger.error('Error checking if scraping should run', {
      error: error.message,
      stack: error.stack
    });
    return false;
  }
}

/**
 * Run hackathon scraping with retry logic
 * @param {number} retryCount - Current retry attempt
 * @returns {Promise<Object>} Scraping results
 */
async function runScrapingWithRetry(retryCount = 0) {
  try {
    logger.info(`Running hackathon scraping (attempt ${retryCount + 1}/${MAX_RETRIES})`);
    
    const result = await runAllScrapers();
    
    // Validate result
    if (!result || typeof result !== 'object') {
      throw new Error('Invalid scraping result');
    }

    return result;
  } catch (error) {
    logger.error(`Hackathon scraping attempt ${retryCount + 1} failed`, {
      error: error.message,
      stack: error.stack
    });

    if (retryCount < MAX_RETRIES - 1) {
      logger.info(`Retrying hackathon scraping after ${RETRY_DELAY}ms`);
      await sleep(RETRY_DELAY);
      return runScrapingWithRetry(retryCount + 1);
    }

    throw error;
  }
}

/**
 * Update hackathon statistics
 * @returns {Promise<void>}
 */
async function updateStatistics() {
  try {
    const stats = await Hackathon.aggregate([
      {
        $facet: {
          byPlatform: [
            { $group: { _id: '$platform', count: { $sum: 1 } } }
          ],
          byStatus: [
            {
              $group: {
                _id: {
                  $cond: [
                    { $lt: ['$deadline', new Date()] },
                    'expired',
                    'active'
                  ]
                },
                count: { $sum: 1 }
              }
            }
          ],
          total: [
            { $count: 'count' }
          ]
        }
      }
    ]);

    const formattedStats = {
      total: stats[0]?.total[0]?.count || 0,
      byPlatform: stats[0]?.byPlatform || [],
      byStatus: stats[0]?.byStatus || []
    };

    logger.info('Hackathon statistics updated', formattedStats);
    
    // Cache statistics
    cache.set('hackathon_statistics', formattedStats, 3600000); // 1 hour
  } catch (error) {
    logger.error('Failed to update hackathon statistics', {
      error: error.message,
      stack: error.stack
    });
  }
}

/**
 * Main hackathon scraping job
 * @returns {Promise<Object>} Job results
 */
export async function runHackathonScrapeJob() {
  const jobId = `hackathon_scrape_${Date.now()}`;
  const startTime = Date.now();
  
  logger.info('Starting hackathon scraping job', { jobId });

  try {
    // Check if should run
    const shouldRun = await shouldRunScraping();
    if (!shouldRun) {
      return {
        success: true,
        skipped: true,
        message: 'Scraping skipped based on conditions'
      };
    }

    // Connect to database
    await connectDB();

    // Run scraping with retry
    const scrapingResult = await runScrapingWithRetry();

    // Update statistics
    await updateStatistics();

    // Mark last run time
    cache.set('hackathon_scraper_last_run', Date.now());

    const executionTime = Date.now() - startTime;

    const result = {
      success: true,
      jobId,
      executionTime: `${executionTime}ms`,
      hackathonsScraped: scrapingResult.hackathons?.length || 0,
      scraperResults: scrapingResult.results,
      timestamp: new Date().toISOString()
    };

    logger.info('Hackathon scraping job completed successfully', result);

    return result;
  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    logger.error('Hackathon scraping job failed', {
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
 * Manual trigger for hackathon scraping
 * @param {Object} options - Scraping options
 * @returns {Promise<Object>} Job results
 */
export async function triggerManualScrape(options = {}) {
  logger.info('Manual hackathon scraping triggered', { options });

  try {
    // Connect to database
    await connectDB();

    // Force refresh by clearing cache
    if (options.forceRefresh) {
      cache.delete('hackathon_scraper_last_run');
    }

    // Run scraping
    const result = await runAllScrapers();

    // Update statistics
    await updateStatistics();

    return {
      success: true,
      manual: true,
      hackathonsScraped: result.hackathons?.length || 0,
      scraperResults: result.results,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Manual hackathon scraping failed', {
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
 * Get job status and statistics
 * @returns {Object} Job status information
 */
export function getJobStatus() {
  const lastRun = cache.get('hackathon_scraper_last_run');
  const statistics = cache.get('hackathon_statistics');

  return {
    enabled: ENABLED,
    lastRun: lastRun ? new Date(lastRun).toISOString() : null,
    nextRun: lastRun ? new Date(lastRun + 3600000).toISOString() : null, // 1 hour later
    statistics
  };
}

// Export for testing
export const _internal = {
  shouldRunScraping,
  runScrapingWithRetry,
  updateStatistics
};