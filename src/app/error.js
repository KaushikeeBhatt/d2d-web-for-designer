'use client';

/**
 * Global Error Boundary Component
 * 
 * This component catches JavaScript errors anywhere in the app and displays
 * a fallback UI instead of the component tree that crashed.
 * 
 * @module app/error
 */

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Logger } from '@/lib/utils/logger';

// Initialize logger for error tracking
const logger = new Logger('ErrorBoundary');

/**
 * Error boundary component that handles runtime errors
 * 
 * @param {Object} props - Component props
 * @param {Error} props.error - The error object that was thrown
 * @param {Function} props.reset - Function to reset the error boundary and retry
 * @returns {JSX.Element} Error UI with recovery options
 */
export default function Error({ error, reset }) {
  /**
   * Log error details when component mounts or error changes
   */
  useEffect(() => {
    // Log error with full details
    logger.error('Application error occurred', {
      message: error?.message || 'Unknown error',
      stack: error?.stack || 'No stack trace available',
      name: error?.name || 'Error',
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'Unknown',
    });

    // Report to error tracking service in production
    if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
      // TODO: Integrate with error tracking service (e.g., Sentry, LogRocket)
      console.error('Production error:', error);
    }
  }, [error]);

  /**
   * Handle retry attempt
   */
  const handleRetry = () => {
    logger.info('User attempting to retry after error');
    
    try {
      // Clear any cached data that might be causing issues
      if (typeof window !== 'undefined' && window.caches) {
        window.caches.keys().then(names => {
          names.forEach(name => window.caches.delete(name));
        });
      }
      
      // Reset the error boundary
      reset();
    } catch (retryError) {
      logger.error('Error during retry attempt', retryError);
      // If retry fails, reload the page as last resort
      window.location.reload();
    }
  };

  /**
   * Navigate to home page
   */
  const handleGoHome = () => {
    logger.info('User navigating to home after error');
    
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  /**
   * Determine error type for user-friendly messaging
   */
  const getErrorType = () => {
    if (!error) return 'unknown';
    
    const errorMessage = error.message?.toLowerCase() || '';
    
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return 'network';
    }
    if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
      return 'permission';
    }
    if (errorMessage.includes('timeout')) {
      return 'timeout';
    }
    if (errorMessage.includes('database') || errorMessage.includes('mongodb')) {
      return 'database';
    }
    
    return 'generic';
  };

  const errorType = getErrorType();

  /**
   * Get user-friendly error message based on error type
   */
  const getUserMessage = () => {
    switch (errorType) {
      case 'network':
        return 'Unable to connect to our servers. Please check your internet connection and try again.';
      case 'permission':
        return 'You don\'t have permission to access this resource. Please log in and try again.';
      case 'timeout':
        return 'The request took too long to complete. Please try again.';
      case 'database':
        return 'We\'re having trouble accessing our database. Please try again in a moment.';
      default:
        return 'Something went wrong. We\'re working on fixing it.';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-6 text-center">
          {/* Error Icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>

          {/* Error Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Oops! Something went wrong
          </h1>

          {/* Error Description */}
          <p className="text-gray-600 mb-6">
            {getUserMessage()}
          </p>

          {/* Error Details (Development Only) */}
          {process.env.NODE_ENV === 'development' && error && (
            <details className="mb-6 text-left">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                Error Details (Development Only)
              </summary>
              <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono overflow-auto">
                <p className="font-semibold text-red-600">{error.name || 'Error'}</p>
                <p className="mt-1">{error.message || 'No error message'}</p>
                {error.stack && (
                  <pre className="mt-2 whitespace-pre-wrap text-gray-600">
                    {error.stack}
                  </pre>
                )}
              </div>
            </details>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={handleRetry}
              variant="primary"
              className="flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            
            <Button
              onClick={handleGoHome}
              variant="outline"
              className="flex items-center justify-center gap-2"
            >
              <Home className="h-4 w-4" />
              Go Home
            </Button>
          </div>

          {/* Support Link */}
          <p className="mt-6 text-sm text-gray-500">
            If this problem persists, please{' '}
            <a
              href="mailto:support@d2ddesigner.com"
              className="text-blue-600 hover:text-blue-500 underline"
            >
              contact support
            </a>
          </p>
        </div>

        {/* Additional Help Text */}
        <div className="mt-4 text-center text-sm text-gray-500">
          <p>Error ID: {Date.now().toString(36).toUpperCase()}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Static generation optimization
 * This helps Next.js optimize the error page
 */
export const dynamic = 'force-dynamic';