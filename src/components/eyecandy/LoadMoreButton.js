'use client';

import { useState, useCallback, useEffect } from 'react';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';

/**
 * LoadMoreButton Component
 * Handles pagination and infinite scroll loading for design gallery
 * @param {Object} props - Component props
 * @param {Function} props.onLoadMore - Callback function to load more items
 * @param {boolean} props.hasMore - Whether there are more items to load
 * @param {boolean} props.isLoading - Loading state from parent
 * @param {number} props.currentPage - Current page number
 * @param {number} props.totalPages - Total number of pages available
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.autoLoad - Enable automatic loading on scroll
 * @param {number} props.threshold - Scroll threshold for auto-loading (default: 200px)
 */
export default function LoadMoreButton({
  onLoadMore,
  hasMore = true,
  isLoading = false,
  currentPage = 1,
  totalPages = null,
  className = '',
  autoLoad = true,
  threshold = 200
}) {
  // Local state for error handling
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isIntersecting, setIsIntersecting] = useState(false);

  // Maximum retry attempts
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1 second

  /**
   * Handle load more action with error handling and retry logic
   */
  const handleLoadMore = useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (isLoading || !hasMore) {
      console.log('[LoadMoreButton] Skipping load - isLoading:', isLoading, 'hasMore:', hasMore);
      return;
    }

    // Clear previous errors
    setError(null);

    try {
      console.log('[LoadMoreButton] Loading more items - Page:', currentPage + 1);
      await onLoadMore();
      
      // Reset retry count on success
      setRetryCount(0);
    } catch (err) {
      console.error('[LoadMoreButton] Error loading more items:', err);
      setError(err.message || 'Failed to load more designs');

      // Implement retry logic
      if (retryCount < MAX_RETRIES) {
        console.log(`[LoadMoreButton] Retrying... Attempt ${retryCount + 1}/${MAX_RETRIES}`);
        setRetryCount(prev => prev + 1);
        
        // Exponential backoff for retries
        setTimeout(() => {
          handleLoadMore();
        }, RETRY_DELAY * Math.pow(2, retryCount));
      }
    }
  }, [onLoadMore, isLoading, hasMore, currentPage, retryCount]);

  /**
   * Handle manual retry after max retries reached
   */
  const handleManualRetry = useCallback(() => {
    console.log('[LoadMoreButton] Manual retry initiated');
    setRetryCount(0);
    setError(null);
    handleLoadMore();
  }, [handleLoadMore]);

  /**
   * Set up intersection observer for infinite scroll
   */
  useEffect(() => {
    // Skip if auto-load is disabled or no more items
    if (!autoLoad || !hasMore || isLoading) {
      return;
    }

    // Create intersection observer
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting) {
          console.log('[LoadMoreButton] Intersection detected - Auto loading');
          setIsIntersecting(true);
          handleLoadMore();
        } else {
          setIsIntersecting(false);
        }
      },
      {
        root: null,
        rootMargin: `${threshold}px`,
        threshold: 0.1
      }
    );

    // Find the button element and observe it
    const buttonElement = document.getElementById('load-more-button');
    if (buttonElement) {
      observer.observe(buttonElement);
      console.log('[LoadMoreButton] Observer attached with threshold:', threshold);
    }

    // Cleanup observer on unmount
    return () => {
      if (buttonElement) {
        observer.unobserve(buttonElement);
      }
      observer.disconnect();
    };
  }, [autoLoad, hasMore, isLoading, threshold, handleLoadMore]);

  /**
   * Log component state changes for debugging
   */
  useEffect(() => {
    console.log('[LoadMoreButton] State updated:', {
      hasMore,
      isLoading,
      currentPage,
      totalPages,
      error,
      retryCount,
      isIntersecting
    });
  }, [hasMore, isLoading, currentPage, totalPages, error, retryCount, isIntersecting]);

  // Don't render if there are no more items and no error
  if (!hasMore && !error) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 text-sm">
          {totalPages && currentPage >= totalPages
            ? `You've reached the end! (${currentPage} of ${totalPages} pages)`
            : "That's all for now!"}
        </p>
      </div>
    );
  }

  // Error state with retry option
  if (error && retryCount >= MAX_RETRIES) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4">
        <div className="flex items-center gap-2 text-red-600 mb-4">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-medium">Unable to load more designs</p>
        </div>
        <p className="text-gray-600 text-sm mb-4 text-center max-w-md">
          {error}
        </p>
        <button
          onClick={handleManualRetry}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          aria-label="Retry loading more designs"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Try Again</span>
        </button>
      </div>
    );
  }

  // Loading or ready state
  return (
    <div
      id="load-more-button"
      className={`flex justify-center py-8 ${className}`}
    >
      {isLoading || (error && retryCount < MAX_RETRIES) ? (
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
            <span className="text-gray-600">
              {error && retryCount > 0
                ? `Retrying... (${retryCount}/${MAX_RETRIES})`
                : 'Loading more designs...'}
            </span>
          </div>
          {totalPages && (
            <p className="text-sm text-gray-500">
              Page {currentPage} of {totalPages}
            </p>
          )}
        </div>
      ) : (
        <button
          onClick={handleLoadMore}
          disabled={isLoading || !hasMore}
          className="group relative px-6 py-3 bg-white border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Load more designs"
        >
          <span className="flex items-center gap-2 text-gray-700 group-hover:text-primary-600">
            <RefreshCw className="w-4 h-4" />
            <span className="font-medium">Load More</span>
          </span>
          {totalPages && (
            <span className="absolute -top-2 -right-2 px-2 py-1 bg-primary-600 text-white text-xs rounded-full">
              {currentPage}/{totalPages}
            </span>
          )}
        </button>
      )}
    </div>
  );
}