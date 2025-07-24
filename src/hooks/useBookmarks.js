'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';

/**
 * Custom hook for managing user bookmarks with optimistic updates
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoFetch - Whether to fetch bookmarks automatically
 * @param {boolean} options.enableOptimistic - Whether to use optimistic updates
 */
export function useBookmarks({
  autoFetch = true,
  enableOptimistic = true
} = {}) {
  // State management
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(new Set());
  
  const { session, loading: authLoading } = useAuth();

  /**
   * Log hook activity for debugging
   */
  const logActivity = useCallback((action, data = {}) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[useBookmarks] ${action}:`, data);
    }
  }, []);

  /**
   * Check if user is authenticated
   */
  const isAuthenticated = useMemo(() => 
    Boolean(session?.user && !authLoading)
  , [session, authLoading]);

  /**
   * Fetch user bookmarks with comprehensive error handling
   */
  const fetchBookmarks = useCallback(async () => {
    if (!isAuthenticated) {
      logActivity('Fetch skipped - not authenticated');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      logActivity('Fetching bookmarks');

      const response = await fetch('/api/bookmarks', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to fetch bookmarks');
      }

      const fetchedBookmarks = data.data?.bookmarks || [];
      
      // Validate response data
      if (!Array.isArray(fetchedBookmarks)) {
        throw new Error('Invalid response format: bookmarks must be an array');
      }

      logActivity('Fetch successful', { count: fetchedBookmarks.length });
      setBookmarks(fetchedBookmarks);
      
      return fetchedBookmarks;

    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch bookmarks';
      logActivity('Fetch failed', { error: errorMessage });
      setError(errorMessage);
      setBookmarks([]);
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, logActivity]);

  /**
   * Add a new bookmark with optimistic updates
   */
  const addBookmark = useCallback(async (hackathonId, notes = '') => {
    if (!isAuthenticated) {
      throw new Error('Authentication required to bookmark hackathons');
    }

    if (!hackathonId) {
      throw new Error('Hackathon ID is required');
    }

    // Check if already bookmarked
    const existingBookmark = bookmarks.find(b => b.hackathonId === hackathonId);
    if (existingBookmark) {
      logActivity('Bookmark already exists', { hackathonId });
      return existingBookmark;
    }

    setActionLoading(prev => new Set(prev).add(hackathonId));
    
    // Optimistic update
    let optimisticBookmark = null;
    if (enableOptimistic) {
      optimisticBookmark = {
        _id: `temp-${Date.now()}`,
        hackathonId,
        notes: notes.trim(),
        createdAt: new Date().toISOString(),
        isOptimistic: true
      };
      
      setBookmarks(prev => [optimisticBookmark, ...prev]);
      logActivity('Optimistic add', { hackathonId, notes });
    }

    try {
      const response = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          hackathonId,
          notes: notes.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to add bookmark');
      }

      const newBookmark = data.data?.bookmark;
      if (!newBookmark) {
        throw new Error('Invalid response: bookmark data missing');
      }

      logActivity('Add successful', { hackathonId, bookmarkId: newBookmark._id });

      // Replace optimistic update with real data
      if (enableOptimistic && optimisticBookmark) {
        setBookmarks(prev => 
          prev.map(b => b._id === optimisticBookmark._id ? newBookmark : b)
        );
      } else {
        setBookmarks(prev => [newBookmark, ...prev]);
      }

      return newBookmark;

    } catch (err) {
      const errorMessage = err.message || 'Failed to add bookmark';
      logActivity('Add failed', { error: errorMessage, hackathonId });

      // Revert optimistic update
      if (enableOptimistic && optimisticBookmark) {
        setBookmarks(prev => 
          prev.filter(b => b._id !== optimisticBookmark._id)
        );
      }

      throw new Error(errorMessage);
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(hackathonId);
        return newSet;
      });
    }
  }, [isAuthenticated, bookmarks, enableOptimistic, logActivity]);

  /**
   * Remove a bookmark with optimistic updates
   */
  const removeBookmark = useCallback(async (bookmarkId, hackathonId = null) => {
    if (!isAuthenticated) {
      throw new Error('Authentication required to manage bookmarks');
    }

    if (!bookmarkId) {
      throw new Error('Bookmark ID is required');
    }

    // Find bookmark to remove
    const bookmarkToRemove = bookmarks.find(b => b._id === bookmarkId);
    if (!bookmarkToRemove) {
      logActivity('Bookmark not found', { bookmarkId });
      return;
    }

    const targetHackathonId = hackathonId || bookmarkToRemove.hackathonId;
    setActionLoading(prev => new Set(prev).add(targetHackathonId));

    // Optimistic update
    if (enableOptimistic) {
      setBookmarks(prev => prev.filter(b => b._id !== bookmarkId));
      logActivity('Optimistic remove', { bookmarkId, hackathonId: targetHackathonId });
    }

    try {
      const response = await fetch(`/api/bookmarks/${bookmarkId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to remove bookmark');
      }

      logActivity('Remove successful', { bookmarkId, hackathonId: targetHackathonId });

      // Ensure bookmark is removed if not using optimistic updates
      if (!enableOptimistic) {
        setBookmarks(prev => prev.filter(b => b._id !== bookmarkId));
      }

      return true;

    } catch (err) {
      const errorMessage = err.message || 'Failed to remove bookmark';
      logActivity('Remove failed', { error: errorMessage, bookmarkId });

      // Revert optimistic update
      if (enableOptimistic) {
        setBookmarks(prev => {
          // Add back the bookmark in its original position
          const bookmarkExists = prev.some(b => b._id === bookmarkId);
          if (!bookmarkExists) {
            return [bookmarkToRemove, ...prev];
          }
          return prev;
        });
      }

      throw new Error(errorMessage);
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetHackathonId);
        return newSet;
      });
    }
  }, [isAuthenticated, bookmarks, enableOptimistic, logActivity]);

  /**
   * Update bookmark notes
   */
  const updateBookmark = useCallback(async (bookmarkId, updates) => {
    if (!isAuthenticated) {
      throw new Error('Authentication required to update bookmarks');
    }

    if (!bookmarkId) {
      throw new Error('Bookmark ID is required');
    }

    const bookmarkToUpdate = bookmarks.find(b => b._id === bookmarkId);
    if (!bookmarkToUpdate) {
      throw new Error('Bookmark not found');
    }

    setActionLoading(prev => new Set(prev).add(bookmarkToUpdate.hackathonId));

    // Optimistic update
    if (enableOptimistic) {
      setBookmarks(prev => 
        prev.map(b => 
          b._id === bookmarkId 
            ? { ...b, ...updates, updatedAt: new Date().toISOString() }
            : b
        )
      );
      logActivity('Optimistic update', { bookmarkId, updates });
    }

    try {
      const response = await fetch(`/api/bookmarks/${bookmarkId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to update bookmark');
      }

      const updatedBookmark = data.data?.bookmark;
      if (!updatedBookmark) {
        throw new Error('Invalid response: bookmark data missing');
      }

      logActivity('Update successful', { bookmarkId, updates });

      // Replace with real data
      setBookmarks(prev => 
        prev.map(b => b._id === bookmarkId ? updatedBookmark : b)
      );

      return updatedBookmark;

    } catch (err) {
      const errorMessage = err.message || 'Failed to update bookmark';
      logActivity('Update failed', { error: errorMessage, bookmarkId });

      // Revert optimistic update
      if (enableOptimistic) {
        setBookmarks(prev => 
          prev.map(b => b._id === bookmarkId ? bookmarkToUpdate : b)
        );
      }

      throw new Error(errorMessage);
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(bookmarkToUpdate.hackathonId);
        return newSet;
      });
    }
  }, [isAuthenticated, bookmarks, enableOptimistic, logActivity]);

  /**
   * Check if a hackathon is bookmarked
   */
  const isBookmarked = useCallback((hackathonId) => {
    return bookmarks.some(b => b.hackathonId === hackathonId);
  }, [bookmarks]);

  /**
   * Get bookmark by hackathon ID
   */
  const getBookmarkByHackathonId = useCallback((hackathonId) => {
    return bookmarks.find(b => b.hackathonId === hackathonId) || null;
  }, [bookmarks]);

  /**
   * Toggle bookmark status for a hackathon
   */
  const toggleBookmark = useCallback(async (hackathonId, notes = '') => {
    const existingBookmark = getBookmarkByHackathonId(hackathonId);
    
    if (existingBookmark) {
      await removeBookmark(existingBookmark._id, hackathonId);
      return { action: 'removed', bookmark: null };
    } else {
      const newBookmark = await addBookmark(hackathonId, notes);
      return { action: 'added', bookmark: newBookmark };
    }
  }, [getBookmarkByHackathonId, removeBookmark, addBookmark]);

  /**
   * Refresh bookmarks
   */
  const refresh = useCallback(async () => {
    logActivity('Refresh initiated');
    return fetchBookmarks();
  }, [fetchBookmarks, logActivity]);

  // Auto-fetch on mount and auth state change
  useEffect(() => {
    if (autoFetch && isAuthenticated) {
      logActivity('Auto-fetch triggered');
      fetchBookmarks();
    }
  }, [autoFetch, isAuthenticated, fetchBookmarks, logActivity]);

  // Clear bookmarks when user logs out
  useEffect(() => {
    if (!isAuthenticated && bookmarks.length > 0) {
      logActivity('Clearing bookmarks - user logged out');
      setBookmarks([]);
      setError(null);
    }
  }, [isAuthenticated, bookmarks.length, logActivity]);

  // Memoized computed values
  const stats = useMemo(() => ({
    total: bookmarks.length,
    recent: bookmarks.slice(0, 5),
    hasBookmarksEnabled: isAuthenticated
  }), [bookmarks, isAuthenticated]);

  const isEmpty = useMemo(() => 
    !loading && bookmarks.length === 0 && !error && isAuthenticated
  , [loading, bookmarks.length, error, isAuthenticated]);

  return {
    // Data
    bookmarks,
    loading,
    error,
    stats,
    isEmpty,
    isAuthenticated,
    
    // State checks
    isBookmarked,
    getBookmarkByHackathonId,
    
    // Actions
    addBookmark,
    removeBookmark,
    updateBookmark,
    toggleBookmark,
    refresh,
    
    // Loading states
    actionLoading: (hackathonId) => actionLoading.has(hackathonId)
  };
}

export default useBookmarks;