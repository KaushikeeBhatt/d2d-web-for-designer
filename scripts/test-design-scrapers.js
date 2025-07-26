/**
 * Design Scrapers Test Script
 * Tests all design inspiration scrapers for EyeCandy feature
 * Run: npm run test-design-scrapers
 */

const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Import after env is loaded
const { scrapeBehance } = require('../src/lib/scrapers/designs/behance');
const { scrapeDribbble } = require('../src/lib/scrapers/designs/dribbble');
const { scrapeAwwwards } = require('../src/lib/scrapers/designs/awwwards');
const { DESIGN_CATEGORIES, CATEGORY_LABELS } = require('../src/lib/scrapers/designs/categories');
const mongoose = require('mongoose');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

/**
 * Log helper with color support
 * @param {string} message - Message to log
 * @param {string} color - Color code
 */
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Display design details
 * @param {object} design - Design data
 * @param {number} index - Design index
 */
function displayDesign(design, index) {
  log(`\n${index + 1}. ${design.title}`, colors.cyan);
  log(`   Source: ${design.source}`, colors.magenta);
  log(`   Category: ${CATEGORY_LABELS[design.category] || design.category}`, colors.yellow);
  log(`   URL: ${design.sourceUrl}`, colors.blue);
  
  if (design.author && design.author.name) {
    log(`   Author: ${design.author.name}`);
  }
  
  if (design.stats) {
    const stats = [];
    if (design.stats.views) stats.push(`${design.stats.views} views`);
    if (design.stats.likes) stats.push(`${design.stats.likes} likes`);
    if (design.stats.saves) stats.push(`${design.stats.saves} saves`);
    if (stats.length > 0) {
      log(`   Stats: ${stats.join(', ')}`);
    }
  }
  
  if (design.tags && design.tags.length > 0) {
    log(`   Tags: ${design.tags.slice(0, 5).join(', ')}${design.tags.length > 5 ? '...' : ''}`);
  }
  
  if (design.colors && design.colors.length > 0) {
    log(`   Colors: ${design.colors.slice(0, 4).join(', ')}${design.colors.length > 4 ? '...' : ''}`);
  }
  
  if (design.description) {
    const shortDesc = design.description.substring(0, 80);
    log(`   Description: ${shortDesc}${design.description.length > 80 ? '...' : ''}`);
  }
  
  log(`   Image: ${design.imageUrl ? '✓' : '✗'} ${design.imageUrl ? design.imageUrl.substring(0, 50) + '...' : 'No image'}`);
  if (design.thumbnailUrl) {
    log(`   Thumbnail: ✓`);
  }
}

/**
 * Test a single design scraper
 * @param {string} scraperName - Name of the scraper
 * @param {Function} scraperFunction - Scraper function to test
 * @param {object} options - Scraper options
 * @returns {object} Test results
 */
