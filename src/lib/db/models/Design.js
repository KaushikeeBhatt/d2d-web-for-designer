/**
 * Design Model for D2D Designer
 * Handles design inspiration data from multiple sources
 * Part of the EyeCandy feature
 */

import mongoose from 'mongoose';
import { DESIGN_CATEGORIES } from '@/lib/scrapers/designs/categories';
import { Logger } from '@/lib/utils/logger';

const logger = new Logger('DesignModel');

// Author schema for design creators
const authorSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    maxlength: [100, 'Author name cannot exceed 100 characters']
  },
  profileUrl: {
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
      message: 'Invalid profile URL'
    }
  },
  avatar: {
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
      message: 'Invalid avatar URL'
    }
  }
}, { _id: false });

// Statistics schema for design metrics
const statsSchema = new mongoose.Schema({
  views: {
    type: Number,
    default: 0,
    min: [0, 'Views cannot be negative'],
    validate: {
      validator: Number.isInteger,
      message: 'Views must be an integer'
    }
  },
  likes: {
    type: Number,
    default: 0,
    min: [0, 'Likes cannot be negative'],
    validate: {
      validator: Number.isInteger,
      message: 'Likes must be an integer'
    }
  },
  saves: {
    type: Number,
    default: 0,
    min: [0, 'Saves cannot be negative'],
    validate: {
      validator: Number.isInteger,
      message: 'Saves must be an integer'
    }
  },
  shares: {
    type: Number,
    default: 0,
    min: [0, 'Shares cannot be negative']
  }
}, { _id: false });

