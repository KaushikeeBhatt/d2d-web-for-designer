/**
 * Image Helper Utilities
 * Handles image processing, validation, and optimization for the D2D Designer platform
 */

import { Logger } from './logger';

const logger = new Logger('ImageHelpers');

/**
 * Validates if a URL is a valid image URL
 * @param {string} url - The URL to validate
 * @returns {boolean} True if valid image URL
 */
export function isValidImageUrl(url) {
  try {
    if (!url || typeof url !== 'string') {
      logger.debug('Invalid image URL: empty or not a string');
      return false;
    }

    // Check if it's a valid URL
    const urlObj = new URL(url);
    
    // Check protocol
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      logger.debug(`Invalid image URL protocol: ${urlObj.protocol}`);
      return false;
    }

    // Check for common image extensions
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif'];
    const pathname = urlObj.pathname.toLowerCase();
    const hasImageExtension = imageExtensions.some(ext => pathname.endsWith(ext));
    
    // Some CDNs don't use extensions, so also check for image-related paths
    const hasImagePath = pathname.includes('/image') || 
                        pathname.includes('/img') || 
                        pathname.includes('/photo') ||
                        pathname.includes('/media');

    return hasImageExtension || hasImagePath;
  } catch (error) {
    logger.debug('Invalid image URL format', { url, error: error.message });
    return false;
  }
}

/**
 * Generates a placeholder image URL
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {string} text - Text to display on placeholder
 * @returns {string} Placeholder image URL
 */
