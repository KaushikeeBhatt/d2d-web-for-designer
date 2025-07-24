'use client';

import { useState, useCallback, memo } from 'react';
import { Calendar, Award, Users, ExternalLink, Bookmark, Clock, Tag } from 'lucide-react';
import Link from 'next/link';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Logger } from '@/lib/utils/logger';
import { formatDate, formatDeadline, isDeadlineSoon, isExpired } from '@/lib/utils/dateHelpers';

const logger = new Logger('HackathonCard');

// Platform configurations
const PLATFORM_CONFIG = {
  devpost: {
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    darkColor: 'bg-blue-600',
    label: 'Devpost'
  },
  unstop: {
    color: 'bg-green-100 text-green-800 border-green-200',
    darkColor: 'bg-green-600',
    label: 'Unstop'
  },
  cumulus: {
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    darkColor: 'bg-purple-600',
    label: 'Cumulus'
  }
};

/**
 * HackathonCard Component
 * Displays a single hackathon with all relevant information
 * 
 * @param {Object} props - Component props
 * @param {Object} props.hackathon - Hackathon data object
 * @param {boolean} props.isBookmarked - Whether hackathon is bookmarked by user
 * @param {Function} props.onBookmark - Callback when bookmark button is clicked
 * @param {Function} props.onView - Callback when hackathon is viewed
 * @param {boolean} props.showDescription - Whether to show description (default: true)
 * @param {boolean} props.compact - Whether to use compact layout (default: false)
 * @param {string} props.className - Additional CSS classes
 */
