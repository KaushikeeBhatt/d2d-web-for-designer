/**
 * Devpost hackathon scraper
 * Scrapes hackathon information from devpost.com
 */

import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import { Logger } from '@/lib/utils/logger';
import { scraperRateLimiters } from '@/lib/utils/rateLimiter';
import { isDesignRelated, extractDesignTags, getSearchQuery } from '../keywords';
import { 
  PLATFORM_CONFIG, 
  SCRAPER_TIMEOUTS, 
  SCRAPER_LIMITS,
  getBrowserOptions,
  getRequestDelay 
} from '../config';

const logger = new Logger('DevpostScraper');
const config = PLATFORM_CONFIG.devpost;

/**
 * Parse date from Devpost format
 * @param {string} dateStr - Date string from Devpost
 * @returns {Date|null} Parsed date or null
 */
function parseDevpostDate(dateStr) {
  if (!dateStr) {
    logger.warn('parseDevpostDate: No date string provided');
    return null;
  }

  try {
    // Devpost formats: "Jan 15, 2025" or "15 days left"
    const cleanStr = dateStr.trim();
    
    // Handle "X days left" format
    if (cleanStr.includes('days left') || cleanStr.includes('day left')) {
      const daysMatch = cleanStr.match(/(\d+)\s+days?\s+left/);
      if (daysMatch) {
        const days = parseInt(daysMatch[1]);
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + days);
        deadline.setHours(23, 59, 59, 999);
        return deadline;
      }
    }
    
    // Handle "hours left" format
    if (cleanStr.includes('hours left') || cleanStr.includes('hour left')) {
      const hoursMatch = cleanStr.match(/(\d+)\s+hours?\s+left/);
      if (hoursMatch) {
        const hours = parseInt(hoursMatch[1]);
        const deadline = new Date();
        deadline.setHours(deadline.getHours() + hours);
        return deadline;
      }
    }
    
    // Try standard date parsing
    const parsedDate = new Date(cleanStr);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
    
    logger.warn(`Unable to parse date: ${dateStr}`);
    return null;
  } catch (error) {
    logger.error(`Error parsing date: ${dateStr}`, error);
    return null;
  }
}

/**
 * Extract hackathon data from a card element
 * @param {Object} $ - Cheerio instance
 * @param {Object} card - Card element
 * @returns {Object|null} Hackathon data or null
 */
function extractHackathonFromCard($, card) {
  try {
    const $card = $(card);
    
    // Extract title
    const titleElement = $card.find(config.selectors.title);
    const title = titleElement.text().trim();
    
    if (!title) {
      logger.warn('No title found for hackathon card');
      return null;
    }
    
    // Extract URL
    const urlElement = $card.find(config.selectors.url);
    const relativeUrl = urlElement.attr('href');
    
    if (!relativeUrl) {
      logger.warn(`No URL found for hackathon: ${title}`);
      return null;
    }
    
    const url = relativeUrl.startsWith('http') 
      ? relativeUrl 
      : `${config.baseUrl}${relativeUrl}`;
    
    // Extract source ID from URL
    const sourceId = relativeUrl.split('/').pop() || relativeUrl;
    
    // Extract description
    const description = $card.find(config.selectors.description).text().trim();
    
    // Check if design-related
    const combinedText = `${title} ${description}`;
    if (!isDesignRelated(combinedText)) {
      logger.info(`Skipping non-design hackathon: ${title}`);
      return null;
    }
    
    // Extract image
    const imageElement = $card.find(config.selectors.image);
    let imageUrl = imageElement.attr('src') || imageElement.attr('data-src');
    
    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = `${config.baseUrl}${imageUrl}`;
    }
    
    // Extract deadline
    const deadlineText = $card.find(config.selectors.deadline).text().trim();
    const deadline = parseDevpostDate(deadlineText);
    
    // Extract prizes
    const prizesText = $card.find(config.selectors.prizes).text().trim();
    const prizes = prizesText ? [prizesText] : [];
    
    // Extract participants count
    const participantsText = $card.find(config.selectors.participants).text().trim();
    const participantsMatch = participantsText.match(/(\d+)/);
    const participants = participantsMatch ? parseInt(participantsMatch[1]) : null;
    
    // Extract tags
    const tags = [];
    $card.find(config.selectors.tags).each((_, tagEl) => {
      const tag = $(tagEl).text().trim().toLowerCase();
      if (tag) tags.push(tag);
    });
    
    // Add design-related tags
    const designTags = extractDesignTags(combinedText);
    const allTags = [...new Set([...tags, ...designTags])];
    
    // Build hackathon object
    const hackathon = {
      title,
      description,
      url,
      platform: 'devpost',
      sourceId,
      deadline,
      prizes,
      tags: allTags,
      imageUrl,
      participants,
      isActive: deadline ? deadline > new Date() : true,
      lastScraped: new Date()
    };
    
    logger.info(`Extracted hackathon: ${title}`);
    return hackathon;
    
  } catch (error) {
    logger.error('Error extracting hackathon from card', error);
    return null;
  }
}

/**
 * Scrape hackathons using Playwright (primary method)
 * @param {Object} options - Scraping options
 * @returns {Array} Array of hackathon objects
 */
