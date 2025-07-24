'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { DesignCard } from './DesignCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { Logger } from '@/lib/utils/logger';

const logger = new Logger('DesignGrid');

/**
 * DesignGrid Component
 * Displays designs in a responsive masonry/grid layout
 * Handles loading states and empty states
 */
export function DesignGrid({ 
  designs = [], 
  isLoading = false, 
  onDesignClick,
  columns = 'auto',
  gap = 4 
}) {
  const [gridColumns, setGridColumns] = useState(3);
  const containerRef = useRef(null);

  /**
   * Calculate optimal number of columns based on container width
   */
  const calculateColumns = useCallback(() => {
    try {
      if (!containerRef.current || columns !== 'auto') return;

      const containerWidth = containerRef.current.offsetWidth;
      let newColumns = 1;

      // Responsive column calculation
      if (containerWidth >= 1280) {
        newColumns = 4;
      } else if (containerWidth >= 1024) {
        newColumns = 3;
      } else if (containerWidth >= 640) {
        newColumns = 2;
      }

      if (newColumns !== gridColumns) {
        setGridColumns(newColumns);
        logger.debug('Grid columns updated', { columns: newColumns, containerWidth });
      }
    } catch (error) {
      logger.error('Error calculating columns', error);
    }
  }, [columns, gridColumns]);

  /**
   * Setup resize observer for responsive columns
   */
  useEffect(() => {
    if (columns !== 'auto') {
      setGridColumns(columns);
      return;
    }

    calculateColumns();

    const resizeObserver = new ResizeObserver(() => {
      calculateColumns();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [columns, calculateColumns]);

  /**
   * Organize designs into columns for masonry layout
   */
  const organizeIntoColumns = useCallback(() => {
    try {
      const cols = Array.from({ length: gridColumns }, () => []);
      
      designs.forEach((design, index) => {
        const columnIndex = index % gridColumns;
        cols[columnIndex].push(design);
      });

      return cols;
    } catch (error) {
      logger.error('Error organizing designs into columns', error);
      return Array.from({ length: gridColumns }, () => []);
    }
  }, [designs, gridColumns]);

  /**
   * Handle design card click
   */
  const handleDesignClick = useCallback((design) => {
    try {
      logger.info('Design clicked', { designId: design._id, title: design.title });
      if (onDesignClick) {
        onDesignClick(design);
      }
    } catch (error) {
      logger.error('Error handling design click', error);
    }
  }, [onDesignClick]);

  /**
   * Render loading skeletons
   */
  const renderLoadingSkeletons = () => {
    const skeletonCount = 12; // Number of skeleton cards to show
    const skeletonColumns = Array.from({ length: gridColumns }, () => []);

    // Distribute skeletons across columns
    for (let i = 0; i < skeletonCount; i++) {
      const columnIndex = i % gridColumns;
      skeletonColumns[columnIndex].push(i);
    }

    return (
      <div 
        className="grid w-full"
        style={{ 
          gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
          gap: `${gap * 4}px`
        }}
      >
        {skeletonColumns.map((column, colIndex) => (
          <div key={`skeleton-col-${colIndex}`} className="flex flex-col" style={{ gap: `${gap * 4}px` }}>
            {column.map((_, index) => (
              <div 
                key={`skeleton-${colIndex}-${index}`}
                className="relative overflow-hidden rounded-lg bg-gray-100"
                style={{ 
                  height: `${200 + Math.random() * 200}px` // Random heights for realistic masonry
                }}
              >
                <Skeleton className="absolute inset-0" />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <svg
        className="w-16 h-16 text-gray-400 mb-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
      <h3 className="text-lg font-medium text-gray-900 mb-1">No designs found</h3>
      <p className="text-sm text-gray-500">Try adjusting your filters or check back later</p>
    </div>
  );

  // Show loading state
  if (isLoading && designs.length === 0) {
    logger.debug('Rendering loading state');
    return (
      <div ref={containerRef} className="w-full">
        {renderLoadingSkeletons()}
      </div>
    );
  }

  // Show empty state
  if (!isLoading && designs.length === 0) {
    logger.debug('Rendering empty state');
    return renderEmptyState();
  }

  // Organize designs into columns
  const columnizedDesigns = organizeIntoColumns();

  return (
    <div ref={containerRef} className="w-full">
      <div 
        className="grid w-full"
        style={{ 
          gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
          gap: `${gap * 4}px`
        }}
      >
        {columnizedDesigns.map((column, colIndex) => (
          <div 
            key={`column-${colIndex}`} 
            className="flex flex-col" 
            style={{ gap: `${gap * 4}px` }}
          >
            {column.map((design) => (
              <DesignCard
                key={design._id}
                design={design}
                onClick={() => handleDesignClick(design)}
                priority={colIndex === 0} // Prioritize first column images
              />
            ))}
          </div>
        ))}
      </div>

      {/* Loading more indicator */}
      {isLoading && designs.length > 0 && (
        <div className="flex justify-center py-8">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}
    </div>
  );
}

// Default props for better documentation
DesignGrid.defaultProps = {
  designs: [],
  isLoading: false,
  onDesignClick: null,
  columns: 'auto',
  gap: 4
};