export function generatePlaceholder(width = 400, height = 300, text = 'D2D') {
  try {
    // Using a simple SVG data URL for placeholder
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#e5e7eb"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
              font-family="Arial, sans-serif" font-size="24" fill="#9ca3af">
          ${text}
        </text>
      </svg>
    `.trim();
    
    const encoded = encodeURIComponent(svg);
    return `data:image/svg+xml,${encoded}`;
  } catch (error) {
    logger.error('Failed to generate placeholder', { error: error.message });
    return '/images/placeholder.jpg'; // Fallback to static placeholder
  }
}

/**
 * Extracts dominant colors from an image URL (client-side only)
 * @param {string} imageUrl - The image URL
 * @returns {Promise<string[]>} Array of hex color codes
 */
export async function extractColors(imageUrl) {
  // This is a placeholder - in production, you'd use a service or library
  // For server-side, consider using sharp or jimp
  logger.info('Color extraction requested', { imageUrl });
  
  // Return default palette for now
  return ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
}

/**
 * Optimizes image URL for Next.js Image component
 * @param {string} url - Original image URL
 * @param {Object} options - Optimization options
 * @returns {string} Optimized image URL
 */
export function optimizeImageUrl(url, options = {}) {
  try {
    if (!isValidImageUrl(url)) {
      logger.warn('Invalid image URL for optimization', { url });
      return generatePlaceholder();
    }

    const { width, height, quality = 75 } = options;
    
    // For Next.js, we'll use the _next/image endpoint
    // This is handled automatically by next/image component
    // Here we just ensure the URL is clean
    
    // Remove any existing query parameters that might conflict
    const urlObj = new URL(url);
    urlObj.searchParams.delete('w');
    urlObj.searchParams.delete('h');
    urlObj.searchParams.delete('q');
    
    return urlObj.toString();
  } catch (error) {
    logger.error('Failed to optimize image URL', { url, error: error.message });
    return url;
  }
}

/**
 * Gets image dimensions from URL (requires server-side implementation)
 * @param {string} url - Image URL
 * @returns {Promise<{width: number, height: number}>} Image dimensions
 */
export async function getImageDimensions(url) {
  try {
    // This would require server-side implementation with sharp or similar
    // For now, return default dimensions
    logger.debug('Getting image dimensions', { url });
    
    return {
      width: 1200,
      height: 800
    };
  } catch (error) {
    logger.error('Failed to get image dimensions', { url, error: error.message });
    return { width: 1200, height: 800 };
  }
}

/**
 * Converts image URL to use Next.js Image Optimization API
 * @param {string} src - Source image URL
 * @param {number} width - Desired width
 * @param {number} quality - Image quality (1-100)
 * @returns {string} Optimized image URL
 */
export function getOptimizedImageUrl(src, width, quality = 75) {
  try {
    if (!src) return generatePlaceholder();
    
    // For external images, Next.js will handle optimization
    // Just ensure the URL is properly encoded
    return encodeURI(src);
  } catch (error) {
    logger.error('Failed to get optimized image URL', { src, error: error.message });
    return generatePlaceholder();
  }
}

/**
 * Checks if an image URL is from a trusted domain
 * @param {string} url - Image URL to check
 * @returns {boolean} True if from trusted domain
 */
export function isTrustedImageDomain(url) {
  try {
    const trustedDomains = [
      'behance.net',
      'dribbble.com',
      'awwwards.com',
      'unsplash.com',
      'cloudfront.net',
      'devpost.com',
      'unstop.com',
      'amazonaws.com',
      'googleusercontent.com'
    ];
    
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    return trustedDomains.some(domain => 
      hostname.endsWith(domain) || hostname.includes(`.${domain}`)
    );
  } catch (error) {
    logger.debug('Failed to check trusted domain', { url, error: error.message });
    return false;
  }
}

/**
 * Sanitizes image URL to prevent XSS attacks
 * @param {string} url - Image URL to sanitize
 * @returns {string} Sanitized URL
 */
export function sanitizeImageUrl(url) {
  try {
    if (!url) return '';
    
    // Remove any javascript: or data: URLs (except our safe SVG placeholders)
    if (url.startsWith('javascript:') || 
        (url.startsWith('data:') && !url.startsWith('data:image/svg+xml,'))) {
      logger.warn('Potentially malicious image URL blocked', { url });
      return generatePlaceholder();
    }
    
    // Ensure it's a valid URL
    const urlObj = new URL(url);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      logger.warn('Invalid protocol in image URL', { protocol: urlObj.protocol });
      return generatePlaceholder();
    }
    
    return urlObj.toString();
  } catch (error) {
    logger.debug('Failed to sanitize image URL', { url, error: error.message });
    return generatePlaceholder();
  }
}

/**
 * Gets fallback image URL based on content type
 * @param {string} type - Content type (hackathon, design, user, etc.)
 * @returns {string} Fallback image URL
 */
export function getFallbackImage(type = 'default') {
  const fallbacks = {
    hackathon: '/images/placeholder.jpg',
    design: generatePlaceholder(800, 600, 'Design'),
    user: generatePlaceholder(200, 200, 'User'),
    logo: '/logo.svg',
    default: '/images/placeholder.jpg'
  };
  
  return fallbacks[type] || fallbacks.default;
}

/**
 * Preloads critical images for performance
 * @param {string[]} imageUrls - Array of image URLs to preload
 */
export function preloadImages(imageUrls) {
  if (typeof window === 'undefined') return;
  
  try {
    imageUrls.forEach(url => {
      if (isValidImageUrl(url)) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = url;
        document.head.appendChild(link);
      }
    });
    
    logger.debug('Images preloaded', { count: imageUrls.length });
  } catch (error) {
    logger.error('Failed to preload images', { error: error.message });
  }
}

/**
 * Lazy loads images using Intersection Observer
 * @param {string} selector - CSS selector for images
 * @param {Object} options - Intersection Observer options
 */
export function setupLazyLoading(selector = 'img[data-src]', options = {}) {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
  
  try {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          const src = img.getAttribute('data-src');
          
          if (src && isValidImageUrl(src)) {
            img.src = src;
            img.removeAttribute('data-src');
            observer.unobserve(img);
          }
        }
      });
    }, {
      rootMargin: '50px 0px',
      threshold: 0.01,
      ...options
    });
    
    document.querySelectorAll(selector).forEach(img => {
      imageObserver.observe(img);
    });
    
    logger.debug('Lazy loading initialized');
  } catch (error) {
    logger.error('Failed to setup lazy loading', { error: error.message });
  }
}

/**
 * Image processing utilities for design gallery
 */
export const designImageUtils = {
  /**
   * Gets optimal thumbnail size based on container
   * @param {number} containerWidth - Container width
   * @returns {{width: number, height: number}} Optimal dimensions
   */
  getOptimalThumbnailSize(containerWidth) {
    // Calculate based on grid layout
    const columns = containerWidth > 1024 ? 4 : containerWidth > 768 ? 3 : 2;
    const gap = 16; // Tailwind gap-4
    const width = Math.floor((containerWidth - (gap * (columns - 1))) / columns);
    const height = Math.floor(width * 0.75); // 4:3 aspect ratio
    
    return { width, height };
  },
  
  /**
   * Generates srcset for responsive images
   * @param {string} baseUrl - Base image URL
   * @param {number[]} sizes - Array of widths
   * @returns {string} Srcset string
   */
  generateSrcSet(baseUrl, sizes = [400, 800, 1200, 1600]) {
    try {
      return sizes
        .map(size => `${getOptimizedImageUrl(baseUrl, size)} ${size}w`)
        .join(', ');
    } catch (error) {
      logger.error('Failed to generate srcset', { error: error.message });
      return baseUrl;
    }
  }
};

// Export all utilities
export default {
  isValidImageUrl,
  generatePlaceholder,
  extractColors,
  optimizeImageUrl,
  getImageDimensions,
  getOptimizedImageUrl,
  isTrustedImageDomain,
  sanitizeImageUrl,
  getFallbackImage,
  preloadImages,
  setupLazyLoading,
  designImageUtils
};