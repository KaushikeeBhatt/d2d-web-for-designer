/**
 * Cron Job API Routes
 * Handles scheduled tasks for scraping and cleanup
 * Called by Vercel Cron or manual triggers
 */

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import { runAllScrapers } from '@/lib/scrapers';
import { runDesignScrapers } from '@/lib/scrapers/designs';
import { runCleanupJob, getCleanupStats } from '@/lib/cron/cleanupJob';
import { apiResponse, apiError } from '@/lib/utils/apiResponse';
import { Logger } from '@/lib/utils/logger';

const logger = new Logger('CronAPI');

// Vercel Cron authentication
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Verify cron request authentication
 * @param {Request} request - The incoming request
 * @returns {boolean} Whether the request is authorized
 */
function verifyCronAuth(request) {
  // In production, verify the authorization header
  if (process.env.NODE_ENV === 'production') {
    const authHeader = request.headers.get('authorization');
    return authHeader === `Bearer ${CRON_SECRET}`;
  }
  
  // In development, allow all requests
  return true;
}

/**
 * GET /api/cron
 * Execute cron jobs based on query parameter
 * @param {Request} request - The incoming request
 */
export async function GET(request) {
  const startTime = Date.now();
  
  try {
    // Verify cron authentication
    if (!verifyCronAuth(request)) {
      logger.warn('Unauthorized cron request');
      return apiError('Unauthorized', 401);
    }
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const job = searchParams.get('job');
    const force = searchParams.get('force') === 'true';
    
    // Log the cron job request
    logger.info(`Cron job requested: ${job || 'none'}`, { 
      job, 
      force,
      userAgent: request.headers.get('user-agent')
    });
    
    // Connect to database
    await connectDB();
    
    // Execute the requested job
    let result;
    
    switch (job) {
      case 'scrape':
      case 'scrape-hackathons':
        // Hackathon scraping job
        logger.info('Starting hackathon scraping cron job');
        
        result = await runAllScrapers();
        
        logger.info('Hackathon scraping completed', {
          totalScraped: result.hackathons.length,
          success: result.results.success,
          failed: result.results.failed,
          duration: Date.now() - startTime
        });
        
        return apiResponse({
          job: 'scrape-hackathons',
          success: true,
          hackathonsScraped: result.hackathons.length,
          scrapers: result.results,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString()
        });
        
      case 'scrape-designs':
        // Design scraping job
        logger.info('Starting design scraping cron job');
        
        result = await runDesignScrapers();
        
        logger.info('Design scraping completed', {
          totalScraped: result.designs.length,
          success: result.results.success,
          failed: result.results.failed,
          duration: Date.now() - startTime
        });
        
        return apiResponse({
          job: 'scrape-designs',
          success: true,
          designsScraped: result.designs.length,
          scrapers: result.results,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString()
        });
        
      case 'cleanup':
        // Cleanup job
        logger.info('Starting cleanup cron job');
        
        result = await runCleanupJob();
        
        logger.info('Cleanup completed', {
          ...result,
          duration: Date.now() - startTime
        });
        
        return apiResponse({
          job: 'cleanup',
          success: result.success,
          cleaned: {
            expiredHackathons: result.expiredHackathons,
            oldHackathons: result.oldHackathons,
            oldDesigns: result.oldDesigns,
            orphanedBookmarks: result.orphanedBookmarks,
            trendingUpdated: result.trendingUpdated
          },
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString()
        });
        
      case 'stats':
        // Get cleanup statistics
        logger.info('Getting cleanup statistics');
        
        const stats = await getCleanupStats();
        
        return apiResponse({
          job: 'stats',
          stats,
          timestamp: new Date().toISOString()
        });
        
      default:
        // No job specified or invalid job
        logger.warn(`Invalid cron job requested: ${job}`);
        
        return apiError('Invalid cron job. Valid jobs: scrape, scrape-designs, cleanup, stats', 400);
    }
  } catch (error) {
    // Log the error with full details
    logger.error('Cron job failed', error, {
      job: new URL(request.url).searchParams.get('job'),
      duration: Date.now() - startTime
    });
    
    // Return error response
    return apiError(
      `Cron job failed: ${error.message}`,
      500,
      process.env.NODE_ENV === 'development' ? error.stack : undefined
    );
  }
}

/**
 * POST /api/cron
 * Manually trigger a cron job (admin only)
 * @param {Request} request - The incoming request
 */
export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { job, options = {} } = body;
    
    // Log the manual trigger
    logger.info(`Manual cron job trigger: ${job}`, { job, options });
    
    // Validate job parameter
    if (!job || !['scrape', 'scrape-hackathons', 'scrape-designs', 'cleanup'].includes(job)) {
      return apiError('Invalid job parameter', 400);
    }
    
    // Connect to database
    await connectDB();
    
    // Execute the job with options
    let result;
    
    switch (job) {
      case 'scrape':
      case 'scrape-hackathons':
        result = await runAllScrapers(options);
        break;
        
      case 'scrape-designs':
        result = await runDesignScrapers(options);
        break;
        
      case 'cleanup':
        result = await runCleanupJob();
        break;
    }
    
    // Return success response
    return apiResponse({
      job,
      success: true,
      result,
      manual: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Manual cron job failed', error);
    return apiError(
      `Manual cron job failed: ${error.message}`,
      500,
      process.env.NODE_ENV === 'development' ? error.stack : undefined
    );
  }
}