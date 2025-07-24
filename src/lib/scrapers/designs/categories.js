/**
 * Design Categories Configuration
 * Central configuration for design categories across the platform
 * Includes category mappings for different design platforms
 */

/**
 * Main design categories enum
 * Used throughout the application for consistency
 */
export const DESIGN_CATEGORIES = {
    ALL: 'all',
    COLOR_TYPOGRAPHY: 'color-typography',
    ILLUSTRATIONS: 'illustrations',
    BRANDING_LOGOS: 'branding-logos',
    UI_UX: 'ui-ux',
    THREE_D_ANIMATIONS: '3d-animations',
    EXPERIMENTAL: 'experimental'
  };
  
  /**
   * Human-readable labels for each category
   * Used in UI components for display
   */
  export const CATEGORY_LABELS = {
    [DESIGN_CATEGORIES.ALL]: 'All',
    [DESIGN_CATEGORIES.COLOR_TYPOGRAPHY]: 'Color & Typography',
    [DESIGN_CATEGORIES.ILLUSTRATIONS]: 'Illustrations',
    [DESIGN_CATEGORIES.BRANDING_LOGOS]: 'Branding / Logos',
    [DESIGN_CATEGORIES.UI_UX]: 'UI/UX',
    [DESIGN_CATEGORIES.THREE_D_ANIMATIONS]: '3D & Animations',
    [DESIGN_CATEGORIES.EXPERIMENTAL]: 'Experimental'
  };
  
  /**
   * Category metadata with icons and descriptions
   * Used for enhanced UI display
   */
  export const CATEGORY_META = {
    [DESIGN_CATEGORIES.ALL]: {
      icon: '🎨',
      description: 'Browse all design categories',
      color: 'gray'
    },
    [DESIGN_CATEGORIES.COLOR_TYPOGRAPHY]: {
      icon: '🎨',
      description: 'Color palettes and typography experiments',
      color: 'purple'
    },
    [DESIGN_CATEGORIES.ILLUSTRATIONS]: {
      icon: '✏️',
      description: 'Digital and traditional illustrations',
      color: 'pink'
    },
    [DESIGN_CATEGORIES.BRANDING_LOGOS]: {
      icon: '💼',
      description: 'Brand identity and logo designs',
      color: 'blue'
    },
    [DESIGN_CATEGORIES.UI_UX]: {
      icon: '📱',
      description: 'User interface and experience designs',
      color: 'green'
    },
    [DESIGN_CATEGORIES.THREE_D_ANIMATIONS]: {
      icon: '🎬',
      description: '3D renders and motion graphics',
      color: 'orange'
    },
    [DESIGN_CATEGORIES.EXPERIMENTAL]: {
      icon: '🔬',
      description: 'Experimental and avant-garde designs',
      color: 'red'
    }
  };
  
  /**
   * Behance category mapping
   * Maps Behance's category system to our internal categories
   */
  export const BEHANCE_CATEGORY_MAP = {
    'graphic-design': DESIGN_CATEGORIES.BRANDING_LOGOS,
    'graphic design': DESIGN_CATEGORIES.BRANDING_LOGOS,
    'branding': DESIGN_CATEGORIES.BRANDING_LOGOS,
    'logo': DESIGN_CATEGORIES.BRANDING_LOGOS,
    'logo-design': DESIGN_CATEGORIES.BRANDING_LOGOS,
    'brand-identity': DESIGN_CATEGORIES.BRANDING_LOGOS,
    'ui-ux': DESIGN_CATEGORIES.UI_UX,
    'ui/ux': DESIGN_CATEGORIES.UI_UX,
    'user-interface': DESIGN_CATEGORIES.UI_UX,
    'user-experience': DESIGN_CATEGORIES.UI_UX,
    'web-design': DESIGN_CATEGORIES.UI_UX,
    'app-design': DESIGN_CATEGORIES.UI_UX,
    'illustration': DESIGN_CATEGORIES.ILLUSTRATIONS,
    'digital-illustration': DESIGN_CATEGORIES.ILLUSTRATIONS,
    'character-design': DESIGN_CATEGORIES.ILLUSTRATIONS,
    'typography': DESIGN_CATEGORIES.COLOR_TYPOGRAPHY,
    'type-design': DESIGN_CATEGORIES.COLOR_TYPOGRAPHY,
    'lettering': DESIGN_CATEGORIES.COLOR_TYPOGRAPHY,
    'color': DESIGN_CATEGORIES.COLOR_TYPOGRAPHY,
    '3d': DESIGN_CATEGORIES.THREE_D_ANIMATIONS,
    '3d-art': DESIGN_CATEGORIES.THREE_D_ANIMATIONS,
    '3d-design': DESIGN_CATEGORIES.THREE_D_ANIMATIONS,
    'motion': DESIGN_CATEGORIES.THREE_D_ANIMATIONS,
    'motion-graphics': DESIGN_CATEGORIES.THREE_D_ANIMATIONS,
    'animation': DESIGN_CATEGORIES.THREE_D_ANIMATIONS,
    'experimental': DESIGN_CATEGORIES.EXPERIMENTAL,
    'digital-art': DESIGN_CATEGORIES.EXPERIMENTAL,
    'creative-direction': DESIGN_CATEGORIES.EXPERIMENTAL
  };
  
  /**
   * Dribbble category mapping
   * Maps Dribbble's tag system to our internal categories
   */
  export const DRIBBBLE_CATEGORY_MAP = {
    'branding': DESIGN_CATEGORIES.BRANDING_LOGOS,
    'brand': DESIGN_CATEGORIES.BRANDING_LOGOS,
    'brand-design': DESIGN_CATEGORIES.BRANDING_LOGOS,
    'logo': DESIGN_CATEGORIES.BRANDING_LOGOS,
    'logo-design': DESIGN_CATEGORIES.BRANDING_LOGOS,
    'identity': DESIGN_CATEGORIES.BRANDING_LOGOS,
    'illustration': DESIGN_CATEGORIES.ILLUSTRATIONS,
    'illustrator': DESIGN_CATEGORIES.ILLUSTRATIONS,
    'character': DESIGN_CATEGORIES.ILLUSTRATIONS,
    'vector': DESIGN_CATEGORIES.ILLUSTRATIONS,
    'mobile': DESIGN_CATEGORIES.UI_UX,
    'mobile-design': DESIGN_CATEGORIES.UI_UX,
    'web-design': DESIGN_CATEGORIES.UI_UX,
    'web': DESIGN_CATEGORIES.UI_UX,
    'ui': DESIGN_CATEGORIES.UI_UX,
    'ux': DESIGN_CATEGORIES.UI_UX,
    'interface': DESIGN_CATEGORIES.UI_UX,
    'app': DESIGN_CATEGORIES.UI_UX,
    'typography': DESIGN_CATEGORIES.COLOR_TYPOGRAPHY,
    'type': DESIGN_CATEGORIES.COLOR_TYPOGRAPHY,
    'lettering': DESIGN_CATEGORIES.COLOR_TYPOGRAPHY,
    'color': DESIGN_CATEGORIES.COLOR_TYPOGRAPHY,
    'palette': DESIGN_CATEGORIES.COLOR_TYPOGRAPHY,
    'animation': DESIGN_CATEGORIES.THREE_D_ANIMATIONS,
    '3d': DESIGN_CATEGORIES.THREE_D_ANIMATIONS,
    'motion': DESIGN_CATEGORIES.THREE_D_ANIMATIONS,
    'cinema4d': DESIGN_CATEGORIES.THREE_D_ANIMATIONS,
    'aftereffects': DESIGN_CATEGORIES.THREE_D_ANIMATIONS,
    'experimental': DESIGN_CATEGORIES.EXPERIMENTAL,
    'abstract': DESIGN_CATEGORIES.EXPERIMENTAL,
    'concept': DESIGN_CATEGORIES.EXPERIMENTAL
  };
  
  /**
   * Awwwards category mapping
   * Maps Awwwards categories to our internal system
   */
  export const AWWWARDS_CATEGORY_MAP = {
    'typography': DESIGN_CATEGORIES.COLOR_TYPOGRAPHY,
    'graphic-design': DESIGN_CATEGORIES.BRANDING_LOGOS,
    'branding': DESIGN_CATEGORIES.BRANDING_LOGOS,
    'ui-design': DESIGN_CATEGORIES.UI_UX,
    'ux-design': DESIGN_CATEGORIES.UI_UX,
    'web-design': DESIGN_CATEGORIES.UI_UX,
    'mobile': DESIGN_CATEGORIES.UI_UX,
    'illustration': DESIGN_CATEGORIES.ILLUSTRATIONS,
    '3d': DESIGN_CATEGORIES.THREE_D_ANIMATIONS,
    'animation': DESIGN_CATEGORIES.THREE_D_ANIMATIONS,
    'motion-design': DESIGN_CATEGORIES.THREE_D_ANIMATIONS,
    'experimental': DESIGN_CATEGORIES.EXPERIMENTAL,
    'innovation': DESIGN_CATEGORIES.EXPERIMENTAL
  };
  
  /**
   * Get category from platform-specific tag/category
   * @param {string} platformCategory - The platform's category/tag
   * @param {string} platform - The platform name (behance, dribbble, awwwards)
   * @returns {string} Internal category or default
   */
  export function mapPlatformCategory(platformCategory, platform) {
    try {
      if (!platformCategory || !platform) {
        console.warn('[Categories] Missing platform category or platform:', { platformCategory, platform });
        return DESIGN_CATEGORIES.EXPERIMENTAL;
      }
  
      const normalizedCategory = platformCategory.toLowerCase().trim();
      let categoryMap;
  
      switch (platform.toLowerCase()) {
        case 'behance':
          categoryMap = BEHANCE_CATEGORY_MAP;
          break;
        case 'dribbble':
          categoryMap = DRIBBBLE_CATEGORY_MAP;
          break;
        case 'awwwards':
          categoryMap = AWWWARDS_CATEGORY_MAP;
          break;
        default:
          console.warn('[Categories] Unknown platform:', platform);
          return DESIGN_CATEGORIES.EXPERIMENTAL;
      }
  
      const mappedCategory = categoryMap[normalizedCategory];
      
      if (!mappedCategory) {
        console.log('[Categories] No mapping found for:', { platform, platformCategory, normalizedCategory });
        return DESIGN_CATEGORIES.EXPERIMENTAL;
      }
  
      return mappedCategory;
    } catch (error) {
      console.error('[Categories] Error mapping platform category:', error);
      return DESIGN_CATEGORIES.EXPERIMENTAL;
    }
  }
  
  /**
   * Get all categories as an array for iteration
   * @returns {Array<{value: string, label: string, meta: Object}>}
   */
  export function getAllCategories() {
    try {
      return Object.entries(DESIGN_CATEGORIES).map(([key, value]) => ({
        value,
        label: CATEGORY_LABELS[value],
        meta: CATEGORY_META[value],
        key
      }));
    } catch (error) {
      console.error('[Categories] Error getting all categories:', error);
      return [];
    }
  }
  
  /**
   * Check if a category value is valid
   * @param {string} category - Category to validate
   * @returns {boolean} Whether the category is valid
   */
  export function isValidCategory(category) {
    try {
      return Object.values(DESIGN_CATEGORIES).includes(category);
    } catch (error) {
      console.error('[Categories] Error validating category:', error);
      return false;
    }
  }
  
  /**
   * Get category display information
   * @param {string} category - Category value
   * @returns {Object} Category display information
   */
  export function getCategoryInfo(category) {
    try {
      if (!isValidCategory(category)) {
        console.warn('[Categories] Invalid category requested:', category);
        return {
          value: DESIGN_CATEGORIES.ALL,
          label: CATEGORY_LABELS[DESIGN_CATEGORIES.ALL],
          meta: CATEGORY_META[DESIGN_CATEGORIES.ALL]
        };
      }
  
      return {
        value: category,
        label: CATEGORY_LABELS[category],
        meta: CATEGORY_META[category]
      };
    } catch (error) {
      console.error('[Categories] Error getting category info:', error);
      return {
        value: DESIGN_CATEGORIES.ALL,
        label: CATEGORY_LABELS[DESIGN_CATEGORIES.ALL],
        meta: CATEGORY_META[DESIGN_CATEGORIES.ALL]
      };
    }
  }
  
  // Log categories initialization for debugging
  console.log('[Categories] Design categories initialized:', {
    totalCategories: Object.keys(DESIGN_CATEGORIES).length,
    behanceMappings: Object.keys(BEHANCE_CATEGORY_MAP).length,
    dribbbleMappings: Object.keys(DRIBBBLE_CATEGORY_MAP).length,
    awwardsMappings: Object.keys(AWWWARDS_CATEGORY_MAP).length
  });