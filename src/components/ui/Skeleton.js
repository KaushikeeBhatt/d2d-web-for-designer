/**
 * Skeleton Loading Component
 * Provides animated loading placeholders for content
 * Used throughout the app for better perceived performance
 */

import React from 'react';

/**
 * Base skeleton component with customizable shape and animation
 * @param {Object} props - Component props
 * @param {string} props.className - Additional CSS classes
 * @param {number} props.width - Width in pixels or percentage
 * @param {number} props.height - Height in pixels
 * @param {boolean} props.circle - Render as circle
 * @param {boolean} props.rounded - Apply rounded corners
 * @param {boolean} props.animate - Enable/disable animation
 * @returns {JSX.Element} Skeleton component
 */
export function Skeleton({ 
  className = '', 
  width, 
  height, 
  circle = false, 
  rounded = true,
  animate = true 
}) {
  console.log('[Skeleton] Rendering skeleton loader', { width, height, circle });

  const baseClasses = 'bg-gray-200 dark:bg-gray-700';
  const animationClasses = animate ? 'animate-pulse' : '';
  const shapeClasses = circle ? 'rounded-full' : (rounded ? 'rounded-md' : '');
  
  const style = {
    width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
    height: height ? `${height}px` : undefined,
  };

  return (
    <div 
      className={`${baseClasses} ${animationClasses} ${shapeClasses} ${className}`}
      style={style}
      role="status"
      aria-label="Loading..."
    />
  );
}

/**
 * Text skeleton with multiple lines
 * @param {Object} props - Component props
 * @param {number} props.lines - Number of lines to render
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} Text skeleton component
 */
export function SkeletonText({ lines = 3, className = '' }) {
  console.log('[SkeletonText] Rendering text skeleton', { lines });

  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          height={16}
          width={index === lines - 1 ? '75%' : '100%'}
          rounded={true}
        />
      ))}
    </div>
  );
}

/**
 * Card skeleton for hackathon/design cards
 * @param {Object} props - Component props
 * @param {boolean} props.showImage - Include image skeleton
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} Card skeleton component
 */
export function SkeletonCard({ showImage = true, className = '' }) {
  console.log('[SkeletonCard] Rendering card skeleton', { showImage });

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden ${className}`}>
      {showImage && (
        <Skeleton 
          height={200} 
          width="100%" 
          rounded={false}
          className="w-full"
        />
      )}
      <div className="p-4 space-y-3">
        <Skeleton height={24} width="80%" />
        <SkeletonText lines={2} />
        <div className="flex gap-2 mt-4">
          <Skeleton height={32} width={80} />
          <Skeleton height={32} width={80} />
        </div>
      </div>
    </div>
  );
}

/**
 * Avatar skeleton for user profiles
 * @param {Object} props - Component props
 * @param {number} props.size - Avatar size in pixels
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} Avatar skeleton component
 */
export function SkeletonAvatar({ size = 40, className = '' }) {
  console.log('[SkeletonAvatar] Rendering avatar skeleton', { size });

  return (
    <Skeleton 
      width={size} 
      height={size} 
      circle={true}
      className={className}
    />
  );
}

/**
 * Table skeleton for data tables
 * @param {Object} props - Component props
 * @param {number} props.rows - Number of rows
 * @param {number} props.columns - Number of columns
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} Table skeleton component
 */
export function SkeletonTable({ rows = 5, columns = 4, className = '' }) {
  console.log('[SkeletonTable] Rendering table skeleton', { rows, columns });

  return (
    <div className={`w-full ${className}`}>
      {/* Header */}
      <div className="grid grid-cols-4 gap-4 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={`header-${index}`} height={20} width="100%" />
        ))}
      </div>
      
      {/* Body */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="grid grid-cols-4 gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton 
                key={`cell-${rowIndex}-${colIndex}`} 
                height={16} 
                width={colIndex === 0 ? '60%' : '80%'} 
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Grid skeleton for image galleries
 * @param {Object} props - Component props
 * @param {number} props.count - Number of items
 * @param {number} props.columns - Number of columns
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} Grid skeleton component
 */
export function SkeletonGrid({ count = 6, columns = 3, className = '' }) {
  console.log('[SkeletonGrid] Rendering grid skeleton', { count, columns });

  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid ${gridCols[columns] || gridCols[3]} gap-6 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
}

/**
 * Button skeleton
 * @param {Object} props - Component props
 * @param {string} props.size - Button size variant
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} Button skeleton component
 */
export function SkeletonButton({ size = 'md', className = '' }) {
  console.log('[SkeletonButton] Rendering button skeleton', { size });

  const sizeMap = {
    sm: { width: 60, height: 32 },
    md: { width: 80, height: 40 },
    lg: { width: 100, height: 48 },
  };

  const { width, height } = sizeMap[size] || sizeMap.md;

  return (
    <Skeleton 
      width={width} 
      height={height} 
      className={className}
    />
  );
}

// Export all skeleton components
export default {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonAvatar,
  SkeletonTable,
  SkeletonGrid,
  SkeletonButton,
};