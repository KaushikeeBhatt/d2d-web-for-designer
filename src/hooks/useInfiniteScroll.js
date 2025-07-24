'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Logger } from '@/lib/utils/logger';

const logger = new Logger('useInfiniteScroll');

/**
 * Custom hook for implementing infinite scroll functionality
 * Handles intersection observer, loading states, and error handling
 * 
 * @param {Object} options - Hook configuration options
 * @param {Function} options.onLoadMore - Callback function to load more items
 * @param {boolean} options.hasMore - Whether there are more items to load
 * @param {boolean} options.isLoading - Current loading state
 * @param {number} options.threshold - Intersection threshold (0-1, default: 0.1)
 * @param {string} options.rootMargin - Root margin for intersection observer (default: '100px')
 * @param {boolean} options.enabled - Whether infinite scroll is enabled (default: true)
 * @param {number} options.delay - Delay in ms before triggering load (default: 100)
 * 
 * @returns {Object} Hook return values
 * @returns {React.RefObject} targetRef - Ref to attach to the trigger element
 * @returns {boolean} isIntersecting - Whether the trigger element is intersecting
 * @returns {Function} reset - Function to reset the infinite scroll state
 */
export function useInfiniteScroll({
  onLoadMore,
  hasMore = true,
  isLoading = false,
  threshold = 0.1,
  rootMargin = '100px',
  enabled = true,
  delay = 100
} = {}) {
  // State management
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [error, setError] = useState(null);
  
  // Refs
  const targetRef = useRef(null);
  const observerRef = useRef(null);
  const loadingRef = useRef(false);
  const timeoutRef = useRef(null);

  /**
   * Handles intersection observer callback
   * Triggers load more when target element becomes visible
   */
  const handleIntersection = useCallback(async (entries) => {
    try {
      const [entry] = entries;
      
      if (!entry) {
        logger.warn('No intersection entry found');
        return;
      }

      setIsIntersecting(entry.isIntersecting);

      // Check if we should trigger load more
      const shouldLoad = entry.isIntersecting && 
                        hasMore && 
                        !isLoading && 
                        !loadingRef.current &&
                        enabled;

      if (shouldLoad) {
        logger.info('Triggering load more', {
          hasMore,
          isLoading,
          enabled,
          isIntersecting: entry.isIntersecting
        });

        // Set loading flag to prevent duplicate calls
        loadingRef.current = true;

        // Clear any existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        // Add delay to prevent rapid fire requests
        timeoutRef.current = setTimeout(async () => {
          try {
            if (onLoadMore && typeof onLoadMore === 'function') {
              await onLoadMore();
              logger.info('Load more completed successfully');
            } else {
              logger.error('onLoadMore is not a valid function');
            }
          } catch (error) {
            logger.error('Failed to load more items', error);
            setError(error);
          } finally {
            loadingRef.current = false;
          }
        }, delay);
      }
    } catch (error) {
      logger.error('Intersection handler error', error);
      setError(error);
    }
  }, [onLoadMore, hasMore, isLoading, enabled, delay]);

  /**
   * Sets up the intersection observer
   */
  const setupObserver = useCallback(() => {
    try {
      // Clean up existing observer
      if (observerRef.current) {
        observerRef.current.disconnect();
        logger.debug('Existing observer disconnected');
      }

      // Check if IntersectionObserver is supported
      if (!window.IntersectionObserver) {
        logger.warn('IntersectionObserver not supported');
        return;
      }

      // Check if target element exists
      if (!targetRef.current) {
        logger.debug('Target element not yet available');
        return;
      }

      // Create new observer
      const observerOptions = {
        root: null,
        rootMargin,
        threshold: Array.isArray(threshold) ? threshold : [threshold]
      };

      observerRef.current = new IntersectionObserver(
        handleIntersection,
        observerOptions
      );

      // Start observing
      observerRef.current.observe(targetRef.current);
      
      logger.info('Intersection observer setup complete', observerOptions);
    } catch (error) {
      logger.error('Failed to setup intersection observer', error);
      setError(error);
    }
  }, [handleIntersection, threshold, rootMargin]);

  /**
   * Resets the infinite scroll state
   * Useful when filters change or data is refreshed
   */
  const reset = useCallback(() => {
    try {
      loadingRef.current = false;
      setIsIntersecting(false);
      setError(null);
      
      // Clear any pending timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Re-setup observer
      setupObserver();
      
      logger.info('Infinite scroll reset');
    } catch (error) {
      logger.error('Failed to reset infinite scroll', error);
    }
  }, [setupObserver]);

  /**
   * Effect to setup/cleanup observer when dependencies change
   */
  useEffect(() => {
    if (!enabled) {
      logger.debug('Infinite scroll disabled');
      return;
    }

    setupObserver();

    // Cleanup function
    return () => {
      try {
        if (observerRef.current) {
          observerRef.current.disconnect();
          logger.debug('Observer disconnected on cleanup');
        }

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      } catch (error) {
        logger.error('Cleanup error', error);
      }
    };
  }, [setupObserver, enabled]);

  /**
   * Effect to reset loading flag when isLoading prop changes
   */
  useEffect(() => {
    if (!isLoading) {
      loadingRef.current = false;
    }
  }, [isLoading]);

  /**
   * Effect to handle visibility change
   * Pauses loading when tab is not visible
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logger.debug('Page hidden, pausing infinite scroll');
        loadingRef.current = true;
      } else {
        logger.debug('Page visible, resuming infinite scroll');
        loadingRef.current = false;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Log state changes for debugging
  useEffect(() => {
    logger.debug('State updated', {
      isIntersecting,
      hasMore,
      isLoading,
      enabled,
      error: error?.message
    });
  }, [isIntersecting, hasMore, isLoading, enabled, error]);

  return {
    targetRef,
    isIntersecting,
    error,
    reset
  };
}

/**
 * Hook for implementing virtual scrolling with infinite scroll
 * Optimizes performance by only rendering visible items
 * 
 * @param {Object} options - Virtual scroll options
 * @param {Array} options.items - Array of items to render
 * @param {number} options.itemHeight - Height of each item in pixels
 * @param {number} options.containerHeight - Height of scroll container
 * @param {number} options.buffer - Number of items to render outside viewport
 * @param {Function} options.onLoadMore - Callback to load more items
 * @param {boolean} options.hasMore - Whether more items are available
 * 
 * @returns {Object} Virtual scroll state and helpers
 */
export function useVirtualInfiniteScroll({
  items = [],
  itemHeight = 100,
  containerHeight = 600,
  buffer = 5,
  onLoadMore,
  hasMore = true
} = {}) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollRef = useRef(null);

  // Calculate visible range
  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.ceil((scrollTop + containerHeight) / itemHeight);
  
  // Add buffer for smooth scrolling
  const startIndex = Math.max(0, visibleStart - buffer);
  const endIndex = Math.min(items.length, visibleEnd + buffer);
  
  // Get visible items
  const visibleItems = items.slice(startIndex, endIndex);
  
  // Calculate total height
  const totalHeight = items.length * itemHeight;
  
  // Calculate offset for visible items
  const offsetY = startIndex * itemHeight;

  /**
   * Handle scroll event
   */
  const handleScroll = useCallback((event) => {
    try {
      const newScrollTop = event.target.scrollTop;
      setScrollTop(newScrollTop);

      // Check if near bottom for infinite scroll
      const scrollPercentage = (newScrollTop + containerHeight) / totalHeight;
      
      if (scrollPercentage > 0.8 && hasMore && onLoadMore) {
        onLoadMore();
      }
    } catch (error) {
      logger.error('Scroll handler error', error);
    }
  }, [containerHeight, totalHeight, hasMore, onLoadMore]);

  return {
    scrollRef,
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    startIndex,
    endIndex
  };
}