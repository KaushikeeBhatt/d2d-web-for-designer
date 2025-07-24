'use client';

import { useState, useEffect, useCallback } from 'react';
import { Filter, Calendar, Award, Users, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Logger } from '@/lib/utils/logger';
import { format, addDays, startOfToday, endOfMonth } from 'date-fns';

const logger = new Logger('FilterPanel');

// Filter configuration
const PLATFORMS = [
  { value: 'devpost', label: 'Devpost', color: 'bg-blue-100 text-blue-800' },
  { value: 'unstop', label: 'Unstop', color: 'bg-green-100 text-green-800' },
  { value: 'cumulus', label: 'Cumulus', color: 'bg-purple-100 text-purple-800' }
];

const DEADLINE_FILTERS = [
  { value: 'today', label: 'Today', getDates: () => ({ start: startOfToday(), end: startOfToday() }) },
  { value: 'week', label: 'This Week', getDates: () => ({ start: startOfToday(), end: addDays(startOfToday(), 7) }) },
  { value: 'month', label: 'This Month', getDates: () => ({ start: startOfToday(), end: endOfMonth(startOfToday()) }) },
  { value: 'all', label: 'All Time', getDates: () => null }
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First', icon: Calendar },
  { value: 'deadline', label: 'Deadline Soon', icon: Calendar },
  { value: 'popular', label: 'Most Popular', icon: Users },
  { value: 'prizes', label: 'Highest Prizes', icon: Award }
];

/**
 * FilterPanel Component
 * Provides filtering options for hackathons including platform, deadline, and sorting
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onFilterChange - Callback when filters change
 * @param {boolean} props.isMobile - Whether to render mobile version
 * @param {string} props.className - Additional CSS classes
 */