const HackathonCard = memo(function HackathonCard({
  hackathon,
  isBookmarked = false,
  onBookmark,
  onView,
  showDescription = true,
  compact = false,
  className = ''
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Validate hackathon data
  if (!hackathon || !hackathon._id) {
    logger.error('Invalid hackathon data provided', { hackathon });
    return null;
  }

  // Extract platform config
  const platformConfig = PLATFORM_CONFIG[hackathon.platform] || {
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    darkColor: 'bg-gray-600',
    label: hackathon.platform
  };

  // Check deadline status
  const deadlineExpired = isExpired(hackathon.deadline);
  const deadlineSoon = isDeadlineSoon(hackathon.deadline, 7);

  /**
   * Handles bookmark button click
   * @param {React.MouseEvent} event - Click event
   */
  const handleBookmarkClick = useCallback((event) => {
    try {
      event.preventDefault();
      event.stopPropagation();
      
      if (onBookmark && typeof onBookmark === 'function') {
        onBookmark(hackathon._id, !isBookmarked);
        logger.info('Bookmark toggled', { 
          hackathonId: hackathon._id, 
          bookmarked: !isBookmarked 
        });
      }
    } catch (error) {
      logger.error('Failed to handle bookmark click', error);
    }
  }, [hackathon._id, isBookmarked, onBookmark]);

  /**
   * Handles card click for view tracking
   */
  const handleCardClick = useCallback(() => {
    try {
      if (onView && typeof onView === 'function') {
        onView(hackathon);
        logger.info('Hackathon viewed', { hackathonId: hackathon._id });
      }
    } catch (error) {
      logger.error('Failed to handle card click', error);
    }
  }, [hackathon, onView]);

  /**
   * Handles external link click
   * @param {React.MouseEvent} event - Click event
   */
  const handleExternalLinkClick = useCallback((event) => {
    try {
      event.stopPropagation();
      window.open(hackathon.url, '_blank', 'noopener,noreferrer');
      logger.info('External link clicked', { 
        hackathonId: hackathon._id, 
        url: hackathon.url 
      });
    } catch (error) {
      logger.error('Failed to open external link', error);
    }
  }, [hackathon._id, hackathon.url]);

  /**
   * Formats prize information
   */
  const formatPrizes = useCallback(() => {
    try {
      if (!hackathon.prizes || hackathon.prizes.length === 0) {
        return null;
      }

      // Extract total prize amount if available
      const prizeText = hackathon.prizes[0];
      if (typeof prizeText === 'string' && prizeText.includes('$')) {
        return prizeText.split('$')[1]?.split(' ')[0] || prizeText;
      }

      return prizeText;
    } catch (error) {
      logger.error('Failed to format prizes', error);
      return null;
    }
  }, [hackathon.prizes]);

  // Render compact layout
  if (compact) {
    return (
      <Card
        className={`
          p-4 hover:shadow-md transition-all cursor-pointer
          ${deadlineExpired ? 'opacity-60' : ''}
          ${className}
        `}
        onClick={handleCardClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-gray-900 line-clamp-1">
                {hackathon.title}
              </h3>
              <Badge 
                variant="secondary" 
                className={`${platformConfig.color} text-xs shrink-0`}
              >
                {platformConfig.label}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600">
              {hackathon.deadline && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span className={deadlineSoon ? 'text-orange-600 font-medium' : ''}>
                    {formatDeadline(hackathon.deadline)}
                  </span>
                </div>
              )}
              
              {formatPrizes() && (
                <div className="flex items-center gap-1">
                  <Award className="h-3.5 w-3.5" />
                  <span>${formatPrizes()}</span>
                </div>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleBookmarkClick}
            className="shrink-0"
            aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
          >
            <Bookmark 
              className={`h-4 w-4 ${isBookmarked ? 'fill-current text-primary-600' : ''}`} 
            />
          </Button>
        </div>
      </Card>
    );
  }

  // Render full layout
  return (
    <Card
      className={`
        overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer
        ${deadlineExpired ? 'opacity-60' : ''}
        ${className}
      `}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Section */}
      {hackathon.imageUrl && (
        <div className="relative h-48 bg-gray-100 overflow-hidden">
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse" />
          )}
          
          <ImageWithFallback
            src={hackathon.imageUrl}
            alt={hackathon.title}
            fill
            className={`
              object-cover transition-transform duration-500
              ${isHovered ? 'scale-105' : 'scale-100'}
            `}
            onLoad={() => setImageLoaded(true)}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />

          {/* Platform Badge Overlay */}
          <div className="absolute top-3 left-3">
            <Badge 
              variant="secondary" 
              className={`${platformConfig.color} border`}
            >
              {platformConfig.label}
            </Badge>
          </div>

          {/* Status Badges */}
          <div className="absolute top-3 right-3 flex gap-2">
            {deadlineExpired && (
              <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200">
                Expired
              </Badge>
            )}
            {deadlineSoon && !deadlineExpired && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
                Ending Soon
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Content Section */}
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-semibold text-lg text-gray-900 line-clamp-2 flex-1">
            {hackathon.title}
          </h3>
          
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExternalLinkClick}
              className="p-2"
              aria-label="View on platform"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBookmarkClick}
              className="p-2"
              aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
            >
              <Bookmark 
                className={`h-4 w-4 ${isBookmarked ? 'fill-current text-primary-600' : ''}`} 
              />
            </Button>
          </div>
        </div>

        {/* Description */}
        {showDescription && hackathon.description && (
          <p className="text-gray-600 text-sm line-clamp-2 mb-4">
            {hackathon.description}
          </p>
        )}

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Deadline */}
          {hackathon.deadline && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-gray-500 text-xs">Deadline</p>
                <p className={`font-medium ${deadlineSoon ? 'text-orange-600' : 'text-gray-900'}`}>
                  {formatDate(hackathon.deadline)}
                </p>
              </div>
            </div>
          )}

          {/* Prize Pool */}
          {formatPrizes() && (
            <div className="flex items-center gap-2 text-sm">
              <Award className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-gray-500 text-xs">Prize Pool</p>
                <p className="font-medium text-gray-900">${formatPrizes()}</p>
              </div>
            </div>
          )}

          {/* Participants */}
          {hackathon.participants && (
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-gray-500 text-xs">Participants</p>
                <p className="font-medium text-gray-900">
                  {hackathon.participants.toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Tags */}
        {hackathon.tags && hackathon.tags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Tag className="h-3.5 w-3.5 text-gray-400" />
            {hackathon.tags.slice(0, 3).map((tag, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className="text-xs bg-gray-100 text-gray-700"
              >
                {tag}
              </Badge>
            ))}
            {hackathon.tags.length > 3 && (
              <span className="text-xs text-gray-500">
                +{hackathon.tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
});

// Display name for debugging
HackathonCard.displayName = 'HackathonCard';

export default HackathonCard;