/**
 * Cleanup Job - Removes old and expired data from the database
 * Runs daily to maintain database performance and remove stale data
 */

import { connectDB } from '@/lib/db/mongodb';
import Hackathon from '@/lib/db/models/Hackathon';
import Design from '@/lib/db/models/Design';
import Bookmark from '@/lib/db/models/Bookmark';
import { Logger } from '@/lib/utils/logger';

const logger = new Logger('CleanupJob');

// Configuration constants
const HACKATHON_RETENTION_DAYS = 90; // Keep hackathons for 90 days after deadline
const DESIGN_RETENTION_DAYS = 60;    // Keep designs for 60 days
const EXPIRED_HACKATHON_GRACE_DAYS = 7; // Grace period after deadline

/**
 * Clean up expired hackathons
 * @returns {Promise<number>} Number of hackathons deleted
 */
async function cleanupExpiredHackathons() {
  try {
    logger.info('Starting expired hackathon cleanup');
    
    // Calculate cutoff date (deadline + grace period)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - EXPIRED_HACKATHON_GRACE_DAYS);
    
    // Find expired hackathons
    const expiredHackathons = await Hackathon.find({
      deadline: { $lt: cutoffDate },
      isActive: true
    }).select('_id title platform').lean();
    
    if (!expiredHackathons || expiredHackathons.length === 0) {
      logger.info('No expired hackathons found');
      return 0;
    }
    
    logger.info(`Found ${expiredHackathons.length} expired hackathons to process`);
    
    // Get hackathon IDs for bookmark cleanup
    const hackathonIds = expiredHackathons.map(h => h._id);
    
    // Delete associated bookmarks first
    const bookmarkResult = await Bookmark.deleteMany({
      hackathonId: { $in: hackathonIds }
    });
    
    logger.info(`Deleted ${bookmarkResult.deletedCount} associated bookmarks`);
    
    // Mark hackathons as inactive instead of deleting
    const updateResult = await Hackathon.updateMany(
      { _id: { $in: hackathonIds } },
      { 
        $set: { 
          isActive: false,
          updatedAt: new Date()
        } 
      }
    );
    
    logger.info(`Marked ${updateResult.modifiedCount} hackathons as inactive`);
    
    return updateResult.modifiedCount;
  } catch (error) {
    logger.error('Error cleaning up expired hackathons', error);
    throw error;
  }
}

/**
 * Clean up old inactive hackathons
 * @returns {Promise<number>} Number of hackathons deleted
 */
async function cleanupOldHackathons() {
  try {
    logger.info('Starting old hackathon cleanup');
    
    // Calculate retention cutoff date
    const retentionCutoff = new Date();
    retentionCutoff.setDate(retentionCutoff.getDate() - HACKATHON_RETENTION_DAYS);
    
    // Find old inactive hackathons
    const oldHackathons = await Hackathon.find({
      isActive: false,
      updatedAt: { $lt: retentionCutoff }
    }).select('_id title').lean();
    
    if (!oldHackathons || oldHackathons.length === 0) {
      logger.info('No old hackathons to delete');
      return 0;
    }
    
    logger.info(`Found ${oldHackathons.length} old hackathons to delete`);
    
    // Delete the hackathons
    const deleteResult = await Hackathon.deleteMany({
      _id: { $in: oldHackathons.map(h => h._id) }
    });
    
    logger.info(`Deleted ${deleteResult.deletedCount} old hackathons`);
    
    return deleteResult.deletedCount;
  } catch (error) {
    logger.error('Error cleaning up old hackathons', error);
    throw error;
  }
}

/**
 * Clean up old designs
 * @returns {Promise<number>} Number of designs deleted
 */
async function cleanupOldDesigns() {
  try {
    logger.info('Starting old design cleanup');
    
    // Calculate retention cutoff date
    const retentionCutoff = new Date();
    retentionCutoff.setDate(retentionCutoff.getDate() - DESIGN_RETENTION_DAYS);
    
    // Find old non-trending designs
    const oldDesigns = await Design.find({
      isTrending: false,
      createdAt: { $lt: retentionCutoff },
      'stats.saves': { $lt: 5 } // Keep designs with more saves
    }).select('_id title').lean();
    
    if (!oldDesigns || oldDesigns.length === 0) {
      logger.info('No old designs to delete');
      return 0;
    }
    
    logger.info(`Found ${oldDesigns.length} old designs to delete`);
    
    // Delete the designs
    const deleteResult = await Design.deleteMany({
      _id: { $in: oldDesigns.map(d => d._id) }
    });
    
    logger.info(`Deleted ${deleteResult.deletedCount} old designs`);
    
    return deleteResult.deletedCount;
  } catch (error) {
    logger.error('Error cleaning up old designs', error);
    throw error;
  }
}

