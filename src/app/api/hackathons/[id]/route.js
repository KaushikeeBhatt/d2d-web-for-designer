/**
 * Hackathon Detail API Route
 * Handles GET, PUT, and DELETE operations for individual hackathons
 * Path: /api/hackathons/[id]
 */

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Hackathon from '@/lib/db/models/Hackathon';
import Bookmark from '@/lib/db/models/Bookmark';
import { apiResponse, apiError } from '@/lib/utils/apiResponse';
import { Logger } from '@/lib/utils/logger';
import { hackathonSchema } from '@/lib/utils/validators';
import { auth } from '@/auth';
import { cache } from '@/lib/utils/cache';

const logger = new Logger('API:Hackathons:Detail');

/**
 * GET /api/hackathons/[id]
 * Retrieve a single hackathon by ID
 * @param {Request} request - Next.js request object
 * @param {Object} context - Route context with params
 * @returns {Promise<NextResponse>} Hackathon data or error
 */
export async function GET(request, { params }) {
  const startTime = Date.now();
  const { id } = params;

  try {
    logger.info(`Fetching hackathon with ID: ${id}`);

    // Validate MongoDB ObjectId format
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      logger.warn(`Invalid hackathon ID format: ${id}`);
      return apiError('Invalid hackathon ID format', 400);
    }

    // Check cache first
    const cacheKey = `hackathon:${id}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      logger.info(`Cache hit for hackathon ${id}`);
      return apiResponse(cachedData);
    }

    // Connect to database
    await connectDB();

    // Find hackathon by ID
    const hackathon = await Hackathon.findById(id).lean();

    if (!hackathon) {
      logger.warn(`Hackathon not found: ${id}`);
      return apiError('Hackathon not found', 404);
    }

    // Get authenticated user
    const session = await auth();
    let isBookmarked = false;

    // Check if user has bookmarked this hackathon
    if (session?.user?.id) {
      const bookmark = await Bookmark.findOne({
        userId: session.user.id,
        hackathonId: id
      });
      isBookmarked = !!bookmark;
    }

    // Add computed fields
    const enrichedHackathon = {
      ...hackathon,
      isExpired: hackathon.deadline && new Date(hackathon.deadline) < new Date(),
      isBookmarked,
      _id: hackathon._id.toString() // Ensure ID is string
    };

    // Cache the result
    cache.set(cacheKey, enrichedHackathon, 300000); // 5 minutes

    logger.info(`Successfully fetched hackathon ${id} in ${Date.now() - startTime}ms`);
    return apiResponse(enrichedHackathon);

  } catch (error) {
    logger.error(`Error fetching hackathon ${id}:`, error);
    return apiError('Failed to fetch hackathon', 500, {
      error: error.message,
      id
    });
  }
}

/**
 * PUT /api/hackathons/[id]
 * Update a hackathon (admin only)
 * @param {Request} request - Next.js request object
 * @param {Object} context - Route context with params
 * @returns {Promise<NextResponse>} Updated hackathon or error
 */
export async function PUT(request, { params }) {
  const startTime = Date.now();
  const { id } = params;

  try {
    logger.info(`Updating hackathon with ID: ${id}`);

    // Validate MongoDB ObjectId format
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      logger.warn(`Invalid hackathon ID format: ${id}`);
      return apiError('Invalid hackathon ID format', 400);
    }

    // Check authentication (admin only for now)
    const session = await auth();
    if (!session?.user) {
      logger.warn('Unauthorized update attempt');
      return apiError('Authentication required', 401);
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      logger.error('Failed to parse request body:', parseError);
      return apiError('Invalid request body', 400);
    }

    // Validate update data
    const validationResult = hackathonSchema.partial().safeParse(body);
    if (!validationResult.success) {
      logger.warn('Validation failed:', validationResult.error);
      return apiError('Validation failed', 400, validationResult.error.flatten());
    }

    // Connect to database
    await connectDB();

    // Check if hackathon exists
    const existingHackathon = await Hackathon.findById(id);
    if (!existingHackathon) {
      logger.warn(`Hackathon not found for update: ${id}`);
      return apiError('Hackathon not found', 404);
    }

    // Update hackathon
    const updatedHackathon = await Hackathon.findByIdAndUpdate(
      id,
      {
        ...validationResult.data,
        updatedAt: new Date()
      },
      { 
        new: true, // Return updated document
        runValidators: true // Run model validators
      }
    ).lean();

    // Clear cache
    cache.delete(`hackathon:${id}`);
    cache.delete('hackathons:*'); // Clear list caches

    logger.info(`Successfully updated hackathon ${id} in ${Date.now() - startTime}ms`);
    return apiResponse({
      ...updatedHackathon,
      _id: updatedHackathon._id.toString()
    });

  } catch (error) {
    logger.error(`Error updating hackathon ${id}:`, error);
    return apiError('Failed to update hackathon', 500, {
      error: error.message,
      id
    });
  }
}

/**
 * DELETE /api/hackathons/[id]
 * Delete a hackathon and its associated bookmarks (admin only)
 * @param {Request} request - Next.js request object
 * @param {Object} context - Route context with params
 * @returns {Promise<NextResponse>} Success message or error
 */
export async function DELETE(request, { params }) {
  const startTime = Date.now();
  const { id } = params;

  try {
    logger.info(`Deleting hackathon with ID: ${id}`);

    // Validate MongoDB ObjectId format
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      logger.warn(`Invalid hackathon ID format: ${id}`);
      return apiError('Invalid hackathon ID format', 400);
    }

    // Check authentication (admin only)
    const session = await auth();
    if (!session?.user) {
      logger.warn('Unauthorized delete attempt');
      return apiError('Authentication required', 401);
    }

    // Connect to database
    await connectDB();

    // Start a session for transaction
    const dbSession = await Hackathon.startSession();
    
    try {
      await dbSession.withTransaction(async () => {
        // Check if hackathon exists
        const hackathon = await Hackathon.findById(id).session(dbSession);
        if (!hackathon) {
          throw new Error('Hackathon not found');
        }

        // Delete all associated bookmarks
        const bookmarkResult = await Bookmark.deleteMany(
          { hackathonId: id },
          { session: dbSession }
        );
        logger.info(`Deleted ${bookmarkResult.deletedCount} associated bookmarks`);

        // Delete the hackathon
        await Hackathon.findByIdAndDelete(id).session(dbSession);
      });

      // Clear cache
      cache.delete(`hackathon:${id}`);
      cache.delete('hackathons:*'); // Clear list caches

      logger.info(`Successfully deleted hackathon ${id} in ${Date.now() - startTime}ms`);
      return apiResponse({ 
        message: 'Hackathon deleted successfully',
        id 
      });

    } finally {
      await dbSession.endSession();
    }

  } catch (error) {
    logger.error(`Error deleting hackathon ${id}:`, error);
    
    if (error.message === 'Hackathon not found') {
      return apiError('Hackathon not found', 404);
    }
    
    return apiError('Failed to delete hackathon', 500, {
      error: error.message,
      id
    });
  }
}