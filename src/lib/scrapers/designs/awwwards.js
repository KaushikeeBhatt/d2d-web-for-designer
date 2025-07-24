/**
 * Awwwards Design Scraper
 * Scrapes award-winning web designs from Awwwards
 * Focuses on high-quality, innovative web design projects
 */

import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import { Logger } from '@/lib/utils/logger';
import { scraperRateLimiters } from '@/lib/utils/rateLimiter';
import { DESIGN_CATEGORIES } from './categories';
import { designKeywords } from '../keywords';

const logger = new Logger('AwwwardsScraper');

// Scraper configuration
const AWWWARDS_CONFIG = {
  baseUrl: 'https://www.awwwards.com',
  winnersUrl: 'https://www.awwwards.com/websites/',
  nomineeUrl: 'https://www.awwwards.com/nominees/',
  timeout: 8000,
  retryAttempts: 2,
  retryDelay: 2000,
  scrollDelay: 2000,
};

/**
 * Determine category based on Awwwards tags and categories
 * @param {string[]} tags - Array of tags
 * @param {string} category - Awwwards category
 * @returns {string} Mapped category
 */
function mapAwwwardsCategory(tags = [], category = '') {
  const combined = [...tags, category].map(t => t.toLowerCase());
  
  // Check for specific patterns
  if (combined.some(t => t.includes('portfolio') || t.includes('agency'))) {
    return DESIGN_CATEGORIES.BRANDING_LOGOS;
  }
  if (combined.some(t => t.includes('e-commerce') || t.includes('app') || t.includes('saas'))) {
    return DESIGN_CATEGORIES.UI_UX;
  }
  if (combined.some(t => t.includes('illustration') || t.includes('art'))) {
    return DESIGN_CATEGORIES.ILLUSTRATIONS;
  }
  if (combined.some(t => t.includes('type') || t.includes('font'))) {
    return DESIGN_CATEGORIES.COLOR_TYPOGRAPHY;
  }
  if (combined.some(t => t.includes('3d') || t.includes('webgl') || t.includes('animation'))) {
    return DESIGN_CATEGORIES.THREE_D_ANIMATIONS;
  }
  if (combined.some(t => t.includes('experimental') || t.includes('creative'))) {
    return DESIGN_CATEGORIES.EXPERIMENTAL;
  }
  
  // Default to UI/UX for web designs
  return DESIGN_CATEGORIES.UI_UX;
}

/**
 * Extract color palette from Awwwards site preview
 * @param {cheerio.CheerioAPI} $ - Cheerio instance
 * @param {cheerio.Element} element - Site element
 * @returns {string[]} Array of hex color codes
 */
