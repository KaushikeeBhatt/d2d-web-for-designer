/**
 * Unstop (formerly Dare2Compete) Hackathon Scraper
 * Scrapes hackathon listings from unstop.com
 */

import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import { Logger } from '@/lib/utils/logger';
import { scraperRateLimiters } from '@/lib/utils/rateLimiter';
import { hackathonSchema } from '@/lib/utils/validators';

const logger = new Logger('UnstopScraper');

// Scraper configuration
const UNSTOP_CONFIG = {
  baseUrl: 'https://unstop.com',
  listingUrl: 'https://unstop.com/hackathons',
  selectors: {
    hackathonCard: '.single_profile',
    title: '.single_profile_name',
    organization: '.single_profile_organisation',
    deadline: '.seperate_box:contains("Deadline") .date_to_be_passed',
    prizes: '.prize_amount',
    participants: '.participants_avg_wrap',
    tags: '.opportunity-tag',
    image: '.img_listing img',
    link: '.single_profile',
    registrationStatus: '.registration_status',
    description: '.single_profile_desc',
  },
  timeout: 30000,
  maxRetries: 3,
  waitForSelector: '.single_profile',
};

/**
 * Extract hackathon data from a card element
 * @param {cheerio.CheerioAPI} $ - Cheerio instance
 * @param {cheerio.Element} card - Card element
 * @param {number} index - Card index for logging
 * @returns {Object|null} Hackathon data or null
 */
function extractHackathonFromCard($, card, index) {
  try {
    logger.debug(`Extracting hackathon ${index + 1}`);
    
    const $card = $(card);
    
    // Extract title - required field
    const title = $card.find(UNSTOP_CONFIG.selectors.title).text().trim();
    if (!title) {
      logger.warn(`Skipping card ${index + 1}: No title found`);
      return null;
    }

    // Extract URL - required field
    const relativeUrl = $card.attr('href') || $card.find('a').first().attr('href');
    if (!relativeUrl) {
      logger.warn(`Skipping "${title}": No URL found`);
      return null;
    }
    const url = relativeUrl.startsWith('http') 
      ? relativeUrl 
      : `${UNSTOP_CONFIG.baseUrl}${relativeUrl.startsWith('/') ? '' : '/'}${relativeUrl}`;

    // Extract deadline
    const deadlineText = $card.find(UNSTOP_CONFIG.selectors.deadline).attr('data-date');
    let deadline = null;
    if (deadlineText) {
      try {
        deadline = new Date(deadlineText).toISOString();
      } catch (error) {
        logger.debug(`Invalid deadline format for "${title}": ${deadlineText}`);
      }
    }

    // Extract organization
    const organization = $card.find(UNSTOP_CONFIG.selectors.organization).text().trim();

    // Extract description
    const description = $card.find(UNSTOP_CONFIG.selectors.description).text().trim() 
      || `Hackathon organized by ${organization || 'Unstop'}`;

    // Extract prizes
    const prizes = [];
    const prizeText = $card.find(UNSTOP_CONFIG.selectors.prizes).text().trim();
    if (prizeText) {
      // Clean prize text and split if multiple values
      const cleanedPrize = prizeText.replace(/[₹$,]/g, '').trim();
      if (cleanedPrize) {
        prizes.push(`Prize Pool: ${prizeText}`);
      }
    }

    // Extract participants count
    let participants = null;
    const participantsText = $card.find(UNSTOP_CONFIG.selectors.participants).text().trim();
    if (participantsText) {
      const match = participantsText.match(/(\d+[,\d]*)/);
      if (match) {
        participants = parseInt(match[1].replace(/,/g, ''), 10);
      }
    }

    // Extract tags
    const tags = [];
    $card.find(UNSTOP_CONFIG.selectors.tags).each((_, tag) => {
      const tagText = $(tag).text().trim();
      if (tagText && tagText.length > 0 && tagText.length < 50) {
        tags.push(tagText);
      }
    });

    // Extract image URL
    let imageUrl = null;
    const imgSrc = $card.find(UNSTOP_CONFIG.selectors.image).attr('src') 
      || $card.find(UNSTOP_CONFIG.selectors.image).attr('data-src');
    if (imgSrc) {
      imageUrl = imgSrc.startsWith('http') 
        ? imgSrc 
        : `${UNSTOP_CONFIG.baseUrl}${imgSrc.startsWith('/') ? '' : '/'}${imgSrc}`;
    }

    // Extract registration status
    const registrationStatus = $card.find(UNSTOP_CONFIG.selectors.registrationStatus).text().trim();
    const isActive = !registrationStatus.toLowerCase().includes('closed') && 
                    !registrationStatus.toLowerCase().includes('ended');

    // Generate source ID from URL
    const sourceId = url.split('/').filter(Boolean).pop() || `unstop-${Date.now()}-${index}`;

    // Construct hackathon object
    const hackathon = {
      title,
      description,
      url,
      platform: 'unstop',
      deadline,
      prizes,
      tags,
      imageUrl,
      participants,
      sourceId,
      eligibility: organization ? `Open to participants via ${organization}` : null,
      isActive,
      platformData: {
        organization,
        registrationStatus,
      }
    };

    // Validate with schema
    try {
      hackathonSchema.parse(hackathon);
      logger.debug(`Successfully extracted: "${title}"`);
      return hackathon;
    } catch (validationError) {
      logger.warn(`Validation failed for "${title}":`, validationError.errors);
      // Return with minimal required fields
      return {
        title,
        url,
        platform: 'unstop',
        sourceId,
        description: description || title,
      };
    }

  } catch (error) {
    logger.error(`Error extracting hackathon from card ${index + 1}:`, error);
    return null;
  }
}

