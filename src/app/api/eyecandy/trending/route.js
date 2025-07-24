import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Design from '@/lib/db/models/Design';
import { apiResponse, apiError } from '@/lib/utils/apiResponse';
import { cache } from '@/lib/utils/cache';
import { Logger } from '@/lib/utils/logger';
import { DESIGN_CATEGORIES, CATEGORY_LABELS } from '@/lib/scrapers/designs/categories';

const logger = new Logger('API:EyeCandy:Trending');

/**
 * GET /api/eyecandy/trending
 * Fetch trending designs across all categories
 * Trending is determined by:
 * - isTrending flag (set by scrapers based on platform trending)
 * - High engagement (likes, views, saves)
 * - Recent publication date
 * 
 * Query params:
 * - category: filter trending by category
 * - limit: number of designs (default: 12, max: 50)
 * - timeframe: trending timeframe (day, week, month)
 */
export async function GET(request) {
  const startTime = Date.now();
  
  try {
    logger.info('Fetching trending designs', { url: request.url });
    
    // Connect to database
    await connectDB();
    
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 50);
    const timeframe = searchParams.get('timeframe') || 'week';
    
    // Validate timeframe
    const validTimeframes = ['day', 'week', 'month'];
    if (!validTimeframes.includes(timeframe)) {
      logger.warn('Invalid timeframe requested', { timeframe });
      return apiError('Invalid timeframe', 400, {
        validTimeframes
      });
    }
    
    // Generate cache key
    const cacheKey = `designs:trending:${category || 'all'}:${timeframe}:${limit}`;
    
    // Check cache
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      logger.info('Returning cached trending designs', { 
        cacheKey, 
        duration: Date.now() - startTime 
      });
      return apiResponse(cachedData);
    }
    
    // Calculate date threshold based on timeframe
    let dateThreshold = new Date();
    switch (timeframe) {
      case 'day':
        dateThreshold.setDate(dateThreshold.getDate() - 1);
        break;
      case 'week':
        dateThreshold.setDate(dateThreshold.getDate() - 7);
        break;
      case 'month':
        dateThreshold.setMonth(dateThreshold.getMonth() - 1);
        break;
    }
    
    // Build base query
    const baseQuery = {
      $or: [
        { isTrending: true },
        { 
          publishedAt: { $gte: dateThreshold },
          'stats.likes': { $gte: 100 } // Minimum engagement threshold
        }
      ]
    };
    
    // Add category filter if specified
    if (category && category !== DESIGN_CATEGORIES.ALL) {
      if (!Object.values(DESIGN_CATEGORIES).includes(category)) {
        logger.warn('Invalid category requested', { category });
        return apiError('Invalid category', 400);
      }
      baseQuery.category = category;
    }
    
    // Fetch trending designs with scoring
    const designs = await Design.aggregate([
      { $match: baseQuery },
      {
        $addFields: {
          // Calculate trending score
          trendingScore: {
            $add: [
              { $cond: [{ $eq: ['$isTrending', true] }, 1000, 0] }, // Platform trending bonus
              { $multiply: ['$stats.likes', 0.5] }, // Likes weight
              { $multiply: ['$stats.views', 0.01] }, // Views weight  
              { $multiply: ['$stats.saves', 2] }, // Saves weight (higher value)
              {
                // Recency bonus (designs published within timeframe get extra points)
                $cond: [
                  { $gte: ['$publishedAt', dateThreshold] },
                  {
                    $multiply: [
                      100,
                      {
                        $divide: [
                          { $subtract: ['$publishedAt', dateThreshold] },
                          { $subtract: [new Date(), dateThreshold] }
                        ]
                      }
                    ]
                  },
                  0
                ]
              }
            ]
          }
        }
      },
      { $sort: { trendingScore: -1, createdAt: -1 } },
      { $limit: limit },
      { $project: { __v: 0, trendingScore: 0 } }
    ]);
    
    // Get category breakdown of trending designs
    const categoryBreakdown = await Design.aggregate([
      { $match: baseQuery },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Format category breakdown
    const categories = categoryBreakdown.reduce((acc, item) => {
      acc[item._id] = {
        label: CATEGORY_LABELS[item._id] || item._id,
        count: item.count
      };
      return acc;
    }, {});
    
    // Get trending stats
    const stats = {
      totalTrending: designs.length,
      timeframe,
      dateThreshold: dateThreshold.toISOString(),
      topCategories: categoryBreakdown.slice(0, 3).map(cat => ({
        category: cat._id,
        label: CATEGORY_LABELS[cat._id] || cat._id,
        count: cat.count
      }))
    };
    
    // Calculate average engagement for trending designs
    if (designs.length > 0) {
      const totalLikes = designs.reduce((sum, d) => sum + (d.stats?.likes || 0), 0);
      const totalViews = designs.reduce((sum, d) => sum + (d.stats?.views || 0), 0);
      const totalSaves = designs.reduce((sum, d) => sum + (d.stats?.saves || 0), 0);
      
      stats.averageEngagement = {
        likes: Math.round(totalLikes / designs.length),
        views: Math.round(totalViews / designs.length),
        saves: Math.round(totalSaves / designs.length)
      };
    }
    
    // Prepare response
    const responseData = {
      designs,
      stats,
      categories,
      filters: {
        currentCategory: category || DESIGN_CATEGORIES.ALL,
        timeframe,
        limit
      }
    };
    
    // Cache response
    // Shorter cache for daily trending (15 minutes), longer for weekly/monthly (1 hour)
    const cacheTTL = timeframe === 'day' ? 900000 : 3600000;
    cache.set(cacheKey, responseData, cacheTTL);
    
    logger.info('Trending designs fetched successfully', {
      count: designs.length,
      timeframe,
      category: category || 'all',
      duration: Date.now() - startTime
    });
    
    return apiResponse(responseData);
    
  } catch (error) {
    logger.error('Error fetching trending designs', error);
    
    if (error.name === 'MongoError' || error.name === 'MongooseError') {
      return apiError('Database error occurred', 500);
    }
    
    return apiError('Failed to fetch trending designs', 500);
  }
}

/**
 * POST /api/eyecandy/trending
 * Mark designs as trending (admin only - not implemented)
 */
export async function POST(request) {
  try {
    logger.warn('POST endpoint called but not implemented');
    return apiError('This endpoint is not available', 405);
  } catch (error) {
    logger.error('Error in POST handler', error);
    return apiError('Internal server error', 500);
  }
}

/**
 * PUT /api/eyecandy/trending
 * Update trending algorithm parameters (admin only - not implemented)
 */
export async function PUT(request) {
  try {
    logger.warn('PUT endpoint called but not implemented');
    return apiError('This endpoint is not available', 405);
  } catch (error) {
    logger.error('Error in PUT handler', error);
    return apiError('Internal server error', 500);
  }
}