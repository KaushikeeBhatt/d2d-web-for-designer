/**
 * Bookmarks API Route
 * Handles GET (list user bookmarks) and POST (create bookmark) operations
 * Path: /api/bookmarks
 */

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Bookmark from '@/lib/db/models/Bookmark';
import Hackathon from '@/lib/db/models/Hackathon';
import User from '@/lib/db/models/User';
import { apiResponse, apiError } from '@/lib/utils/apiResponse';
import { Logger } from '@/lib/utils/logger';
import { bookmarkSchema, searchParamsSchema } from '@/lib/utils/validators';
import { withAuth } from '@/lib/middleware/withAuth';
import { cache } from '@/lib/utils/cache';

const logger = new Logger('API:Bookmarks');

/**
 * GET /api/bookmarks
 * Get all bookmarks for the authenticated user
 * Protected route - requires authentication
 * @param {Request} request - Next.js request object with session
 * @returns {Promise<NextResponse>} User's bookmarks or error
 */
async function handleGET(request) {
  const startTime = Date.now();
  const userId = request.session.user.id;

  try {
    logger.info(`Fetching bookmarks for user: ${userId}`);

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const params = {
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
      sort: searchParams.get('sort') || 'newest',
      q: searchParams.get('q') || ''
    };

    const validationResult = searchParamsSchema.safeParse(params);
    if (!validationResult.success) {
      logger.warn('Invalid query parameters:', validationResult.error);
      return apiError('Invalid query parameters', 400, validationResult.error.flatten());
    }

    const { page, limit, sort, q } = validationResult.data;
    const skip = (page - 1) * limit;

    // Check cache
    const cacheKey = `bookmarks:${userId}:${page}:${limit}:${sort}:${q}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      logger.info(`Cache hit for user ${userId} bookmarks`);
      return apiResponse(cachedData);
    }

    // Connect to database
    await connectDB();

    // Build query
    const query = { userId };

    // Build sort options
    let sortOptions = {};
    switch (sort) {
      case 'oldest':
        sortOptions = { createdAt: 1 };
        break;
      case 'deadline':
        sortOptions = { 'hackathon.deadline': 1 };
        break;
      case 'newest':
      default:
        sortOptions = { createdAt: -1 };
    }

    // Get total count for pagination
    const totalCount = await Bookmark.countDocuments(query);

    // Fetch bookmarks with populated hackathon data
    const bookmarks = await Bookmark.find(query)
      .populate({
        path: 'hackathonId',
        model: 'Hackathon',
        match: q ? { 
          $or: [
            { title: { $regex: q, $options: 'i' } },
            { description: { $regex: q, $options: 'i' } }
          ]
        } : {},
        select: 'title description url platform deadline startDate endDate imageUrl tags isActive'
      })
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();

    // Filter out bookmarks where hackathon doesn't match search
    const filteredBookmarks = bookmarks.filter(bookmark => bookmark.hackathonId);

    // Transform bookmarks for response
    const transformedBookmarks = filteredBookmarks.map(bookmark => ({
      _id: bookmark._id.toString(),
      hackathon: {
        ...bookmark.hackathonId,
        _id: bookmark.hackathonId._id.toString(),
        isExpired: bookmark.hackathonId.deadline && new Date(bookmark.hackathonId.deadline) < new Date()
      },
      notes: bookmark.notes,
      tags: bookmark.tags,
      reminder: bookmark.reminder,
      createdAt: bookmark.createdAt,
      updatedAt: bookmark.updatedAt
    }));

    // Prepare pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    const responseData = {
      bookmarks: transformedBookmarks,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    };

    // Cache the result
    cache.set(cacheKey, responseData, 60000); // 1 minute

    logger.info(`Successfully fetched ${transformedBookmarks.length} bookmarks for user ${userId} in ${Date.now() - startTime}ms`);
    return apiResponse(responseData);

  } catch (error) {
    logger.error(`Error fetching bookmarks for user ${userId}:`, error);
    return apiError('Failed to fetch bookmarks', 500, {
      error: error.message
    });
  }
}

/**
 * POST /api/bookmarks
 * Create a new bookmark for the authenticated user
 * Protected route - requires authentication
 * @param {Request} request - Next.js request object with session
 * @returns {Promise<NextResponse>} Created bookmark or error
 */
async function handlePOST(request) {
  const startTime = Date.now();
  const userId = request.session.user.id;

  try {
    logger.info(`Creating bookmark for user: ${userId}`);

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      logger.error('Failed to parse request body:', parseError);
      return apiError('Invalid request body', 400);
    }

    // Validate bookmark data
    const validationResult = bookmarkSchema.safeParse(body);
    if (!validationResult.success) {
      logger.warn('Bookmark validation failed:', validationResult.error);
      return apiError('Validation failed', 400, validationResult.error.flatten());
    }

    const { hackathonId, notes } = validationResult.data;

    // Validate hackathon ID format
    if (!hackathonId || !/^[0-9a-fA-F]{24}$/.test(hackathonId)) {
      logger.warn(`Invalid hackathon ID format: ${hackathonId}`);
      return apiError('Invalid hackathon ID format', 400);
    }

    // Connect to database
    await connectDB();

    // Start a session for transaction
    const session = await Bookmark.startSession();
    
    try {
      let newBookmark;
      
      await session.withTransaction(async () => {
        // Check if hackathon exists and is active
        const hackathon = await Hackathon.findById(hackathonId).session(session);
        if (!hackathon) {
          throw new Error('Hackathon not found');
        }

        if (!hackathon.isActive) {
          throw new Error('Cannot bookmark inactive hackathon');
        }

        // Check if bookmark already exists
        const existingBookmark = await Bookmark.findOne({
          userId,
          hackathonId
        }).session(session);

        if (existingBookmark) {
          throw new Error('Bookmark already exists');
        }

        // Create bookmark
        newBookmark = await Bookmark.create([{
          userId,
          hackathonId,
          notes,
          createdAt: new Date()
        }], { session });

        // Update user stats
        await User.findByIdAndUpdate(
          userId,
          { 
            $inc: { 'stats.totalBookmarks': 1 },
            'stats.lastActive': new Date()
          },
          { session }
        );
      });

      // Populate hackathon data
      const populatedBookmark = await Bookmark.findById(newBookmark[0]._id)
        .populate('hackathonId', 'title description url platform deadline imageUrl')
        .lean();

      // Clear user's bookmark cache
      cache.delete(`bookmarks:${userId}:*`);

      const responseData = {
        _id: populatedBookmark._id.toString(),
        hackathon: {
          ...populatedBookmark.hackathonId,
          _id: populatedBookmark.hackathonId._id.toString()
        },
        notes: populatedBookmark.notes,
        createdAt: populatedBookmark.createdAt
      };

      logger.info(`Successfully created bookmark for user ${userId} in ${Date.now() - startTime}ms`);
      return apiResponse(responseData, 201);

    } catch (error) {
      if (error.message === 'Hackathon not found') {
        return apiError('Hackathon not found', 404);
      }
      if (error.message === 'Cannot bookmark inactive hackathon') {
        return apiError('Cannot bookmark inactive hackathon', 400);
      }
      if (error.message === 'Bookmark already exists') {
        return apiError('Bookmark already exists', 409);
      }
      throw error;
    } finally {
      await session.endSession();
    }

  } catch (error) {
    logger.error(`Error creating bookmark for user ${userId}:`, error);
    return apiError('Failed to create bookmark', 500, {
      error: error.message
    });
  }
}

// Export authenticated handlers
export const GET = withAuth(handleGET);
export const POST = withAuth(handlePOST);