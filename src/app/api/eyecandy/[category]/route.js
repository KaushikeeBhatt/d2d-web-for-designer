import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Design from '@/lib/db/models/Design';
import { apiResponse, apiError } from '@/lib/utils/apiResponse';
import { cache } from '@/lib/utils/cache';
import { searchParamsSchema } from '@/lib/utils/validators';
import { Logger } from '@/lib/utils/logger';
import { DESIGN_CATEGORIES, CATEGORY_LABELS } from '@/lib/scrapers/designs/categories';

const logger = new Logger('API:EyeCandy:Category');

/**
 * GET /api/eyecandy/[category]
 * Fetch designs by specific category with pagination
 * 
 * Route params:
 * - category: category slug (e.g., 'ui-ux', 'illustrations')
 * 
 * Query params:
 * - q: search within category
 * - sort: sorting option (newest, popular)
 * - page: page number
 * - limit: items per page
 */
export async function GET(request, { params }) {
  const startTime = Date.now();
  
  try {
    const { category } = params;
    
    logger.info('Fetching designs by category', { category, url: request.url });
    
    // Validate category
    if (!category || !Object.values(DESIGN_CATEGORIES).includes(category)) {
      logger.warn('Invalid category requested', { category });
      return apiError('Invalid category', 400, {
        validCategories: Object.values(DESIGN_CATEGORIES)
      });
    }
    
    // Don't allow 'all' category here - use main endpoint for that
    if (category === DESIGN_CATEGORIES.ALL) {
      return apiError('Use /api/eyecandy for all designs', 400);
    }
    
    // Connect to database
    await connectDB();
    
    // Parse and validate query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const validationResult = searchParamsSchema.safeParse(searchParams);
    
    if (!validationResult.success) {
      logger.warn('Invalid query parameters', validationResult.error);
      return apiError('Invalid query parameters', 400, validationResult.error.errors);
    }
    
    const { q, sort = 'newest', page = 1, limit = 20 } = validationResult.data;
    
    // Generate cache key
    const cacheKey = `designs:category:${category}:${JSON.stringify({ q, sort, page, limit })}`;
    
    // Check cache
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      logger.info('Returning cached category designs', { 
        category,
        cacheKey, 
        duration: Date.now() - startTime 
      });
      return apiResponse(cachedData);
    }
    
    // Build query
    const query = { category };
    
    // Add search if provided
    if (q && q.trim()) {
      query.$text = { $search: q };
    }
    
    // Build sort options
    let sortOptions = {};
    switch (sort) {
      case 'popular':
        sortOptions = { 'stats.likes': -1, createdAt: -1 };
        break;
      case 'newest':
      default:
        sortOptions = { createdAt: -1 };
        break;
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Execute queries
    const [designs, totalCount] = await Promise.all([
      Design.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .select('-__v')
        .lean(),
      Design.countDocuments(query)
    ]);
    
    // Get related stats for this category
    const [trendingCount, recentCount] = await Promise.all([
      Design.countDocuments({ category, isTrending: true }),
      Design.countDocuments({ 
        category, 
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
      })
    ]);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    // Get top tags for this category (cached)
    const tagsCacheKey = `designs:category:${category}:tags`;
    let topTags = cache.get(tagsCacheKey);
    
    if (!topTags) {
      try {
        const tagAggregation = await Design.aggregate([
          { $match: { category } },
          { $unwind: '$tags' },
          { $group: { _id: '$tags', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]);
        
        topTags = tagAggregation.map(tag => ({
          name: tag._id,
          count: tag.count
        }));
        
        // Cache tags for 1 hour
        cache.set(tagsCacheKey, topTags, 3600000);
      } catch (error) {
        logger.error('Failed to get top tags', error);
        topTags = [];
      }
    }
    
    // Prepare response
    const responseData = {
      category: {
        slug: category,
        label: CATEGORY_LABELS[category],
        totalDesigns: totalCount,
        trendingCount,
        recentCount
      },
      designs,
      pagination: {
        page,
        limit,
        totalPages,
        totalCount,
        hasNextPage,
        hasPrevPage
      },
      topTags,
      sort
    };
    
    // Cache response for 5 minutes
    cache.set(cacheKey, responseData, 300000);
    
    logger.info('Category designs fetched successfully', {
      category,
      count: designs.length,
      totalCount,
      page,
      duration: Date.now() - startTime
    });
    
    return apiResponse(responseData);
    
  } catch (error) {
    logger.error('Error fetching category designs', error);
    
    if (error.name === 'MongoError' || error.name === 'MongooseError') {
      return apiError('Database error occurred', 500);
    }
    
    return apiError('Failed to fetch designs', 500);
  }
}

/**
 * PUT /api/eyecandy/[category]
 * Update category metadata (admin only - not implemented)
 */
export async function PUT(request, { params }) {
  try {
    logger.warn('PUT endpoint called but not implemented');
    return apiError('This endpoint is not available', 405);
  } catch (error) {
    logger.error('Error in PUT handler', error);
    return apiError('Internal server error', 500);
  }
}

/**
 * DELETE /api/eyecandy/[category]
 * Not allowed - categories are predefined
 */
export async function DELETE(request, { params }) {
  try {
    logger.warn('DELETE endpoint called - not allowed');
    return apiError('Categories cannot be deleted', 405);
  } catch (error) {
    logger.error('Error in DELETE handler', error);
    return apiError('Internal server error', 500);
  }
}