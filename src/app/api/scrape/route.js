import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectDB } from '@/lib/db/mongodb';
import { runAllScrapers } from '@/lib/scrapers/index';
import { apiResponse, apiError } from '@/lib/utils/apiResponse';
import { Logger } from '@/lib/utils/logger';
import { RateLimiter } from '@/lib/utils/rateLimiter';

const logger = new Logger('ManualScrapeAPI');

// Rate limiter for manual scraping - prevent abuse
const manualScrapeRateLimiter = new RateLimiter(5, 300000); // 5 requests per 5 minutes

/**
 * Manual hackathon scraping endpoint
 * Allows authenticated users to trigger hackathon scraping manually
 */
export async function POST(request) {
  try {
    logger.info('Manual hackathon scrape initiated');

    // Check authentication
    const session = await auth();
    if (!session?.user) {
      logger.warn('Unauthorized manual scrape attempt');
      return apiError('Unauthorized. Please sign in to access scraping.', 401);
    }

    // Apply rate limiting to prevent abuse
    try {
      await manualScrapeRateLimiter.throttle();
    } catch (rateLimitError) {
      logger.warn('Manual scrape rate limit exceeded', { 
        userId: session.user.id,
        email: session.user.email 
      });
      return apiError('Rate limit exceeded. Please wait before trying again.', 429);
    }

    // Parse request body for options
    let options = {};
    try {
      const body = await request.json();
      options = {
        limit: body.limit ? Math.min(parseInt(body.limit), 50) : 20, // Max 50 items
        platforms: body.platforms || ['devpost', 'unstop', 'cumulus'],
        forceRefresh: body.forceRefresh || false
      };
    } catch (parseError) {
      // Use defaults if JSON parsing fails
      logger.info('Using default scraping options');
      options = { limit: 20, platforms: ['devpost', 'unstop', 'cumulus'] };
    }

    // Validate platforms
    const validPlatforms = ['devpost', 'unstop', 'cumulus'];
    options.platforms = options.platforms.filter(platform => 
      validPlatforms.includes(platform)
    );

    if (options.platforms.length === 0) {
      return apiError('No valid platforms specified', 400);
    }

    logger.info('Manual scrape started', { 
      userId: session.user.id,
      options 
    });

    // Connect to database
    await connectDB();

    // Check if scraping is enabled
    if (process.env.SCRAPING_ENABLED === 'false') {
      logger.warn('Scraping is disabled via environment variable');
      return apiError('Scraping is currently disabled', 503);
    }

    // Run the scrapers with timeout protection
    const startTime = Date.now();
    let result;

    try {
      // Set a timeout for the entire scraping operation (8 seconds for Vercel)
      result = await Promise.race([
        runAllScrapers(options),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Scraping timeout')), 8000)
        )
      ]);
    } catch (scraperError) {
      logger.error('Scraping operation failed', {
        error: scraperError.message,
        userId: session.user.id,
        duration: Date.now() - startTime
      });

      if (scraperError.message === 'Scraping timeout') {
        return apiError('Scraping operation timed out. Please try again.', 408);
      }

      return apiError('Scraping failed. Please try again later.', 500);
    }

    const duration = Date.now() - startTime;

    logger.info('Manual scrape completed successfully', {
      userId: session.user.id,
      hackathonsFound: result.hackathons?.length || 0,
      successfulScrapers: result.results?.success || 0,
      failedScrapers: result.results?.failed || 0,
      duration: `${duration}ms`
    });

    // Return success response with detailed information
    return apiResponse({
      message: 'Scraping completed successfully',
      hackathons: result.hackathons?.length || 0,
      platforms: {
        successful: result.results?.success || 0,
        failed: result.results?.failed || 0
      },
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Manual scrape API error', {
      error: error.message,
      stack: error.stack
    });

    return apiError(
      'An unexpected error occurred during scraping',
      500,
      process.env.NODE_ENV === 'development' ? error.message : null
    );
  }
}

/**
 * Get scraping status and last run information
 */
export async function GET(request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return apiError('Unauthorized', 401);
    }

    await connectDB();

    // Get scraping statistics from database
    const { Hackathon } = await import('@/lib/db/models/Hackathon');
    
    const stats = await Promise.all([
      // Total hackathons count
      Hackathon.countDocuments(),
      
      // Recent hackathons (last 24 hours)
      Hackathon.countDocuments({
        lastScraped: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }),
      
      // Active hackathons (not expired)
      Hackathon.countDocuments({
        $or: [
          { deadline: { $gte: new Date() } },
          { deadline: null }
        ]
      }),
      
      // Last scrape time
      Hackathon.findOne({}, { lastScraped: 1 }).sort({ lastScraped: -1 })
    ]);

    const [totalHackathons, recentlyScraped, activeHackathons, lastScrapeDoc] = stats;

    logger.info('Scraping status requested', { userId: session.user.id });

    return apiResponse({
      status: {
        enabled: process.env.SCRAPING_ENABLED !== 'false',
        lastRun: lastScrapeDoc?.lastScraped || null,
        nextScheduledRun: null // Could add cron schedule info here
      },
      statistics: {
        total: totalHackathons,
        recentlyScraped: recentlyScraped,
        active: activeHackathons,
        platforms: ['devpost', 'unstop', 'cumulus']
      },
      rateLimits: {
        remaining: manualScrapeRateLimiter.maxRequests - manualScrapeRateLimiter.requests.length,
        resetTime: new Date(Date.now() + manualScrapeRateLimiter.timeWindow)
      }
    });

  } catch (error) {
    logger.error('Get scraping status error', error);
    return apiError('Failed to fetch scraping status', 500);
  }
}

/**
 * Handle unsupported HTTP methods
 */
export async function PUT() {
  return apiError('Method not allowed', 405);
}

export async function DELETE() {
  return apiError('Method not allowed', 405);
}

export async function PATCH() {
  return apiError('Method not allowed', 405);
}