async function testDesignScraper(scraperName, scraperFunction, options = {}) {
  log(`\n${'='.repeat(60)}`, colors.blue);
  log(`Testing ${scraperName} Design Scraper`, colors.blue);
  log('='.repeat(60), colors.blue);
  
  const startTime = Date.now();
  const results = {
    name: scraperName,
    success: false,
    count: 0,
    duration: 0,
    error: null,
    designs: [],
    categoryBreakdown: {}
  };
  
  try {
    log(`Starting scrape with options: ${JSON.stringify(options)}`, colors.cyan);
    
    const designs = await scraperFunction(options);
    const duration = Date.now() - startTime;
    
    results.success = true;
    results.count = designs.length;
    results.duration = duration;
    results.designs = designs;
    
    // Calculate category breakdown
    designs.forEach(design => {
      const category = design.category || 'uncategorized';
      results.categoryBreakdown[category] = (results.categoryBreakdown[category] || 0) + 1;
    });
    
    log(`\n✓ ${scraperName} completed successfully!`, colors.green);
    log(`Found ${designs.length} designs in ${duration}ms`, colors.green);
    
    // Display sample designs
    if (designs.length > 0) {
      log(`\nSample designs:`, colors.yellow);
      const samplesToShow = Math.min(3, designs.length);
      for (let i = 0; i < samplesToShow; i++) {
        displayDesign(designs[i], i);
      }
      
      if (designs.length > samplesToShow) {
        log(`\n... and ${designs.length - samplesToShow} more designs`, colors.cyan);
      }
    }
    
    // Category breakdown
    log(`\nCategory Breakdown:`, colors.yellow);
    Object.entries(results.categoryBreakdown).forEach(([category, count]) => {
      const label = CATEGORY_LABELS[category] || category;
      log(`  - ${label}: ${count} designs`);
    });
    
    // Data validation summary
    log(`\nData Validation:`, colors.yellow);
    const validationStats = {
      withImage: designs.filter(d => d.imageUrl).length,
      withThumbnail: designs.filter(d => d.thumbnailUrl).length,
      withAuthor: designs.filter(d => d.author && d.author.name).length,
      withStats: designs.filter(d => d.stats && (d.stats.views || d.stats.likes)).length,
      withTags: designs.filter(d => d.tags && d.tags.length > 0).length,
      withColors: designs.filter(d => d.colors && d.colors.length > 0).length,
      withDescription: designs.filter(d => d.description).length
    };
    
    log(`  - With image: ${validationStats.withImage}/${designs.length}`);
    log(`  - With thumbnail: ${validationStats.withThumbnail}/${designs.length}`);
    log(`  - With author: ${validationStats.withAuthor}/${designs.length}`);
    log(`  - With stats: ${validationStats.withStats}/${designs.length}`);
    log(`  - With tags: ${validationStats.withTags}/${designs.length}`);
    log(`  - With colors: ${validationStats.withColors}/${designs.length}`);
    log(`  - With description: ${validationStats.withDescription}/${designs.length}`);
    
  } catch (error) {
    results.error = error.message;
    log(`\n✗ ${scraperName} failed: ${error.message}`, colors.red);
    if (error.stack) {
      log('\nStack trace:', colors.red);
      console.error(error.stack);
    }
  }
  
  return results;
}

/**
 * Test design categorization
 * @param {Array} designs - Designs to test
 */
function testCategorization(designs) {
  log('\n\nTesting Design Categorization...', colors.cyan);
  
  const categoryStats = {};
  const invalidCategories = [];
  
  designs.forEach(design => {
    if (design.category) {
      if (Object.values(DESIGN_CATEGORIES).includes(design.category)) {
        categoryStats[design.category] = (categoryStats[design.category] || 0) + 1;
      } else {
        invalidCategories.push({
          title: design.title,
          category: design.category,
          source: design.source
        });
      }
    }
  });
  
  log('\nValid Categories:', colors.green);
  Object.entries(categoryStats).forEach(([category, count]) => {
    const label = CATEGORY_LABELS[category];
    log(`  ${label}: ${count} designs`);
  });
  
  if (invalidCategories.length > 0) {
    log('\n⚠️  Invalid Categories Found:', colors.yellow);
    invalidCategories.slice(0, 5).forEach(design => {
      log(`  - "${design.title}" has invalid category: ${design.category} (${design.source})`);
    });
    if (invalidCategories.length > 5) {
      log(`  ... and ${invalidCategories.length - 5} more`);
    }
  } else {
    log('\n✓ All categories are valid!', colors.green);
  }
}

/**
 * Test database connection and save
 * @param {Array} designs - Designs to save
 * @returns {boolean} Success status
 */
async function testDatabaseSave(designs) {
  try {
    log('\n\nTesting database connection...', colors.cyan);
    
    const MONGODB_URI = process.env.MONGODB_URI;
    const DATABASE_NAME = process.env.DATABASE_NAME || 'd2d-designer';
    
    if (!MONGODB_URI) {
      log('✗ MONGODB_URI not found in environment variables', colors.red);
      return false;
    }
    
    await mongoose.connect(MONGODB_URI, {
      dbName: DATABASE_NAME,
      serverSelectionTimeoutMS: 5000
    });
    
    log('✓ Connected to MongoDB', colors.green);
    
    // Import model after connection
    const Design = require('../src/lib/db/models/Design').default;
    
    // Try to save one design
    if (designs.length > 0) {
      log('Testing database save...', colors.cyan);
      
      const testDesign = designs[0];
      const saved = await Design.findOneAndUpdate(
        { sourceUrl: testDesign.sourceUrl },
        { 
          $set: { 
            ...testDesign, 
            lastScraped: new Date() 
          } 
        },
        { 
          upsert: true, 
          new: true 
        }
      );
      
      log(`✓ Successfully saved design: ${saved.title}`, colors.green);
      log(`  Database ID: ${saved._id}`, colors.cyan);
      log(`  Category: ${CATEGORY_LABELS[saved.category]}`, colors.cyan);
      
      // Test trending calculation
      const trendingCount = await Design.countDocuments({ isTrending: true });
      log(`  Trending designs in DB: ${trendingCount}`, colors.cyan);
      
      return true;
    }
    
  } catch (error) {
    log(`✗ Database test failed: ${error.message}`, colors.red);
    return false;
  } finally {
    await mongoose.disconnect();
    log('Database connection closed', colors.cyan);
  }
}

