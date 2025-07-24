'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { DESIGN_CATEGORIES, CATEGORY_LABELS } from '@/lib/scrapers/designs/categories';
import { Logger } from '@/lib/utils/logger';

const logger = new Logger('CategoryFilter');

/**
 * CategoryFilter Component
 * Renders category filter tabs with horizontal scrolling on mobile
 * Handles category selection and provides visual feedback
 */
export function CategoryFilter({ 
  selectedCategory = DESIGN_CATEGORIES.ALL, 
  onCategoryChange,
  showCounts = false,
  categoryCounts = {},
  className = ''
}) {
  const [isScrollable, setIsScrollable] = useState(false);
  const [showLeftGradient, setShowLeftGradient] = useState(false);
  const [showRightGradient, setShowRightGradient] = useState(false);
  const scrollContainerRef = useRef(null);

  /**
   * Handle category selection
   */
  const handleCategoryClick = useCallback((category) => {
    try {
      if (category === selectedCategory) {
        logger.debug('Same category clicked, ignoring', { category });
        return;
      }

      logger.info('Category changed', { 
        from: selectedCategory, 
        to: category 
      });

      if (onCategoryChange) {
        onCategoryChange(category);
      }
    } catch (error) {
      logger.error('Error handling category change', error);
    }
  }, [selectedCategory, onCategoryChange]);

  /**
   * Check if horizontal scroll is needed and update gradients
   */
  const checkScrollability = useCallback(() => {
    try {
      const container = scrollContainerRef.current;
      if (!container) return;

      const isScrollableNow = container.scrollWidth > container.clientWidth;
      setIsScrollable(isScrollableNow);

      if (isScrollableNow) {
        const scrollLeft = container.scrollLeft;
        const maxScroll = container.scrollWidth - container.clientWidth;

        setShowLeftGradient(scrollLeft > 0);
        setShowRightGradient(scrollLeft < maxScroll - 1);
      } else {
        setShowLeftGradient(false);
        setShowRightGradient(false);
      }
    } catch (error) {
      logger.error('Error checking scrollability', error);
    }
  }, []);

  /**
   * Setup resize observer and scroll listener
   */
  useEffect(() => {
    checkScrollability();

    const container = scrollContainerRef.current;
    if (!container) return;

    // Scroll event listener
    const handleScroll = () => {
      checkScrollability();
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      checkScrollability();
    });

    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, [checkScrollability]);

  /**
   * Scroll to selected category on mount or change
   */
  useEffect(() => {
    try {
      const container = scrollContainerRef.current;
      if (!container || !selectedCategory) return;

      const selectedButton = container.querySelector(`[data-category="${selectedCategory}"]`);
      if (!selectedButton) return;

      // Scroll selected category into view
      selectedButton.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    } catch (error) {
      logger.error('Error scrolling to selected category', error);
    }
  }, [selectedCategory]);

  /**
   * Format count display
   */
  const formatCount = (count) => {
    if (!count) return '';
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  // Get categories array
  const categories = Object.entries(DESIGN_CATEGORIES);

  return (
    <div className={`relative ${className}`}>
      {/* Left gradient */}
      {isScrollable && showLeftGradient && (
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
      )}

      {/* Right gradient */}
      {isScrollable && showRightGradient && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
      )}

      {/* Category tabs container */}
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto scrollbar-hide"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitScrollbar: { display: 'none' }
        }}
      >
        <div className="flex space-x-1 px-1">
          {categories.map(([key, value]) => {
            const isSelected = selectedCategory === value;
            const count = categoryCounts[value];

            return (
              <button
                key={key}
                data-category={value}
                onClick={() => handleCategoryClick(value)}
                className={`
                  relative px-4 py-2 rounded-full text-sm font-medium
                  transition-all duration-200 whitespace-nowrap
                  ${isSelected 
                    ? 'bg-gray-900 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                  }
                  ${!isSelected && 'hover:scale-105'}
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900
                `}
                aria-label={`Filter by ${CATEGORY_LABELS[value]}`}
                aria-pressed={isSelected}
              >
                <span className="flex items-center space-x-1.5">
                  <span>{CATEGORY_LABELS[value]}</span>
                  {showCounts && count > 0 && (
                    <span className={`
                      text-xs
                      ${isSelected ? 'text-gray-300' : 'text-gray-500'}
                    `}>
                      ({formatCount(count)})
                    </span>
                  )}
                </span>

                {/* Selection indicator */}
                {isSelected && (
                  <span className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-gray-900" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile scroll hint */}
      {isScrollable && (
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 lg:hidden">
          <span className="flex items-center space-x-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10l5 5 5-5" />
            </svg>
            <span>Scroll for more</span>
          </span>
        </div>
      )}
    </div>
  );
}

// Default props
CategoryFilter.defaultProps = {
  selectedCategory: DESIGN_CATEGORIES.ALL,
  onCategoryChange: null,
  showCounts: false,
  categoryCounts: {},
  className: ''
};