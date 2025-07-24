import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Design from '@/lib/db/models/Design';
import { apiResponse, apiError, apiValidationError } from '@/lib/utils/apiResponse';
import { cache } from '@/lib/utils/cache';
import { searchParamsSchema } from '@/lib/utils/validators';
import { Logger } from '@/lib/utils/logger';
import { DESIGN_CATEGORIES, CATEGORY_LABELS } from '@/lib/scrapers/designs/categories';

const logger = new Logger('API:EyeCandy');

/**
 * GET /api/eyecandy
 * Fetch all designs with filters, pagination, and sorting
 * 
 * Query params:
 * - q: search query (searches title and description)
 * - category: filter by category
 * - source: filter by source platform (behance, dribbble, etc.)
 * - sort: sorting option (newest, popular, trending)
 * - page: page number (default: 1)
 * - limit: items per page (default: 20, max: 100)
 */
export async function GET(request) {
  const startTime = Date.now();
  
  try {
    logger.info('Fetching designs', { url: request.url });
    
    // Connect to database
    await connectDB();
    
    // Parse and validate query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const validationResult = searchParamsSchema.safeParse(searchParams);
    
    if (!validationResult.success) {
      logger.warn('Invalid query parameters', validationResult.error);
      return apiValidationError(validationResult.error.errors);
    }
    
    const { q, category, sort = 'newest', page = 1, limit = 20 } = validationResult.data;
    const source = searchParams.source; // Not in the schema but valid param
    
    // Generate cache key for this specific query
    const cacheKey = `designs:${JSON.stringify({ q, category, source, sort, page, limit })}`;
    
    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      logger.info('Returning cached designs', { 
        cacheKey, 
        duration: Date.now() - startTime 
      });
      return apiResponse(cachedData);
    }
    
    // Build MongoDB query
    const query = {};
    
    // Search filter
    if (q && q.trim()) {
      query.$text = { $search: q };
    }
    
    // Category filter
    if (category && category !== DESIGN_CATEGORIES.ALL) {
      if (!Object.values(DESIGN_CATEGORIES).includes(category)) {
        logger.warn('Invalid category requested', { category });
        return apiError('Invalid category', 400);
      }
      query.category = category;
    }
    
    // Source filter
    if (source) {
      const validSources = ['behance', 'dribbble', 'awwwards', 'designspiration'];
      if (!validSources.includes(source)) {
        logger.warn('Invalid source requested', { source });
        return apiError('Invalid source platform', 400);
      }
      query.source = source;
    }
    
    // Build sort options
    let sortOptions = {};
    switch (sort) {
      case 'popular':
        sortOptions = { 'stats.likes': -1, createdAt: -1 };
        break;
      case 'trending':
        sortOptions = { isTrending: -1, 'stats.likes': -1, createdAt: -1 };
        break;
      case 'newest':
      default:
        sortOptions = { createdAt: -1 };
        break;
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Execute queries in parallel for better performance
    const [designs, totalCount] = await Promise.all([
      Design.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .select('-__v')
        .lean(),
      Design.countDocuments(query)
    ]);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    // Get category counts for filters (cached separately)
    const categoryCacheKey = 'designs:categoryStats';
    let categoryStats = cache.get(categoryCacheKey);
    
    if (!categoryStats) {
      try {
        categoryStats = await Design.aggregate([
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]);
        
        // Cache category stats for 30 minutes
        cache.set(categoryCacheKey, categoryStats, 1800000);
      } catch (error) {
        logger.error('Failed to get category stats', error);
        categoryStats = [];
      }
    }
    
    // Format category stats
    const categories = categoryStats.reduce((acc, stat) => {
      acc[stat._id] = {
        label: CATEGORY_LABELS[stat._id] || stat._id,
        count: stat.count
      };
      return acc;
    }, {});
    
    // Prepare response data
    const responseData = {
      designs,
      pagination: {
        page,
        limit,
        totalPages,
        totalCount,
        hasNextPage,
        hasPrevPage
      },
      filters: {
        categories,
        currentCategory: category || DESIGN_CATEGORIES.ALL,
        currentSource: source || null,
        currentSort: sort
      }
    };
    
    // Cache the response for 5 minutes
    cache.set(cacheKey, responseData, 300000);
    
    logger.info('Designs fetched successfully', {
      count: designs.length,
      totalCount,
      page,
      duration: Date.now() - startTime
    });
    
    return apiResponse(responseData);
    
  } catch (error) {
    logger.error('Error fetching designs', error);
    
    if (error.name === 'MongoError' || error.name === 'MongooseError') {
      return apiError('Database error occurred', 500);
    }
    
    return apiError('Failed to fetch designs', 500);
  }
}

/**
 * POST /api/eyecandy
 * Create a new design (admin only - not implemented yet)
 * This endpoint would be used by scrapers or admin UI
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