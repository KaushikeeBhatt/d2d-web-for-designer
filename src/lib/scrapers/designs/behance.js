/**
 * Behance Design Scraper
 * Scrapes design projects from Behance using web scraping
 * Falls back to API if available
 */

import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import { Logger } from '@/lib/utils/logger';
import { scraperRateLimiters } from '@/lib/utils/rateLimiter';
import { DESIGN_CATEGORIES, BEHANCE_CATEGORY_MAP } from './categories';
import { designKeywords } from '../keywords';

const logger = new Logger('BehanceScraper');

// Scraper configuration
const BEHANCE_CONFIG = {
  baseUrl: 'https://www.behance.net',
  searchUrl: 'https://www.behance.net/search/projects',
  timeout: 8000, // 8 seconds to be safe with Vercel
  retryAttempts: 2,
  retryDelay: 1000,
};

/**
 * Extract color palette from Behance project
 * @param {cheerio.CheerioAPI} $ - Cheerio instance
 * @returns {string[]} Array of hex color codes
 */
function extractColors($) {
  const colors = [];
  
  try {
    // Look for color swatches in project details
    $('.project-color-swatch, .color-palette-item').each((_, element) => {
      const color = $(element).attr('data-color') || 
                   $(element).css('background-color') ||
                   $(element).attr('style')?.match(/#[0-9A-Fa-f]{6}/)?.[0];
      
      if (color && color.startsWith('#') && !colors.includes(color)) {
        colors.push(color.toUpperCase());
      }
    });
  } catch (error) {
    logger.warn('Failed to extract colors', error);
  }
  
  return colors.slice(0, 5); // Return max 5 colors
}

/**
 * Map Behance field to our category system
 * @param {string} field - Behance creative field
 * @returns {string} Mapped category
 */
function mapBehanceCategory(field) {
  if (!field) return DESIGN_CATEGORIES.EXPERIMENTAL;
  
  const fieldLower = field.toLowerCase();
  
  // Check direct mappings first
  for (const [behanceField, category] of Object.entries(BEHANCE_CATEGORY_MAP)) {
    if (fieldLower.includes(behanceField)) {
      return category;
    }
  }
  
  // Additional keyword-based mapping
  if (fieldLower.includes('brand') || fieldLower.includes('logo')) {
    return DESIGN_CATEGORIES.BRANDING_LOGOS;
  }
  if (fieldLower.includes('type') || fieldLower.includes('font')) {
    return DESIGN_CATEGORIES.COLOR_TYPOGRAPHY;
  }
  if (fieldLower.includes('3d') || fieldLower.includes('motion')) {
    return DESIGN_CATEGORIES.THREE_D_ANIMATIONS;
  }
  
  return DESIGN_CATEGORIES.EXPERIMENTAL;
}

/**
 * Parse a single Behance project from HTML
 * @param {cheerio.CheerioAPI} $ - Cheerio instance for the project element
 * @param {cheerio.Element} element - Project element
 * @returns {Object|null} Parsed design object
 */
function parseProject($, element) {
  try {
    const $project = $(element);
    
    // Extract basic information
    const titleElement = $project.find('.ProjectCover-title, .js-project-title, h3').first();
    const title = titleElement.text().trim();
    
    if (!title) {
      logger.debug('Skipping project without title');
      return null;
    }
    
    // Extract URLs
    const projectLink = $project.find('a.js-project-link, .ProjectCover-link').first();
    const sourceUrl = projectLink.attr('href');
    
    if (!sourceUrl) {
      logger.debug('Skipping project without URL');
      return null;
    }
    
    const fullUrl = sourceUrl.startsWith('http') 
      ? sourceUrl 
      : `${BEHANCE_CONFIG.baseUrl}${sourceUrl}`;
    
    // Extract image URLs
    const imageElement = $project.find('img.ProjectCover-image, .js-cover-image').first();
    const imageUrl = imageElement.attr('src') || 
                    imageElement.attr('data-src') ||
                    imageElement.attr('srcset')?.split(',')[0]?.split(' ')[0];
    
    if (!imageUrl) {
      logger.debug('Skipping project without image');
      return null;
    }
    
    // Generate thumbnail URL (Behance uses different sizes)
    const thumbnailUrl = imageUrl.replace(/\/\d+x\d+\//, '/404x316/');
    
    // Extract author information
    const authorElement = $project.find('.ProjectCover-owner, .js-mini-profile').first();
    const authorName = authorElement.find('.ProjectCover-owner-name, .user-name').text().trim() ||
                      authorElement.text().trim();
    const authorProfileUrl = authorElement.attr('href');
    const authorAvatar = authorElement.find('img').attr('src');
    
    // Extract stats
    const stats = {
      views: parseInt($project.find('.ProjectCover-stats-views, .js-view-count').text().replace(/\D/g, '') || '0'),
      likes: parseInt($project.find('.ProjectCover-stats-appreciations, .js-appreciation-count').text().replace(/\D/g, '') || '0'),
      saves: 0 // Behance doesn't publicly show saves
    };
    
    // Extract creative field for category mapping
    const field = $project.find('.ProjectCover-field, .js-project-field').first().text().trim();
    const category = mapBehanceCategory(field);
    
    // Extract tags
    const tags = [];
    $project.find('.ProjectCover-tag, .js-project-tag').each((_, tagEl) => {
      const tag = $(tagEl).text().trim();
      if (tag && tags.length < 10) {
        tags.push(tag.toLowerCase());
      }
    });
    
    // Add field as a tag if not already present
    if (field && !tags.includes(field.toLowerCase())) {
      tags.push(field.toLowerCase());
    }
    
    // Extract colors if available in preview
    const colors = extractColors($);
    
    // Extract publish date if available
    const publishedText = $project.find('.ProjectCover-published, time').attr('datetime') ||
                         $project.find('.js-published-date').text();
    const publishedAt = publishedText ? new Date(publishedText).toISOString() : new Date().toISOString();
    
    return {
      title,
      description: '', // Will be filled from detail page if needed
      imageUrl,
      thumbnailUrl,
      sourceUrl: fullUrl,
      source: 'behance',
      category,
      tags,
      author: {
        name: authorName || 'Unknown',
        profileUrl: authorProfileUrl ? `${BEHANCE_CONFIG.baseUrl}${authorProfileUrl}` : null,
        avatar: authorAvatar || null
      },
      stats,
      colors,
      publishedAt,
      sourceId: sourceUrl.match(/\/gallery\/(\d+)/)?.[1] || sourceUrl
    };
    
  } catch (error) {
    logger.error('Failed to parse project', error);
    return null;
  }
}

/**
 * Scrape designs from Behance search results
 * @param {Object} options - Scraping options
 * @param {string} options.query - Search query
 * @param {number} options.limit - Maximum number of designs to fetch
 * @param {string} options.field - Creative field filter
 * @returns {Promise<Array>} Array of design objects
 */
export async function scrapeBehance(options = {}) {
  const { 
    query = designKeywords.trending[0], 
    limit = 20,
    field = null 
  } = options;
  
  logger.info('Starting Behance scrape', { query, limit, field });
  
  let browser = null;
  const designs = [];
  
  try {
    // Apply rate limiting
    await scraperRateLimiters.behance.throttle();
    
    // Construct search URL
    const searchParams = new URLSearchParams({
      search: query,
      sort: 'featured_date',
      time: 'week' // Focus on recent content
    });
    
    if (field) {
      searchParams.append('field', field);
    }
    
    const url = `${BEHANCE_CONFIG.searchUrl}?${searchParams}`;
    logger.debug('Scraping URL', { url });
    
    // Launch browser
    browser = await chromium.launch({
      headless: true,
      timeout: BEHANCE_CONFIG.timeout
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    // Set timeout
    page.setDefaultTimeout(BEHANCE_CONFIG.timeout);
    
    // Navigate to search results
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: BEHANCE_CONFIG.timeout 
    });
    
    // Wait for projects to load
    try {
      await page.waitForSelector('.ProjectCover, .js-project', { 
        timeout: 5000 
      });
    } catch (error) {
      logger.warn('No projects found or timeout waiting for selector');
    }
    
    // Scroll to load more projects if needed
    let previousHeight = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 3;
    
    while (designs.length < limit && scrollAttempts < maxScrollAttempts) {
      // Get page HTML
      const html = await page.content();
      const $ = cheerio.load(html);
      
      // Parse projects
      $('.ProjectCover, .js-project').each((index, element) => {
        if (designs.length >= limit) return false;
        
        const project = parseProject($, element);
        if (project && !designs.find(d => d.sourceUrl === project.sourceUrl)) {
          designs.push(project);
          logger.debug('Parsed project', { 
            title: project.title, 
            category: project.category 
          });
        }
      });
      
      // Check if we have enough designs
      if (designs.length >= limit) break;
      
      // Scroll to load more
      const currentHeight = await page.evaluate(() => document.body.scrollHeight);
      
      if (currentHeight === previousHeight) {
        logger.debug('No more content to load');
        break;
      }
      
      previousHeight = currentHeight;
      
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000); // Wait for lazy loading
      
      scrollAttempts++;
    }
    
    logger.info('Behance scrape completed', { 
      found: designs.length, 
      requested: limit 
    });
    
  } catch (error) {
    logger.error('Behance scraping failed', error);
    
    // Retry logic
    if (options.retryCount && options.retryCount < BEHANCE_CONFIG.retryAttempts) {
      logger.info('Retrying Behance scrape', { 
        attempt: options.retryCount + 1 
      });
      
      await new Promise(resolve => setTimeout(resolve, BEHANCE_CONFIG.retryDelay));
      
      return scrapeBehance({ 
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
 * Scrape trending designs from Behance
 * @param {number} limit - Maximum number of designs
 * @returns {Promise<Array>} Array of trending designs
 */
export async function scrapeBehanceTrending(limit = 20) {
  logger.info('Scraping Behance trending designs');
  
  try {
    // Use featured/appreciated sorting for trending
    const designs = await scrapeBehance({
      query: '', // Empty query to get all
      limit,
      sort: 'appreciations' // Most liked
    });
    
    // Mark as trending
    return designs.map(design => ({
      ...design,
      isTrending: true
    }));
    
  } catch (error) {
    logger.error('Failed to scrape Behance trending', error);
    return [];
  }
}

/**
 * Scrape designs by category
 * @param {string} category - Design category
 * @param {number} limit - Maximum number of designs
 * @returns {Promise<Array>} Array of designs in category
 */
export async function scrapeBehanceByCategory(category, limit = 20) {
  logger.info('Scraping Behance by category', { category });
  
  // Map our category to Behance fields
  const fieldMap = {
    [DESIGN_CATEGORIES.BRANDING_LOGOS]: 'branding',
    [DESIGN_CATEGORIES.UI_UX]: 'ui-ux',
    [DESIGN_CATEGORIES.ILLUSTRATIONS]: 'illustration',
    [DESIGN_CATEGORIES.COLOR_TYPOGRAPHY]: 'typography',
    [DESIGN_CATEGORIES.THREE_D_ANIMATIONS]: '3d'
  };
  
  const field = fieldMap[category];
  const query = designKeywords[category] || designKeywords.trending[0];
  
  try {
    return await scrapeBehance({
      query,
      field,
      limit
    });
  } catch (error) {
    logger.error('Failed to scrape Behance by category', error);
    return [];
  }
}

// Test function for development
if (process.env.NODE_ENV === 'development') {
  // Example: node -e "require('./behance').scrapeBehance().then(console.log)"
  exports.testScraper = async () => {
    const results = await scrapeBehance({ limit: 5 });
    console.log('Test results:', JSON.stringify(results, null, 2));
    return results;
  };
}