export default function FilterPanel({ 
  onFilterChange, 
  isMobile = false,
  className = '' 
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Filter states
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [selectedDeadline, setSelectedDeadline] = useState('all');
  const [selectedSort, setSelectedSort] = useState('newest');
  const [isExpanded, setIsExpanded] = useState(!isMobile);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  /**
   * Initialize filters from URL params
   */
  useEffect(() => {
    try {
      const platforms = searchParams.get('platform')?.split(',').filter(Boolean) || [];
      const deadline = searchParams.get('deadline') || 'all';
      const sort = searchParams.get('sort') || 'newest';
      
      setSelectedPlatforms(platforms);
      setSelectedDeadline(deadline);
      setSelectedSort(sort);
      
      // Calculate active filters count
      const count = platforms.length + (deadline !== 'all' ? 1 : 0) + (sort !== 'newest' ? 1 : 0);
      setActiveFiltersCount(count);
      
      logger.info('Filters initialized from URL', { platforms, deadline, sort });
    } catch (error) {
      logger.error('Failed to initialize filters', error);
    }
  }, [searchParams]);

  /**
   * Updates URL with current filter state
   */
  const updateURL = useCallback((filters) => {
    try {
      const params = new URLSearchParams(searchParams);
      
      // Update platform filter
      if (filters.platforms && filters.platforms.length > 0) {
        params.set('platform', filters.platforms.join(','));
      } else {
        params.delete('platform');
      }
      
      // Update deadline filter
      if (filters.deadline && filters.deadline !== 'all') {
        params.set('deadline', filters.deadline);
      } else {
        params.delete('deadline');
      }
      
      // Update sort filter
      if (filters.sort && filters.sort !== 'newest') {
        params.set('sort', filters.sort);
      } else {
        params.delete('sort');
      }
      
      // Reset to first page when filters change
      params.set('page', '1');
      
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      router.push(newUrl, { scroll: false });
      
      logger.info('URL updated with filters', { filters, url: newUrl });
    } catch (error) {
      logger.error('Failed to update URL with filters', error);
    }
  }, [router, searchParams]);

  /**
   * Handles platform filter toggle
   * @param {string} platform - Platform value to toggle
   */
  const handlePlatformToggle = useCallback((platform) => {
    try {
      const newPlatforms = selectedPlatforms.includes(platform)
        ? selectedPlatforms.filter(p => p !== platform)
        : [...selectedPlatforms, platform];
      
      setSelectedPlatforms(newPlatforms);
      
      const filters = {
        platforms: newPlatforms,
        deadline: selectedDeadline,
        sort: selectedSort
      };
      
      updateURL(filters);
      
      if (onFilterChange && typeof onFilterChange === 'function') {
        onFilterChange(filters);
      }
      
      logger.info('Platform filter toggled', { platform, selected: !selectedPlatforms.includes(platform) });
    } catch (error) {
      logger.error('Failed to toggle platform filter', error);
    }
  }, [selectedPlatforms, selectedDeadline, selectedSort, updateURL, onFilterChange]);

  /**
   * Handles deadline filter change
   * @param {string} deadline - Deadline filter value
   */
  const handleDeadlineChange = useCallback((deadline) => {
    try {
      setSelectedDeadline(deadline);
      
      const filters = {
        platforms: selectedPlatforms,
        deadline: deadline,
        sort: selectedSort
      };
      
      updateURL(filters);
      
      if (onFilterChange && typeof onFilterChange === 'function') {
        onFilterChange(filters);
      }
      
      logger.info('Deadline filter changed', { deadline });
    } catch (error) {
      logger.error('Failed to change deadline filter', error);
    }
  }, [selectedPlatforms, selectedSort, updateURL, onFilterChange]);

  /**
   * Handles sort option change
   * @param {string} sort - Sort option value
   */
  const handleSortChange = useCallback((sort) => {
    try {
      setSelectedSort(sort);
      
      const filters = {
        platforms: selectedPlatforms,
        deadline: selectedDeadline,
        sort: sort
      };
      
      updateURL(filters);
      
      if (onFilterChange && typeof onFilterChange === 'function') {
        onFilterChange(filters);
      }
      
      logger.info('Sort option changed', { sort });
    } catch (error) {
      logger.error('Failed to change sort option', error);
    }
  }, [selectedPlatforms, selectedDeadline, updateURL, onFilterChange]);

  /**
   * Clears all active filters
   */
  const handleClearFilters = useCallback(() => {
    try {
      setSelectedPlatforms([]);
      setSelectedDeadline('all');
      setSelectedSort('newest');
      
      const filters = {
        platforms: [],
        deadline: 'all',
        sort: 'newest'
      };
      
      updateURL(filters);
      
      if (onFilterChange && typeof onFilterChange === 'function') {
        onFilterChange(filters);
      }
      
      logger.info('All filters cleared');
    } catch (error) {
      logger.error('Failed to clear filters', error);
    }
  }, [updateURL, onFilterChange]);

  /**
   * Toggles filter panel expansion on mobile
   */
  const handleToggleExpand = useCallback(() => {
    try {
      setIsExpanded(!isExpanded);
      logger.debug('Filter panel toggled', { expanded: !isExpanded });
    } catch (error) {
      logger.error('Failed to toggle filter panel', error);
    }
  }, [isExpanded]);

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Filters</h3>
            {activeFiltersCount > 0 && (
              <Badge variant="primary" className="ml-2">
                {activeFiltersCount}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Clear all
              </Button>
            )}
            
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleExpand}
                aria-label={isExpanded ? 'Collapse filters' : 'Expand filters'}
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Content */}
      {isExpanded && (
        <div className="p-4 space-y-6">
          {/* Platform Filter */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Platform</h4>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((platform) => {
                const isSelected = selectedPlatforms.includes(platform.value);
                return (
                  <button
                    key={platform.value}
                    onClick={() => handlePlatformToggle(platform.value)}
                    className={`
                      px-3 py-1.5 rounded-full text-sm font-medium transition-all
                      ${isSelected 
                        ? platform.color 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                    aria-pressed={isSelected}
                    aria-label={`Filter by ${platform.label}`}
                  >
                    {platform.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Deadline Filter */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Deadline</h4>
            <div className="flex flex-wrap gap-2">
              {DEADLINE_FILTERS.map((deadline) => {
                const isSelected = selectedDeadline === deadline.value;
                return (
                  <button
                    key={deadline.value}
                    onClick={() => handleDeadlineChange(deadline.value)}
                    className={`
                      px-3 py-1.5 rounded-full text-sm font-medium transition-all
                      ${isSelected 
                        ? 'bg-primary-100 text-primary-800' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                    aria-pressed={isSelected}
                    aria-label={`Filter by ${deadline.label}`}
                  >
                    {deadline.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sort Options */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Sort By</h4>
            <div className="space-y-2">
              {SORT_OPTIONS.map((option) => {
                const isSelected = selectedSort === option.value;
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleSortChange(option.value)}
                    className={`
                      w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left
                      ${isSelected 
                        ? 'bg-primary-50 text-primary-700 border border-primary-200' 
                        : 'bg-white hover:bg-gray-50 border border-gray-200'
                      }
                    `}
                    aria-pressed={isSelected}
                    aria-label={`Sort by ${option.label}`}
                  >
                    <Icon className="h-4 w-4" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}