'use client';

import { useState, useCallback, memo } from 'react';
import { Heart, Eye, Bookmark, ExternalLink, User } from 'lucide-react';
import Image from 'next/image';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Logger } from '@/lib/utils/logger';
import { CATEGORY_LABELS } from '@/lib/scrapers/designs/categories';
import { formatNumber } from '@/lib/utils/formatters';

const logger = new Logger('DesignCard');

/**
 * DesignCard Component
 * Displays a single design item in the EyeCandy gallery
 * 
 * @param {Object} props - Component props
 * @param {Object} props.design - Design data object
 * @param {Function} props.onView - Callback when design is viewed
 * @param {Function} props.onLike - Callback when design is liked
 * @param {Function} props.onSave - Callback when design is saved
 * @param {boolean} props.isLiked - Whether the design is liked by current user
 * @param {boolean} props.isSaved - Whether the design is saved by current user
 * @param {boolean} props.showStats - Whether to show stats (views, likes, saves)
 * @param {string} props.className - Additional CSS classes
 */
const DesignCard = memo(function DesignCard({
  design,
  onView,
  onLike,
  onSave,
  isLiked = false,
  isSaved = false,
  showStats = true,
  className = ''
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Validate design data
  if (!design || !design._id) {
    logger.error('Invalid design data provided', { design });
    return null;
  }

  /**
   * Handles click on design card
   */
  const handleCardClick = useCallback(() => {
    try {
      if (onView && typeof onView === 'function') {
        onView(design);
      }
      logger.info('Design card clicked', { designId: design._id });
    } catch (error) {
      logger.error('Failed to handle card click', error);
    }
  }, [design, onView]);

  /**
   * Handles like button click
   * @param {React.MouseEvent} event - Click event
   */
  const handleLikeClick = useCallback((event) => {
    try {
      event.stopPropagation();
      if (onLike && typeof onLike === 'function') {
        onLike(design._id, !isLiked);
      }
      logger.info('Like button clicked', { designId: design._id, liked: !isLiked });
    } catch (error) {
      logger.error('Failed to handle like click', error);
    }
  }, [design._id, isLiked, onLike]);

  /**
   * Handles save button click
   * @param {React.MouseEvent} event - Click event
   */
  const handleSaveClick = useCallback((event) => {
    try {
      event.stopPropagation();
      if (onSave && typeof onSave === 'function') {
        onSave(design._id, !isSaved);
      }
      logger.info('Save button clicked', { designId: design._id, saved: !isSaved });
    } catch (error) {
      logger.error('Failed to handle save click', error);
    }
  }, [design._id, isSaved, onSave]);

  /**
   * Handles external link click
   * @param {React.MouseEvent} event - Click event
   */
  const handleExternalLinkClick = useCallback((event) => {
    try {
      event.stopPropagation();
      window.open(design.sourceUrl, '_blank', 'noopener,noreferrer');
      logger.info('External link clicked', { designId: design._id, url: design.sourceUrl });
    } catch (error) {
      logger.error('Failed to open external link', error);
    }
  }, [design._id, design.sourceUrl]);

  /**
   * Handles image load success
   */
  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    logger.debug('Design image loaded', { designId: design._id });
  }, [design._id]);

  /**
   * Handles image load error
   */
  const handleImageError = useCallback(() => {
    setImageError(true);
    logger.error('Design image failed to load', { designId: design._id, imageUrl: design.imageUrl });
  }, [design._id, design.imageUrl]);

  // Calculate aspect ratio for proper image sizing
  const aspectRatio = design.aspectRatio || 1.5;
  const imageHeight = 280 / aspectRatio;

  return (
    <article
      className={`
        group relative bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-lg 
        transition-all duration-300 cursor-pointer
        ${className}
      `}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label={`Design: ${design.title}`}
    >
      {/* Image Container */}
      <div 
        className="relative overflow-hidden bg-gray-100"
        style={{ height: `${imageHeight}px` }}
      >
        {/* Loading Skeleton */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse" />
        )}

        {/* Design Image */}
        <ImageWithFallback
          src={design.thumbnailUrl || design.imageUrl}
          alt={design.title}
          fill
          className={`
            object-cover transition-transform duration-500
            ${isHovered ? 'scale-105' : 'scale-100'}
          `}
          onLoad={handleImageLoad}
          onError={handleImageError}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />

        {/* Overlay on Hover */}
        <div className={`
          absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent
          transition-opacity duration-300
          ${isHovered ? 'opacity-100' : 'opacity-0'}
        `}>
          {/* Action Buttons */}
          <div className="absolute top-3 right-3 flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSaveClick}
              className={`
                p-2 bg-white/90 hover:bg-white text-gray-700
                ${isSaved ? 'text-primary-600' : ''}
              `}
              aria-label={isSaved ? 'Remove from saved' : 'Save design'}
            >
              <Bookmark 
                className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} 
              />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExternalLinkClick}
              className="p-2 bg-white/90 hover:bg-white text-gray-700"
              aria-label="View on source website"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>

          {/* Like Button */}
          <div className="absolute bottom-3 left-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLikeClick}
              className={`
                p-2 bg-white/90 hover:bg-white text-gray-700
                ${isLiked ? 'text-red-500' : ''}
              `}
              aria-label={isLiked ? 'Unlike design' : 'Like design'}
            >
              <Heart 
                className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} 
              />
            </Button>
          </div>
        </div>

        {/* Category Badge */}
        {design.category && (
          <div className="absolute top-3 left-3">
            <Badge 
              variant="secondary" 
              className="bg-white/90 text-gray-700 text-xs"
            >
              {CATEGORY_LABELS[design.category] || design.category}
            </Badge>
          </div>
        )}

        {/* New Badge */}
        {design.isNew && (
          <div className="absolute top-3 left-3">
            <Badge 
              variant="primary" 
              className="bg-green-500 text-white text-xs"
            >
              New
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2">
          {design.title || 'Untitled Design'}
        </h3>

        {/* Author */}
        {design.author?.name && (
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
            {design.author.avatar ? (
              <Image
                src={design.author.avatar}
                alt={design.author.name}
                width={20}
                height={20}
                className="rounded-full"
              />
            ) : (
              <User className="h-4 w-4" />
            )}
            <span className="truncate">{design.author.name}</span>
          </div>
        )}

        {/* Stats */}
        {showStats && design.stats && (
          <div className="flex items-center gap-4 text-sm text-gray-500">
            {design.stats.views > 0 && (
              <div className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                <span>{formatNumber(design.stats.views)}</span>
              </div>
            )}
            
            {design.stats.likes > 0 && (
              <div className="flex items-center gap-1">
                <Heart className="h-3.5 w-3.5" />
                <span>{formatNumber(design.stats.likes)}</span>
              </div>
            )}
            
            {design.stats.saves > 0 && (
              <div className="flex items-center gap-1">
                <Bookmark className="h-3.5 w-3.5" />
                <span>{formatNumber(design.stats.saves)}</span>
              </div>
            )}
          </div>
        )}

        {/* Color Palette */}
        {design.colors && design.colors.length > 0 && (
          <div className="flex gap-1 mt-3">
            {design.colors.slice(0, 5).map((color, index) => (
              <div
                key={index}
                className="w-6 h-6 rounded-full border border-gray-200"
                style={{ backgroundColor: color }}
                title={color}
                aria-label={`Color: ${color}`}
              />
            ))}
            {design.colors.length > 5 && (
              <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xs text-gray-600">
                +{design.colors.length - 5}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
});

// Display name for debugging
DesignCard.displayName = 'DesignCard';

export default DesignCard;