function extractColors($, element) {
  const colors = [];
  
  try {
    // Look for color badges or swatches
    $(element).find('.color, .palette-color').each((_, colorEl) => {
      const color = $(colorEl).attr('data-color') || 
                   $(colorEl).css('background-color') ||
                   $(colorEl).text();
      
      if (color && color.match(/#[0-9A-Fa-f]{6}/)) {
        colors.push(color.toUpperCase());
      }
    });
    
  } catch (error) {
    logger.warn('Failed to extract colors', error);
  }
  
  return [...new Set(colors)].slice(0, 5);
}

/**
 * Parse a single Awwwards site from HTML
 * @param {cheerio.CheerioAPI} $ - Cheerio instance
 * @param {cheerio.Element} element - Site element
 * @returns {Object|null} Parsed design object
 */
function parseSite($, element) {
  try {
    const $site = $(element);
    
    // Extract title
    const titleElement = $site.find('.js-vote-title, h3, .content__title').first();
    const title = titleElement.text().trim();
    
    if (!title) {
      logger.debug('Skipping site without title');
      return null;
    }
    
    // Extract URLs
    const linkElement = $site.find('a.js-visit, .content__link').first();
    const sourceUrl = linkElement.attr('href');
    
    if (!sourceUrl) {
      logger.debug('Skipping site without URL');
      return null;
    }
    
    const fullUrl = sourceUrl.startsWith('http') 
      ? sourceUrl 
      : `${AWWWARDS_CONFIG.baseUrl}${sourceUrl}`;
    
    // Extract site ID
    const siteId = $site.attr('data-id') || 
                  sourceUrl.match(/sites\/([^\/]+)/)?.[1] ||
                  sourceUrl;
    
    // Extract images
    const imageElement = $site.find('img, .lazy').first();
    let imageUrl = imageElement.attr('data-src') || 
                  imageElement.attr('src') ||
                  imageElement.attr('data-srcset')?.split(',')[0]?.split(' ')[0];
    
    if (!imageUrl) {
      logger.debug('Skipping site without image');
      return null;
    }
    
    // Clean up image URL
    if (!imageUrl.startsWith('http')) {
      imageUrl = imageUrl.startsWith('//') ? `https:${imageUrl}` : `${AWWWARDS_CONFIG.baseUrl}${imageUrl}`;
    }
    
    // Create thumbnail version
    const thumbnailUrl = imageUrl.replace(/\/\d+x\d+/, '/417x417');
    
    // Extract author/agency information
    const authorElement = $site.find('.by, .content__by').first();
    const authorText = authorElement.text().trim();
    const authorName = authorText.replace(/^by\s+/i, '') || 'Unknown';
    const authorLink = authorElement.find('a').attr('href');
    
    // Extract scores/stats (Awwwards specific)
    const scores = {
      design: parseFloat($site.find('.js-vote-design, .vote__number--design').text()) || 0,
      usability: parseFloat($site.find('.js-vote-usability, .vote__number--usability').text()) || 0,
      creativity: parseFloat($site.find('.js-vote-creativity, .vote__number--creativity').text()) || 0,
      content: parseFloat($site.find('.js-vote-content, .vote__number--content').text()) || 0,
    };
    
    // Calculate average score as "likes"
    const avgScore = Object.values(scores).filter(s => s > 0).length > 0
      ? Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).filter(s => s > 0).length
      : 0;
    
    const stats = {
      views: parseInt($site.find('.views').text().replace(/\D/g, '') || '0'),
      likes: Math.round(avgScore * 100), // Convert to percentage
      saves: parseInt($site.find('.bt-item__likes').text().replace(/\D/g, '') || '0')
    };
    
    // Extract tags and categories
    const tags = [];
    $site.find('.tags a, .content__tags a').each((_, tagEl) => {
      const tag = $(tagEl).text().trim().toLowerCase();
      if (tag && tags.length < 10) {
        tags.push(tag);
      }
    });
    
    // Extract main category
    const categoryText = $site.find('.content__type, .category').text().trim();
    const category = mapAwwwardsCategory(tags, categoryText);
    
    // Extract awards/badges
    const awards = [];
    $site.find('.trophy, .badge, .ribbon').each((_, awardEl) => {
      const award = $(awardEl).attr('title') || $(awardEl).text().trim();
      if (award) awards.push(award);
    });
    
    if (awards.length > 0) {
      tags.push(...awards.map(a => a.toLowerCase()));
    }
    
    // Extract colors
    const colors = extractColors($, element);
    
    // Extract date
    const dateElement = $site.find('time, .date');
    const publishedAt = dateElement.attr('datetime') || 
                       dateElement.text() ||
                       new Date().toISOString();
    
    // Extract description
    const description = $site.find('.description, .content__description').text().trim()
      .substring(0, 500);
    
    return {
      title,
      description: description || `Award-winning ${categoryText || 'web design'} project`,
      imageUrl,
      thumbnailUrl,
      sourceUrl: fullUrl,
      source: 'awwwards',
      category,
      tags: [...new Set(tags)], // Remove duplicates
      author: {
        name: authorName,
        profileUrl: authorLink ? `${AWWWARDS_CONFIG.baseUrl}${authorLink}` : null,
        avatar: null // Awwwards doesn't show avatars in listings
      },
      stats,
      colors,
      publishedAt: new Date(publishedAt).toISOString(),
      sourceId: siteId,
      // Additional Awwwards-specific data
      platformData: {
        scores,
        awards
      }
    };
    
  } catch (error) {
    logger.error('Failed to parse site', error);
    return null;
  }
}

/**
 * Scrape designs from Awwwards
 * @param {Object} options - Scraping options
 * @param {string} options.type - Type of sites (winners, nominees, all)
 * @param {number} options.limit - Maximum number of designs
 * @param {string} options.category - Filter by category
 * @returns {Promise<Array>} Array of design objects
 */
