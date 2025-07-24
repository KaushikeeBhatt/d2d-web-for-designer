import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectDB } from '@/lib/db/mongodb';
import { runAllDesignScrapers } from '@/lib/scrapers/designs/index';
import { apiResponse, apiError } from '@/lib/utils/apiResponse';
import { Logger } from '@/lib/utils/logger';
import { RateLimiter } from '@/lib/utils/rateLimiter';
import { DESIGN_CATEGORIES } from '@/lib/scrapers/designs/categories';

const logger = new Logger('ManualDesignScrapeAPI');

// Rate limiter for manual design scraping - more restrictive due to external APIs
const designScrapeRateLimiter = new RateLimiter(3, 600000); // 3 requests per 10 minutes

/**
 * Manual design scraping endpoint
 * Allows authenticated users to trigger design inspiration scraping manually
 */
export async function POST(request) {
  try {
    logger.info('Manual design scrape initiated');

    // Check authentication
    const session = await auth();
    if (!session?.user) {
      logger.warn('Unauthorized manual design scrape attempt');
      return apiError('Unauthorized. Please sign in to access design scraping.', 401);
    }

    // Apply rate limiting to prevent abuse of external APIs
    try {
      await designScrapeRateLimiter.throttle();
    } catch (rateLimitError) {
      logger.warn('Manual design scrape rate limit exceeded', { 
        userId: session.user.id,
        email: session.user.email 
      });
      return apiError('Rate limit exceeded. Design scraping is limited to prevent API abuse.', 429);
    }

    // Parse request body for options
    let options = {};
    try {
      const body = await request.json();
      options = {
        limit: body.limit ? Math.min(parseInt(body.limit), 30) : 15, // Max 30 items for designs
        sources: body.sources || ['behance', 'dribbble', 'awwwards'],
        categories: body.categories || [DESIGN_CATEGORIES.ALL],
        trending: body.trending || false,
        forceRefresh: body.forceRefresh || false
      };
    } catch (parseError) {
      // Use defaults if JSON parsing fails
      logger.info('Using default design scraping options');
      options = { 
        limit: 15, 
        sources: ['behance', 'dribbble', 'awwwards'],
        categories: [DESIGN_CATEGORIES.ALL]
      };
    }

    // Validate sources
    const validSources = ['behance', 'dribbble', 'awwwards', 'designspiration'];
    options.sources = options.sources.filter(source => 
      validSources.includes(source)
    );

    if (options.sources.length === 0) {
      return apiError('No valid design sources specified', 400);
    }

    // Validate categories
    const validCategories = Object.values(DESIGN_CATEGORIES);
    options.categories = options.categories.filter(category => 
      validCategories.includes(category)
    );

    if (options.categories.length === 0) {
      options.categories = [DESIGN_CATEGORIES.ALL];
    }

    logger.info('Manual design scrape started', { 
      userId: session.user.id,
      options 
    });

    // Connect to database
    await connectDB();

    // Check if design scraping is enabled
    if (process.env.SCRAPING_ENABLED === 'false') {
      logger.warn('Design scraping is disabled via environment variable');
      return apiError('Design scraping is currently disabled', 503);
    }

    // Run the design scrapers with timeout protection
    const startTime = Date.now();
    let result;

    try {
      // Set a timeout for the entire scraping operation (8 seconds for Vercel)
      result = await Promise.race([
        runAllDesignScrapers(options),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Design scraping timeout')), 8000)
        )
      ]);
    } catch (scraperError) {
      logger.error('Design scraping operation failed', {
        error: scraperError.message,
        userId: session.user.id,
        duration: Date.now() - startTime
      });

      if (scraperError.message === 'Design scraping timeout') {
        return apiError('Design scraping operation timed out. Please try again.', 408);
      }

      return apiError('Design scraping failed. Please try again later.', 500);
    }

    const duration = Date.now() - startTime;

    logger.info('Manual design scrape completed successfully', {
      userId: session.user.id,
      designsFound: result.designs?.length || 0,
      successfulScrapers: result.results?.success || 0,
      failedScrapers: result.results?.failed || 0,
      duration: `${duration}ms`
    });

    // Return success response with detailed information
    return apiResponse({
      message: 'Design scraping completed successfully',
      designs: result.designs?.length || 0,
      sources: {
        successful: result.results?.success || 0,
        failed: result.results?.failed || 0
      },
      categories: result.categoriesFound || [],
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Manual design scrape API error', {
      error: error.message,
      stack: error.stack
    });

    return apiError(
      'An unexpected error occurred during design scraping',
      500,
      process.env.NODE_ENV === 'development' ? error.message : null
    );
  }
}