/**
 * Scrape hackathons using Playwright (primary method)
 * @param {Object} options - Scraping options
 * @returns {Promise<Array>} Array of hackathons
 */
async function scrapeWithPlaywright(options = {}) {
  const { limit = 20, page = 1 } = options;
  let browser = null;

  try {
    logger.info('Starting Playwright scraping');
    
    // Launch browser with optimized settings
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      viewport: { width: 1920, height: 1080 },
    });

    const browserPage = await context.newPage();
    
    // Set up request interception to block unnecessary resources
    await browserPage.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    // Navigate to the page
    logger.debug(`Navigating to ${UNSTOP_CONFIG.listingUrl}`);
    await browserPage.goto(UNSTOP_CONFIG.listingUrl, {
      waitUntil: 'domcontentloaded',
      timeout: UNSTOP_CONFIG.timeout,
    });

    // Wait for hackathon cards to load
    await browserPage.waitForSelector(UNSTOP_CONFIG.selectors.hackathonCard, {
      timeout: UNSTOP_CONFIG.timeout,
    });

    // Scroll to load more content if needed
    logger.debug('Scrolling to load more content');
    await browserPage.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await browserPage.waitForTimeout(2000);

    // Get page HTML
    const html = await browserPage.content();
    const $ = cheerio.load(html);

    // Extract hackathons
    const hackathons = [];
    const cards = $(UNSTOP_CONFIG.selectors.hackathonCard).slice(0, limit);
    
    logger.info(`Found ${cards.length} hackathon cards`);

    cards.each((index, card) => {
      if (hackathons.length >= limit) return false;
      
      const hackathon = extractHackathonFromCard($, card, index);
      if (hackathon) {
        hackathons.push(hackathon);
      }
    });

    logger.info(`Successfully scraped ${hackathons.length} hackathons`);
    return hackathons;

  } catch (error) {
    logger.error('Playwright scraping failed:', error);
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
 * @returns {Promise<Array>} Array of hackathons
 */
async function scrapeWithCheerio(options = {}) {
  const { limit = 20 } = options;

  try {
    logger.info('Starting Cheerio scraping (fallback)');
    
    // Fetch the page HTML
    const response = await fetch(UNSTOP_CONFIG.listingUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract hackathons
    const hackathons = [];
    const cards = $(UNSTOP_CONFIG.selectors.hackathonCard).slice(0, limit);
    
    logger.info(`Found ${cards.length} hackathon cards`);

    cards.each((index, card) => {
      if (hackathons.length >= limit) return false;
      
      const hackathon = extractHackathonFromCard($, card, index);
      if (hackathon) {
        hackathons.push(hackathon);
      }
    });

    logger.info(`Successfully scraped ${hackathons.length} hackathons with Cheerio`);
    return hackathons;

  } catch (error) {
    logger.error('Cheerio scraping failed:', error);
    throw error;
  }
}

/**
 * Main scraper function with retry logic
 * @param {Object} options - Scraping options
 * @returns {Promise<Array>} Array of hackathons
 */
export async function scrapeUnstop(options = {}) {
  const startTime = Date.now();
  logger.info('Starting Unstop scraper', options);

  try {
    // Apply rate limiting
    await scraperRateLimiters.unstop.throttle();

    let hackathons = [];
    let lastError = null;

    // Try Playwright first
    for (let attempt = 1; attempt <= UNSTOP_CONFIG.maxRetries; attempt++) {
      try {
        logger.debug(`Attempt ${attempt} with Playwright`);
        hackathons = await scrapeWithPlaywright(options);
        if (hackathons.length > 0) {
          break;
        }
      } catch (error) {
        lastError = error;
        logger.warn(`Playwright attempt ${attempt} failed:`, error.message);
        if (attempt < UNSTOP_CONFIG.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    // Fallback to Cheerio if Playwright failed
    if (hackathons.length === 0) {
      logger.info('Falling back to Cheerio scraper');
      try {
        hackathons = await scrapeWithCheerio(options);
      } catch (error) {
        logger.error('Both Playwright and Cheerio failed');
        throw lastError || error;
      }
    }

    // Add metadata to each hackathon
    const enrichedHackathons = hackathons.map(hackathon => ({
      ...hackathon,
      scrapedAt: new Date().toISOString(),
      scraperVersion: '1.0.0',
    }));

    const duration = Date.now() - startTime;
    logger.info(`Unstop scraping completed in ${duration}ms`, {
      count: enrichedHackathons.length,
      duration,
    });

    return enrichedHackathons;

  } catch (error) {
    logger.error('Unstop scraper failed:', error);
    return [];
  }
}

/**
 * Test function for development
 */
export async function testUnstopScraper() {
  try {
    const results = await scrapeUnstop({ limit: 5 });
    console.log('Test results:', JSON.stringify(results, null, 2));
    return results;
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
}