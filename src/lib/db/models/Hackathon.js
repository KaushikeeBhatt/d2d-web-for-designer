/**
 * Hackathon Model for D2D Designer
 * Handles hackathon data from multiple platforms
 * Includes comprehensive validation and indexing
 */

import mongoose from 'mongoose';
import { Logger } from '@/lib/utils/logger';

const logger = new Logger('HackathonModel');

// Prize schema for structured prize data
const prizeSchema = new mongoose.Schema({
  position: {
    type: String,
    required: true
  },
  amount: {
    type: String,
    required: true
  },
  description: String
}, { _id: false });

// Main hackathon schema
const hackathonSchema = new mongoose.Schema({
  // Core fields
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters'],
    maxlength: [200, 'Title cannot exceed 200 characters'],
    index: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  url: {
    type: String,
    required: [true, 'URL is required'],
    validate: {
      validator: function(url) {
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      },
      message: 'Invalid URL format'
    }
  },
  
  // Platform information
  platform: {
    type: String,
    enum: {
      values: ['devpost', 'unstop', 'cumulus'],
      message: 'Invalid platform: {VALUE}'
    },
    required: [true, 'Platform is required'],
    index: true
  },
  sourceId: {
    type: String,
    required: [true, 'Source ID is required'],
    trim: true
  },
  
  // Dates
  deadline: {
    type: Date,
    index: true,
    validate: {
      validator: function(date) {
        // Allow null or future dates
        return !date || date >= new Date();
      },
      message: 'Deadline must be in the future'
    }
  },
  startDate: {
    type: Date,
    validate: {
      validator: function(date) {
        // Start date should be before end date if both exist
        if (date && this.endDate) {
          return date <= this.endDate;
        }
        return true;
      },
      message: 'Start date must be before end date'
    }
  },
  endDate: {
    type: Date,
    validate: {
      validator: function(date) {
        // End date should be after start date if both exist
        if (date && this.startDate) {
          return date >= this.startDate;
        }
        return true;
      },
      message: 'End date must be after start date'
    }
  },
  
  // Prize information
  prizes: {
    type: [String],
    default: [],
    validate: {
      validator: function(prizes) {
        return Array.isArray(prizes) && prizes.length <= 50;
      },
      message: 'Too many prizes (max 50)'
    }
  },
  structuredPrizes: [prizeSchema],
  totalPrizeValue: {
    type: String,
    trim: true
  },
  
  // Categorization
  tags: {
    type: [String],
    default: [],
    lowercase: true,
    validate: {
      validator: function(tags) {
        return Array.isArray(tags) && tags.length <= 20;
      },
      message: 'Too many tags (max 20)'
    }
  },
  categories: {
    type: [String],
    default: [],
    enum: {
      values: ['web', 'mobile', 'ai-ml', 'blockchain', 'iot', 'game', 'design', 'social-good', 'other'],
      message: 'Invalid category: {VALUE}'
    }
  },
  
  // Participation details
  eligibility: {
    type: String,
    trim: true,
    maxlength: [1000, 'Eligibility cannot exceed 1000 characters']
  },
  teamSize: {
    min: {
      type: Number,
      min: 1,
      max: 100
    },
    max: {
      type: Number,
      min: 1,
      max: 100
    }
  },
  
  // Media
  imageUrl: {
    type: String,
    validate: {
      validator: function(url) {
        if (!url) return true;
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      },
      message: 'Invalid image URL'
    }
  },
  thumbnailUrl: String,
  
  // Statistics
  participants: {
    type: Number,
    min: [0, 'Participants cannot be negative'],
    default: 0
  },
  submissions: {
    type: Number,
    min: [0, 'Submissions cannot be negative'],
    default: 0
  },
  viewCount: {
    type: Number,
    min: 0,
    default: 0
  },
  bookmarkCount: {
    type: Number,
    min: 0,
    default: 0,
    index: true
  },
  
  // Platform-specific data
  platformData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Status fields
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isFeatured: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Tracking
  lastScraped: {
    type: Date,
    default: Date.now,
    required: true
  },
  scrapedCount: {
    type: Number,
    default: 1,
    min: 0
  }
}, {
  timestamps: true,
  collection: 'hackathons',
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes
hackathonSchema.index({ platform: 1, sourceId: 1 }, { unique: true });
hackathonSchema.index({ deadline: 1, isActive: 1 });
hackathonSchema.index({ createdAt: -1 });
hackathonSchema.index({ bookmarkCount: -1 });
hackathonSchema.index({ platform: 1, deadline: 1 });
hackathonSchema.index({ tags: 1 });
hackathonSchema.index({ categories: 1 });

// Text index for search
hackathonSchema.index({ 
  title: 'text', 
  description: 'text', 
  tags: 'text' 
}, {
  weights: {
    title: 10,
    tags: 5,
    description: 1
  }
});

// Virtual for checking if deadline passed
hackathonSchema.virtual('isExpired').get(function() {
  try {
    return this.deadline && this.deadline < new Date();
  } catch (error) {
    logger.error('Error checking expiration', { error, hackathonId: this._id });
    return false;
  }
});

// Virtual for days until deadline
hackathonSchema.virtual('daysUntilDeadline').get(function() {
  try {
    if (!this.deadline) return null;
    const now = new Date();
    const diff = this.deadline - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  } catch (error) {
    logger.error('Error calculating days until deadline', { error, hackathonId: this._id });
    return null;
  }
});

// Virtual for status
hackathonSchema.virtual('status').get(function() {
  try {
    if (!this.isActive) return 'inactive';
    if (this.isExpired) return 'expired';
    if (this.daysUntilDeadline && this.daysUntilDeadline <= 7) return 'ending-soon';
    if (this.startDate && this.startDate > new Date()) return 'upcoming';
    return 'active';
  } catch (error) {
    logger.error('Error determining status', { error, hackathonId: this._id });
    return 'unknown';
  }
});

// Instance method to increment view count
hackathonSchema.methods.incrementViewCount = async function() {
  try {
    this.viewCount = (this.viewCount || 0) + 1;
    await this.save();
    logger.debug('Incremented view count', { 
      hackathonId: this._id, 
      newCount: this.viewCount 
    });
  } catch (error) {
    logger.error('Failed to increment view count', { error, hackathonId: this._id });
    throw error;
  }
};

// Instance method to update bookmark count
hackathonSchema.methods.updateBookmarkCount = async function(increment = 1) {
  try {
    this.bookmarkCount = Math.max(0, (this.bookmarkCount || 0) + increment);
    await this.save();
    logger.info('Updated bookmark count', { 
      hackathonId: this._id, 
      newCount: this.bookmarkCount 
    });
    return this.bookmarkCount;
  } catch (error) {
    logger.error('Failed to update bookmark count', { error, hackathonId: this._id });
    throw error;
  }
};

// Static method to find active hackathons
hackathonSchema.statics.findActive = function(filter = {}) {
  try {
    const now = new Date();
    return this.find({
      ...filter,
      isActive: true,
      $or: [
        { deadline: { $gte: now } },
        { deadline: null }
      ]
    });
  } catch (error) {
    logger.error('Failed to find active hackathons', { error, filter });
    throw error;
  }
};

// Static method to find by platform and sourceId
hackathonSchema.statics.findByPlatformAndSourceId = async function(platform, sourceId) {
  try {
    if (!platform || !sourceId) {
      throw new Error('Platform and sourceId are required');
    }
    
    return await this.findOne({ platform, sourceId });
  } catch (error) {
    logger.error('Failed to find hackathon by platform and sourceId', { 
      error, 
      platform, 
      sourceId 
    });
    throw error;
  }
};

// Static method to search hackathons
hackathonSchema.statics.searchHackathons = async function(query, options = {}) {
  try {
    const {
      page = 1,
      limit = 20,
      sort = '-createdAt',
      platform,
      categories,
      tags,
      status
    } = options;
    
    // Build filter
    const filter = { isActive: true };
    
    if (query) {
      filter.$text = { $search: query };
    }
    
    if (platform) {
      filter.platform = platform;
    }
    
    if (categories && categories.length > 0) {
      filter.categories = { $in: categories };
    }
    
    if (tags && tags.length > 0) {
      filter.tags = { $in: tags };
    }
    
    if (status === 'ending-soon') {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      filter.deadline = {
        $gte: new Date(),
        $lte: sevenDaysFromNow
      };
    }
    
    // Execute query with pagination
    const skip = (page - 1) * limit;
    const [hackathons, total] = await Promise.all([
      this.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.countDocuments(filter)
    ]);
    
    logger.info('Search completed', { 
      query, 
      resultsCount: hackathons.length, 
      total 
    });
    
    return {
      hackathons,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    logger.error('Search failed', { error, query });
    throw error;
  }
};

// Static method to get trending hackathons
hackathonSchema.statics.getTrending = async function(limit = 10) {
  try {
    const hackathons = await this.find({ 
      isActive: true,
      deadline: { $gte: new Date() }
    })
    .sort({ bookmarkCount: -1, viewCount: -1 })
    .limit(limit)
    .lean();
    
    logger.info('Retrieved trending hackathons', { count: hackathons.length });
    return hackathons;
  } catch (error) {
    logger.error('Failed to get trending hackathons', { error });
    throw error;
  }
};

// Static method to cleanup expired hackathons
hackathonSchema.statics.cleanupExpired = async function(daysOld = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const result = await this.updateMany(
      {
        deadline: { $lt: cutoffDate },
        isActive: true
      },
      {
        $set: { isActive: false }
      }
    );
    
    logger.info('Cleaned up expired hackathons', { 
      modified: result.modifiedCount,
      daysOld 
    });
    
    return result.modifiedCount;
  } catch (error) {
    logger.error('Failed to cleanup expired hackathons', { error });
    throw error;
  }
};

// Pre-save middleware
hackathonSchema.pre('save', async function(next) {
  try {
    // Ensure required fields
    if (!this.title || !this.url || !this.platform || !this.sourceId) {
      throw new Error('Missing required fields');
    }
    
    // Clean up tags
    if (this.tags && Array.isArray(this.tags)) {
      this.tags = [...new Set(this.tags.map(tag => tag.toLowerCase().trim()))];
    }
    
    // Update scraped count
    if (this.isModified('lastScraped')) {
      this.scrapedCount = (this.scrapedCount || 0) + 1;
    }
    
    logger.debug('Hackathon pre-save validation passed', { hackathonId: this._id });
    next();
  } catch (error) {
    logger.error('Hackathon pre-save validation failed', { error, hackathonId: this._id });
    next(error);
  }
});

// Post-save middleware
hackathonSchema.post('save', function(doc) {
  logger.info('Hackathon saved successfully', { 
    hackathonId: doc._id, 
    platform: doc.platform,
    title: doc.title 
  });
});

// Error handling middleware
hackathonSchema.post('save', function(error, doc, next) {
  if (error) {
    logger.error('Hackathon save error', { error, hackathonId: doc?._id });
    
    if (error.code === 11000) {
      next(new Error('Hackathon already exists on this platform'));
    } else {
      next(error);
    }
  } else {
    next();
  }
});

// Ensure model is not re-compiled
const Hackathon = mongoose.models.Hackathon || mongoose.model('Hackathon', hackathonSchema);

export default Hackathon;
