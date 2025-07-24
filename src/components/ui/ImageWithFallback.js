/**
 * Image Component with Fallback
 * Handles image loading errors and provides fallback images
 * Uses Next.js Image component for optimization
 */

'use client';

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { Skeleton } from './Skeleton';

// Default fallback image path
const DEFAULT_FALLBACK = '/images/placeholder.jpg';

/**
 * Enhanced Image component with error handling and loading states
 * @param {Object} props - Component props
 * @param {string} props.src - Image source URL
 * @param {string} props.alt - Alt text for accessibility
 * @param {string} props.fallbackSrc - Fallback image URL
 * @param {number} props.width - Image width
 * @param {number} props.height - Image height
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.objectFit - CSS object-fit property
 * @param {number} props.quality - Image quality (1-100)
 * @param {string} props.priority - Load priority
 * @param {Function} props.onLoad - Load success callback
 * @param {Function} props.onError - Error callback
 * @param {boolean} props.showLoader - Show skeleton loader
 * @param {Object} props.style - Additional inline styles
 * @returns {JSX.Element} Image component with fallback
 */
export function ImageWithFallback({
  src,
  alt,
  fallbackSrc = DEFAULT_FALLBACK,
  width,
  height,
  className = '',
  objectFit = 'cover',
  quality = 75,
  priority = false,
  onLoad,
  onError,
  showLoader = true,
  style = {},
  ...rest
}) {
  const [imgSrc, setImgSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  console.log('[ImageWithFallback] Rendering image', { 
    src: imgSrc, 
    alt, 
    width, 
    height,
    hasError,
    isLoading 
  });

  /**
   * Handle image load error
   * Falls back to fallback image or shows error state
   */
  const handleError = useCallback((error) => {
    console.error('[ImageWithFallback] Image load error', { 
      src: imgSrc, 
      error: error?.message || 'Unknown error' 
    });

    if (imgSrc !== fallbackSrc) {
      console.log('[ImageWithFallback] Switching to fallback image', { fallbackSrc });
      setImgSrc(fallbackSrc);
      setHasError(true);
    } else {
      console.error('[ImageWithFallback] Fallback image also failed to load');
      setHasError(true);
    }

    if (onError) {
      onError(error);
    }
  }, [imgSrc, fallbackSrc, onError]);

  /**
   * Handle successful image load
   */
  const handleLoad = useCallback((result) => {
    console.log('[ImageWithFallback] Image loaded successfully', { src: imgSrc });
    setIsLoading(false);
    
    if (onLoad) {
      onLoad(result);
    }
  }, [imgSrc, onLoad]);

  /**
   * Handle loading completion (Next.js specific)
   */
  const handleLoadingComplete = useCallback((result) => {
    console.log('[ImageWithFallback] Image loading complete', { 
      src: imgSrc,
      naturalWidth: result.naturalWidth,
      naturalHeight: result.naturalHeight 
    });
    setIsLoading(false);
  }, [imgSrc]);

  // Show error state if both original and fallback failed
  if (hasError && imgSrc === fallbackSrc) {
    console.log('[ImageWithFallback] Showing error placeholder');
    return (
      <div 
        className={`bg-gray-200 dark:bg-gray-700 flex items-center justify-center ${className}`}
        style={{ 
          width: width || '100%', 
          height: height || '100%',
          ...style 
        }}
      >
        <svg
          className="w-12 h-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  // Container style for proper aspect ratio
  const containerStyle = {
    position: 'relative',
    width: width || '100%',
    height: height || 'auto',
    ...style,
  };

  return (
    <div className={`image-container ${className}`} style={containerStyle}>
      {/* Loading skeleton */}
      {isLoading && showLoader && (
        <div className="absolute inset-0 z-10">
          <Skeleton 
            width="100%" 
            height="100%" 
            rounded={false}
            className="absolute inset-0"
          />
        </div>
      )}

      {/* Next.js Image component */}
      <Image
        src={imgSrc}
        alt={alt}
        width={width}
        height={height}
        quality={quality}
        priority={priority}
        onError={handleError}
        onLoad={handleLoad}
        onLoadingComplete={handleLoadingComplete}
        style={{
          objectFit: objectFit,
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 0.3s ease-in-out',
        }}
        {...rest}
      />
    </div>
  );
}

/**
 * Background image component with fallback
 * For use as CSS background images
 * @param {Object} props - Component props
 * @returns {JSX.Element} Background image component
 */
export function BackgroundImageWithFallback({
  src,
  fallbackSrc = DEFAULT_FALLBACK,
  className = '',
  children,
  overlay = false,
  overlayOpacity = 0.5,
  style = {},
  ...rest
}) {
  const [bgSrc, setBgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  console.log('[BackgroundImageWithFallback] Rendering background image', { src: bgSrc });

  // Create test image to check if URL loads
  React.useEffect(() => {
    const img = new window.Image();
    img.src = bgSrc;
    
    img.onload = () => {
      console.log('[BackgroundImageWithFallback] Background image loaded', { src: bgSrc });
    };
    
    img.onerror = () => {
      console.error('[BackgroundImageWithFallback] Background image error', { src: bgSrc });
      if (bgSrc !== fallbackSrc && !hasError) {
        setBgSrc(fallbackSrc);
        setHasError(true);
      }
    };
  }, [bgSrc, fallbackSrc, hasError]);

  const backgroundStyle = {
    backgroundImage: `url('${bgSrc}')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    ...style,
  };

  return (
    <div 
      className={`relative ${className}`} 
      style={backgroundStyle}
      {...rest}
    >
      {/* Optional overlay */}
      {overlay && (
        <div 
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity }}
        />
      )}
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

// Export default component
export default ImageWithFallback;