// Main design schema
const designSchema = new mongoose.Schema({
  // Core fields
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    minlength: [2, 'Title must be at least 2 characters'],
    maxlength: [200, 'Title cannot exceed 200 characters'],
    index: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  
  // Media URLs
  imageUrl: {
    type: String,
    required: [true, 'Image URL is required'],
    validate: {
      validator: function(url) {
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
  thumbnailUrl: {
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
      message: 'Invalid thumbnail URL'
    }
  },
  
  // Source information
  sourceUrl: {
    type: String,
    required: [true, 'Source URL is required'],
    unique: true,
    validate: {
      validator: function(url) {
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      },
      message: 'Invalid source URL'
    }
  },
  source: {
    type: String,
    enum: {
      values: ['behance', 'dribbble', 'awwwards', 'designspiration'],
      message: 'Invalid source: {VALUE}'
    },
    required: [true, 'Source is required'],
    index: true
  },
  sourceId: {
    type: String,
    required: true,
    trim: true
  },
  
  // Categorization
  category: {
    type: String,
    enum: {
      values: Object.values(DESIGN_CATEGORIES),
      message: 'Invalid category: {VALUE}'
    },
    required: [true, 'Category is required'],
    index: true
  },
  tags: {
    type: [String],
    default: [],
    lowercase: true,
    validate: {
      validator: function(tags) {
        return Array.isArray(tags) && tags.length <= 30;
      },
      message: 'Too many tags (max 30)'
    }
  },
  
  // Design attributes
  colors: {
    type: [String],
    default: [],
    validate: {
      validator: function(colors) {
        // Validate hex colors
        const hexRegex = /^#[0-9A-F]{6}$/i;
        return Array.isArray(colors) && 
               colors.length <= 10 &&
               colors.every(color => hexRegex.test(color));
      },
      message: 'Invalid color format or too many colors (max 10)'
    }
  },
  tools: {
    type: [String],
    default: [],
    enum: {
      values: [
        'photoshop', 'illustrator', 'sketch', 'figma', 'xd', 
        'after-effects', 'cinema-4d', 'blender', 'procreate', 
        'invision', 'principle', 'framer', 'webflow', 'other'
      ],
      message: 'Invalid tool: {VALUE}'
    }
  },
  
  // Creator information
  author: {
    type: authorSchema,
    default: {}
  },
  
  // Metrics
  stats: {
    type: statsSchema,
    default: () => ({})
  },
  
  // Status flags
  isTrending: {
    type: Boolean,
    default: false,
    index: true
  },
  isFeatured: {
    type: Boolean,
    default: false,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Quality score (for ranking)
  qualityScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
    index: true
  },
  
  // Dates
  publishedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  lastScraped: {
    type: Date,
    default: Date.now,
    required: true
  },
  
  // Additional metadata
  dimensions: {
    width: {
      type: Number,
      min: 0
    },
    height: {
      type: Number,
      min: 0
    }
  },
  fileSize: {
    type: Number,
    min: 0
  }
}, {
  timestamps: true,
  collection: 'designs',
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
designSchema.index({ category: 1, isTrending: -1 });
designSchema.index({ createdAt: -1 });
designSchema.index({ publishedAt: -1 });
designSchema.index({ 'stats.likes': -1 });
designSchema.index({ qualityScore: -1 });
designSchema.index({ source: 1, sourceId: 1 }, { unique: true });
designSchema.index({ category: 1, publishedAt: -1 });
designSchema.index({ isFeatured: 1, qualityScore: -1 });

// Text index for search
designSchema.index({ 
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

// Virtual for checking if design is new (within 7 days)
designSchema.virtual('isNew').get(function() {
  try {
    const daysSincePublished = (Date.now() - this.publishedAt) / (1000 * 60 * 60 * 24);
    return daysSincePublished <= 7;
  } catch (error) {
    logger.error('Error checking if design is new', { error, designId: this._id });
    return false;
  }
});

// Virtual for engagement rate
designSchema.virtual('engagementRate').get(function() {
  try {
    const totalEngagement = (this.stats?.likes || 0) + (this.stats?.saves || 0);
    const views = this.stats?.views || 1; // Avoid division by zero
    return (totalEngagement / views) * 100;
  } catch (error) {
    logger.error('Error calculating engagement rate', { error, designId: this._id });
    return 0;
  }
});

// Virtual for aspect ratio
designSchema.virtual('aspectRatio').get(function() {
  try {
    if (this.dimensions?.width && this.dimensions?.height) {
      return this.dimensions.width / this.dimensions.height;
    }
    return null;
  } catch (error) {
    logger.error('Error calculating aspect ratio', { error, designId: this._id });
    return null;
  }
});

// Instance method to calculate quality score
designSchema.methods.calculateQualityScore = function() {
  try {
    let score = 0;
    
    // Title and description quality
    if (this.title && this.title.length > 10) score += 10;
    if (this.description && this.description.length > 50) score += 15;
    
    // Media quality
    if (this.imageUrl) score += 20;
    if (this.thumbnailUrl) score += 5;
    
    // Author information
    if (this.author?.name) score += 10;
    if (this.author?.profileUrl) score += 5;
    
    // Categorization
    if (this.tags && this.tags.length >= 3) score += 10;
    if (this.colors && this.colors.length >= 3) score += 5;
    
    // Engagement metrics
    const engagementScore = Math.min(20, this.engagementRate * 2);
    score += engagementScore;
    
    this.qualityScore = Math.min(100, Math.round(score));
    
    logger.debug('Calculated quality score', { 
      designId: this._id, 
      score: this.qualityScore 
    });
    
    return this.qualityScore;
  } catch (error) {
    logger.error('Failed to calculate quality score', { error, designId: this._id });
    return 0;
  }
};

// Instance method to update stats
designSchema.methods.updateStats = async function(statUpdates) {
  try {
    if (!statUpdates || typeof statUpdates !== 'object') {
      throw new Error('Invalid stat updates');
    }
    
    // Merge with existing stats
    Object.keys(statUpdates).forEach(key => {
      if (this.stats[key] !== undefined && typeof statUpdates[key] === 'number') {
        this.stats[key] = Math.max(0, this.stats[key] + statUpdates[key]);
      }
    });
    
    // Recalculate quality score
    this.calculateQualityScore();
    
    await this.save();
    logger.info('Updated design stats', { designId: this._id, updates: statUpdates });
    
    return this.stats;
  } catch (error) {
    logger.error('Failed to update stats', { error, designId: this._id });
    throw error;
  }
};

// Static method to find trending designs
designSchema.statics.findTrending = async function(category = null, limit = 20) {
  try {
    const filter = { 
      isActive: true,
      isTrending: true 
    };
    
    if (category && category !== DESIGN_CATEGORIES.ALL) {
      filter.category = category;
    }
    
    const designs = await this.find(filter)
      .sort({ qualityScore: -1, 'stats.likes': -1 })
      .limit(limit)
      .lean();
    
    logger.info('Retrieved trending designs', { 
      category, 
      count: designs.length 
    });
    
    return designs;
  } catch (error) {
    logger.error('Failed to find trending designs', { error, category });
    throw error;
  }
};

// Static method to search designs
designSchema.statics.searchDesigns = async function(query, options = {}) {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      source,
      colors,
      sort = '-publishedAt',
      trending = false
    } = options;
    
    // Build filter
    const filter = { isActive: true };
    
    if (query) {
      filter.$text = { $search: query };
    }
    
    if (category && category !== DESIGN_CATEGORIES.ALL) {
      filter.category = category;
    }
    
    if (source) {
      filter.source = source;
    }
    
    if (colors && colors.length > 0) {
      filter.colors = { $in: colors };
    }
    
    if (trending) {
      filter.isTrending = true;
    }
    
    // Execute query with pagination
    const skip = (page - 1) * limit;
    const [designs, total] = await Promise.all([
      this.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.countDocuments(filter)
    ]);
    
    logger.info('Design search completed', { 
      query, 
      resultsCount: designs.length, 
      total 
    });
    
    return {
      designs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    logger.error('Design search failed', { error, query });
    throw error;
  }
};

// Static method to update trending status
designSchema.statics.updateTrendingStatus = async function() {
  try {
    // Reset all trending flags
    await this.updateMany({}, { $set: { isTrending: false } });
    
    // Calculate trending based on recent engagement
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    
    // Find top designs by engagement in last 2 days
    const trendingDesigns = await this.find({
      isActive: true,
      publishedAt: { $gte: twoDaysAgo }
    })
    .sort({ 'stats.likes': -1, 'stats.saves': -1 })
    .limit(50)
    .select('_id');
    
    // Update trending status
    const trendingIds = trendingDesigns.map(d => d._id);
    await this.updateMany(
      { _id: { $in: trendingIds } },
      { $set: { isTrending: true } }
    );
    
    logger.info('Updated trending status', { 
      trendingCount: trendingIds.length 
    });
    
    return trendingIds.length;
  } catch (error) {
    logger.error('Failed to update trending status', { error });
    throw error;
  }
};

// Static method to get category statistics
designSchema.statics.getCategoryStats = async function() {
  try {
    const stats = await this.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgLikes: { $avg: '$stats.likes' },
          avgViews: { $avg: '$stats.views' }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    logger.info('Retrieved category statistics', { 
      categoriesCount: stats.length 
    });
    
    return stats;
  } catch (error) {
    logger.error('Failed to get category statistics', { error });
    throw error;
  }
};

// Pre-save middleware
designSchema.pre('save', async function(next) {
  try {
    // Ensure required fields
    if (!this.title || !this.imageUrl || !this.sourceUrl || !this.source) {
      throw new Error('Missing required fields');
    }
    
    // Clean up tags
    if (this.tags && Array.isArray(this.tags)) {
      this.tags = [...new Set(this.tags.map(tag => tag.toLowerCase().trim()))]
        .filter(tag => tag.length > 0);
    }
    
    // Clean up colors
    if (this.colors && Array.isArray(this.colors)) {
      this.colors = this.colors
        .map(color => color.toUpperCase())
        .filter(color => /^#[0-9A-F]{6}$/i.test(color));
    }
    
    // Calculate quality score if new
    if (this.isNew) {
      this.calculateQualityScore();
    }
    
    logger.debug('Design pre-save validation passed', { designId: this._id });
    next();
  } catch (error) {
    logger.error('Design pre-save validation failed', { error, designId: this._id });
    next(error);
  }
});

// Post-save middleware
designSchema.post('save', function(doc) {
  logger.info('Design saved successfully', { 
    designId: doc._id, 
    source: doc.source,
    title: doc.title 
  });
});

// Error handling middleware
designSchema.post('save', function(error, doc, next) {
  if (error) {
    logger.error('Design save error', { error, designId: doc?._id });
    
    if (error.code === 11000) {
      next(new Error('Design already exists from this source'));
    } else {
      next(error);
    }
  } else {
    next();
  }
});

// Ensure model is not re-compiled
const Design = mongoose.models.Design || mongoose.model('Design', designSchema);

export default Design;
