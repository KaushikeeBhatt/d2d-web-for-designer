'use client';

import { useCallback, useMemo, Fragment } from 'react';
import { Loader2, AlertCircle, Search } from 'lucide-react';
import HackathonCard from './HackathonCard';
import { Button } from '@/components/ui/Button';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { Logger } from '@/lib/utils/logger';

const logger = new Logger('HackathonGrid');

/**
 * HackathonGrid Component
 * Displays a responsive grid of hackathon cards with infinite scroll support
 * 
 * @param {Object} props - Component props
 * @param {Array} props.hackathons - Array of hackathon objects to display
 * @param {Object} props.bookmarks - Object mapping hackathon IDs to bookmark status
 * @param {Function} props.onBookmark - Callback when bookmark is toggled
 * @param {Function} props.onView - Callback when hackathon is viewed
 * @param {Function} props.onLoadMore - Callback to load more hackathons
 * @param {boolean} props.isLoading - Whether hackathons are currently loading
 * @param {boolean} props.hasMore - Whether there are more hackathons to load
 * @param {string} props.error - Error message if loading failed
 * @param {boolean} props.showDescription - Whether to show descriptions on cards
 * @param {boolean} props.compact - Whether to use compact card layout
 * @param {string} props.emptyMessage - Message to show when no hackathons found
 * @param {string} props.className - Additional CSS classes
 */
