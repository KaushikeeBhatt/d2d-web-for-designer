/**
 * Bookmark Model
 * Handles user bookmarks for hackathons with notes and reminders
 * @module models/Bookmark
 */

import mongoose from 'mongoose';
import { Logger } from '@/lib/utils/logger';

const logger = new Logger('BookmarkModel');

/**
 * Bookmark Schema Definition
 * Represents a user's saved hackathon with optional notes and reminder
 */
const bookmarkSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true,
    validate: {
      validator: function(v) {
        return mongoose.Types.ObjectId.isValid(v);
      },
      message: 'Invalid user ID format'
    }
  },
  hackathonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hackathon',
    required: [true, 'Hackathon ID is required'],
    index: true,
    validate: {
      validator: function(v) {
        return mongoose.Types.ObjectId.isValid(v);
      },
      message: 'Invalid hackathon ID format'
    }
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
    trim: true,
    default: ''
  },
  tags: {
    type: [String],
    default: [],
    validate: {
      validator: function(tags) {
        return tags.length <= 10;
      },
      message: 'Cannot have more than 10 tags'
    }
  },
  reminder: {
    type: Date,
    validate: {
      validator: function(date) {
        return !date || date > new Date();
      },
      message: 'Reminder date must be in the future'
    }
  },
  isArchived: {
    type: Boolean,
    default: false,
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound unique index to prevent duplicate bookmarks
bookmarkSchema.index({ userId: 1, hackathonId: 1 }, { unique: true });

// Index for user's bookmarks sorted by creation date
bookmarkSchema.index({ userId: 1, createdAt: -1 });

// Index for finding bookmarks with upcoming reminders
bookmarkSchema.index({ reminder: 1, userId: 1 });

// Index for archived bookmarks
bookmarkSchema.index({ userId: 1, isArchived: 1 });

/**
 * Virtual property to check if reminder is soon (within 24 hours)
 */
bookmarkSchema.virtual('isReminderSoon').get(function() {
  try {
    if (!this.reminder) return false;
    const hoursDiff = (this.reminder - new Date()) / (1000 * 60 * 60);
    return hoursDiff > 0 && hoursDiff <= 24;
  } catch (error) {
    logger.error('Error calculating isReminderSoon', error);
    return false;
  }
});

/**
 * Virtual property to check if reminder has passed
 */
bookmarkSchema.virtual('isReminderPassed').get(function() {
  try {
    return this.reminder && this.reminder < new Date();
  } catch (error) {
    logger.error('Error calculating isReminderPassed', error);
    return false;
  }
});

/**
 * Pre-save middleware for validation and data cleanup
 */
bookmarkSchema.pre('save', async function(next) {
  try {
    logger.debug('Pre-save hook triggered for bookmark', {
      userId: this.userId,
      hackathonId: this.hackathonId
    });

    // Trim notes if present
    if (this.notes) {
      this.notes = this.notes.trim();
    }

    // Clean up tags
    if (this.tags && this.tags.length > 0) {
      this.tags = this.tags
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0)
        .filter((tag, index, self) => self.indexOf(tag) === index); // Remove duplicates
    }

    // Validate reminder date
    if (this.reminder && this.reminder <= new Date()) {
      const error = new Error('Reminder date must be in the future');
      logger.error('Invalid reminder date', { reminder: this.reminder });
      return next(error);
    }

    next();
  } catch (error) {
    logger.error('Error in bookmark pre-save hook', error);
    next(error);
  }
});

/**
 * Post-save middleware for logging
 */
bookmarkSchema.post('save', function(doc) {
  logger.info('Bookmark saved successfully', {
    id: doc._id,
    userId: doc.userId,
    hackathonId: doc.hackathonId
  });
});

/**
 * Post-remove middleware for cleanup
 */
bookmarkSchema.post('remove', function(doc) {
  logger.info('Bookmark removed', {
    id: doc._id,
    userId: doc.userId,
    hackathonId: doc.hackathonId
  });
});

/**
 * Static method to find bookmarks by user with pagination
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Paginated bookmarks
 */
