/**
 * Date Helper Utilities
 * Date manipulation and formatting functions
 * Handles timezone conversions and relative time calculations
 */

import { Logger } from './logger';

const logger = new Logger('DateHelpers');

/**
 * Formats a date to a human-readable string
 * @param {Date|string} date - Date to format
 * @param {string} format - Format type ('short', 'long', 'relative')
 * @returns {string} Formatted date string
 */
export function formatDate(date, format = 'short') {
  try {
    if (!date) return 'No date';
    
    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (isNaN(dateObj.getTime())) {
      logger.warn('Invalid date provided', { date });
      return 'Invalid date';
    }
    
    switch (format) {
      case 'short':
        return dateObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        
      case 'long':
        return dateObj.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });
        
      case 'relative':
        return getRelativeTime(dateObj);
        
      case 'datetime':
        return dateObj.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        
      default:
        return dateObj.toLocaleDateString();
    }
  } catch (error) {
    logger.error('Date formatting error', error);
    return 'Invalid date';
  }
}

/**
 * Gets relative time string (e.g., "2 hours ago", "in 3 days")
 * @param {Date|string} date - Date to compare
 * @returns {string} Relative time string
 */
export function getRelativeTime(date) {
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const diffMs = dateObj - now;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffWeek = Math.floor(diffDay / 7);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffDay / 365);
    
    // Future dates
    if (diffMs > 0) {
      if (diffSec < 60) return 'in a few seconds';
      if (diffMin < 60) return `in ${diffMin} minute${diffMin !== 1 ? 's' : ''}`;
      if (diffHour < 24) return `in ${diffHour} hour${diffHour !== 1 ? 's' : ''}`;
      if (diffDay < 7) return `in ${diffDay} day${diffDay !== 1 ? 's' : ''}`;
      if (diffWeek < 4) return `in ${diffWeek} week${diffWeek !== 1 ? 's' : ''}`;
      if (diffMonth < 12) return `in ${diffMonth} month${diffMonth !== 1 ? 's' : ''}`;
      return `in ${diffYear} year${diffYear !== 1 ? 's' : ''}`;
    }
    
    // Past dates
    const absDiffSec = Math.abs(diffSec);
    const absDiffMin = Math.abs(diffMin);
    const absDiffHour = Math.abs(diffHour);
    const absDiffDay = Math.abs(diffDay);
    const absDiffWeek = Math.abs(diffWeek);
    const absDiffMonth = Math.abs(diffMonth);
    const absDiffYear = Math.abs(diffYear);
    
    if (absDiffSec < 60) return 'just now';
    if (absDiffMin < 60) return `${absDiffMin} minute${absDiffMin !== 1 ? 's' : ''} ago`;
    if (absDiffHour < 24) return `${absDiffHour} hour${absDiffHour !== 1 ? 's' : ''} ago`;
    if (absDiffDay < 7) return `${absDiffDay} day${absDiffDay !== 1 ? 's' : ''} ago`;
    if (absDiffWeek < 4) return `${absDiffWeek} week${absDiffWeek !== 1 ? 's' : ''} ago`;
    if (absDiffMonth < 12) return `${absDiffMonth} month${absDiffMonth !== 1 ? 's' : ''} ago`;
    return `${absDiffYear} year${absDiffYear !== 1 ? 's' : ''} ago`;
  } catch (error) {
    logger.error('Relative time calculation error', error);
    return 'unknown time';
  }
}

/**
 * Checks if a date is in the past
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is in the past
 */
export function isPastDate(date) {
  try {
    if (!date) return false;
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj < new Date();
  } catch (error) {
    logger.error('Date comparison error', error);
    return false;
  }
}

/**
 * Checks if a date is in the future
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is in the future
 */
export function isFutureDate(date) {
  try {
    if (!date) return false;
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj > new Date();
  } catch (error) {
    logger.error('Date comparison error', error);
    return false;
  }
}

/**
 * Checks if a date is within a specific range
 * @param {Date|string} date - Date to check
 * @param {Date|string} startDate - Range start date
 * @param {Date|string} endDate - Range end date
 * @returns {boolean} True if date is within range
 */
export function isDateInRange(date, startDate, endDate) {
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    const startObj = startDate instanceof Date ? startDate : new Date(startDate);
    const endObj = endDate instanceof Date ? endDate : new Date(endDate);
    
    return dateObj >= startObj && dateObj <= endObj;
  } catch (error) {
    logger.error('Date range check error', error);
    return false;
  }
}

/**
 * Gets the days remaining until a deadline
 * @param {Date|string} deadline - Deadline date
 * @returns {number} Days remaining (negative if past)
 */
export function getDaysUntilDeadline(deadline) {
  try {
    if (!deadline) return null;
    
    const deadlineObj = deadline instanceof Date ? deadline : new Date(deadline);
    const now = new Date();
    const diffMs = deadlineObj - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    return diffDays;
  } catch (error) {
    logger.error('Days calculation error', error);
    return null;
  }
}

/**
 * Formats deadline with urgency indicator
 * @param {Date|string} deadline - Deadline date
 * @returns {object} { text: string, urgency: 'expired'|'urgent'|'soon'|'normal' }
 */
