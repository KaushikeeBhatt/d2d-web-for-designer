/**
 * Keywords configuration for design-focused hackathon and inspiration scraping
 * These keywords help filter and categorize design-related content
 */

/**
 * Primary design-related keywords for hackathon filtering
 */
export const DESIGN_KEYWORDS = [
  // Core design terms
  'design',
  'designer',
  'ui',
  'ux',
  'ui/ux',
  'user interface',
  'user experience',
  'product design',
  'visual design',
  'interaction design',
  
  // Graphic and visual design
  'graphic design',
  'graphics',
  'illustration',
  'typography',
  'branding',
  'logo design',
  'identity design',
  'brand identity',
  
  // Digital design
  'web design',
  'app design',
  'mobile design',
  'responsive design',
  'interface design',
  'digital design',
  'website design',
  
  // Creative fields
  'creative',
  'creativity',
  'art',
  'artistic',
  'visual arts',
  'digital art',
  'creative coding',
  
  // Design tools and methods
  'figma',
  'sketch',
  'adobe',
  'photoshop',
  'illustrator',
  'xd',
  'design system',
  'wireframe',
  'prototype',
  'mockup',
  
  // 3D and motion
  '3d design',
  '3d modeling',
  'animation',
  'motion design',
  'motion graphics',
  'after effects',
  'blender',
  'cinema 4d',
  
  // Emerging design areas
  'ar design',
  'vr design',
  'augmented reality',
  'virtual reality',
  'game design',
  'metaverse',
  'nft design',
  'generative design',
  'ai design',
  'design automation'
];

/**
 * Extended keywords for broader design-related content
 */
export const EXTENDED_DESIGN_KEYWORDS = [
  ...DESIGN_KEYWORDS,
  'design thinking',
  'human-centered design',
  'design challenge',
  'design competition',
  'design hackathon',
  'design sprint',
  'design jam',
  'designathon',
  'creative challenge',
  'visual challenge',
  'design innovation',
  'design solution',
  'design problem',
  'sustainable design',
  'inclusive design',
  'accessible design',
  'social design',
  'design for good',
  'design impact'
];

/**
 * Keywords to exclude (helps filter out non-design hackathons)
 */
export const EXCLUDE_KEYWORDS = [
  'circuit design',
  'chip design',
  'hardware design',
  'pcb design',
  'system design interview',
  'database design',
  'network design',
  'architecture design' // unless preceded by 'information' or 'user'
];

/**
 * Platform-specific search queries
 */
export const PLATFORM_SEARCH_QUERIES = {
  devpost: [
    'design',
    'ui ux',
    'graphic design',
    'creative',
    'user experience',
    'product design'
  ],
  unstop: [
    'design challenge',
    'ui/ux competition',
    'graphic design',
    'creative challenge',
    'design hackathon'
  ],
  behance: [
    'ui design',
    'branding',
    'illustration',
    'typography',
    'motion design',
    'web design'
  ],
  dribbble: [
    'ui',
    'web design',
    'mobile design',
    'illustration',
    'branding',
    'animation'
  ]
};

/**
 * Category keywords mapping for design inspiration
 */
export const CATEGORY_KEYWORDS = {
  'color-typography': [
    'typography',
    'typeface',
    'font',
    'color palette',
    'color scheme',
    'color theory',
    'lettering',
    'calligraphy'
  ],
  'illustrations': [
    'illustration',
    'illustrator',
    'drawing',
    'digital illustration',
    'vector art',
    'character design',
    'concept art',
    'editorial illustration'
  ],
  'branding-logos': [
    'branding',
    'logo',
    'brand identity',
    'visual identity',
    'brand design',
    'logo design',
    'trademark',
    'brand guidelines'
  ],
  'ui-ux': [
    'ui design',
    'ux design',
    'user interface',
    'user experience',
    'app design',
    'web design',
    'dashboard',
    'mobile app'
  ],
  '3d-animations': [
    '3d',
    'animation',
    'motion',
    'motion graphics',
    '3d modeling',
    'cinema 4d',
    'blender',
    'after effects'
  ],
  'experimental': [
    'experimental',
    'generative',
    'creative coding',
    'interactive',
    'ai art',
    'procedural',
    'glitch art',
    'data visualization'
  ]
};