export async function scrapeAwwwards(options = {}) {
  const { 
    type = 'winners', 
    limit = 20,
    category = null
  } = options;
  
  logger.info('Starting Awwwards scrape', { type, limit, category });
  
  let browser = null;
  const designs = [];
  
  try {
    // Apply rate limiting
    await scraperRateLimiters.awwwards.throttle();
    
    // Determine URL
    let url = type === 'nominees' ? AWWWARDS_CONFIG.nomineeUrl : AWWWARDS_CONFIG.winnersUrl;
    
    if (category) {
      url += `?categories=${category}`;
    }
    
    logger.debug('Scraping URL', { url });
    
    // Launch browser
    browser = await chromium.launch({
      headless: true,
      timeout: AWWWARDS_CONFIG.timeout
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    page.setDefaultTimeout(AWWWARDS_CONFIG.timeout);
    
    // Navigate to page
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: AWWWARDS_CONFIG.timeout 
    });
    
    // Wait for content to load
    try {
      await page.waitForSelector('.list-items article, .grid__item', { 
        timeout: 5000 
      });
    } catch (error) {
      logger.warn('No sites found or timeout');
    }
    
    // Handle lazy loading with scrolling
    let previousHeight = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 5;
    let consecutiveNoNewContent = 0;
    
    while (designs.length < limit && scrollAttempts < maxScrollAttempts) {
      // Get current content
      const html = await page.content();
      const $ = cheerio.load(html);
      
      const beforeCount = designs.length;
      
      // Parse all sites
      $('.list-items article, .grid__item, .js-grid-item').each((index, element) => {
        if (designs.length >= limit) return false;
        
        const site = parseSite($, element);
        if (site && !designs.find(d => d.sourceId === site.sourceId)) {
          designs.push(site);
          logger.debug('Parsed site', { 
            title: site.title,
            category: site.category,
            awards: site.platformData?.awards
          });
        }
      });
      
      // Check if we got new content
      if (designs.length === beforeCount) {
        consecutiveNoNewContent++;
        if (consecutiveNoNewContent >= 2) {
          logger.debug('No new content after multiple scrolls');
          break;
        }
      } else {
        consecutiveNoNewContent = 0;
      }
      
      // Check if we have enough
      if (designs.length >= limit) break;
      
      // Scroll to load more
      const currentHeight = await page.evaluate(() => document.body.scrollHeight);
      
      if (currentHeight === previousHeight) {
        logger.debug('Reached end of content');
        
        // Try to click "Load more" button
        try {
          const loadMoreButton = await page.$('button.load-more, .js-load-more');
          if (loadMoreButton) {
            await loadMoreButton.click();
            await page.waitForTimeout(AWWWARDS_CONFIG.scrollDelay);
          } else {
            break;
          }
        } catch (error) {
          break;
        }
      }
      
      previousHeight = currentHeight;
      
      // Scroll down
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      await page.waitForTimeout(AWWWARDS_CONFIG.scrollDelay);
      scrollAttempts++;
    }
    
    logger.info('Awwwards scrape completed', { 
      found: designs.length, 
      requested: limit,
      scrollAttempts
    });
    
  } catch (error) {
    logger.error('Awwwards scraping failed', error);
    
    // Retry logic
    if (options.retryCount && options.retryCount < AWWWARDS_CONFIG.retryAttempts) {
      logger.info('Retrying Awwwards scrape', { 
        attempt: options.retryCount + 1 
      });
      
      await new Promise(resolve => setTimeout(resolve, AWWWARDS_CONFIG.retryDelay));
      
      return scrapeAwwwards({ 
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
 * Scrape trending/recent winners from Awwwards
 * @param {number} limit - Maximum number of designs
 * @returns {Promise<Array>} Array of trending designs
 */
export async function scrapeAwwardsTrending(limit = 20) {
  logger.info('Scraping Awwwards trending designs');
  
  try {
    // Get recent winners (highest quality)
    const winners = await scrapeAwwwards({
      type: 'winners',
      limit: Math.ceil(limit / 2)
    });
    
    // Get recent nominees
    const nominees = await scrapeAwwwards({
      type: 'nominees',
      limit: Math.ceil(limit / 2)
    });
    
    // Combine and mark as trending
    const allDesigns = [...winners, ...nominees];
    
    return allDesigns
      .map(design => ({
        ...design,
        isTrending: true
      }))
      .slice(0, limit);
    
  } catch (error) {
    logger.error('Failed to scrape Awwwards trending', error);
    return [];
  }
}

/**
 * Scrape designs by category from Awwwards
 * @param {string} category - Design category
 * @param {number} limit - Maximum number of designs
 * @returns {Promise<Array>} Array of designs in category
 */
export async function scrapeAwwardsByCategory(category, limit = 20) {
  logger.info('Scraping Awwwards by category', { category });
  
  // Map our categories to Awwwards categories
  const categoryMap = {
    [DESIGN_CATEGORIES.UI_UX]: 'web-interactive',
    [DESIGN_CATEGORIES.BRANDING_LOGOS]: 'portfolio',
    [DESIGN_CATEGORIES.THREE_D_ANIMATIONS]: 'animation',
    [DESIGN_CATEGORIES.EXPERIMENTAL]: 'experimental'
  };
  
  const awwwardsCategory = categoryMap[category];
  
  try {
    const designs = await scrapeAwwwards({
      type: 'winners',
      limit,
      category: awwwardsCategory
    });
    
    // Ensure category is set correctly
    return designs.map(design => ({
      ...design,
      category: category || design.category
    }));
    
  } catch (error) {
    logger.error('Failed to scrape Awwwards by category', error);
    
    // Fallback to general scraping
    try {
      const allDesigns = await scrapeAwwwards({ limit: limit * 2 });
      return allDesigns
        .filter(d => d.category === category)
        .slice(0, limit);
    } catch (fallbackError) {
      logger.error('Fallback scraping also failed', fallbackError);
      return [];
    }
  }
}

// Test function for development
if (process.env.NODE_ENV === 'development') {
  exports.testScraper = async () => {
    const results = await scrapeAwwwards({ limit: 5 });
    console.log('Test results:', JSON.stringify(results, null, 2));
    return results;
  };
}