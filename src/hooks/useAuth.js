'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for authentication using Auth.js v5
 * Provides session management, sign in/out functionality, and loading states
 */
export function useAuth() {
  const { data: session, status, update } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Update loading state based on session status
  useEffect(() => {
    setIsLoading(status === 'loading');
  }, [status]);

  /**
   * Sign in user with specified provider
   * @param {string} provider - OAuth provider (default: 'google')
   * @param {string} callbackUrl - URL to redirect to after sign in
   * @returns {Promise<boolean>} Success status
   */
  const signInUser = useCallback(async (provider = 'google', callbackUrl = '/dashboard') => {
    try {
      setError(null);
      setIsLoading(true);

      const result = await signIn(provider, {
        callbackUrl,
        redirect: false // Handle redirect manually for better UX
      });

      if (result?.error) {
        setError(result.error);
        console.error('Sign in error:', result.error);
        return false;
      }

      // If successful and no redirect, manually redirect
      if (result?.ok && result?.url) {
        window.location.href = result.url;
        return true;
      }

      return true;
    } catch (error) {
      console.error('Sign in failed:', error);
      setError('Sign in failed. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Sign out user and redirect to home page
   * @param {string} callbackUrl - URL to redirect to after sign out
   * @returns {Promise<boolean>} Success status
   */
  const signOutUser = useCallback(async (callbackUrl = '/') => {
    try {
      setError(null);
      setIsLoading(true);

      const result = await signOut({
        callbackUrl,
        redirect: false // Handle redirect manually
      });

      // Clear any local storage or cached data if needed
      if (typeof window !== 'undefined') {
        // Clear any app-specific cache
        localStorage.removeItem('bookmarks-cache');
        localStorage.removeItem('user-preferences');
      }

      // Manual redirect for better UX
      window.location.href = callbackUrl;
      return true;
    } catch (error) {
      console.error('Sign out failed:', error);
      setError('Sign out failed. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update session data (useful for profile updates)
   * @param {Object} data - Data to update in session
   * @returns {Promise<boolean>} Success status
   */
  const updateSession = useCallback(async (data) => {
    try {
      setError(null);
      await update(data);
      return true;
    } catch (error) {
      console.error('Session update failed:', error);
      setError('Failed to update session');
      return false;
    }
  }, [update]);

  /**
   * Check if user has specific permissions or roles
   * @param {string|Array} permission - Permission(s) to check
   * @returns {boolean} Whether user has permission
   */
  const hasPermission = useCallback((permission) => {
    if (!session?.user) return false;

    // For now, all authenticated users have basic permissions
    // This can be extended when role-based access is implemented
    const basicPermissions = ['read', 'bookmark', 'scrape'];
    
    if (Array.isArray(permission)) {
      return permission.every(p => basicPermissions.includes(p));
    }
    
    return basicPermissions.includes(permission);
  }, [session]);

  /**
   * Get user display name with fallback
   * @returns {string} User display name
   */
  const getUserDisplayName = useCallback(() => {
    if (!session?.user) return 'Guest';
    
    return session.user.name || 
           session.user.email?.split('@')[0] || 
           'User';
  }, [session]);

  /**
   * Get user avatar URL with fallback
   * @returns {string} User avatar URL
   */
  const getUserAvatar = useCallback(() => {
    if (!session?.user?.image) {
      // Generate a fallback avatar URL (could use initials or default image)
      const name = getUserDisplayName();
      const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=3b82f6&color=fff&size=40`;
    }
    
    return session.user.image;
  }, [session, getUserDisplayName]);

  /**
   * Clear any authentication errors
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Check if user is authenticated
   * @returns {boolean} Whether user is authenticated
   */
  const isAuthenticated = session?.user != null;

  /**
   * Check if authentication is in loading state
   * @returns {boolean} Whether auth is loading
   */
  const isAuthLoading = status === 'loading' || isLoading;

  /**
   * Get session expiry information
   * @returns {Object} Session expiry data
   */
  const getSessionInfo = useCallback(() => {
    if (!session) return null;

    return {
      user: session.user,
      expires: session.expires,
      isExpired: session.expires ? new Date(session.expires) < new Date() : false,
      expiresIn: session.expires ? 
        Math.max(0, new Date(session.expires).getTime() - Date.now()) : null
    };
  }, [session]);

  // Return comprehensive auth state and methods
  return {
    // State
    session,
    user: session?.user || null,
    isAuthenticated,
    isLoading: isAuthLoading,
    error,

    // Methods
    signIn: signInUser,
    signOut: signOutUser,
    updateSession,
    hasPermission,
    clearError,

    // Computed values
    displayName: getUserDisplayName(),
    avatar: getUserAvatar(),
    sessionInfo: getSessionInfo(),

    // Status checks
    canBookmark: isAuthenticated,
    canScrape: isAuthenticated,
    canAccessDashboard: isAuthenticated,

    // Provider info
    provider: session?.user?.email ? 'google' : null,
    
    // Helper methods for components
    requireAuth: (callback) => {
      if (!isAuthenticated) {
        signInUser();
        return false;
      }
      return callback?.() ?? true;
    },

    // Format session for API calls
    getAuthHeaders: () => {
      if (!session) return {};
      return {
        'Authorization': `Bearer ${session.accessToken || 'session-token'}`,
        'X-User-Email': session.user?.email || '',
      };
    }
  };
}

/**
 * Hook to get authentication status without full auth object
 * Useful for components that only need to check auth status
 */
export function useAuthStatus() {
  const { status } = useSession();
  
  return {
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    isUnauthenticated: status === 'unauthenticated'
  };
}

/**
 * Hook to get user information only
 * Useful for components that only need user data
 */
export function useUser() {
  const { data: session, status } = useSession();
  
  return {
    user: session?.user || null,
    isLoading: status === 'loading'
  };
}

// Export default useAuth for primary usage
export default useAuth;