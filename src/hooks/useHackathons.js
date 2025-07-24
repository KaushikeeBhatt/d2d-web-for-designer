'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';

/**
 * Custom hook for managing hackathons data with search, filtering, and pagination
 * @param {Object} options - Configuration options
 * @param {string} options.initialQuery - Initial search query
 * @param {string} options.initialCategory - Initial category filter
 * @param {string} options.initialPlatform - Initial platform filter
 * @param {string} options.initialSort - Initial sort option
 * @param {number} options.limit - Items per page
 * @param {boolean} options.autoFetch - Whether to fetch data automatically
 */
export function useHackathons({
  initialQuery = '',
  initialCategory = '',
  initialPlatform = '',
  initialSort = 'newest',
  limit = 20,
  autoFetch = true
} = {}) {
  // State management
  const [hackathons, setHackathons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // Search and filter state
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [platform, setPlatform] = useState(initialPlatform);
  const [sort, setSort] = useState(initialSort);
  
  // Cache for storing fetched data
  const [cache, setCache] = useState(new Map());
  
  const { session } = useAuth();

  /**
   * Generate cache key for current search parameters
   */
  const getCacheKey = useCallback((params) => {
    return `hackathons-${params.query}-${params.category}-${params.platform}-${params.sort}-${params.page}`;
  }, []);

  /**
   * Log hook activity for debugging
   */
  const logActivity = useCallback((action, data = {}) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[useHackathons] ${action}:`, data);
    }
  }, []);

  /**
   * Fetch hackathons from API with comprehensive error handling
   */
  const fetchHackathons = useCallback(async (params = {}, append = false) => {
    const searchParams = {
      q: params.query || query,
      category: params.category || category,
      platform: params.platform || platform,
      sort: params.sort || sort,
      page: params.page || currentPage,
      limit
    };

    const cacheKey = getCacheKey(searchParams);
    
    // Check cache first
    if (cache.has(cacheKey) && !params.force) {
      const cachedData = cache.get(cacheKey);
      logActivity('Cache hit', { cacheKey, count: cachedData.hackathons.length });
      
      if (append) {
        setHackathons(prev => [...prev, ...cachedData.hackathons]);
      } else {
        setHackathons(cachedData.hackathons);
      }
      setTotalCount(cachedData.totalCount);
      setHasMore(cachedData.hasMore);
      return cachedData;
    }

    try {
      setLoading(true);
      setError(null);
      
      logActivity('Fetching hackathons', searchParams);

      // Build query string
      const queryString = new URLSearchParams();
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          queryString.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/hackathons?${queryString.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.user && { 'Authorization': `Bearer ${session.accessToken}` })
        },
        cache: 'no-store' // Ensure fresh data
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to fetch hackathons');
      }

      const { hackathons: fetchedHackathons = [], totalCount: total = 0, pagination = {} } = data.data || {};
      
      // Validate response data
      if (!Array.isArray(fetchedHackathons)) {
        throw new Error('Invalid response format: hackathons must be an array');
      }

      const hasMorePages = pagination.hasMore ?? (fetchedHackathons.length === limit);
      
      logActivity('Fetch successful', {
        count: fetchedHackathons.length,
        total,
        hasMore: hasMorePages,
        page: searchParams.page
      });

      // Cache the results
      setCache(prev => new Map(prev).set(cacheKey, {
        hackathons: fetchedHackathons,
        totalCount: total,
        hasMore: hasMorePages,
        timestamp: Date.now()
      }));

      // Update state
      if (append) {
        setHackathons(prev => {
          // Remove duplicates based on _id
          const existingIds = new Set(prev.map(h => h._id));
          const newHackathons = fetchedHackathons.filter(h => !existingIds.has(h._id));
          return [...prev, ...newHackathons];
        });
      } else {
        setHackathons(fetchedHackathons);
      }
      
      setTotalCount(total);
      setHasMore(hasMorePages);
      
      return {
        hackathons: fetchedHackathons,
        totalCount: total,
        hasMore: hasMorePages
      };

    } catch (err) {
      const errorMessage = err.message || 'An unexpected error occurred';
      logActivity('Fetch failed', { error: errorMessage });
      setError(errorMessage);
      setHackathons(append ? prev => prev : []);
      return null;
    } finally {
      setLoading(false);
    }
  }, [query, category, platform, sort, currentPage, limit, cache, getCacheKey, logActivity, session]);

  /**
   * Search hackathons with debouncing
   */
  const searchHackathons = useCallback(async (searchQuery) => {
    logActivity('Search initiated', { query: searchQuery });
    setQuery(searchQuery);
    setCurrentPage(1);
    setHackathons([]);
    
    return fetchHackathons({ 
      query: searchQuery, 
      page: 1 
    });
  }, [fetchHackathons, logActivity]);

  /**
   * Apply filters and reset pagination
   */
  const applyFilters = useCallback(async (filters = {}) => {
    logActivity('Filters applied', filters);
    
    if (filters.category !== undefined) setCategory(filters.category);
    if (filters.platform !== undefined) setPlatform(filters.platform);
    if (filters.sort !== undefined) setSort(filters.sort);
    
    setCurrentPage(1);
    setHackathons([]);
    
    return fetchHackathons({ 
      ...filters, 
      page: 1 
    });
  }, [fetchHackathons, logActivity]);

  /**
   * Load more hackathons for pagination
   */
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) {
      logActivity('Load more skipped', { loading, hasMore });
      return;
    }

    const nextPage = currentPage + 1;
    logActivity('Loading more', { nextPage });
    
    setCurrentPage(nextPage);
    
    return fetchHackathons({ 
      page: nextPage 
    }, true);
  }, [loading, hasMore, currentPage, fetchHackathons, logActivity]);

  /**
   * Refresh data and clear cache
   */
  const refresh = useCallback(async () => {
    logActivity('Refresh initiated');
    setCache(new Map());
    setCurrentPage(1);
    setHackathons([]);
    
    return fetchHackathons({ 
      page: 1, 
      force: true 
    });
  }, [fetchHackathons, logActivity]);

  /**
   * Reset all filters and search
   */
  const reset = useCallback(() => {
    logActivity('Reset initiated');
    setQuery('');
    setCategory('');
    setPlatform('');
    setSort('newest');
    setCurrentPage(1);
    setHackathons([]);
    setError(null);
  }, [logActivity]);

  /**
   * Get hackathon by ID from current results
   */
  const getHackathonById = useCallback((id) => {
    return hackathons.find(h => h._id === id) || null;
  }, [hackathons]);

  /**
   * Clean old cache entries (older than 5 minutes)
   */
  const cleanCache = useCallback(() => {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    setCache(prev => {
      const newCache = new Map();
      for (const [key, value] of prev.entries()) {
        if (value.timestamp > fiveMinutesAgo) {
          newCache.set(key, value);
        }
      }
      return newCache;
    });
  }, []);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      logActivity('Auto-fetch triggered');
      fetchHackathons();
    }
  }, [autoFetch, fetchHackathons, logActivity]);

  // Clean cache periodically
  useEffect(() => {
    const interval = setInterval(cleanCache, 5 * 60 * 1000); // Every 5 minutes
    return () => clearInterval(interval);
  }, [cleanCache]);

  // Memoized computed values
  const stats = useMemo(() => ({
    total: totalCount,
    current: hackathons.length,
    pages: Math.ceil(totalCount / limit),
    currentPage,
    hasMore
  }), [totalCount, hackathons.length, limit, currentPage, hasMore]);

  const isEmpty = useMemo(() => 
    !loading && hackathons.length === 0 && !error
  , [loading, hackathons.length, error]);

  const filters = useMemo(() => ({
    query,
    category,
    platform,
    sort
  }), [query, category, platform, sort]);

  return {
    // Data
    hackathons,
    loading,
    error,
    stats,
    isEmpty,
    filters,
    
    // Actions
    searchHackathons,
    applyFilters,
    loadMore,
    refresh,
    reset,
    getHackathonById,
    
    // Utilities
    setQuery,
    setCategory,
    setPlatform,
    setSort
  };
}

export default useHackathons;