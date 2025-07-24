/**
 * Hackathons API Routes
 * GET /api/hackathons - Get all hackathons with filters
 * POST /api/hackathons - Create a new hackathon (admin only)
 */

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Hackathon from '@/lib/db/models/Hackathon';
import Bookmark from '@/lib/db/models/Bookmark';
import { auth } from '@/auth';
import { apiResponse, apiError, apiValidationError } from '@/lib/utils/apiResponse';
import { hackathonSchema, searchParamsSchema } from '@/lib/utils/validators';
import { Logger } from '@/lib/utils/logger';
import { cache } from '@/lib/utils/cache';

const logger = new Logger('HackathonsAPI');

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_KEY_PREFIX = 'hackathons:';

/**
 * Build MongoDB query from search parameters
 * @param {Object} params - Validated search parameters
 * @returns {Object} MongoDB query object
 */
function buildQuery(params) {
  const query = { isActive: true };
  
  // Text search
  if (params.q) {
    query.$text = { $search: params.q };
  }
  
  // Platform filter
  if (params.platform) {
    query.platform = params.platform;
  }
  
  // Category/tag filter
  if (params.category) {
    query.tags = { $in: [params.category] };
  }
  
  // Deadline filter - only show upcoming hackathons
  if (params.upcoming === 'true') {
    query.deadline = { $gte: new Date() };
  }
  
  return query;
}

/**
 * Build sort object from sort parameter
 * @param {string} sort - Sort parameter
 * @returns {Object} MongoDB sort object
 */
function buildSort(sort) {
  switch (sort) {
    case 'deadline':
      return { deadline: 1 }; // Nearest deadline first
    case 'newest':
      return { createdAt: -1 };
    case 'popular':
      return { participants: -1 };
    default:
      return { createdAt: -1 };
  }
}

/**
 * GET /api/hackathons
 * Retrieve hackathons with pagination and filters
 */
export async function GET(request) {
  try {
    const startTime = Date.now();
    
    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const rawParams = Object.fromEntries(searchParams);
    
    // Validate parameters
    const validation = searchParamsSchema.safeParse(rawParams);
    if (!validation.success) {
      logger.warn('Invalid search parameters', validation.error.errors);
      return apiValidationError(validation.error.errors);
    }
    
    const params = validation.data;
    
    // Check cache first
    const cacheKey = `${CACHE_KEY_PREFIX}${JSON.stringify(params)}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      logger.info('Returning cached hackathons', { 
        cacheKey, 
        count: cachedData.hackathons.length 
      });
      return apiResponse(cachedData);
    }
    
    // Connect to database
    await connectDB();
    
    // Get authenticated user (optional)
    const session = await auth();
    const userId = session?.user?.id;
    
    // Build query and sort
    const query = buildQuery(params);
    const sort = buildSort(params.sort);
    
    // Calculate pagination
    const skip = (params.page - 1) * params.limit;
    
    // Execute query with pagination
    const [hackathons, totalCount] = await Promise.all([
      Hackathon.find(query)
        .sort(sort)
        .skip(skip)
        .limit(params.limit)
        .lean(),
      Hackathon.countDocuments(query)
    ]);
    
    // If user is authenticated, get their bookmarks
    let userBookmarks = new Set();
    if (userId) {
      const bookmarks = await Bookmark.find({ userId })
        .select('hackathonId')
        .lean();
      
      userBookmarks = new Set(
        bookmarks.map(b => b.hackathonId.toString())
      );
    }
    
    // Process hackathons
    const processedHackathons = hackathons.map(hackathon => ({
      ...hackathon,
      _id: hackathon._id.toString(),
      isBookmarked: userId ? userBookmarks.has(hackathon._id.toString()) : false,
      isExpired: hackathon.deadline ? new Date(hackathon.deadline) < new Date() : false,
      daysUntilDeadline: hackathon.deadline
        ? Math.ceil((new Date(hackathon.deadline) - new Date()) / (1000 * 60 * 60 * 24))
        : null
    }));
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / params.limit);
    const hasNextPage = params.page < totalPages;
    const hasPrevPage = params.page > 1;
    
    // Prepare response data
    const responseData = {
      hackathons: processedHackathons,
      pagination: {
        page: params.page,
        limit: params.limit,
        total: totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage
      },
      filters: {
        query: params.q || null,
        platform: params.platform || null,
        category: params.category || null,
        sort: params.sort || 'newest'
      },
      queryTime: Date.now() - startTime
    };
    
    // Cache the response
    cache.set(cacheKey, responseData, CACHE_TTL);
    
    // Log successful query
    logger.info('Hackathons retrieved successfully', {
      count: processedHackathons.length,
      total: totalCount,
      page: params.page,
      queryTime: responseData.queryTime,
      userId
    });
    
    return apiResponse(responseData);
  } catch (error) {
    logger.error('Error retrieving hackathons', error);
    
    // Check for specific error types
    if (error.name === 'MongoNetworkError') {
      return apiError('Database connection error', 503);
    }
    
    return apiError(
      'Failed to retrieve hackathons',
      500,
      process.env.NODE_ENV === 'development' ? error.stack : undefined
    );
  }
}

/**
 * POST /api/hackathons
 * Create a new hackathon (admin only)
 */
export async function POST(request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return apiError('Authentication required', 401);
    }
    
    // For now, any authenticated user can submit hackathons
    // In production, you might want to check for admin role
    // if (!session.user.isAdmin) {
    //   return apiError('Admin access required', 403);
    // }
    
    // Parse request body
    const body = await request.json();
    
    // Validate hackathon data
    const validation = hackathonSchema.safeParse(body);
    if (!validation.success) {
      logger.warn('Invalid hackathon data', validation.error.errors);
      return apiValidationError(validation.error.errors);
    }
    
    const hackathonData = validation.data;
    
    // Connect to database
    await connectDB();
    
    // Check if hackathon already exists
    const existing = await Hackathon.findOne({
      platform: hackathonData.platform,
      sourceId: hackathonData.sourceId
    });
    
    if (existing) {
      logger.warn('Duplicate hackathon submission', {
        platform: hackathonData.platform,
        sourceId: hackathonData.sourceId
      });
      return apiError('Hackathon already exists', 409);
    }
    
    // Create new hackathon
    const newHackathon = new Hackathon({
      ...hackathonData,
      submittedBy: session.user.id,
      isActive: true,
      lastScraped: new Date()
    });
    
    // Save to database
    await newHackathon.save();
    
    // Clear cache to reflect new hackathon
    cache.clear();
    
    // Log successful creation
    logger.info('New hackathon created', {
      id: newHackathon._id,
      title: newHackathon.title,
      platform: newHackathon.platform,
      submittedBy: session.user.email
    });
    
    // Return created hackathon
    return apiResponse(
      {
        hackathon: newHackathon.toObject(),
        message: 'Hackathon created successfully'
      },
      201
    );
  } catch (error) {
    logger.error('Error creating hackathon', error);
    
    // Check for validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => ({
        field: e.path,
        message: e.message
      }));
      return apiValidationError(errors);
    }
    
    // Check for duplicate key error
    if (error.code === 11000) {
      return apiError('Hackathon with this ID already exists', 409);
    }
    
    return apiError(
      'Failed to create hackathon',
      500,
      process.env.NODE_ENV === 'development' ? error.stack : undefined
    );
  }
}