/**
 * Main test function
 */
async function runTests() {
  log('\n🎨 D2D Designer EyeCandy Design Scrapers Test Suite\n', colors.blue);
  
  const scrapers = [
    { 
      name: 'Behance', 
      function: scrapeBehance, 
      options: { 
        limit: 10, 
        category: DESIGN_CATEGORIES.UI_UX,
        timeout: 30000 
      } 
    },
    { 
      name: 'Dribbble', 
      function: scrapeDribbble, 
      options: { 
        limit: 10, 
        category: DESIGN_CATEGORIES.ILLUSTRATIONS,
        timeout: 30000 
      } 
    },
    { 
      name: 'Awwwards', 
      function: scrapeAwwwards, 
      options: { 
        limit: 10,
        timeout: 30000 
      } 
    }
  ];
  
  const allResults = [];
  const allDesigns = [];
  
  // Test each scraper
  for (const scraper of scrapers) {
    const result = await testDesignScraper(
      scraper.name, 
      scraper.function, 
      scraper.options
    );
    allResults.push(result);
    if (result.success) {
      allDesigns.push(...result.designs);
    }
  }
  
  // Test categorization
  if (allDesigns.length > 0) {
    testCategorization(allDesigns);
  }
  
  // Summary
  log(`\n\n${'='.repeat(60)}`, colors.blue);
  log('Test Summary', colors.blue);
  log('='.repeat(60), colors.blue);
  
  const successful = allResults.filter(r => r.success).length;
  const failed = allResults.filter(r => !r.success).length;
  const totalDesigns = allResults.reduce((sum, r) => sum + r.count, 0);
  const totalDuration = allResults.reduce((sum, r) => sum + r.duration, 0);
  
  log(`\nScrapers tested: ${allResults.length}`, colors.cyan);
  log(`Successful: ${successful}`, colors.green);
  log(`Failed: ${failed}`, failed > 0 ? colors.red : colors.green);
  log(`Total designs found: ${totalDesigns}`, colors.cyan);
  log(`Total time: ${totalDuration}ms`, colors.cyan);
  
  // Overall category distribution
  log('\n\nOverall Category Distribution:', colors.yellow);
  const overallCategories = {};
  allDesigns.forEach(design => {
    const category = design.category || 'uncategorized';
    overallCategories[category] = (overallCategories[category] || 0) + 1;
  });
  
  Object.entries(overallCategories)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, count]) => {
      const label = CATEGORY_LABELS[category] || category;
      const percentage = ((count / allDesigns.length) * 100).toFixed(1);
      log(`  ${label}: ${count} designs (${percentage}%)`);
    });
  
  log('\n\nDetailed Results:', colors.yellow);
  allResults.forEach(result => {
    const statusIcon = result.success ? '✓' : '✗';
    const statusColor = result.success ? colors.green : colors.red;
    log(
      `${statusIcon} ${result.name}: ${result.count} designs in ${result.duration}ms`,
      statusColor
    );
    if (result.error) {
      log(`  Error: ${result.error}`, colors.red);
    }
  });
  
  // Test database save
  if (allDesigns.length > 0) {
    await testDatabaseSave(allDesigns);
  }
  
  log('\n\n✅ All design scraper tests completed!\n', colors.green);
  
  // Exit cleanly
  process.exit(0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  log('\n\n✗ Unhandled error:', colors.red);
  console.error(error);
  process.exit(1);
});

// Run tests
runTests();