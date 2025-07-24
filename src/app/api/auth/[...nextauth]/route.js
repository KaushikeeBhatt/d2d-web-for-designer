/**
 * NextAuth.js v5 Route Handler
 * 
 * This file exports the NextAuth handlers for the App Router.
 * All auth configuration is centralized in src/auth.js
 * 
 * @module api/auth/[...nextauth]/route
 */

import { handlers } from '@/auth';
import { Logger } from '@/lib/utils/logger';

// Initialize logger for auth events
const logger = new Logger('NextAuth.Route');

/**
 * Wrap handlers with logging for debugging
 * 
 * @param {Function} handler - Original handler function
 * @param {string} method - HTTP method name
 * @returns {Function} Wrapped handler with logging
 */
function withLogging(handler, method) {
  return async (request, context) => {
    const startTime = Date.now();
    const url = request.url || 'Unknown URL';
    
    try {
      // Log incoming auth request
      logger.info(`${method} auth request`, {
        method,
        url,
        headers: {
          // Log only safe headers
          'user-agent': request.headers.get('user-agent'),
          'referer': request.headers.get('referer'),
        },
        timestamp: new Date().toISOString(),
      });

      // Call original handler
      const response = await handler(request, context);

      // Log successful auth response
      const duration = Date.now() - startTime;
      logger.info(`${method} auth response`, {
        method,
        url,
        status: response?.status || 'Unknown',
        duration: `${duration}ms`,
      });

      return response;
    } catch (error) {
      // Log auth errors
      const duration = Date.now() - startTime;
      logger.error(`${method} auth error`, {
        method,
        url,
        error: {
          message: error?.message || 'Unknown error',
          name: error?.name || 'Error',
          stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
        },
        duration: `${duration}ms`,
      });

      // Re-throw to let NextAuth handle the error
      throw error;
    }
  };
}

/**
 * Export NextAuth handlers for App Router
 * 
 * GET handler: Handles OAuth callbacks, session checks, etc.
 * POST handler: Handles signIn, signOut, session updates, etc.
 */
export const GET = withLogging(handlers.GET, 'GET');
export const POST = withLogging(handlers.POST, 'POST');

/**
 * Runtime configuration
 * Ensure this route runs on Node.js runtime
 */
export const runtime = 'nodejs';

/**
 * Route segment config
 * Configure caching and revalidation for auth routes
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Add CORS headers for auth endpoints if needed
 * This is handled automatically by NextAuth, but we log it
 */
if (process.env.NODE_ENV === 'development') {
  logger.info('NextAuth route initialized', {
    authUrl: process.env.AUTH_URL || 'Not set',
    providers: process.env.GOOGLE_CLIENT_ID ? ['google'] : ['none configured'],
  });
}