bookmarkSchema.statics.findByUser = async function(userId, options = {}) {
  try {
    logger.debug('Finding bookmarks for user', { userId, options });

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID format');
    }

    const {
      page = 1,
      limit = 20,
      includeArchived = false,
      sort = '-createdAt'
    } = options;

    const query = { userId };
    if (!includeArchived) {
      query.isArchived = false;
    }

    const skip = (page - 1) * limit;

    const [bookmarks, total] = await Promise.all([
      this.find(query)
        .populate('hackathonId')
        .sort(sort)
        .limit(limit)
        .skip(skip)
        .lean(),
      this.countDocuments(query)
    ]);

    logger.info('Bookmarks retrieved for user', {
      userId,
      count: bookmarks.length,
      total,
      page
    });

    return {
      bookmarks,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      }
    };
  } catch (error) {
    logger.error('Error finding bookmarks by user', error);
    throw error;
  }
};

/**
 * Static method to find bookmarks with upcoming reminders
 * @param {string} userId - User ID
 * @param {number} daysAhead - Number of days to look ahead
 * @returns {Promise<Array>} Bookmarks with upcoming reminders
 */
bookmarkSchema.statics.findUpcomingReminders = async function(userId, daysAhead = 7) {
  try {
    logger.debug('Finding upcoming reminders', { userId, daysAhead });

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID format');
    }

    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + daysAhead);

    const bookmarks = await this.find({
      userId,
      reminder: {
        $gte: now,
        $lte: future
      },
      isArchived: false
    })
    .populate('hackathonId')
    .sort('reminder')
    .lean();

    logger.info('Upcoming reminders found', {
      userId,
      count: bookmarks.length,
      daysAhead
    });

    return bookmarks;
  } catch (error) {
    logger.error('Error finding upcoming reminders', error);
    throw error;
  }
};

/**
 * Static method to toggle bookmark archive status
 * @param {string} bookmarkId - Bookmark ID
 * @param {string} userId - User ID for ownership verification
 * @returns {Promise<Object>} Updated bookmark
 */
bookmarkSchema.statics.toggleArchive = async function(bookmarkId, userId) {
  try {
    logger.debug('Toggling archive status', { bookmarkId, userId });

    const bookmark = await this.findOne({ _id: bookmarkId, userId });
    
    if (!bookmark) {
      throw new Error('Bookmark not found or unauthorized');
    }

    bookmark.isArchived = !bookmark.isArchived;
    await bookmark.save();

    logger.info('Archive status toggled', {
      bookmarkId,
      isArchived: bookmark.isArchived
    });

    return bookmark;
  } catch (error) {
    logger.error('Error toggling archive status', error);
    throw error;
  }
};

/**
 * Instance method to update reminder
 * @param {Date} newDate - New reminder date
 * @returns {Promise<Object>} Updated bookmark
 */
bookmarkSchema.methods.updateReminder = async function(newDate) {
  try {
    logger.debug('Updating reminder', {
      bookmarkId: this._id,
      newDate
    });

    if (newDate && newDate <= new Date()) {
      throw new Error('Reminder date must be in the future');
    }

    this.reminder = newDate;
    await this.save();

    logger.info('Reminder updated', {
      bookmarkId: this._id,
      reminder: this.reminder
    });

    return this;
  } catch (error) {
    logger.error('Error updating reminder', error);
    throw error;
  }
};

/**
 * Instance method to add tags
 * @param {Array<string>} newTags - Tags to add
 * @returns {Promise<Object>} Updated bookmark
 */
bookmarkSchema.methods.addTags = async function(newTags) {
  try {
    logger.debug('Adding tags to bookmark', {
      bookmarkId: this._id,
      newTags
    });

    if (!Array.isArray(newTags)) {
      throw new Error('Tags must be an array');
    }

    const cleanedTags = newTags
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0);

    const uniqueTags = [...new Set([...this.tags, ...cleanedTags])];
    
    if (uniqueTags.length > 10) {
      throw new Error('Cannot have more than 10 tags');
    }

    this.tags = uniqueTags;
    await this.save();

    logger.info('Tags added to bookmark', {
      bookmarkId: this._id,
      tags: this.tags
    });

    return this;
  } catch (error) {
    logger.error('Error adding tags', error);
    throw error;
  }
};

// Handle mongoose model caching in development
let BookmarkModel;

try {
  BookmarkModel = mongoose.model('Bookmark');
  logger.debug('Using existing Bookmark model');
} catch {
  BookmarkModel = mongoose.model('Bookmark', bookmarkSchema);
  logger.debug('Creating new Bookmark model');
}

export default BookmarkModel;
