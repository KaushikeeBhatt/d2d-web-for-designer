/**
 * Dribbble Design Scraper
 * Scrapes design shots from Dribbble using web scraping
 * Handles lazy loading and dynamic content
 */

import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import { Logger } from '@/lib/utils/logger';
import { scraperRateLimiters } from '@/lib/utils/rateLimiter';
import { DESIGN_CATEGORIES, DRIBBBLE_CATEGORY_MAP } from './categories';
import { designKeywords } from '../keywords';

const logger = new Logger('DribbbleScraper');

// Scraper configuration
const DRIBBBLE_CONFIG = {
  baseUrl: 'https://dribbble.com',
  searchUrl: 'https://dribbble.com/search/shots',
  popularUrl: 'https://dribbble.com/shots/popular',
  timeout: 8000,
  retryAttempts: 2,
  retryDelay: 1500,
  scrollDelay: 1500,
};

/**
 * Extract dominant colors from Dribbble shot
 * @param {cheerio.CheerioAPI} $ - Cheerio instance
 * @param {cheerio.Element} element - Shot element
 * @returns {string[]} Array of hex color codes
 */
function extractColors($, element) {
  const colors = [];
  
  try {
    // Dribbble sometimes includes color tags
    $(element).find('.color-swatch, .shot-color').each((_, colorEl) => {
      const color = $(colorEl).attr('data-color') || 
                   $(colorEl).css('background-color');
      
      if (color && color.startsWith('#')) {
        colors.push(color.toUpperCase());
      }
    });
    
    // Try to extract from style attributes
    const styleColors = $(element).find('[style*="background"]')
      .map((_, el) => {
        const style = $(el).attr('style') || '';
        const match = style.match(/#[0-9A-Fa-f]{6}/);
        return match ? match[0].toUpperCase() : null;
      })
      .get()
      .filter(Boolean);
    
    colors.push(...styleColors);
    
  } catch (error) {
    logger.warn('Failed to extract colors', error);
  }
  
  return [...new Set(colors)].slice(0, 5);
}

/**
 * Map Dribbble tags to our category system
 * @param {string[]} tags - Array of tags from Dribbble
 * @returns {string} Mapped category
 */
function mapDribbbleCategory(tags = []) {
  if (!tags.length) return DESIGN_CATEGORIES.EXPERIMENTAL;
  
  const tagsLower = tags.map(tag => tag.toLowerCase());
  
  // Check each tag against our mapping
  for (const tag of tagsLower) {
    for (const [dribbbleTag, category] of Object.entries(DRIBBBLE_CATEGORY_MAP)) {
      if (tag.includes(dribbbleTag)) {
        return category;
      }
    }
  }
  
  // Additional keyword matching
  if (tagsLower.some(tag => tag.includes('logo') || tag.includes('brand'))) {
    return DESIGN_CATEGORIES.BRANDING_LOGOS;
  }
  if (tagsLower.some(tag => tag.includes('ui') || tag.includes('ux') || tag.includes('app'))) {
    return DESIGN_CATEGORIES.UI_UX;
  }
  if (tagsLower.some(tag => tag.includes('3d') || tag.includes('animation'))) {
    return DESIGN_CATEGORIES.THREE_D_ANIMATIONS;
  }
  
  return DESIGN_CATEGORIES.EXPERIMENTAL;
}

/**
 * Parse a single Dribbble shot from HTML
 * @param {cheerio.CheerioAPI} $ - Cheerio instance
 * @param {cheerio.Element} element - Shot element
 * @returns {Object|null} Parsed design object
 */
function parseShot($, element) {
  try {
    const $shot = $(element);
    
    // Skip ads or promoted content
    if ($shot.hasClass('promoted') || $shot.find('.badge-pro').length) {
      logger.debug('Skipping promoted content');
      return null;
    }
    
    // Extract title
    const titleElement = $shot.find('.shot-title, .dribbble-link, h3').first();
    const title = titleElement.text().trim() || 
                 titleElement.attr('title') ||
                 $shot.find('img').attr('alt');
    
    if (!title || title.length < 3) {
      logger.debug('Skipping shot without valid title');
      return null;
    }
    
    // Extract URL
    const shotLink = $shot.find('a.shot-thumbnail-link, .dribbble-link').first();
    const relativeUrl = shotLink.attr('href');
    
    if (!relativeUrl) {
      logger.debug('Skipping shot without URL');
      return null;
    }
    
    const sourceUrl = relativeUrl.startsWith('http') 
      ? relativeUrl 
      : `${DRIBBBLE_CONFIG.baseUrl}${relativeUrl}`;
    
    // Extract shot ID from URL
    const sourceId = relativeUrl.match(/shots\/(\d+)/)?.[1] || relativeUrl;
    
    // Extract images
    const imageElement = $shot.find('img.shot-image, .dribbble-img, figure img').first();
    let imageUrl = imageElement.attr('data-src') || 
                  imageElement.attr('src') ||
                  imageElement.attr('data-srcset')?.split(',')[0]?.split(' ')[0];
    
    if (!imageUrl) {
      logger.debug('Skipping shot without image');
      return null;
    }
    
    // Clean up image URL
    if (!imageUrl.startsWith('http')) {
      imageUrl = `https:${imageUrl}`;
    }
    
    // Generate thumbnail (Dribbble uses different sizes)
    const thumbnailUrl = imageUrl
      .replace(/\/\d+x\d+/, '/400x300')
      .replace('_1x', '_teaser');
    
    // Extract author information
    const authorLink = $shot.find('.user-information a, .shot-user-link').first();
    const authorName = authorLink.find('.display-name').text().trim() ||
                      authorLink.text().trim() ||
                      'Unknown Designer';
    
    const authorProfileUrl = authorLink.attr('href');
    const authorAvatar = $shot.find('.user-avatar img, .shot-user-avatar').attr('src');
    
    // Extract stats
    const viewsText = $shot.find('.js-shot-views-count, .shot-views').text();
    const likesText = $shot.find('.js-shot-likes-count, .shot-likes').text();
    const savesText = $shot.find('.js-shot-saves-count, .shot-saves').text();
    
    const stats = {
      views: parseInt(viewsText.replace(/[^\d]/g, '') || '0'),
      likes: parseInt(likesText.replace(/[^\d]/g, '') || '0'),
      saves: parseInt(savesText.replace(/[^\d]/g, '') || '0')
    };
    
    // Extract tags
    const tags = [];
    $shot.find('.shot-tag, .tag').each((_, tagEl) => {
      const tag = $(tagEl).text().trim().toLowerCase();
      if (tag && !tags.includes(tag) && tags.length < 10) {
        tags.push(tag);
      }
    });
    
    // Determine category from tags
    const category = mapDribbbleCategory(tags);
    
    // Extract colors
    const colors = extractColors($, element);
    
    // Extract publish date
    const timeElement = $shot.find('time, .shot-time');
    const publishedAt = timeElement.attr('datetime') || 
                       timeElement.attr('title') ||
                       new Date().toISOString();
    
    // Extract description if available
    const description = $shot.find('.shot-description, .comment').text().trim()
      .substring(0, 500); // Limit description length
    
    return {
      title,
      description,
      imageUrl,
      thumbnailUrl,
      sourceUrl,
      source: 'dribbble',
      category,
      tags,
      author: {
        name: authorName,
        profileUrl: authorProfileUrl ? `${DRIBBBLE_CONFIG.baseUrl}${authorProfileUrl}` : null,
        avatar: authorAvatar || null
      },
      stats,
      colors,
      publishedAt: new Date(publishedAt).toISOString(),
      sourceId
    };
    
  } catch (error) {
    logger.error('Failed to parse shot', error);
    return null;
  }
}

/**
 * Scrape designs from Dribbble
 * @param {Object} options - Scraping options
 * @param {string} options.query - Search query
 * @param {number} options.limit - Maximum number of designs
 * @param {string} options.sort - Sort order (popular, new)
 * @returns {Promise<Array>} Array of design objects
 */
export async function scrapeDribbble(options = {}) {
  const { 
    query = '', 
    limit = 20,
    sort = 'popular'
  } = options;
  
  logger.info('Starting Dribbble scrape', { query, limit, sort });
  
  let browser = null;
  const designs = [];
  
  try {
    // Apply rate limiting
    await scraperRateLimiters.dribbble.throttle();
    
    // Determine URL based on options
    let url;
    if (query) {
      const searchParams = new URLSearchParams({
        q: query,
        s: sort === 'new' ? 'latest' : 'popular'
      });
      url = `${DRIBBBLE_CONFIG.searchUrl}?${searchParams}`;
    } else {
      url = sort === 'new' 
        ? `${DRIBBBLE_CONFIG.baseUrl}/shots/recent`
        : DRIBBBLE_CONFIG.popularUrl;
    }
    
    logger.debug('Scraping URL', { url });
    
    // Launch browser
    browser = await chromium.launch({
      headless: true,
      timeout: DRIBBBLE_CONFIG.timeout
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    page.setDefaultTimeout(DRIBBBLE_CONFIG.timeout);
    
    // Navigate to page
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: DRIBBBLE_CONFIG.timeout 
    });
    
    // Wait for shots to load
    try {
      await page.waitForSelector('.shot-thumbnail, .dribbble-shot, li[data-thumbnail]', { 
        timeout: 5000 
      });
    } catch (error) {
      logger.warn('No shots found or timeout');
    }
    
    // Handle infinite scroll
    let previousHeight = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 4;
    let noNewContentCount = 0;
    
    while (designs.length < limit && scrollAttempts < maxScrollAttempts) {
      // Get current page content
      const html = await page.content();
      const $ = cheerio.load(html);
      
      // Parse all shots
      const currentDesignCount = designs.length;
      
      $('.shot-thumbnail, .dribbble-shot, li[data-thumbnail]').each((index, element) => {
        if (designs.length >= limit) return false;
        
        const shot = parseShot($, element);
        if (shot && !designs.find(d => d.sourceId === shot.sourceId)) {
          designs.push(shot);
          logger.debug('Parsed shot', { 
            title: shot.title, 
            category: shot.category,
            stats: shot.stats
          });
        }
      });
      
      // Check if we got new content
      if (designs.length === currentDesignCount) {
        noNewContentCount++;
        if (noNewContentCount >= 2) {
          logger.debug('No new content after scrolling');
          break;
        }
      } else {
        noNewContentCount = 0;
      }
      
      // Check if we have enough
      if (designs.length >= limit) break;
      
      // Scroll to load more
      const currentHeight = await page.evaluate(() => document.body.scrollHeight);
      
      if (currentHeight === previousHeight) {
        logger.debug('Reached end of content');
        break;
      }
      
      previousHeight = currentHeight;
      
      // Scroll down
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      // Wait for new content to load
      await page.waitForTimeout(DRIBBBLE_CONFIG.scrollDelay);
      
      // Try clicking "Load more" button if exists
      try {
        const loadMoreButton = await page.$('.load-more, button[data-target="more-shots"]');
        if (loadMoreButton) {
          await loadMoreButton.click();
          await page.waitForTimeout(DRIBBBLE_CONFIG.scrollDelay);
        }
      } catch (error) {
        // No load more button, continue scrolling
      }
      
      scrollAttempts++;
    }
    
    logger.info('Dribbble scrape completed', { 
      found: designs.length, 
      requested: limit,
      scrollAttempts 
    });
    
  } catch (error) {
    logger.error('Dribbble scraping failed', error);
    
    // Retry logic
    if (options.retryCount && options.retryCount < DRIBBBLE_CONFIG.retryAttempts) {
      logger.info('Retrying Dribbble scrape', { 
        attempt: options.retryCount + 1 
      });
      
      await new Promise(resolve => setTimeout(resolve, DRIBBBLE_CONFIG.retryDelay));
      
      return scrapeDribbble({ 
        ...options, 
        retryCount: (options.retryCount || 0) + 1 
      });
    }
    
    throw error;
    
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  return designs;
}

/**
 * Scrape trending designs from Dribbble
 * @param {number} limit - Maximum number of designs
 * @returns {Promise<Array>} Array of trending designs
 */
export async function scrapeDribbbleTrending(limit = 20) {
  logger.info('Scraping Dribbble trending designs');
  
  try {
    const designs = await scrapeDribbble({
      query: '',
      limit,
      sort: 'popular'
    });
    
    // Mark high-engagement shots as trending
    return designs.map(design => ({
      ...design,
      isTrending: design.stats.likes > 100 || design.stats.views > 1000
    }));
    
  } catch (error) {
    logger.error('Failed to scrape Dribbble trending', error);
    return [];
  }
}

/**
 * Scrape designs by category from Dribbble
 * @param {string} category - Design category
 * @param {number} limit - Maximum number of designs
 * @returns {Promise<Array>} Array of designs in category
 */
export async function scrapeDribbbleByCategory(category, limit = 20) {
  logger.info('Scraping Dribbble by category', { category });
  
  // Map our categories to Dribbble search terms
  const categoryQueries = {
    [DESIGN_CATEGORIES.BRANDING_LOGOS]: 'logo branding identity',
    [DESIGN_CATEGORIES.UI_UX]: 'ui ux mobile app interface',
    [DESIGN_CATEGORIES.ILLUSTRATIONS]: 'illustration vector art',
    [DESIGN_CATEGORIES.COLOR_TYPOGRAPHY]: 'typography type font lettering',
    [DESIGN_CATEGORIES.THREE_D_ANIMATIONS]: '3d animation motion graphics'
  };
  
  const query = categoryQueries[category] || designKeywords[category]?.[0] || '';
  
  try {
    const designs = await scrapeDribbble({
      query,
      limit,
      sort: 'popular'
    });
    
    // Ensure category is correctly set
    return designs.map(design => ({
      ...design,
      category: category || design.category
    }));
    
  } catch (error) {
    logger.error('Failed to scrape Dribbble by category', error);
    return [];
  }
}

// Test function for development
if (process.env.NODE_ENV === 'development') {
  exports.testScraper = async () => {
    const results = await scrapeDribbble({ limit: 5 });
    console.log('Test results:', JSON.stringify(results, null, 2));
    return results;
  };
}