export function formatDeadline(deadline) {
  try {
    const days = getDaysUntilDeadline(deadline);
    
    if (days === null) {
      return { text: 'No deadline', urgency: 'normal' };
    }
    
    if (days < 0) {
      return { text: 'Expired', urgency: 'expired' };
    }
    
    if (days === 0) {
      return { text: 'Today', urgency: 'urgent' };
    }
    
    if (days === 1) {
      return { text: 'Tomorrow', urgency: 'urgent' };
    }
    
    if (days <= 7) {
      return { text: `${days} days left`, urgency: 'urgent' };
    }
    
    if (days <= 30) {
      return { text: `${days} days left`, urgency: 'soon' };
    }
    
    const weeks = Math.floor(days / 7);
    if (weeks <= 8) {
      return { text: `${weeks} week${weeks !== 1 ? 's' : ''} left`, urgency: 'normal' };
    }
    
    const months = Math.floor(days / 30);
    return { text: `${months} month${months !== 1 ? 's' : ''} left`, urgency: 'normal' };
  } catch (error) {
    logger.error('Deadline formatting error', error);
    return { text: 'Invalid deadline', urgency: 'normal' };
  }
}

/**
 * Converts a date to ISO string safely
 * @param {Date|string} date - Date to convert
 * @returns {string|null} ISO date string or null
 */
export function toISOStringSafe(date) {
  try {
    if (!date) return null;
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toISOString();
  } catch (error) {
    logger.error('ISO string conversion error', error);
    return null;
  }
}

/**
 * Gets the start and end of a day
 * @param {Date|string} date - Date to get range for
 * @returns {object} { start: Date, end: Date }
 */
export function getDayRange(date = new Date()) {
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    
    const start = new Date(dateObj);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(dateObj);
    end.setHours(23, 59, 59, 999);
    
    return { start, end };
  } catch (error) {
    logger.error('Day range calculation error', error);
    const now = new Date();
    return { start: now, end: now };
  }
}

/**
 * Gets the start and end of current week
 * @returns {object} { start: Date, end: Date }
 */
export function getWeekRange() {
  try {
    const now = new Date();
    const dayOfWeek = now.getDay();
    
    const start = new Date(now);
    start.setDate(now.getDate() - dayOfWeek);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(now);
    end.setDate(now.getDate() + (6 - dayOfWeek));
    end.setHours(23, 59, 59, 999);
    
    return { start, end };
  } catch (error) {
    logger.error('Week range calculation error', error);
    const now = new Date();
    return { start: now, end: now };
  }
}

/**
 * Gets the start and end of current month
 * @returns {object} { start: Date, end: Date }
 */
export function getMonthRange() {
  try {
    const now = new Date();
    
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    return { start, end };
  } catch (error) {
    logger.error('Month range calculation error', error);
    const now = new Date();
    return { start: now, end: now };
  }
}

/**
 * Parses various date formats to Date object
 * @param {string} dateString - Date string to parse
 * @returns {Date|null} Parsed date or null
 */
export function parseDate(dateString) {
  try {
    if (!dateString) return null;
    
    // Try standard date parsing first
    let date = new Date(dateString);
    if (!isNaN(date.getTime())) return date;
    
    // Try common formats
    const formats = [
      // MM/DD/YYYY
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      // DD-MM-YYYY
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
      // YYYY-MM-DD
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    ];
    
    for (const format of formats) {
      const match = dateString.match(format);
      if (match) {
        // Adjust based on format
        if (format === formats[0]) {
          // MM/DD/YYYY
          date = new Date(match[3], match[1] - 1, match[2]);
        } else if (format === formats[1]) {
          // DD-MM-YYYY
          date = new Date(match[3], match[2] - 1, match[1]);
        } else if (format === formats[2]) {
          // YYYY-MM-DD
          date = new Date(match[1], match[2] - 1, match[3]);
        }
        
        if (!isNaN(date.getTime())) return date;
      }
    }
    
    logger.warn('Unable to parse date', { dateString });
    return null;
  } catch (error) {
    logger.error('Date parsing error', error);
    return null;
  }
}

/**
 * Gets a human-readable duration between two dates
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {string} Duration string
 */
export function getDuration(startDate, endDate) {
  try {
    const start = startDate instanceof Date ? startDate : new Date(startDate);
    const end = endDate instanceof Date ? endDate : new Date(endDate);
    
    const diffMs = Math.abs(end - start);
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Same day';
    if (diffDays === 1) return '1 day';
    if (diffDays < 7) return `${diffDays} days`;
    
    const weeks = Math.floor(diffDays / 7);
    if (weeks === 1) return '1 week';
    if (weeks < 4) return `${weeks} weeks`;
    
    const months = Math.floor(diffDays / 30);
    if (months === 1) return '1 month';
    if (months < 12) return `${months} months`;
    
    const years = Math.floor(diffDays / 365);
    if (years === 1) return '1 year';
    return `${years} years`;
  } catch (error) {
    logger.error('Duration calculation error', error);
    return 'Unknown duration';
  }
}

/**
 * Checks if a date string is valid
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if valid date
 */
export function isValidDate(dateString) {
  try {
    if (!dateString) return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  } catch (error) {
    return false;
  }
}

/**
 * Sorts an array of objects by date field
 * @param {array} items - Array to sort
 * @param {string} dateField - Date field name
 * @param {string} order - Sort order ('asc' or 'desc')
 * @returns {array} Sorted array
 */
export function sortByDate(items, dateField = 'createdAt', order = 'desc') {
  try {
    if (!Array.isArray(items)) return [];
    
    return [...items].sort((a, b) => {
      const dateA = new Date(a[dateField]);
      const dateB = new Date(b[dateField]);
      
      if (order === 'asc') {
        return dateA - dateB;
      } else {
        return dateB - dateA;
      }
    });
  } catch (error) {
    logger.error('Date sorting error', error);
    return items;
  }
}