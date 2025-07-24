/**
 * Central configuration for all web scrapers
 * Contains URLs, selectors, and scraping parameters
 */

/**
 * Scraper timeouts and delays
 */
export const SCRAPER_TIMEOUTS = {
    PAGE_LOAD: 30000,        // 30 seconds for page load
    ELEMENT_WAIT: 10000,     // 10 seconds for element wait
    NETWORK_IDLE: 5000,      // 5 seconds for network idle
    BETWEEN_REQUESTS: 1000,  // 1 second between requests
    RETRY_DELAY: 2000,       // 2 seconds before retry
    MAX_RETRIES: 3           // Maximum retry attempts
  };
  
  /**
   * Scraper limits
   */
  export const SCRAPER_LIMITS = {
    DEFAULT_HACKATHONS: 20,   // Default hackathons per scrape
    MAX_HACKATHONS: 50,       // Maximum hackathons per scrape
    DEFAULT_DESIGNS: 30,      // Default designs per scrape
    MAX_DESIGNS: 100,         // Maximum designs per scrape
    CONCURRENT_PAGES: 3,      // Max concurrent browser pages
    BATCH_SIZE: 10           // Database batch insert size
  };
  
  /**
   * Platform configurations
   */
  export const PLATFORM_CONFIG = {
    devpost: {
      name: 'Devpost',
      baseUrl: 'https://devpost.com',
      searchUrl: 'https://devpost.com/hackathons',
      selectors: {
        hackathonCard: '.challenge-listing',
        title: '.challenge-listing__title',
        url: '.challenge-listing__title a',
        description: '.challenge-listing__tagline',
        image: '.challenge-listing__image img',
        deadline: '.challenge-listing__deadline',
        prizes: '.challenge-listing__prizes',
        participants: '.challenge-listing__participants',
        tags: '.challenge-listing__tags a',
        loadMore: '.load-more-button',
        pagination: '.pagination',
        searchInput: '#search-hackathons',
        filterPanel: '.filters-panel'
      },
      api: {
        endpoint: null, // No public API
        rateLimit: 20    // Requests per minute
      }
    },
    
    unstop: {
      name: 'Unstop',
      baseUrl: 'https://unstop.com',
      searchUrl: 'https://unstop.com/competitions',
      selectors: {
        competitionCard: '.opportunity-card',
        title: '.opportunity-card__title',
        url: '.opportunity-card__title a',
        description: '.opportunity-card__description',
        image: '.opportunity-card__image img',
        deadline: '.opportunity-card__deadline',
        prizes: '.opportunity-card__prize',
        participants: '.opportunity-card__participants',
        eligibility: '.opportunity-card__eligibility',
        loadMore: '.load-more-btn',
        searchInput: '.search-input',
        filterSection: '.filter-section'
      },
      api: {
        endpoint: null,
        rateLimit: 20
      }
    },
    
    cumulus: {
      name: 'CumulusAI',
      baseUrl: 'https://cumulus.ai',
      searchUrl: 'https://cumulus.ai/hackathons',
      selectors: {
        hackathonList: '.hackathon-list',
        hackathonItem: '.hackathon-item',
        title: '.hackathon-title',
        description: '.hackathon-description',
        dates: '.hackathon-dates',
        link: '.hackathon-link',
        tags: '.hackathon-tags span'
      },
      api: {
        endpoint: null,
        rateLimit: 15
      }
    },
    
    behance: {
      name: 'Behance',
      baseUrl: 'https://www.behance.net',
      searchUrl: 'https://www.behance.net/search/projects',
      selectors: {
        projectCard: '.ProjectCover-root',
        title: '.ProjectCover-title',
        image: '.ProjectCover-image img',
        author: '.ProjectCover-owners a',
        stats: '.ProjectCover-stats',
        likes: '.ProjectCover-stats-appreciation',
        views: '.ProjectCover-stats-views',
        url: 'a.ProjectCover-link'
      },
      api: {
        endpoint: 'https://api.behance.net/v2/',
        rateLimit: 10
      }
    },
    
    dribbble: {
      name: 'Dribbble',
      baseUrl: 'https://dribbble.com',
      searchUrl: 'https://dribbble.com/search',
      selectors: {
        shotCard: '.shot-thumbnail',
        title: '.shot-title',
        image: '.shot-image img',
        author: '.user-information a',
        likes: '.js-shot-likes-count',
        views: '.js-shot-views-count',
        url: '.shot-thumbnail-link'
      },
      api: {
        endpoint: null,
        rateLimit: 15
      }
    },
    
    awwwards: {
      name: 'Awwwards',
      baseUrl: 'https://www.awwwards.com',
      searchUrl: 'https://www.awwwards.com/websites/',
      selectors: {
        siteCard: '.site-item',
        title: '.site-title',
        image: '.site-thumbnail img',
        author: '.site-author',
        score: '.site-score',
        category: '.site-category',
        url: 'a.site-link'
      },
      api: {
        endpoint: null,
        rateLimit: 5
      }
    }
  };
  
  /**
   * Browser configuration for Playwright
   */
  export const BROWSER_CONFIG = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ],
    viewport: {
      width: 1920,
      height: 1080
    },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
  };
  
  /**
   * Request headers for scrapers
   */
  export const REQUEST_HEADERS = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  };
  
  /**
   * Get platform configuration
   * @param {string} platform - Platform name
   * @returns {Object} Platform configuration object
   */
  export function getPlatformConfig(platform) {
    const config = PLATFORM_CONFIG[platform];
    
    if (!config) {
      console.error(`Platform configuration not found: ${platform}`);
      throw new Error(`Unknown platform: ${platform}`);
    }
    
    console.log(`Retrieved configuration for platform: ${platform}`);
    return config;
  }
  
  /**
   * Get scraper URL with parameters
   * @param {string} platform - Platform name
   * @param {Object} params - URL parameters
   * @returns {string} Complete URL with parameters
   */
  export function getScraperUrl(platform, params = {}) {
    const config = getPlatformConfig(platform);
    let url = config.searchUrl;
    
    // Add query parameters
    const queryParams = new URLSearchParams(params);
    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    }
    
    console.log(`Generated scraper URL for ${platform}: ${url}`);
    return url;
  }
  
  /**
   * Get rate limit for a platform
   * @param {string} platform - Platform name
   * @returns {number} Requests per minute limit
   */
  export function getRateLimit(platform) {
    const config = getPlatformConfig(platform);
    return config.api?.rateLimit || 10;
  }
  
  /**
   * Calculate delay between requests based on rate limit
   * @param {string} platform - Platform name
   * @returns {number} Delay in milliseconds
   */
  export function getRequestDelay(platform) {
    const rateLimit = getRateLimit(platform);
    const delay = Math.ceil(60000 / rateLimit); // Convert to milliseconds
    
    console.log(`Request delay for ${platform}: ${delay}ms (${rateLimit} req/min)`);
    return delay;
  }
  
  /**
   * Get browser launch options
   * @param {Object} overrides - Override default options
   * @returns {Object} Browser launch options
   */
  export function getBrowserOptions(overrides = {}) {
    return {
      ...BROWSER_CONFIG,
      ...overrides
    };
  }
  
  /**
   * Validate scraper configuration
   * @param {string} platform - Platform to validate
   * @returns {boolean} Whether configuration is valid
   */
  export function validateConfig(platform) {
    try {
      const config = getPlatformConfig(platform);
      
      // Check required fields
      const requiredFields = ['name', 'baseUrl', 'searchUrl', 'selectors'];
      for (const field of requiredFields) {
        if (!config[field]) {
          console.error(`Missing required field: ${field}`);
          return false;
        }
      }
      
      // Check selectors
      const requiredSelectors = ['title'];
      for (const selector of requiredSelectors) {
        if (!config.selectors[selector]) {
          console.error(`Missing required selector: ${selector}`);
          return false;
        }
      }
      
      console.log(`Configuration valid for platform: ${platform}`);
      return true;
    } catch (error) {
      console.error(`Configuration validation failed: ${error.message}`);
      return false;
    }
  }
  
  // Export all configurations
  export default {
    SCRAPER_TIMEOUTS,
    SCRAPER_LIMITS,
    PLATFORM_CONFIG,
    BROWSER_CONFIG,
    REQUEST_HEADERS,
    getPlatformConfig,
    getScraperUrl,
    getRateLimit,
    getRequestDelay,
    getBrowserOptions,
    validateConfig
  };