/**
 * Check if a title or description contains design-related keywords
 * @param {string} text - Text to check
 * @param {number} minMatches - Minimum number of keyword matches required
 * @returns {boolean} - Whether the text is design-related
 */
export function isDesignRelated(text, minMatches = 1) {
  if (!text || typeof text !== 'string') {
    console.warn('isDesignRelated: Invalid text input');
    return false;
  }

  const lowerText = text.toLowerCase();
  let matchCount = 0;

  // Check for excluded keywords first
  for (const excludeKeyword of EXCLUDE_KEYWORDS) {
    if (lowerText.includes(excludeKeyword)) {
      // Special case: allow "information architecture design"
      if (excludeKeyword === 'architecture design' && 
          (lowerText.includes('information architecture') || 
           lowerText.includes('user architecture'))) {
        continue;
      }
      console.log(`Excluded due to keyword: ${excludeKeyword}`);
      return false;
    }
  }

  // Count design keyword matches
  for (const keyword of DESIGN_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      matchCount++;
      if (matchCount >= minMatches) {
        console.log(`Design-related: matched "${keyword}"`);
        return true;
      }
    }
  }

  return false;
}

/**
 * Extract design-related tags from text
 * @param {string} text - Text to extract tags from
 * @returns {string[]} - Array of relevant design tags
 */
export function extractDesignTags(text) {
  if (!text || typeof text !== 'string') {
    console.warn('extractDesignTags: Invalid text input');
    return [];
  }

  const lowerText = text.toLowerCase();
  const tags = new Set();

  // Check all design keywords
  for (const keyword of DESIGN_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      // Normalize certain tags
      if (keyword.includes('/')) {
        tags.add(keyword.replace('/', '-'));
      } else {
        tags.add(keyword.toLowerCase().replace(/\s+/g, '-'));
      }
    }
  }

  // Check category-specific keywords
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        tags.add(keyword.toLowerCase().replace(/\s+/g, '-'));
      }
    }
  }

  return Array.from(tags).slice(0, 10); // Limit to 10 tags
}

/**
 * Get search query for a specific platform
 * @param {string} platform - Platform name
 * @param {number} index - Query index (for rotation)
 * @returns {string} - Search query
 */
export function getSearchQuery(platform, index = 0) {
  const queries = PLATFORM_SEARCH_QUERIES[platform];
  
  if (!queries || queries.length === 0) {
    console.warn(`No search queries defined for platform: ${platform}`);
    return 'design';
  }

  const queryIndex = index % queries.length;
  console.log(`Using search query for ${platform}: "${queries[queryIndex]}"`);
  
  return queries[queryIndex];
}

/**
 * Categorize content based on keywords
 * @param {string} text - Text to categorize
 * @returns {string[]} - Array of matching categories
 */
export function categorizeByKeywords(text) {
  if (!text || typeof text !== 'string') {
    console.warn('categorizeByKeywords: Invalid text input');
    return [];
  }

  const lowerText = text.toLowerCase();
  const categories = [];

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        categories.push(category);
        break; // Only add each category once
      }
    }
  }

  return categories.length > 0 ? categories : ['ui-ux']; // Default to UI/UX
}

// Export all constants and functions
export default {
  DESIGN_KEYWORDS,
  EXTENDED_DESIGN_KEYWORDS,
  EXCLUDE_KEYWORDS,
  PLATFORM_SEARCH_QUERIES,
  CATEGORY_KEYWORDS,
  isDesignRelated,
  extractDesignTags,
  getSearchQuery,
  categorizeByKeywords
};