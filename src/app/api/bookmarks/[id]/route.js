/**
 * Individual Bookmark API Route
 * Handles DELETE operations for specific bookmarks
 * Path: /api/bookmarks/[id]
 */

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Bookmark from '@/lib/db/models/Bookmark';
import User from '@/lib/db/models/User';
import { apiResponse, apiError } from '@/lib/utils/apiResponse';
import { Logger } from '@/lib/utils/logger';
import { withAuth } from '@/lib/middleware/withAuth';
import { cache } from '@/lib/utils/cache';

const logger = new Logger('API:Bookmarks:Detail');

/**
 * DELETE /api/bookmarks/[id]
 * Delete a bookmark for the authenticated user
 * Protected route - requires authentication
 * @param {Request} request - Next.js request object with session
 * @param {Object} context - Route context with params
 * @returns {Promise<NextResponse>} Success message or error
 */
async function handleDELETE(request, { params }) {
  const startTime = Date.now();
  const { id } = params;
  const userId = request.session.user.id;

  try {
    logger.info(`Deleting bookmark ${id} for user ${userId}`);

    // Validate bookmark ID format
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      logger.warn(`Invalid bookmark ID format: ${id}`);
      return apiError('Invalid bookmark ID format', 400);
    }

    // Connect to database
    await connectDB();

    // Start a session for transaction
    const session = await Bookmark.startSession();
    
    try {
      let deletedBookmark;
      
      await session.withTransaction(async () => {
        // Find bookmark and verify ownership
        const bookmark = await Bookmark.findById(id).session(session);
        
        if (!bookmark) {
          throw new Error('Bookmark not found');
        }

        // Verify the bookmark belongs to the authenticated user
        if (bookmark.userId.toString() !== userId) {
          throw new Error('Unauthorized to delete this bookmark');
        }

        // Delete the bookmark
        deletedBookmark = await Bookmark.findByIdAndDelete(id).session(session);

        // Update user stats
        await User.findByIdAndUpdate(
          userId,
          { 
            $inc: { 'stats.totalBookmarks': -1 },
            'stats.lastActive': new Date()
          },
          { session }
        );
      });

      // Clear user's bookmark cache
      cache.delete(`bookmarks:${userId}:*`);

      logger.info(`Successfully deleted bookmark ${id} for user ${userId} in ${Date.now() - startTime}ms`);
      return apiResponse({
        message: 'Bookmark deleted successfully',
        bookmarkId: id
      });

    } catch (error) {
      if (error.message === 'Bookmark not found') {
        return apiError('Bookmark not found', 404);
      }
      if (error.message === 'Unauthorized to delete this bookmark') {
        return apiError('Unauthorized to delete this bookmark', 403);
      }
      throw error;
    } finally {
      await session.endSession();
    }

  } catch (error) {
    logger.error(`Error deleting bookmark ${id}:`, error);
    return apiError('Failed to delete bookmark', 500, {
      error: error.message,
      bookmarkId: id
    });
  }
}

/**
 * PATCH /api/bookmarks/[id]
 * Update a bookmark (notes, tags, reminder)
 * Protected route - requires authentication
 * @param {Request} request - Next.js request object with session
 * @param {Object} context - Route context with params
 * @returns {Promise<NextResponse>} Updated bookmark or error
 */
async function handlePATCH(request, { params }) {
  const startTime = Date.now();
  const { id } = params;
  const userId = request.session.user.id;

  try {
    logger.info(`Updating bookmark ${id} for user ${userId}`);

    // Validate bookmark ID format
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      logger.warn(`Invalid bookmark ID format: ${id}`);
      return apiError('Invalid bookmark ID format', 400);
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      logger.error('Failed to parse request body:', parseError);
      return apiError('Invalid request body', 400);
    }

    // Validate update fields
    const allowedFields = ['notes', 'tags', 'reminder'];
    const updates = {};
    
    for (const field of allowedFields) {
      if (field in body) {
        if (field === 'notes' && typeof body.notes === 'string' && body.notes.length <= 500) {
          updates.notes = body.notes;
        } else if (field === 'tags' && Array.isArray(body.tags)) {
          updates.tags = body.tags.filter(tag => typeof tag === 'string').slice(0, 10);
        } else if (field === 'reminder' && body.reminder) {
          const reminderDate = new Date(body.reminder);
          if (!isNaN(reminderDate.getTime()) && reminderDate > new Date()) {
            updates.reminder = reminderDate;
          }
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      logger.warn('No valid fields to update');
      return apiError('No valid fields to update', 400);
    }

    // Connect to database
    await connectDB();

    // Find bookmark and verify ownership
    const bookmark = await Bookmark.findById(id);
    
    if (!bookmark) {
      logger.warn(`Bookmark not found: ${id}`);
      return apiError('Bookmark not found', 404);
    }

    // Verify the bookmark belongs to the authenticated user
    if (bookmark.userId.toString() !== userId) {
      logger.warn(`Unauthorized update attempt for bookmark ${id} by user ${userId}`);
      return apiError('Unauthorized to update this bookmark', 403);
    }

    // Update bookmark
    const updatedBookmark = await Bookmark.findByIdAndUpdate(
      id,
      {
        ...updates,
        updatedAt: new Date()
      },
      { 
        new: true,
        runValidators: true
      }
    )
    .populate('hackathonId', 'title description url platform deadline imageUrl')
    .lean();

    // Clear user's bookmark cache
    cache.delete(`bookmarks:${userId}:*`);

    const responseData = {
      _id: updatedBookmark._id.toString(),
      hackathon: {
        ...updatedBookmark.hackathonId,
        _id: updatedBookmark.hackathonId._id.toString()
      },
      notes: updatedBookmark.notes,
      tags: updatedBookmark.tags,
      reminder: updatedBookmark.reminder,
      updatedAt: updatedBookmark.updatedAt
    };

    logger.info(`Successfully updated bookmark ${id} for user ${userId} in ${Date.now() - startTime}ms`);
    return apiResponse(responseData);

  } catch (error) {
    logger.error(`Error updating bookmark ${id}:`, error);
    return apiError('Failed to update bookmark', 500, {
      error: error.message,
      bookmarkId: id
    });
  }
}

// Export authenticated handlers
export const DELETE = withAuth(handleDELETE);
export const PATCH = withAuth(handlePATCH);