async function scrapeWithPlaywright(options = {}) {
  const { limit = SCRAPER_LIMITS.DEFAULT_HACKATHONS, searchQuery } = options;
  let browser = null;
  
  try {
    logger.info('Starting Playwright scraping', { limit, searchQuery });
    
    // Launch browser
    browser = await chromium.launch(getBrowserOptions());
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    
    const page = await context.newPage();
    const hackathons = [];
    
    // Build URL with search query
    let url = config.searchUrl;
    if (searchQuery) {
      url += `?search=${encodeURIComponent(searchQuery)}`;
    }
    
    // Navigate to page
    logger.info(`Navigating to: ${url}`);
    await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: SCRAPER_TIMEOUTS.PAGE_LOAD 
    });
    
    // Wait for content to load
    await page.waitForSelector(config.selectors.hackathonCard, {
      timeout: SCRAPER_TIMEOUTS.ELEMENT_WAIT
    });
    
    // Scroll to load more content
    let previousHeight = 0;
    let scrollAttempts = 0;
    const maxScrolls = 5;
    
    while (hackathons.length < limit && scrollAttempts < maxScrolls) {
      // Get current page height
      const currentHeight = await page.evaluate(() => document.body.scrollHeight);
      
      if (currentHeight === previousHeight) {
        logger.info('No more content to load');
        break;
      }
      
      // Scroll to bottom
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000); // Wait for content to load
      
      // Extract hackathons from current page
      const html = await page.content();
      const $ = cheerio.load(html);
      
      $(config.selectors.hackathonCard).each((index, card) => {
        if (hackathons.length >= limit) return false;
        
        const hackathon = extractHackathonFromCard($, card);
        if (hackathon) {
          // Check for duplicates
          const exists = hackathons.some(h => h.sourceId === hackathon.sourceId);
          if (!exists) {
            hackathons.push(hackathon);
          }
        }
      });
      
      previousHeight = currentHeight;
      scrollAttempts++;
      
      logger.info(`Scroll ${scrollAttempts}: Found ${hackathons.length} hackathons`);
      
      // Rate limiting
      await scraperRateLimiters.devpost.throttle();
    }
    
    logger.info(`Playwright scraping completed: ${hackathons.length} hackathons found`);
    return hackathons;
    
  } catch (error) {
    logger.error('Playwright scraping failed', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Scrape hackathons using Cheerio (fallback method)
 * @param {Object} options - Scraping options
 * @returns {Array} Array of hackathon objects
 */
async function scrapeWithCheerio(options = {}) {
  const { limit = SCRAPER_LIMITS.DEFAULT_HACKATHONS, searchQuery } = options;
  
  try {
    logger.info('Starting Cheerio scraping (fallback)', { limit, searchQuery });
    
    // Build URL
    let url = config.searchUrl;
    if (searchQuery) {
      url += `?search=${encodeURIComponent(searchQuery)}`;
    }
    
    // Fetch page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; D2DBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const hackathons = [];
    
    $(config.selectors.hackathonCard).each((index, card) => {
      if (hackathons.length >= limit) return false;
      
      const hackathon = extractHackathonFromCard($, card);
      if (hackathon) {
        hackathons.push(hackathon);
      }
    });
    
    logger.info(`Cheerio scraping completed: ${hackathons.length} hackathons found`);
    return hackathons;
    
  } catch (error) {
    logger.error('Cheerio scraping failed', error);
    throw error;
  }
}

/**
 * Main scrape function for Devpost
 * @param {Object} options - Scraping options
 * @returns {Array} Array of hackathon objects
 */
export async function scrapeDevpost(options = {}) {
  const startTime = Date.now();
  
  try {
    logger.info('Starting Devpost scraper', options);
    
    // Get search query for design-related content
    const searchQuery = options.searchQuery || getSearchQuery('devpost', 0);
    const scraperOptions = { ...options, searchQuery };
    
    let hackathons = [];
    
    // Try Playwright first
    try {
      hackathons = await scrapeWithPlaywright(scraperOptions);
    } catch (playwrightError) {
      logger.warn('Playwright failed, falling back to Cheerio', playwrightError);
      
      // Fallback to Cheerio
      hackathons = await scrapeWithCheerio(scraperOptions);
    }
    
    // Process and validate hackathons
    const validHackathons = hackathons.filter(h => {
      if (!h.title || !h.url || !h.sourceId) {
        logger.warn('Invalid hackathon data', h);
        return false;
      }
      return true;
    });
    
    const duration = Date.now() - startTime;
    logger.info(`Devpost scraping completed in ${duration}ms`, {
      total: validHackathons.length,
      duration
    });
    
    return validHackathons;
    
  } catch (error) {
    logger.error('Devpost scraper failed', error);
    return [];
  }
}

/**
 * Test the Devpost scraper
 */
export async function testDevpostScraper() {
  logger.info('Testing Devpost scraper...');
  
  try {
    const hackathons = await scrapeDevpost({ limit: 5 });
    
    logger.info(`Test completed. Found ${hackathons.length} hackathons:`);
    hackathons.forEach((h, i) => {
      logger.info(`${i + 1}. ${h.title}`);
      logger.info(`   URL: ${h.url}`);
      logger.info(`   Deadline: ${h.deadline || 'Not specified'}`);
      logger.info(`   Tags: ${h.tags.join(', ') || 'None'}`);
    });
    
    return hackathons;
  } catch (error) {
    logger.error('Test failed', error);
    throw error;
  }
}

// Export for use in other modules
export default scrapeDevpost;