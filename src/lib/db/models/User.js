/**
 * User Model for D2D Designer
 * Handles user data, preferences, authentication, and statistics
 * Compatible with NextAuth v5 and MongoDB
 */

import mongoose from 'mongoose';
import { Logger } from '@/lib/utils/logger';

const logger = new Logger('UserModel');

// User preferences schema
const preferencesSchema = new mongoose.Schema({
  notifications: {
    type: Boolean,
    default: true,
    required: true
  },
  subscribeNewsletter: {
    type: Boolean,
    default: false
  },
  categories: {
    type: [String],
    default: [],
    validate: {
      validator: function(categories) {
        // Validate categories are strings and not empty
        return Array.isArray(categories) && 
               categories.every(cat => typeof cat === 'string' && cat.trim().length > 0);
      },
      message: 'Categories must be non-empty strings'
    }
  },
  platforms: {
    type: [String],
    default: [],
    enum: {
      values: ['devpost', 'unstop', 'cumulus'],
      message: 'Invalid platform: {VALUE}'
    }
  }
}, { _id: false });

// User statistics schema
const statsSchema = new mongoose.Schema({
  totalBookmarks: {
    type: Number,
    default: 0,
    min: [0, 'Total bookmarks cannot be negative'],
    validate: {
      validator: Number.isInteger,
      message: 'Total bookmarks must be an integer'
    }
  },
  totalDesignsSaved: {
    type: Number,
    default: 0,
    min: [0, 'Total designs saved cannot be negative']
  },
  lastActive: {
    type: Date,
    default: Date.now,
    required: true
  },
  loginCount: {
    type: Number,
    default: 0,
    min: 0
  }
}, { _id: false });

// Social accounts schema for Auth.js
const accountSchema = new mongoose.Schema({
  type: { type: String },
  provider: { type: String },
  providerAccountId: { type: String },
  refresh_token: { type: String },
  access_token: { type: String },
  expires_at: { type: Number },
  token_type: { type: String },
  scope: { type: String },
  id_token: { type: String },
  session_state: { type: String }
}, { _id: false });

