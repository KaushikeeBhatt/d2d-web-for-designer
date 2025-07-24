'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CATEGORY_LABELS } from '@/lib/scrapers/designs/categories';
import { Logger } from '@/lib/utils/logger';

const logger = new Logger('DesignModal');

/**
 * DesignModal Component
 * Full-screen modal for viewing design details
 * Handles keyboard navigation, image loading, and interactions
 */
export function DesignModal({ 
  design, 
  isOpen, 
  onClose, 
  onNext, 
  onPrevious,
  hasNext = false,
  hasPrevious = false 
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  /**
   * Handle escape key and arrow navigation
   */
  const handleKeyDown = useCallback((event) => {
    try {
      switch (event.key) {
        case 'Escape':
          logger.debug('Escape key pressed, closing modal');
          onClose();
          break;
        case 'ArrowLeft':
          if (hasPrevious && onPrevious) {
            logger.debug('Left arrow pressed, navigating to previous');
            onPrevious();
          }
          break;
        case 'ArrowRight':
          if (hasNext && onNext) {
            logger.debug('Right arrow pressed, navigating to next');
            onNext();
          }
          break;
        default:
          break;
      }
    } catch (error) {
      logger.error('Error handling keyboard navigation', error);
    }
  }, [onClose, onNext, onPrevious, hasNext, hasPrevious]);

  /**
   * Handle click outside modal content
   */
  const handleBackdropClick = useCallback((event) => {
    try {
      if (event.target === event.currentTarget) {
        logger.debug('Backdrop clicked, closing modal');
        onClose();
      }
    } catch (error) {
      logger.error('Error handling backdrop click', error);
    }
  }, [onClose]);

  /**
   * Open external link in new tab
   */
  const handleViewOriginal = useCallback(() => {
    try {
      if (!design?.sourceUrl) {
        logger.warn('No source URL available for design');
        return;
      }

      logger.info('Opening original design', { 
        url: design.sourceUrl,
        source: design.source 
      });

      window.open(design.sourceUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      logger.error('Error opening original design', error);
    }
  }, [design]);

  /**
   * Setup modal focus management and event listeners
   */
  useEffect(() => {
    if (!isOpen) return;

    // Store current focus
    previousFocusRef.current = document.activeElement;

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown);
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Focus modal
    if (modalRef.current) {
      modalRef.current.focus();
    }

    // Reset image state
    setImageLoaded(false);
    setImageError(false);

    logger.info('Modal opened', { 
      designId: design?._id,
      title: design?.title 
    });

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';

      // Restore focus
      if (previousFocusRef.current && previousFocusRef.current.focus) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, handleKeyDown, design]);

  if (!isOpen || !design) return null;

  /**
   * Format stats number
   */
  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  /**
   * Get source platform icon
   */
  const getSourceIcon = () => {
    switch (design.source) {
      case 'behance':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6.938 4.503c.702 0 1.34.06 1.92.188.577.13 1.07.33 1.485.59.41.26.733.57.96.94.225.37.34.803.34 1.29 0 .556-.12 1.025-.367 1.413-.246.388-.615.714-1.095.97.646.195 1.14.507 1.483.93.34.43.514.954.514 1.58 0 .523-.116.986-.34 1.385-.23.398-.55.73-.946.99-.4.26-.867.46-1.4.58-.54.12-1.103.18-1.69.18H0V4.51h6.938v-.007zM16 7.5h6v1.5h-6V7.5zM6 7h1.5c.5 0 .9.08 1.2.27.3.18.45.47.45.85 0 .44-.175.74-.525.9-.35.16-.825.24-1.425.24H6V7zm1.65 6.27c.5 0 .91-.08 1.224-.27.313-.19.474-.52.474-.99 0-.47-.19-.79-.57-.964-.38-.18-.9-.26-1.55-.26H6v2.48h1.65v.004zM23 10.5c-.03 1.87-.68 3.35-1.95 4.44C19.78 16.04 18.13 16.5 16 16.5c-2.13 0-3.78-.456-4.95-1.37C9.88 14.22 9.25 12.76 9.25 10.8c0-1.96.68-3.48 2.04-4.56C12.65 5.16 14.36 4.5 16.5 4.5c1.95 0 3.54.58 4.77 1.74 1.23 1.16 1.84 2.88 1.84 5.16v1.1H14.5c.05.8.34 1.41.86 1.82.52.42 1.24.63 2.14.63.7 0 1.31-.11 1.81-.34.51-.23.89-.53 1.14-.92H23v.81zM14.5 9h6c-.05-.62-.27-1.13-.66-1.52-.39-.39-.94-.58-1.64-.58-.74 0-1.32.2-1.73.6-.41.4-.65.9-.7 1.5h.03z"/>
          </svg>
        );
      case 'dribbble':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c5.51 0 10-4.48 10-10S17.51 2 12 2zm6.605 4.61c1.22 1.53 1.95 3.45 1.99 5.53-.29-.06-3.19-.65-6.11-.28-.24-.59-.47-1.11-.77-1.73 3.24-1.33 4.7-3.23 4.89-3.52zM12 3.81c2.28 0 4.35.87 5.92 2.29-.16.23-1.43 1.93-4.44 3.06-1.39-2.55-2.93-4.64-3.17-4.96.52-.25 1.09-.39 1.69-.39zm-3.52.95c.21.29 1.74 2.41 3.14 4.91-3.95 1.05-7.44 1.03-7.82 1.03.55-2.63 2.3-4.81 4.68-5.94zm-5.65 7.28v-.26c.37.01 4.51.06 8.77-1.22.24.48.48.96.7 1.45-.11.03-.22.07-.33.1-4.41 1.42-6.76 5.31-6.96 5.64-1.24-1.39-2.01-3.22-2.18-5.22v.51zm9.17 9.15c-2.08 0-3.97-.74-5.43-1.97.16-.33 1.95-3.78 6.93-5.51.02-.01.04-.01.06-.02.62 1.62 1.21 3.25 1.66 4.89-1.02.46-2.09.71-3.22.71v-.1zm4.58-1.47c-.4-1.41-.89-2.83-1.44-4.26 2.6-.42 4.89.27 5.18.36-.37 2.31-1.7 4.3-3.61 5.55-.04-.54-.09-1.09-.13-1.65z"/>
          </svg>
        );
      case 'awwwards':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 6l2.5 7.5H9.5L12 6zm0-4L6 20h3l1.5-4.5h3L15 20h3L12 2z"/>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdropClick}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Design details"
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 
                   text-white transition-colors duration-200 backdrop-blur-sm"
        aria-label="Close modal"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Navigation buttons */}
      {hasPrevious && (
        <button
          onClick={onPrevious}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full 
                     bg-white/10 hover:bg-white/20 text-white transition-colors duration-200 
                     backdrop-blur-sm"
          aria-label="Previous design"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {hasNext && (
        <button
          onClick={onNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full 
                     bg-white/10 hover:bg-white/20 text-white transition-colors duration-200 
                     backdrop-blur-sm"
          aria-label="Next design"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Modal content */}
      <div className="h-full overflow-y-auto py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg overflow-hidden shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-3">
              {/* Image section */}
              <div className="lg:col-span-2 bg-gray-50 relative">
                <div className="relative aspect-auto min-h-[400px] lg:min-h-[600px]">
                  {!imageLoaded && !imageError && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-600 
                                      rounded-full animate-spin" />
                    </div>
                  )}
                  
                  <ImageWithFallback
                    src={design.imageUrl}
                    alt={design.title}
                    fill
                    className="object-contain"
                    onLoad={() => setImageLoaded(true)}
                    onError={() => setImageError(true)}
                    priority
                  />
                </div>
              </div>

              {/* Details section */}
              <div className="p-6 lg:p-8">
                {/* Category badge */}
                <div className="mb-4">
                  <Badge variant="secondary">
                    {CATEGORY_LABELS[design.category] || design.category}
                  </Badge>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  {design.title}
                </h2>

                {/* Description */}
                {design.description && (
                  <p className="text-gray-600 mb-6 line-clamp-4">
                    {design.description}
                  </p>
                )}

                {/* Author info */}
                {design.author?.name && (
                  <div className="flex items-center mb-6 pb-6 border-b border-gray-200">
                    {design.author.avatar ? (
                      <ImageWithFallback
                        src={design.author.avatar}
                        alt={design.author.name}
                        width={48}
                        height={48}
                        className="rounded-full mr-3"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-200 mr-3 
                                      flex items-center justify-center">
                        <span className="text-gray-500 font-medium">
                          {design.author.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{design.author.name}</p>
                      <div className="flex items-center text-sm text-gray-500">
                        {getSourceIcon()}
                        <span className="ml-1 capitalize">{design.source}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Stats */}
                {design.stats && (
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {design.stats.views > 0 && (
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">
                          {formatNumber(design.stats.views)}
                        </p>
                        <p className="text-sm text-gray-500">Views</p>
                      </div>
                    )}
                    {design.stats.likes > 0 && (
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">
                          {formatNumber(design.stats.likes)}
                        </p>
                        <p className="text-sm text-gray-500">Likes</p>
                      </div>
                    )}
                    {design.stats.saves > 0 && (
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">
                          {formatNumber(design.stats.saves)}
                        </p>
                        <p className="text-sm text-gray-500">Saves</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tags */}
                {design.tags && design.tags.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {design.tags.slice(0, 8).map((tag, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 text-xs font-medium text-gray-600 
                                     bg-gray-100 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action button */}
                <Button
                  onClick={handleViewOriginal}
                  className="w-full"
                  variant="primary"
                >
                  View on {design.source.charAt(0).toUpperCase() + design.source.slice(1)}
                  <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Default props
DesignModal.defaultProps = {
  design: null,
  isOpen: false,
  onClose: () => {},
  onNext: null,
  onPrevious: null,
  hasNext: false,
  hasPrevious: false
};