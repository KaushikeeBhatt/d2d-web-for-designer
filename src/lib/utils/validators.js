/**
 * Data Validation Utilities
 * Zod schemas and validation helpers for type safety
 * Ensures data integrity across the application
 */

import { z } from 'zod';
import { Logger } from './logger';

const logger = new Logger('Validators');

// Custom error messages
const requiredString = (field) => z.string({
  required_error: `${field} is required`,
  invalid_type_error: `${field} must be a string`
});

/**
 * Hackathon validation schema
 * Validates hackathon data from scrapers and API inputs
 */
export const hackathonSchema = z.object({
  title: requiredString('Title')
    .min(1, 'Title cannot be empty')
    .max(200, 'Title must be less than 200 characters')
    .trim(),
  
  description: z.string()
    .max(5000, 'Description must be less than 5000 characters')
    .optional()
    .nullable(),
  
  url: z.string()
    .url('Invalid URL format')
    .refine((url) => {
      try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
      } catch {
        return false;
      }
    }, 'URL must use HTTP or HTTPS protocol'),
  
  platform: z.enum(['devpost', 'unstop', 'cumulus'], {
    errorMap: () => ({ message: 'Invalid platform' })
  }),
  
  deadline: z.string()
    .datetime({ message: 'Invalid datetime format for deadline' })
    .optional()
    .nullable()
    .refine((date) => {
      if (!date) return true;
      return new Date(date) >= new Date();
    }, 'Deadline cannot be in the past'),
  
  startDate: z.string()
    .datetime({ message: 'Invalid datetime format for start date' })
    .optional()
    .nullable(),
  
  endDate: z.string()
    .datetime({ message: 'Invalid datetime format for end date' })
    .optional()
    .nullable(),
  
  prizes: z.array(z.string().max(500))
    .max(20, 'Maximum 20 prizes allowed')
    .optional()
    .default([]),
  
  tags: z.array(z.string().max(50))
    .max(30, 'Maximum 30 tags allowed')
    .optional()
    .default([]),
  
  eligibility: z.string()
    .max(1000, 'Eligibility must be less than 1000 characters')
    .optional()
    .nullable(),
  
  imageUrl: z.string()
    .url('Invalid image URL')
    .optional()
    .nullable(),
  
  participants: z.number()
    .int('Participants must be a whole number')
    .min(0, 'Participants cannot be negative')
    .optional()
    .nullable(),
  
  sourceId: requiredString('Source ID')
    .min(1, 'Source ID cannot be empty'),
  
  platformData: z.record(z.unknown())
    .optional()
    .default({}),
}).refine((data) => {
  // Validate date relationships
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate);
  }
  return true;
}, {
  message: 'Start date must be before end date',
  path: ['endDate']
});

/**
 * Design validation schema
 * Validates design inspiration data from scrapers
 */
export const designSchema = z.object({
  title: requiredString('Title')
    .min(1, 'Title cannot be empty')
    .max(200, 'Title must be less than 200 characters')
    .trim(),
  
  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional()
    .nullable(),
  
  imageUrl: z.string()
    .url('Invalid image URL')
    .refine((url) => {
      const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
      return validExtensions.some(ext => url.toLowerCase().includes(ext)) || 
             url.includes('cloudinary') || 
             url.includes('behance') ||
             url.includes('dribbble');
    }, 'Invalid image format'),
  
  thumbnailUrl: z.string()
    .url('Invalid thumbnail URL')
    .optional()
    .nullable(),
  
  sourceUrl: z.string()
    .url('Invalid source URL'),
  
  source: z.enum(['behance', 'dribbble', 'awwwards', 'designspiration'], {
    errorMap: () => ({ message: 'Invalid design source platform' })
  }),
  
  category: z.string()
    .min(1, 'Category is required'),
  
  tags: z.array(z.string().max(30))
    .max(20, 'Maximum 20 tags allowed')
    .optional()
    .default([]),
  
  author: z.object({
    name: z.string().max(100).optional().nullable(),
    profileUrl: z.string().url().optional().nullable(),
    avatar: z.string().url().optional().nullable(),
  }).optional().nullable(),
  
  stats: z.object({
    views: z.number().int().min(0).default(0),
    likes: z.number().int().min(0).default(0),
    saves: z.number().int().min(0).default(0),
  }).optional().default({
    views: 0,
    likes: 0,
    saves: 0
  }),
  
  colors: z.array(
    z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color format')
  )
  .max(10, 'Maximum 10 colors allowed')
  .optional()
  .default([]),
  
  publishedAt: z.string()
    .datetime({ message: 'Invalid datetime format' })
    .optional()
    .nullable(),
});

/**
 * Bookmark validation schema
 * Validates bookmark creation requests
 */
export const bookmarkSchema = z.object({
  hackathonId: z.string()
    .min(1, 'Hackathon ID is required')
    .refine((id) => {
      // Basic MongoDB ObjectId validation
      return /^[0-9a-fA-F]{24}$/.test(id);
    }, 'Invalid hackathon ID format'),
  
  notes: z.string()
    .max(500, 'Notes must be less than 500 characters')
    .optional()
    .nullable(),
  
  tags: z.array(z.string().max(30))
    .max(10, 'Maximum 10 tags allowed')
    .optional()
    .default([]),
  
  reminder: z.string()
    .datetime({ message: 'Invalid reminder date format' })
    .optional()
    .nullable()
    .refine((date) => {
      if (!date) return true;
      return new Date(date) > new Date();
    }, 'Reminder must be in the future'),
});