// Main user schema
const userSchema = new mongoose.Schema({
  // Core fields required by NextAuth
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
    validate: {
      validator: function(email) {
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      },
      message: 'Invalid email format'
    }
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  password: {
    type: String,
    required: function() {
      // Password required only for non-social logins
      return !this.accounts || this.accounts.length === 0;
    },
    minlength: [8, 'Password must be at least 8 characters long']
  },
  image: {
    type: String,
    validate: {
      validator: function(url) {
        // Allow empty string or valid URL
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
  emailVerified: {
    type: Date,
    default: null
  },
  
  // Social login accounts (for Auth.js)
  accounts: {
    type: [accountSchema],
    default: []
  },
  
  // Custom fields for D2D Designer
  preferences: {
    type: preferencesSchema,
    default: () => ({})
  },
  stats: {
    type: statsSchema,
    default: () => ({})
  },
  
  // Additional profile fields
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  location: {
    type: String,
    maxlength: [100, 'Location cannot exceed 100 characters']
  },
  website: {
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
      message: 'Invalid website URL'
    }
  },
  
  // Account status
  isActive: {
    type: Boolean,
    default: true,
    required: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
    required: true
  }
}, {
  timestamps: true,
  collection: 'users'
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ 'stats.lastActive': -1 });
userSchema.index({ isActive: 1, email: 1 });
userSchema.index({ 'accounts.provider': 1, 'accounts.providerAccountId': 1 });

// Virtual for display name
userSchema.virtual('displayName').get(function() {
  try {
    return this.name || this.email?.split('@')[0] || 'User';
  } catch (error) {
    logger.error('Error getting display name', { error, userId: this._id });
    return 'User';
  }
});

// Virtual for checking if profile is complete
userSchema.virtual('isProfileComplete').get(function() {
  try {
    return Boolean(
      this.name &&
      this.emailVerified &&
      this.bio &&
      this.preferences?.categories?.length > 0
    );
  } catch (error) {
    logger.error('Error checking profile completion', { error, userId: this._id });
    return false;
  }
});

// Virtual to check if user has social login
userSchema.virtual('hasSocialLogin').get(function() {
  return this.accounts && this.accounts.length > 0;
});

// Instance method to update last active timestamp
userSchema.methods.updateLastActive = async function() {
  try {
    this.stats.lastActive = new Date();
    await this.save();
    logger.info('Updated last active', { userId: this._id });
  } catch (error) {
    logger.error('Failed to update last active', { error, userId: this._id });
    throw error;
  }
};

// Instance method to increment bookmark count
userSchema.methods.incrementBookmarks = async function(increment = 1) {
  try {
    if (!Number.isInteger(increment)) {
      throw new Error('Increment must be an integer');
    }
    
    this.stats.totalBookmarks = Math.max(0, (this.stats.totalBookmarks || 0) + increment);
    await this.save();
    logger.info('Updated bookmark count', { 
      userId: this._id, 
      newCount: this.stats.totalBookmarks 
    });
    return this.stats.totalBookmarks;
  } catch (error) {
    logger.error('Failed to increment bookmarks', { error, userId: this._id });
    throw error;
  }
};

// Instance method to increment login count
userSchema.methods.incrementLoginCount = async function() {
  try {
    this.stats.loginCount = (this.stats.loginCount || 0) + 1;
    this.stats.lastActive = new Date();
    await this.save();
    logger.info('Updated login count', { 
      userId: this._id, 
      newCount: this.stats.loginCount 
    });
    return this.stats.loginCount;
  } catch (error) {
    logger.error('Failed to increment login count', { error, userId: this._id });
    throw error;
  }
};

// Instance method to update preferences
userSchema.methods.updatePreferences = async function(preferences) {
  try {
    if (!preferences || typeof preferences !== 'object') {
      throw new Error('Invalid preferences object');
    }
    
    // Merge with existing preferences
    this.preferences = {
      ...this.preferences.toObject(),
      ...preferences
    };
    
    await this.save();
    logger.info('Updated user preferences', { userId: this._id });
    return this.preferences;
  } catch (error) {
    logger.error('Failed to update preferences', { error, userId: this._id });
    throw error;
  }
};

// Instance method to verify email
userSchema.methods.verifyEmail = async function() {
  try {
    this.emailVerified = new Date();
    this.isVerified = true;
    await this.save();
    logger.info('Email verified', { userId: this._id });
    return true;
  } catch (error) {
    logger.error('Failed to verify email', { error, userId: this._id });
    throw error;
  }
};

// Static method to find active users
userSchema.statics.findActive = function(filter = {}) {
  try {
    return this.find({ ...filter, isActive: true });
  } catch (error) {
    logger.error('Failed to find active users', { error, filter });
    throw error;
  }
};

// Static method to find by email with error handling
userSchema.statics.findByEmail = async function(email) {
  try {
    if (!email) {
      throw new Error('Email is required');
    }
    
    const user = await this.findOne({ 
      email: email.toLowerCase().trim() 
    });
    
    if (!user) {
      logger.debug('User not found by email', { email });
    }
    
    return user;
  } catch (error) {
    logger.error('Failed to find user by email', { error, email });
    throw error;
  }
};

// Static method to get user statistics
userSchema.statics.getUserStats = async function() {
  try {
    const [totalUsers, activeUsers, verifiedUsers] = await Promise.all([
      this.countDocuments(),
      this.countDocuments({ isActive: true }),
      this.countDocuments({ emailVerified: { $ne: null } })
    ]);
    
    const stats = {
      totalUsers,
      activeUsers,
      verifiedUsers,
      unverifiedUsers: totalUsers - verifiedUsers
    };
    
    logger.info('Retrieved user statistics', stats);
    return stats;
  } catch (error) {
    logger.error('Failed to get user statistics', { error });
    throw error;
  }
};

// Pre-save middleware for validation
userSchema.pre('save', async function(next) {
  try {
    // Ensure email is lowercase
    if (this.email) {
      this.email = this.email.toLowerCase().trim();
    }
    
    // Validate required fields
    if (!this.email) {
      throw new Error('Email is required');
    }
    
    // Set default stats if not present
    if (!this.stats) {
      this.stats = {};
    }
    
    // Set default preferences if not present
    if (!this.preferences) {
      this.preferences = {};
    }
    
    // Update lastActive on modification
    if (this.isModified() && !this.isNew) {
      this.stats.lastActive = new Date();
    }
    
    logger.debug('User pre-save validation passed', { userId: this._id });
    next();
  } catch (error) {
    logger.error('User pre-save validation failed', { error, userId: this._id });
    next(error);
  }
});

// Post-save middleware for logging
userSchema.post('save', function(doc) {
  logger.info('User saved successfully', { userId: doc._id, email: doc.email });
});

// Error handling middleware
userSchema.post('save', function(error, doc, next) {
  if (error) {
    logger.error('User save error', { error, userId: doc?._id });
    
    // Handle duplicate key error
    if (error.code === 11000) {
      next(new Error('Email already exists'));
    } else {
      next(error);
    }
  } else {
    next();
  }
});

// Ensure model is not re-compiled
const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;