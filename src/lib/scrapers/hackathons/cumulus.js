/**
 * Cumulus IQ Hackathon Scraper
 * Scrapes hackathon listings from cumulus.iq platform
 */

import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import { Logger } from '@/lib/utils/logger';
import { scraperRateLimiters } from '@/lib/utils/rateLimiter';
import { hackathonSchema } from '@/lib/utils/validators';

const logger = new Logger('CumulusScraper');

// Scraper configuration
const CUMULUS_CONFIG = {
  baseUrl: 'https://www.cumulus.iq',
  listingUrl: 'https://www.cumulus.iq/challenges',
  selectors: {
    challengeCard: '.challenge-card, .challenge-item',
    title: '.challenge-title, .card-title, h3',
    organization: '.challenge-org, .organization-name',
    deadline: '.deadline, .end-date, .challenge-deadline',
    prizes: '.prize-pool, .total-prize',
    description: '.challenge-description, .card-description',
    tags: '.challenge-tag, .skill-tag',
    image: '.challenge-image img, .card-image img',
    link: 'a[href*="/challenge/"], a[href*="/challenges/"]',
    status: '.challenge-status, .status-badge',
    participants: '.participant-count, .team-count',
    difficulty: '.difficulty-level',
  },
  timeout: 30000,
  maxRetries: 3,
  waitForSelector: '.challenge-card, .challenge-item',
};

/**
 * Parse date from various formats
 * @param {string} dateText - Date text to parse
 * @returns {string|null} ISO date string or null
 */
