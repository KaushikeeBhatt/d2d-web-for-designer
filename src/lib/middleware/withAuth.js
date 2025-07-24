import { auth } from '@/auth';
import { apiError } from '@/lib/utils/apiResponse';

/**
 * Middleware to protect API routes by requiring authentication.
 * Usage: export const GET = withAuth(async (req, ctx) => { ... });
 * @param {Function} handler - The API route handler to wrap.
 * @returns {Function} - A new handler that checks authentication.
 */
export function withAuth(handler) {
  return async (request, context) => {
    try {
      const session = await auth();

      if (!session?.user) {
        console.warn('[withAuth] Unauthorized access attempt', {
          path: request?.nextUrl?.pathname,
          ip: request?.headers?.get('x-forwarded-for') || request?.ip,
        });
        return apiError('Unauthorized', 401);
      }

      // Attach session to request for downstream use
      request.session = session;

      return handler(request, context);
    } catch (error) {
      console.error('[withAuth] Error during authentication', error);
      return apiError('Internal server error', 500, error?.message || error);
    }
  };
}

// Example usage in API route:
// export const GET = withAuth(async (req, ctx) => { ... });