/**
 * Get design scraping status and statistics
 */
export async function GET(request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return apiError('Unauthorized', 401);
    }

    await connectDB();

    // Get design statistics from database
    const { Design } = await import('@/lib/db/models/Design');
    
    const stats = await Promise.all([
      // Total designs count
      Design.countDocuments(),
      
      // Recent designs (last 24 hours)
      Design.countDocuments({
        lastScraped: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }),
      
      // Trending designs count
      Design.countDocuments({ isTrending: true }),
      
      // Designs by category
      Design.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      
      // Designs by source
      Design.aggregate([
        { $group: { _id: '$source', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      
      // Last scrape time
      Design.findOne({}, { lastScraped: 1 }).sort({ lastScraped: -1 })
    ]);

    const [
      totalDesigns, 
      recentlyScraped, 
      trendingDesigns, 
      categoryStats, 
      sourceStats, 
      lastScrapeDoc
    ] = stats;

    logger.info('Design scraping status requested', { userId: session.user.id });

    return apiResponse({
      status: {
        enabled: process.env.SCRAPING_ENABLED !== 'false',
        lastRun: lastScrapeDoc?.lastScraped || null,
        nextScheduledRun: null // Could add cron schedule info here
      },
      statistics: {
        total: totalDesigns,
        recentlyScraped: recentlyScraped,
        trending: trendingDesigns,
        byCategory: categoryStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        bySource: sourceStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        sources: ['behance', 'dribbble', 'awwwards', 'designspiration']
      },
      rateLimits: {
        remaining: designScrapeRateLimiter.maxRequests - designScrapeRateLimiter.requests.length,
        resetTime: new Date(Date.now() + designScrapeRateLimiter.timeWindow)
      },
      availableCategories: Object.values(DESIGN_CATEGORIES)
    });

  } catch (error) {
    logger.error('Get design scraping status error', error);
    return apiError('Failed to fetch design scraping status', 500);
  }
}

/**
 * Delete old designs (cleanup endpoint)
 */
export async function DELETE(request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return apiError('Unauthorized', 401);
    }

    const url = new URL(request.url);
    const daysOld = parseInt(url.searchParams.get('days')) || 30;

    if (daysOld < 7) {
      return apiError('Cannot delete designs newer than 7 days', 400);
    }

    await connectDB();
    const { Design } = await import('@/lib/db/models/Design');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const deleteResult = await Design.deleteMany({
      createdAt: { $lt: cutoffDate },
      isTrending: false // Keep trending designs regardless of age
    });

    logger.info('Old designs cleanup completed', {
      userId: session.user.id,
      deletedCount: deleteResult.deletedCount,
      daysOld
    });

    return apiResponse({
      message: `Cleaned up designs older than ${daysOld} days`,
      deletedCount: deleteResult.deletedCount
    });

  } catch (error) {
    logger.error('Design cleanup error', error);
    return apiError('Failed to cleanup old designs', 500);
  }
}

/**
 * Handle unsupported HTTP methods
 */
export async function PUT() {
  return apiError('Method not allowed', 405);
}

export async function PATCH() {
  return apiError('Method not allowed', 405);
}