function parseDateSafely(dateText) {
  if (!dateText) return null;

  try {
    // Common date patterns
    const patterns = [
      /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i,
      /(\d{4})-(\d{2})-(\d{2})/,
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
    ];

    // Try to parse with Date constructor first
    const directParse = new Date(dateText);
    if (!isNaN(directParse.getTime())) {
      return directParse.toISOString();
    }

    // Try patterns
    for (const pattern of patterns) {
      if (pattern.test(dateText)) {
        const parsed = new Date(dateText);
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString();
        }
      }
    }

    logger.debug(`Unable to parse date: ${dateText}`);
    return null;
  } catch (error) {
    logger.debug(`Date parsing error for "${dateText}":`, error.message);
    return null;
  }
}

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
    const title = $card.find(CUMULUS_CONFIG.selectors.title).first().text().trim();
    if (!title) {
      logger.warn(`Skipping card ${index + 1}: No title found`);
      return null;
    }

    // Extract URL - required field
    const linkElement = $card.find(CUMULUS_CONFIG.selectors.link).first();
    let url = linkElement.attr('href') || $card.find('a').first().attr('href');
    
    if (!url) {
      // Try to get URL from card wrapper
      url = $card.closest('a').attr('href');
    }
    
    if (!url) {
      logger.warn(`Skipping "${title}": No URL found`);
      return null;
    }

    // Ensure absolute URL
    if (!url.startsWith('http')) {
      url = `${CUMULUS_CONFIG.baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    }

    // Extract organization
    const organization = $card.find(CUMULUS_CONFIG.selectors.organization).text().trim()
      || 'Cumulus IQ';

    // Extract description
    let description = $card.find(CUMULUS_CONFIG.selectors.description).text().trim();
    if (!description) {
      description = `${title} - Challenge hosted by ${organization}`;
    }
    // Limit description length
    if (description.length > 500) {
      description = description.substring(0, 497) + '...';
    }

    // Extract deadline
    const deadlineText = $card.find(CUMULUS_CONFIG.selectors.deadline).text().trim();
    const deadline = parseDateSafely(deadlineText);

    // Extract prizes
    const prizes = [];
    const prizeElements = $card.find(CUMULUS_CONFIG.selectors.prizes);
    prizeElements.each((_, elem) => {
      const prizeText = $(elem).text().trim();
      if (prizeText && prizeText.length > 0) {
        prizes.push(prizeText);
      }
    });

    // Extract status
    const statusText = $card.find(CUMULUS_CONFIG.selectors.status).text().trim();
    const isActive = !statusText.toLowerCase().includes('closed') && 
                    !statusText.toLowerCase().includes('completed') &&
                    !statusText.toLowerCase().includes('ended');

    // Extract participants
    let participants = null;
    const participantsText = $card.find(CUMULUS_CONFIG.selectors.participants).text().trim();
    if (participantsText) {
      const match = participantsText.match(/(\d+[,\d]*)/);
      if (match) {
        participants = parseInt(match[1].replace(/,/g, ''), 10);
      }
    }

    // Extract tags
    const tags = [];
    $card.find(CUMULUS_CONFIG.selectors.tags).each((_, tag) => {
      const tagText = $(tag).text().trim();
      if (tagText && tagText.length > 0 && tagText.length < 50) {
        tags.push(tagText);
      }
    });

    // Extract difficulty level
    const difficulty = $card.find(CUMULUS_CONFIG.selectors.difficulty).text().trim();
    if (difficulty) {
      tags.push(`Difficulty: ${difficulty}`);
    }

    // Extract image URL
    let imageUrl = null;
    const imgElement = $card.find(CUMULUS_CONFIG.selectors.image).first();
    const imgSrc = imgElement.attr('src') || imgElement.attr('data-src') || imgElement.attr('data-lazy-src');
    if (imgSrc) {
      imageUrl = imgSrc.startsWith('http') 
        ? imgSrc 
        : `${CUMULUS_CONFIG.baseUrl}${imgSrc.startsWith('/') ? '' : '/'}${imgSrc}`;
    }

    // Generate source ID from URL
    const urlParts = url.split('/').filter(Boolean);
    const sourceId = urlParts[urlParts.length - 1] || `cumulus-${Date.now()}-${index}`;

    // Construct hackathon object
    const hackathon = {
      title,
      description,
      url,
      platform: 'cumulus',
      deadline,
      prizes,
      tags,
      imageUrl,
      participants,
      sourceId,
      eligibility: null,
      isActive,
      platformData: {
        organization,
        status: statusText,
        difficulty,
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
        platform: 'cumulus',
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
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ],
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
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

    // Navigate to the page with retry logic
    logger.debug(`Navigating to ${CUMULUS_CONFIG.listingUrl}`);
    let navigationSuccess = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await browserPage.goto(CUMULUS_CONFIG.listingUrl, {
          waitUntil: 'networkidle',
          timeout: CUMULUS_CONFIG.timeout,
        });
        navigationSuccess = true;
        break;
      } catch (navError) {
        logger.warn(`Navigation attempt ${attempt} failed:`, navError.message);
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    if (!navigationSuccess) {
      throw new Error('Failed to navigate to Cumulus page after 3 attempts');
    }

    // Wait for content to load
    try {
      await browserPage.waitForSelector(CUMULUS_CONFIG.selectors.challengeCard, {
        timeout: CUMULUS_CONFIG.timeout,
      });
    } catch (error) {
      logger.warn('Timeout waiting for challenge cards, proceeding with available content');
    }

    // Scroll to load more content
    logger.debug('Scrolling to load more content');
    await browserPage.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await browserPage.waitForTimeout(3000);

    // Get page HTML
    const html = await browserPage.content();
    const $ = cheerio.load(html);

    // Extract hackathons
    const hackathons = [];
    const cards = $(CUMULUS_CONFIG.selectors.challengeCard).slice(0, limit);
    
    logger.info(`Found ${cards.length} challenge cards`);

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
    
    // Fetch the page HTML with proper headers
    const response = await fetch(CUMULUS_CONFIG.listingUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract hackathons
    const hackathons = [];
    const cards = $(CUMULUS_CONFIG.selectors.challengeCard).slice(0, limit);
    
    logger.info(`Found ${cards.length} challenge cards`);

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
export async function scrapeCumulus(options = {}) {
  const startTime = Date.now();
  logger.info('Starting Cumulus scraper', options);

  try {
    // Apply rate limiting
    await scraperRateLimiters.cumulus.throttle();

    let hackathons = [];
    let lastError = null;

    // Try Playwright first with retries
    for (let attempt = 1; attempt <= CUMULUS_CONFIG.maxRetries; attempt++) {
      try {
        logger.debug(`Attempt ${attempt} with Playwright`);
        hackathons = await scrapeWithPlaywright(options);
        if (hackathons.length > 0) {
          break;
        }
      } catch (error) {
        lastError = error;
        logger.warn(`Playwright attempt ${attempt} failed:`, error.message);
        if (attempt < CUMULUS_CONFIG.maxRetries) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, waitTime));
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
        // Return empty array instead of throwing to prevent complete failure
        return [];
      }
    }

    // Add metadata to each hackathon
    const enrichedHackathons = hackathons.map(hackathon => ({
      ...hackathon,
      scrapedAt: new Date().toISOString(),
      scraperVersion: '1.0.0',
    }));

    const duration = Date.now() - startTime;
    logger.info(`Cumulus scraping completed in ${duration}ms`, {
      count: enrichedHackathons.length,
      duration,
    });

    return enrichedHackathons;

  } catch (error) {
    logger.error('Cumulus scraper failed:', error);
    // Return empty array to prevent cascading failures
    return [];
  }
}

/**
 * Test function for development
 */
export async function testCumulusScraper() {
  try {
    const results = await scrapeCumulus({ limit: 5 });
    console.log('Test results:', JSON.stringify(results, null, 2));
    return results;
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
}