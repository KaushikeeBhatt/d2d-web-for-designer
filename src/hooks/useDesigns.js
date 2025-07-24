'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DESIGN_CATEGORIES } from '@/lib/scrapers/designs/categories';

/**
 * Custom hook for managing design inspiration gallery with infinite scroll and filtering
 * @param {Object} options - Configuration options
 * @param {string} options.initialCategory - Initial category filter
 * @param {string} options.initialSort - Initial sort option
 * @param {number} options.limit - Items per page
 * @param {boolean} options.autoFetch - Whether to fetch data automatically
 * @param {boolean} options.enableInfiniteScroll - Whether to enable infinite scroll
 */
export function useDesigns({
  initialCategory = DESIGN_CATEGORIES.ALL,
  initialSort = 'newest',
  limit = 24,
  autoFetch = true,
  enableInfiniteScroll = true
} = {}) {
  // State management
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filter and sort state
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState(initialSort);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Cache for storing fetched data
  const [cache, setCache] = useState(new Map());
  
  // Trending designs state
  const [trendingDesigns, setTrendingDesigns] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(false);

  /**
   * Generate cache key for current parameters
   */
  const getCacheKey = useCallback((params) => {
    return `designs-${params.category}-${params.sort}-${params.query}-${params.page}`;
  }, []);

  /**
   * Log hook activity for debugging
   */
  const logActivity = useCallback((action, data = {}) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[useDesigns] ${action}:`, data);
    }
  }, []);

  /**
   * Fetch designs from API with comprehensive error handling
   */
  const fetchDesigns = useCallback(async (params = {}, append = false) => {
    const searchParams = {
      category: params.category || category,
      sort: params.sort || sort,
      query: params.query || searchQuery,
      page: params.page || currentPage,
      limit
    };

    const cacheKey = getCacheKey(searchParams);
    
    // Check cache first
    if (cache.has(cacheKey) && !params.force) {
      const cachedData = cache.get(cacheKey);
      logActivity('Cache hit', { cacheKey, count: cachedData.designs.length });
      
      if (append) {
        setDesigns(prev => [...prev, ...cachedData.designs]);
      } else {
        setDesigns(cachedData.designs);
      }
      setTotalCount(cachedData.totalCount);
      setHasMore(cachedData.hasMore);
      return cachedData;
    }

    try {
      setLoading(true);
      setError(null);
      
      logActivity('Fetching designs', searchParams);

      // Build query string
      const queryString = new URLSearchParams();
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          queryString.append(key, value.toString());
        }
      });

      // Determine API endpoint
      const endpoint = searchParams.category === DESIGN_CATEGORIES.ALL 
        ? '/api/eyecandy'
        : `/api/eyecandy/${searchParams.category}`;

      const response = await fetch(`${endpoint}?${queryString.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store' // Ensure fresh data
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to fetch designs');
      }

      const { designs: fetchedDesigns = [], totalCount: total = 0, pagination = {} } = data.data || {};
      
      // Validate response data
      if (!Array.isArray(fetchedDesigns)) {
        throw new Error('Invalid response format: designs must be an array');
      }

      const hasMorePages = pagination.hasMore ?? (fetchedDesigns.length === limit);
      
      logActivity('Fetch successful', {
        count: fetchedDesigns.length,
        total,
        hasMore: hasMorePages,
        page: searchParams.page
      });

      // Cache the results
      setCache(prev => new Map(prev).set(cacheKey, {
        designs: fetchedDesigns,
        totalCount: total,
        hasMore: hasMorePages,
        timestamp: Date.now()
      }));

      // Update state
      if (append) {
        setDesigns(prev => {
          // Remove duplicates based on _id
          const existingIds = new Set(prev.map(d => d._id));
          const newDesigns = fetchedDesigns.filter(d => !existingIds.has(d._id));
          return [...prev, ...newDesigns];
        });
      } else {
        setDesigns(fetchedDesigns);
      }
      
      setTotalCount(total);
      setHasMore(hasMorePages);
      
      return {
        designs: fetchedDesigns,
        totalCount: total,
        hasMore: hasMorePages
      };

    } catch (err) {
      const errorMessage = err.message || 'An unexpected error occurred';
      logActivity('Fetch failed', { error: errorMessage });
      setError(errorMessage);
      setDesigns(append ? prev => prev : []);
      return null;
    } finally {
      setLoading(false);
    }
  }, [category, sort, searchQuery, currentPage, limit, cache, getCacheKey, logActivity]);

  /**
   * Fetch trending designs
   */
  const fetchTrendingDesigns = useCallback(async () => {
    try {
      setTrendingLoading(true);
      
      logActivity('Fetching trending designs');

      const response = await fetch('/api/eyecandy/trending', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to fetch trending designs');
      }

      const { designs: trending = [] } = data.data || {};
      
      if (!Array.isArray(trending)) {
        throw new Error('Invalid response format: trending designs must be an array');
      }

      logActivity('Trending fetch successful', { count: trending.length });
      setTrendingDesigns(trending);
      
      return trending;

    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch trending designs';
      logActivity('Trending fetch failed', { error: errorMessage });
      return [];
    } finally {
      setTrendingLoading(false);
    }
  }, [logActivity]);

  /**
   * Search designs
   */
  const searchDesigns = useCallback(async (query) => {
    logActivity('Search initiated', { query });
    setSearchQuery(query);
    setCurrentPage(1);
    setDesigns([]);
    
    return fetchDesigns({ 
      query, 
      page: 1 
    });
  }, [fetchDesigns, logActivity]);

  /**
   * Change category filter
   */
  const changeCategory = useCallback(async (newCategory) => {
    if (newCategory === category) return;
    
    logActivity('Category changed', { from: category, to: newCategory });
    setCategory(newCategory);
    setCurrentPage(1);
    setDesigns([]);
    
    return fetchDesigns({ 
      category: newCategory, 
      page: 1 
    });
  }, [category, fetchDesigns, logActivity]);

  /**
   * Change sort order
   */
  const changeSort = useCallback(async (newSort) => {
    if (newSort === sort) return;
    
    logActivity('Sort changed', { from: sort, to: newSort });
    setSort(newSort);
    setCurrentPage(1);
    setDesigns([]);
    
    return fetchDesigns({ 
      sort: newSort, 
      page: 1 
    });
  }, [sort, fetchDesigns, logActivity]);

  /**
   * Load more designs for infinite scroll
   */
  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !enableInfiniteScroll) {
      logActivity('Load more skipped', { loading, hasMore, infiniteScrollEnabled: enableInfiniteScroll });
      return;
    }

    const nextPage = currentPage + 1;
    logActivity('Loading more', { nextPage });
    
    setCurrentPage(nextPage);
    
    return fetchDesigns({ 
      page: nextPage 
    }, true);
  }, [loading, hasMore, enableInfiniteScroll, currentPage, fetchDesigns, logActivity]);

  /**
   * Refresh data and clear cache
   */
  const refresh = useCallback(async () => {
    logActivity('Refresh initiated');
    setCache(new Map());
    setCurrentPage(1);
    setDesigns([]);
    
    return fetchDesigns({ 
      page: 1, 
      force: true 
    });
  }, [fetchDesigns, logActivity]);

  /**
   * Reset all filters and search
   */
  const reset = useCallback(() => {
    logActivity('Reset initiated');
    setCategory(DESIGN_CATEGORIES.ALL);
    setSort('newest');
    setSearchQuery('');
    setCurrentPage(1);
    setDesigns([]);
    setError(null);
  }, [logActivity]);

  /**
   * Get design by ID from current results
   */
  const getDesignById = useCallback((id) => {
    return designs.find(d => d._id === id) || null;
  }, [designs]);

  /**
   * Clean old cache entries (older than 10 minutes)
   */
  const cleanCache = useCallback(() => {
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
    setCache(prev => {
      const newCache = new Map();
      for (const [key, value] of prev.entries()) {
        if (value.timestamp > tenMinutesAgo) {
          newCache.set(key, value);
        }
      }
      return newCache;
    });
  }, []);

  /**
   * Get designs by category from current results
   */
  const getDesignsByCategory = useCallback((targetCategory) => {
    if (targetCategory === DESIGN_CATEGORIES.ALL) {
      return designs;
    }
    return designs.filter(d => d.category === targetCategory);
  }, [designs]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      logActivity('Auto-fetch triggered');
      fetchDesigns();
    }
  }, [autoFetch, fetchDesigns, logActivity]);

  // Auto-fetch trending designs on mount
  useEffect(() => {
    if (autoFetch) {
      fetchTrendingDesigns();
    }
  }, [autoFetch, fetchTrendingDesigns]);

  // Clean cache periodically
  useEffect(() => {
    const interval = setInterval(cleanCache, 10 * 60 * 1000); // Every 10 minutes
    return () => clearInterval(interval);
  }, [cleanCache]);

  // Memoized computed values
  const stats = useMemo(() => ({
    total: totalCount,
    current: designs.length,
    pages: Math.ceil(totalCount / limit),
    currentPage,
    hasMore,
    trending: trendingDesigns.length
  }), [totalCount, designs.length, limit, currentPage, hasMore, trendingDesigns.length]);

  const isEmpty = useMemo(() => 
    !loading && designs.length === 0 && !error
  , [loading, designs.length, error]);

  const filters = useMemo(() => ({
    category,
    sort,
    query: searchQuery
  }), [category, sort, searchQuery]);

  const categoriesWithCounts = useMemo(() => {
    const counts = {};
    Object.values(DESIGN_CATEGORIES).forEach(cat => {
      counts[cat] = cat === DESIGN_CATEGORIES.ALL 
        ? designs.length 
        : designs.filter(d => d.category === cat).length;
    });
    return counts;
  }, [designs]);

  return {
    // Data
    designs,
    trendingDesigns,
    loading,
    trendingLoading,
    error,
    stats,
    isEmpty,
    filters,
    categoriesWithCounts,
    
    // Actions
    searchDesigns,
    changeCategory,
    changeSort,
    loadMore,
    refresh,
    reset,
    getDesignById,
    getDesignsByCategory,
    fetchTrendingDesigns,
    
    // Utilities
    setSearchQuery,
    setCategory,
    setSort,
    
    // Constants
    DESIGN_CATEGORIES
  };
}

export default useDesigns;