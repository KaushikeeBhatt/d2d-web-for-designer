/**
 * API Response Utilities
 * Standardized response format for all API endpoints
 * Ensures consistent error handling and response structure
 */

import { NextResponse } from 'next/server';
import { Logger } from './logger';

const logger = new Logger('ApiResponse');

/**
 * Creates a successful API response
 * @param {any} data - The response data
 * @param {number} status - HTTP status code (default: 200)
 * @param {object} meta - Additional metadata for the response
 * @returns {NextResponse} Formatted JSON response
 */
export function apiResponse(data, status = 200, meta = {}) {
  try {
    const response = {
      success: true,
      data: data || null,
      error: null,
      timestamp: new Date().toISOString(),
      ...meta
    };

    logger.debug('API Response', { status, dataType: typeof data });
    
    return NextResponse.json(response, { status });
  } catch (error) {
    logger.error('Failed to create API response', error);
    return apiError('Internal server error', 500);
  }
}

/**
 * Creates an error API response
 * @param {string} message - Error message
 * @param {number} status - HTTP status code (default: 500)
 * @param {any} details - Additional error details
 * @returns {NextResponse} Formatted error response
 */
export function apiError(message, status = 500, details = null) {
  try {
    const response = {
      success: false,
      data: null,
      error: {
        message: message || 'An error occurred',
        details: details || null,
        code: getErrorCode(status),
        timestamp: new Date().toISOString()
      }
    };

    logger.error('API Error', { status, message, details });
    
    return NextResponse.json(response, { status });
  } catch (error) {
    // Fallback error response
    return NextResponse.json({
      success: false,
      data: null,
      error: {
        message: 'Internal server error',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

/**
 * Creates a validation error response
 * @param {object|array} errors - Validation errors
 * @returns {NextResponse} Formatted validation error response
 */
export function apiValidationError(errors) {
  try {
    // Normalize errors to consistent format
    const normalizedErrors = Array.isArray(errors) 
      ? errors 
      : Object.entries(errors).map(([field, message]) => ({ field, message }));

    logger.warn('Validation error', { errors: normalizedErrors });

    return apiError('Validation failed', 400, {
      type: 'VALIDATION_ERROR',
      errors: normalizedErrors
    });
  } catch (error) {
    logger.error('Failed to create validation error response', error);
    return apiError('Validation failed', 400);
  }
}

/**
 * Creates a paginated response
 * @param {array} items - Array of items
 * @param {object} pagination - Pagination metadata
 * @returns {NextResponse} Formatted paginated response
 */
export function apiPaginatedResponse(items, pagination) {
  try {
    if (!Array.isArray(items)) {
      throw new Error('Items must be an array for paginated response');
    }

    const { page = 1, limit = 20, total = items.length } = pagination || {};
    
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    const meta = {
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(total),
        totalPages,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null
      }
    };

    logger.debug('Paginated response', meta.pagination);

    return apiResponse(items, 200, meta);
  } catch (error) {
    logger.error('Failed to create paginated response', error);
    return apiError('Failed to process pagination', 500);
  }
}

/**
 * Creates a no content response (204)
 * @returns {NextResponse} Empty response with 204 status
 */
export function apiNoContent() {
  logger.debug('No content response');
  return new NextResponse(null, { status: 204 });
}

/**
 * Creates a redirect response
 * @param {string} url - Redirect URL
 * @param {number} status - HTTP status code (default: 302)
 * @returns {NextResponse} Redirect response
 */
export function apiRedirect(url, status = 302) {
  try {
    if (!url) {
      throw new Error('Redirect URL is required');
    }

    logger.debug('Redirect response', { url, status });
    
    return NextResponse.redirect(new URL(url), status);
  } catch (error) {
    logger.error('Failed to create redirect response', error);
    return apiError('Invalid redirect URL', 400);
  }
}

/**
 * Handles rate limit exceeded errors
 * @param {number} retryAfter - Seconds until rate limit resets
 * @returns {NextResponse} Rate limit error response
 */
export function apiRateLimitError(retryAfter = 60) {
  const headers = {
    'Retry-After': String(retryAfter),
    'X-RateLimit-Limit': '60',
    'X-RateLimit-Remaining': '0',
    'X-RateLimit-Reset': new Date(Date.now() + retryAfter * 1000).toISOString()
  };

  logger.warn('Rate limit exceeded', { retryAfter });

  return NextResponse.json({
    success: false,
    data: null,
    error: {
      message: 'Rate limit exceeded. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter,
      timestamp: new Date().toISOString()
    }
  }, { status: 429, headers });
}

/**
 * Handles method not allowed errors
 * @param {array} allowedMethods - Array of allowed HTTP methods
 * @returns {NextResponse} Method not allowed error response
 */
export function apiMethodNotAllowed(allowedMethods = []) {
  const headers = {
    'Allow': allowedMethods.join(', ')
  };

  logger.warn('Method not allowed', { allowedMethods });

  return NextResponse.json({
    success: false,
    data: null,
    error: {
      message: `Method not allowed. Allowed methods: ${allowedMethods.join(', ')}`,
      code: 'METHOD_NOT_ALLOWED',
      timestamp: new Date().toISOString()
    }
  }, { status: 405, headers });
}

/**
 * Maps HTTP status codes to error codes
 * @param {number} status - HTTP status code
 * @returns {string} Error code
 */
function getErrorCode(status) {
  const errorCodes = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    405: 'METHOD_NOT_ALLOWED',
    409: 'CONFLICT',
    422: 'UNPROCESSABLE_ENTITY',
    429: 'RATE_LIMIT_EXCEEDED',
    500: 'INTERNAL_SERVER_ERROR',
    502: 'BAD_GATEWAY',
    503: 'SERVICE_UNAVAILABLE',
    504: 'GATEWAY_TIMEOUT'
  };

  return errorCodes[status] || 'UNKNOWN_ERROR';
}

/**
 * Wraps an async handler with error handling
 * @param {Function} handler - Async handler function
 * @returns {Function} Wrapped handler with error handling
 */
export function withErrorHandler(handler) {
  return async (request, context) => {
    try {
      // Log request details
      logger.debug('Request received', {
        method: request.method,
        url: request.url,
        headers: Object.fromEntries(request.headers.entries())
      });

      // Execute the handler
      const response = await handler(request, context);

      // Log response status
      if (response instanceof NextResponse) {
        logger.debug('Request completed', { status: response.status });
      }

      return response;
    } catch (error) {
      // Log the full error
      logger.error('Unhandled error in API route', error);

      // Handle specific error types
      if (error.name === 'ValidationError') {
        return apiValidationError(error.errors);
      }

      if (error.name === 'MongoError' && error.code === 11000) {
        return apiError('Duplicate entry found', 409);
      }

      if (error.name === 'CastError') {
        return apiError('Invalid ID format', 400);
      }

      if (error.message?.includes('ECONNREFUSED')) {
        return apiError('Database connection failed', 503);
      }

      // Default error response
      return apiError(
        process.env.NODE_ENV === 'development' 
          ? error.message 
          : 'An unexpected error occurred',
        500
      );
    }
  };
}

/**
 * Creates a response for successful resource creation
 * @param {any} data - Created resource data
 * @param {string} location - Location header URL
 * @returns {NextResponse} Created response with 201 status
 */
export function apiCreated(data, location = null) {
  const headers = {};
  
  if (location) {
    headers['Location'] = location;
  }

  logger.debug('Resource created', { hasLocation: !!location });

  return NextResponse.json({
    success: true,
    data,
    error: null,
    timestamp: new Date().toISOString()
  }, { status: 201, headers });
}

/**
 * Creates a response for accepted but processing requests
 * @param {string} message - Status message
 * @param {object} meta - Additional metadata
 * @returns {NextResponse} Accepted response with 202 status
 */
export function apiAccepted(message = 'Request accepted for processing', meta = {}) {
  logger.debug('Request accepted for processing');

  return NextResponse.json({
    success: true,
    data: { message },
    error: null,
    timestamp: new Date().toISOString(),
    ...meta
  }, { status: 202 });
}