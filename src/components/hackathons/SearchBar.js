'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Logger } from '@/lib/utils/logger';

const logger = new Logger('SearchBar');

/**
 * SearchBar Component
 * Provides search functionality for hackathons with debouncing and loading states
 * 
 * @param {Object} props - Component props
 * @param {string} props.placeholder - Placeholder text for search input
 * @param {number} props.debounceDelay - Delay in ms before search executes (default: 300)
 * @param {Function} props.onSearch - Callback function when search is performed
 * @param {boolean} props.isLoading - Loading state from parent component
 * @param {string} props.className - Additional CSS classes
 */
export default function SearchBar({ 
  placeholder = 'Search hackathons...', 
  debounceDelay = 300,
  onSearch,
  isLoading = false,
  className = ''
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Initialize search query from URL params
  useEffect(() => {
    try {
      const query = searchParams.get('q') || '';
      setSearchQuery(query);
      logger.info('Search query initialized from URL', { query });
    } catch (error) {
      logger.error('Failed to initialize search query', error);
    }
  }, [searchParams]);

  /**
   * Updates URL search params while preserving other params
   * @param {string} query - Search query to set in URL
   */
  const updateURLParams = useCallback((query) => {
    try {
      const params = new URLSearchParams(searchParams);
      
      if (query && query.trim()) {
        params.set('q', query.trim());
      } else {
        params.delete('q');
      }
      
      // Reset to first page when searching
      params.set('page', '1');
      
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      router.push(newUrl, { scroll: false });
      
      logger.info('URL params updated', { query, url: newUrl });
    } catch (error) {
      logger.error('Failed to update URL params', error);
    }
  }, [router, searchParams]);

  /**
   * Handles search execution with debouncing
   * @param {string} query - Search query to execute
   */
  const executeSearch = useCallback((query) => {
    try {
      setIsSearching(true);
      
      // Update URL params
      updateURLParams(query);
      
      // Call parent onSearch callback if provided
      if (onSearch && typeof onSearch === 'function') {
        onSearch(query);
      }
      
      logger.info('Search executed', { query });
    } catch (error) {
      logger.error('Search execution failed', error);
    } finally {
      setIsSearching(false);
    }
  }, [updateURLParams, onSearch]);

  /**
   * Handles input change with debouncing
   * @param {React.ChangeEvent<HTMLInputElement>} event - Input change event
   */
  const handleInputChange = useCallback((event) => {
    try {
      const value = event.target.value;
      setSearchQuery(value);
      
      // Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      // Set new debounce timer
      debounceTimerRef.current = setTimeout(() => {
        executeSearch(value);
      }, debounceDelay);
      
      logger.debug('Search input changed', { value });
    } catch (error) {
      logger.error('Failed to handle input change', error);
    }
  }, [executeSearch, debounceDelay]);

  /**
   * Handles form submission for immediate search
   * @param {React.FormEvent} event - Form submit event
   */
  const handleSubmit = useCallback((event) => {
    try {
      event.preventDefault();
      
      // Clear debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      // Execute search immediately
      executeSearch(searchQuery);
      
      // Blur input on mobile to hide keyboard
      if (searchInputRef.current && window.innerWidth < 768) {
        searchInputRef.current.blur();
      }
      
      logger.info('Search form submitted', { query: searchQuery });
    } catch (error) {
      logger.error('Failed to handle form submission', error);
    }
  }, [searchQuery, executeSearch]);

  /**
   * Clears the search input and executes empty search
   */
  const handleClear = useCallback(() => {
    try {
      setSearchQuery('');
      
      // Clear debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      // Execute empty search
      executeSearch('');
      
      // Focus input after clearing
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
      
      logger.info('Search cleared');
    } catch (error) {
      logger.error('Failed to clear search', error);
    }
  }, [executeSearch]);

  /**
   * Handles keyboard shortcuts
   * @param {React.KeyboardEvent} event - Keyboard event
   */
  const handleKeyDown = useCallback((event) => {
    try {
      // Escape key clears search
      if (event.key === 'Escape' && searchQuery) {
        event.preventDefault();
        handleClear();
      }
    } catch (error) {
      logger.error('Failed to handle keyboard shortcut', error);
    }
  }, [searchQuery, handleClear]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Determine if we should show loading state
  const showLoading = isLoading || isSearching;

  return (
    <form 
      onSubmit={handleSubmit} 
      className={`relative w-full ${className}`}
      role="search"
      aria-label="Search hackathons"
    >
      <div className="relative">
        {/* Search Icon */}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {showLoading ? (
            <Loader2 
              className="h-5 w-5 text-gray-400 animate-spin" 
              aria-hidden="true"
            />
          ) : (
            <Search 
              className="h-5 w-5 text-gray-400" 
              aria-hidden="true"
            />
          )}
        </div>

        {/* Search Input */}
        <Input
          ref={searchInputRef}
          type="search"
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-10 pr-10"
          disabled={showLoading}
          aria-label="Search query"
          autoComplete="off"
          spellCheck="false"
        />

        {/* Clear Button */}
        {searchQuery && !showLoading && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Clear search"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Submit Button (Hidden, for accessibility) */}
      <button type="submit" className="sr-only">
        Search
      </button>
    </form>
  );
}