/**
 * User preferences schema
 * Validates user preference updates
 */
export const userPreferencesSchema = z.object({
  notifications: z.boolean().optional(),
  
  categories: z.array(z.string())
    .max(20, 'Maximum 20 categories allowed')
    .optional(),
  
  platforms: z.array(
    z.enum(['devpost', 'unstop', 'cumulus'])
  )
  .optional(),
});

/**
 * Search params validation schema
 * Validates and sanitizes search query parameters
 */
export const searchParamsSchema = z.object({
  q: z.string()
    .max(100, 'Search query too long')
    .optional()
    .transform((val) => val?.trim()),
  
  category: z.string()
    .max(50)
    .optional(),
  
  platform: z.enum(['devpost', 'unstop', 'cumulus', 'all'])
    .optional()
    .default('all'),
  
  sort: z.enum(['newest', 'deadline', 'popular', 'trending'])
    .optional()
    .default('newest'),
  
  page: z.coerce
    .number()
    .int('Page must be a whole number')
    .positive('Page must be positive')
    .default(1),
  
  limit: z.coerce
    .number()
    .int('Limit must be a whole number')
    .positive('Limit must be positive')
    .max(100, 'Maximum 100 items per page')
    .default(20),
  
  startDate: z.string()
    .datetime()
    .optional()
    .nullable(),
  
  endDate: z.string()
    .datetime()
    .optional()
    .nullable(),
});

/**
 * Design search params schema
 * Validates design gallery search parameters
 */
export const designSearchParamsSchema = z.object({
  category: z.string().optional(),
  
  source: z.enum(['behance', 'dribbble', 'awwwards', 'all'])
    .optional()
    .default('all'),
  
  sort: z.enum(['newest', 'trending', 'popular'])
    .optional()
    .default('trending'),
  
  colors: z.array(z.string())
    .optional(),
  
  page: z.coerce
    .number()
    .int()
    .positive()
    .default(1),
  
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(50, 'Maximum 50 items per page')
    .default(20),
});

/**
 * MongoDB ObjectId validation
 * @param {string} id - ID to validate
 * @returns {boolean} True if valid ObjectId
 */
export function isValidObjectId(id) {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Validates data against a schema
 * @param {z.Schema} schema - Zod schema
 * @param {any} data - Data to validate
 * @returns {object} { success: boolean, data?: any, error?: object }
 */
export function validateData(schema, data) {
  try {
    const result = schema.safeParse(data);
    
    if (result.success) {
      logger.debug('Validation passed', { 
        schema: schema._def?.typeName || 'unknown' 
      });
      return { success: true, data: result.data };
    }
    
    const errors = result.error.errors.map(err => ({
      path: err.path.join('.'),
      message: err.message
    }));
    
    logger.warn('Validation failed', { errors });
    
    return { 
      success: false, 
      error: { 
        message: 'Validation failed', 
        errors 
      } 
    };
  } catch (error) {
    logger.error('Validation error', error);
    return { 
      success: false, 
      error: { 
        message: 'Validation error occurred',
        errors: [{ path: 'unknown', message: error.message }]
      } 
    };
  }
}

/**
 * Sanitizes user input to prevent XSS
 * @param {string} input - User input string
 * @returns {string} Sanitized string
 */
export function sanitizeInput(input) {
  if (!input || typeof input !== 'string') return '';
  
  // Basic HTML entity encoding
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

/**
 * Validates and sanitizes an array of tags
 * @param {array} tags - Array of tag strings
 * @returns {array} Sanitized and validated tags
 */
export function validateTags(tags) {
  if (!Array.isArray(tags)) return [];
  
  return tags
    .filter(tag => typeof tag === 'string' && tag.length > 0)
    .map(tag => sanitizeInput(tag.toLowerCase().trim()))
    .filter(tag => tag.length > 0 && tag.length <= 30)
    .slice(0, 30); // Maximum 30 tags
}

/**
 * Validates pagination parameters
 * @param {object} params - Pagination parameters
 * @returns {object} Validated pagination params
 */
export function validatePagination(params = {}) {
  const { page = 1, limit = 20 } = params;
  
  const validatedPage = Math.max(1, parseInt(page) || 1);
  const validatedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
  
  return {
    page: validatedPage,
    limit: validatedLimit,
    skip: (validatedPage - 1) * validatedLimit
  };
}

/**
 * Creates a validation middleware for API routes
 * @param {z.Schema} schema - Zod schema to validate against
 * @param {string} source - Data source ('body', 'query', 'params')
 * @returns {Function} Validation middleware
 */
export function createValidator(schema, source = 'body') {
  return async (request) => {
    try {
      let data;
      
      switch (source) {
        case 'body':
          data = await request.json();
          break;
        case 'query':
          const url = new URL(request.url);
          data = Object.fromEntries(url.searchParams);
          break;
        case 'params':
          // Params are passed via context in Next.js
          data = request.params || {};
          break;
        default:
          throw new Error(`Invalid validation source: ${source}`);
      }
      
      const validation = validateData(schema, data);
      
      if (!validation.success) {
        return { 
          isValid: false, 
          error: validation.error 
        };
      }
      
      return { 
        isValid: true, 
        data: validation.data 
      };
    } catch (error) {
      logger.error('Validation middleware error', error);
      return { 
        isValid: false, 
        error: { 
          message: 'Failed to validate request',
          errors: [{ path: 'unknown', message: error.message }]
        } 
      };
    }
  };
}