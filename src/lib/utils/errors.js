/**
 * Custom Error Classes
 * Provides structured error handling with proper status codes and messages
 * @module utils/errors
 */

import { Logger } from './logger';

const logger = new Logger('ErrorHandler');

/**
 * Base custom error class
 */
export class AppError extends Error {
  /**
   * Create an application error
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {string} code - Internal error code
   * @param {Object} details - Additional error details
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.isOperational = true;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);

    // Log error creation
    logger.debug(`${this.name} created`, {
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details
    });
  }

  /**
   * Convert error to JSON format
   * @returns {Object} Serialized error
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      ...(process.env.NODE_ENV === 'development' && { stack: this.stack })
    };
  }

  /**
   * Convert error to client-safe format
   * @returns {Object} Client-safe error object
   */
  toClientJSON() {
    return {
      error: {
        message: this.message,
        code: this.code,
        timestamp: this.timestamp,
        ...(process.env.NODE_ENV === 'development' && { 
          details: this.details,
          stack: this.stack 
        })
      }
    };
  }
}

/**
 * Validation error for invalid input
 */
export class ValidationError extends AppError {
  /**
   * Create a validation error
   * @param {string} message - Error message
   * @param {Object} errors - Validation errors object
   */
  constructor(message = 'Validation failed', errors = {}) {
    super(message, 400, 'VALIDATION_ERROR', { errors });
    this.errors = errors;
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends AppError {
  /**
   * Create an authentication error
   * @param {string} message - Error message
   * @param {string} reason - Authentication failure reason
   */
  constructor(message = 'Authentication failed', reason = 'INVALID_CREDENTIALS') {
    super(message, 401, 'AUTHENTICATION_ERROR', { reason });
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends AppError {
  /**
   * Create an authorization error
   * @param {string} message - Error message
   * @param {string} resource - Resource being accessed
   * @param {string} action - Action being attempted
   */
  constructor(message = 'Access denied', resource = null, action = null) {
    super(message, 403, 'AUTHORIZATION_ERROR', { resource, action });
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  /**
   * Create a not found error
   * @param {string} resource - Resource type
   * @param {string} identifier - Resource identifier
   */
  constructor(resource = 'Resource', identifier = null) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 404, 'NOT_FOUND', { resource, identifier });
  }
}

/**
 * Conflict error for duplicate resources
 */
export class ConflictError extends AppError {
  /**
   * Create a conflict error
   * @param {string} message - Error message
   * @param {string} field - Conflicting field
   * @param {*} value - Conflicting value
   */
  constructor(message = 'Resource already exists', field = null, value = null) {
    super(message, 409, 'CONFLICT', { field, value });
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends AppError {
  /**
   * Create a rate limit error
   * @param {string} message - Error message
   * @param {number} retryAfter - Seconds until retry is allowed
   */
  constructor(message = 'Too many requests', retryAfter = 60) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', { retryAfter });
    this.retryAfter = retryAfter;
  }
}

/**
 * External service error
 */
export class ExternalServiceError extends AppError {
  /**
   * Create an external service error
   * @param {string} service - Service name
   * @param {string} message - Error message
   * @param {Object} originalError - Original error from service
   */
  constructor(service, message = 'External service error', originalError = null) {
    super(message, 503, 'EXTERNAL_SERVICE_ERROR', { service, originalError });
    this.service = service;
    this.originalError = originalError;
  }
}

/**
 * Database error
 */
export class DatabaseError extends AppError {
  /**
   * Create a database error
   * @param {string} message - Error message
   * @param {string} operation - Database operation
   * @param {Object} originalError - Original database error
   */
  constructor(message = 'Database error', operation = null, originalError = null) {
    super(message, 500, 'DATABASE_ERROR', { operation, originalError });
    this.operation = operation;
  }
}

/**
 * Scraping error
 */
export class ScrapingError extends AppError {
  /**
   * Create a scraping error
   * @param {string} source - Scraping source
   * @param {string} message - Error message
   * @param {Object} details - Error details
   */
  constructor(source, message = 'Scraping failed', details = {}) {
    super(message, 500, 'SCRAPING_ERROR', { source, ...details });
    this.source = source;
  }
}

/**
 * Configuration error
 */
export class ConfigurationError extends AppError {
  /**
   * Create a configuration error
   * @param {string} message - Error message
   * @param {string} missingConfig - Missing configuration key
   */
  constructor(message = 'Configuration error', missingConfig = null) {
    super(message, 500, 'CONFIGURATION_ERROR', { missingConfig });
    this.isOperational = false; // Non-operational error
  }
}

/**
 * Error handler utility functions
 */
export const ErrorHandler = {
  /**
   * Check if error is operational (expected)
   * @param {Error} error - Error to check
   * @returns {boolean} Whether error is operational
   */
  isOperational(error) {
    return error instanceof AppError && error.isOperational;
  },

  /**
   * Handle error and return appropriate response
   * @param {Error} error - Error to handle
   * @returns {Object} Error response object
   */
  handle(error) {
    // Log error
    if (this.isOperational(error)) {
      logger.warn('Operational error occurred', error);
    } else {
      logger.error('Unexpected error occurred', error);
    }

    // Convert known errors
    if (error.name === 'ValidationError' && error.errors) {
      // Mongoose validation error
      const errors = Object.keys(error.errors).reduce((acc, key) => {
        acc[key] = error.errors[key].message;
        return acc;
      }, {});
      return new ValidationError('Validation failed', errors);
    }

    if (error.code === 11000) {
      // MongoDB duplicate key error
      const field = Object.keys(error.keyPattern)[0];
      return new ConflictError(`Duplicate value for field: ${field}`, field);
    }

    if (error.name === 'CastError') {
      // Mongoose cast error
      return new ValidationError(`Invalid ${error.path}: ${error.value}`);
    }

    if (error.name === 'JsonWebTokenError') {
      // JWT error
      return new AuthenticationError('Invalid token');
    }

    if (error.name === 'TokenExpiredError') {
      // JWT expired error
      return new AuthenticationError('Token expired');
    }

    // Return original error if operational, otherwise generic error
    if (this.isOperational(error)) {
      return error;
    }

    // Generic error for non-operational errors
    return new AppError('An unexpected error occurred', 500, 'INTERNAL_ERROR');
  },

  /**
   * Create error from status code
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Error message
   * @returns {AppError} Appropriate error instance
   */
  fromStatusCode(statusCode, message) {
    switch (statusCode) {
      case 400:
        return new ValidationError(message);
      case 401:
        return new AuthenticationError(message);
      case 403:
        return new AuthorizationError(message);
      case 404:
        return new NotFoundError(message);
      case 409:
        return new ConflictError(message);
      case 429:
        return new RateLimitError(message);
      case 503:
        return new ExternalServiceError('Unknown', message);
      default:
        return new AppError(message, statusCode);
    }
  },

  /**
   * Async error wrapper for route handlers
   * @param {Function} fn - Async function to wrap
   * @returns {Function} Wrapped function
   */
  asyncHandler(fn) {
    return async (req, res, next) => {
      try {
        await fn(req, res, next);
      } catch (error) {
        const handledError = this.handle(error);
        logger.error('Route handler error', {
          method: req.method,
          path: req.path,
          error: handledError
        });
        res.status(handledError.statusCode).json(handledError.toClientJSON());
      }
    };
  }
};

export default ErrorHandler;