/**
 * Clean up orphaned bookmarks
 * @returns {Promise<number>} Number of bookmarks deleted
 */
async function cleanupOrphanedBookmarks() {
  try {
    logger.info('Starting orphaned bookmark cleanup');
    
    // Find all bookmark hackathon IDs
    const bookmarks = await Bookmark.find({}).select('hackathonId').lean();
    
    if (!bookmarks || bookmarks.length === 0) {
      logger.info('No bookmarks found');
      return 0;
    }
    
    const hackathonIds = [...new Set(bookmarks.map(b => b.hackathonId))];
    
    // Find which hackathons still exist
    const existingHackathons = await Hackathon.find({
      _id: { $in: hackathonIds }
    }).select('_id').lean();
    
    const existingIds = new Set(existingHackathons.map(h => h._id.toString()));
    const orphanedIds = hackathonIds.filter(id => !existingIds.has(id.toString()));
    
    if (orphanedIds.length === 0) {
      logger.info('No orphaned bookmarks found');
      return 0;
    }
    
    logger.info(`Found ${orphanedIds.length} orphaned bookmarks to delete`);
    
    // Delete orphaned bookmarks
    const deleteResult = await Bookmark.deleteMany({
      hackathonId: { $in: orphanedIds }
    });
    
    logger.info(`Deleted ${deleteResult.deletedCount} orphaned bookmarks`);
    
    return deleteResult.deletedCount;
  } catch (error) {
    logger.error('Error cleaning up orphaned bookmarks', error);
    throw error;
  }
}

/**
 * Update trending status for designs
 * @returns {Promise<number>} Number of designs updated
 */
async function updateTrendingDesigns() {
  try {
    logger.info('Starting trending design update');
    
    // Reset all trending flags
    await Design.updateMany(
      { isTrending: true },
      { $set: { isTrending: false } }
    );
    
    // Find top designs from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const topDesigns = await Design.find({
      createdAt: { $gte: sevenDaysAgo }
    })
    .sort({ 'stats.likes': -1, 'stats.views': -1 })
    .limit(50)
    .select('_id');
    
    if (!topDesigns || topDesigns.length === 0) {
      logger.info('No designs to mark as trending');
      return 0;
    }
    
    // Mark as trending
    const updateResult = await Design.updateMany(
      { _id: { $in: topDesigns.map(d => d._id) } },
      { $set: { isTrending: true } }
    );
    
    logger.info(`Marked ${updateResult.modifiedCount} designs as trending`);
    
    return updateResult.modifiedCount;
  } catch (error) {
    logger.error('Error updating trending designs', error);
    throw error;
  }
}

/**
 * Main cleanup job function
 * @returns {Promise<Object>} Cleanup results
 */
export async function runCleanupJob() {
  const startTime = Date.now();
  const results = {
    expiredHackathons: 0,
    oldHackathons: 0,
    oldDesigns: 0,
    orphanedBookmarks: 0,
    trendingUpdated: 0,
    duration: 0,
    success: true,
    error: null
  };
  
  try {
    logger.info('Starting daily cleanup job');
    
    // Connect to database
    await connectDB();
    
    // Run cleanup tasks in sequence to avoid overwhelming the database
    results.expiredHackathons = await cleanupExpiredHackathons();
    results.oldHackathons = await cleanupOldHackathons();
    results.oldDesigns = await cleanupOldDesigns();
    results.orphanedBookmarks = await cleanupOrphanedBookmarks();
    results.trendingUpdated = await updateTrendingDesigns();
    
    // Calculate duration
    results.duration = Date.now() - startTime;
    
    logger.info('Cleanup job completed successfully', {
      ...results,
      durationMs: results.duration
    });
    
    return results;
  } catch (error) {
    logger.error('Cleanup job failed', error);
    results.success = false;
    results.error = error.message;
    results.duration = Date.now() - startTime;
    
    throw error;
  }
}

/**
 * Get cleanup job statistics
 * @returns {Promise<Object>} Cleanup statistics
 */
export async function getCleanupStats() {
  try {
    await connectDB();
    
    const now = new Date();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - EXPIRED_HACKATHON_GRACE_DAYS);
    
    const stats = {
      expiredHackathons: await Hackathon.countDocuments({
        deadline: { $lt: cutoffDate },
        isActive: true
      }),
      inactiveHackathons: await Hackathon.countDocuments({
        isActive: false
      }),
      totalHackathons: await Hackathon.countDocuments(),
      totalDesigns: await Design.countDocuments(),
      trendingDesigns: await Design.countDocuments({ isTrending: true }),
      totalBookmarks: await Bookmark.countDocuments()
    };
    
    return stats;
  } catch (error) {
    logger.error('Error getting cleanup stats', error);
    throw error;
  }
}