export default function HackathonGrid({
  hackathons = [],
  bookmarks = {},
  onBookmark,
  onView,
  onLoadMore,
  isLoading = false,
  hasMore = false,
  error = null,
  showDescription = true,
  compact = false,
  emptyMessage = 'No hackathons found. Try adjusting your filters.',
  className = ''
}) {
  // Validate hackathons array
  const validHackathons = useMemo(() => {
    if (!Array.isArray(hackathons)) {
      logger.error('Invalid hackathons data provided', { hackathons });
      return [];
    }
    
    return hackathons.filter(h => h && h._id);
  }, [hackathons]);

  /**
   * Handles infinite scroll trigger
   */
  const handleLoadMore = useCallback(async () => {
    try {
      if (!onLoadMore || typeof onLoadMore !== 'function') {
        logger.warn('onLoadMore callback not provided');
        return;
      }

      if (!hasMore || isLoading) {
        logger.debug('Skipping load more', { hasMore, isLoading });
        return;
      }

      logger.info('Loading more hackathons');
      await onLoadMore();
    } catch (error) {
      logger.error('Failed to load more hackathons', error);
    }
  }, [onLoadMore, hasMore, isLoading]);

  // Setup infinite scroll
  const { targetRef, isIntersecting, error: scrollError } = useInfiniteScroll({
    onLoadMore: handleLoadMore,
    hasMore,
    isLoading,
    threshold: 0.1,
    rootMargin: '200px',
    enabled: !error && hasMore
  });

  /**
   * Handles retry after error
   */
  const handleRetry = useCallback(() => {
    try {
      logger.info('Retrying hackathon load');
      handleLoadMore();
    } catch (error) {
      logger.error('Retry failed', error);
    }
  }, [handleLoadMore]);

  /**
   * Renders loading state
   */
  const renderLoading = useCallback(() => {
    const skeletonCount = validHackathons.length > 0 ? 3 : 6;
    
    return (
      <div className={`grid gap-6 ${getGridClasses()}`}>
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <div 
            key={`skeleton-${index}`}
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-pulse"
          >
            {!compact && (
              <div className="h-48 bg-gray-200" />
            )}
            <div className="p-5 space-y-3">
              <div className="h-6 bg-gray-200 rounded w-3/4" />
              {showDescription && !compact && (
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded" />
                  <div className="h-4 bg-gray-200 rounded w-5/6" />
                </div>
              )}
              <div className="flex gap-4">
                <div className="h-4 bg-gray-200 rounded w-24" />
                <div className="h-4 bg-gray-200 rounded w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }, [validHackathons.length, compact, showDescription]);

  /**
   * Renders error state
   */
  const renderError = useCallback(() => {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Failed to load hackathons
        </h3>
        <p className="text-gray-600 text-center mb-4 max-w-md">
          {error || 'An unexpected error occurred while loading hackathons.'}
        </p>
        <Button onClick={handleRetry} variant="primary">
          Try Again
        </Button>
      </div>
    );
  }, [error, handleRetry]);

  /**
   * Renders empty state
   */
  const renderEmpty = useCallback(() => {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <Search className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No hackathons found
        </h3>
        <p className="text-gray-600 text-center max-w-md">
          {emptyMessage}
        </p>
      </div>
    );
  }, [emptyMessage]);

  /**
   * Gets grid classes based on layout
   */
  const getGridClasses = useCallback(() => {
    if (compact) {
      return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    }
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
  }, [compact]);

  // Handle error state
  if (error && validHackathons.length === 0) {
    return renderError();
  }

  // Handle initial loading state
  if (isLoading && validHackathons.length === 0) {
    return renderLoading();
  }

  // Handle empty state
  if (!isLoading && validHackathons.length === 0) {
    return renderEmpty();
  }

  return (
    <div className={className}>
      {/* Hackathon Grid */}
      <div className={`grid gap-6 ${getGridClasses()}`}>
        {validHackathons.map((hackathon, index) => {
          try {
            const isBookmarked = bookmarks[hackathon._id] || false;
            
            return (
              <Fragment key={hackathon._id || `hackathon-${index}`}>
                <HackathonCard
                  hackathon={hackathon}
                  isBookmarked={isBookmarked}
                  onBookmark={onBookmark}
                  onView={onView}
                  showDescription={showDescription}
                  compact={compact}
                />
              </Fragment>
            );
          } catch (error) {
            logger.error('Failed to render hackathon card', { 
              error, 
              hackathonId: hackathon._id 
            });
            return null;
          }
        })}
      </div>

      {/* Infinite Scroll Trigger */}
      {hasMore && !error && (
        <div 
          ref={targetRef}
          className="flex justify-center py-8"
          aria-label="Loading more hackathons"
        >
          {(isLoading || isIntersecting) && (
            <div className="flex items-center gap-2 text-gray-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading more hackathons...</span>
            </div>
          )}
        </div>
      )}

      {/* Load More Button (Fallback) */}
      {hasMore && !isLoading && !isIntersecting && (
        <div className="flex justify-center py-8">
          <Button
            onClick={handleLoadMore}
            variant="secondary"
            disabled={isLoading}
          >
            Load More Hackathons
          </Button>
        </div>
      )}

      {/* Scroll Error */}
      {scrollError && (
        <div className="flex justify-center py-4">
          <p className="text-sm text-red-600">
            Failed to load more hackathons. Please try again.
          </p>
        </div>
      )}

      {/* End of Results */}
      {!hasMore && validHackathons.length > 0 && (
        <div className="text-center py-8">
          <p className="text-gray-600">
            You've reached the end! {validHackathons.length} hackathons displayed.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * HackathonGrid Loading Component
 * Can be used for initial page load skeleton
 */
export function HackathonGridSkeleton({ count = 6, compact = false }) {
  return (
    <div className={`grid gap-6 ${compact ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div 
          key={`skeleton-${index}`}
          className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-pulse"
        >
          {!compact && (
            <div className="h-48 bg-gray-200" />
          )}
          <div className="p-5 space-y-3">
            <div className="h-6 bg-gray-200 rounded w-3/4" />
            {!compact && (
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded" />
                <div className="h-4 bg-gray-200 rounded w-5/6" />
              </div>
            )}
            <div className="flex gap-4">
              <div className="h-4 bg-gray-200 rounded w-24" />
              <div className="h-4 bg-gray-200 rounded w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}