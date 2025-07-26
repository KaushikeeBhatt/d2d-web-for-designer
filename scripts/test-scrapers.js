/**
 * Hackathon Scrapers Test Script
 * Tests all hackathon scrapers and displays results
 * Run: npm run test-scrapers
 */

const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Import after env is loaded
const { scrapeDevpost } = require('../src/lib/scrapers/hackathons/devpost');
const { scrapeUnstop } = require('../src/lib/scrapers/hackathons/unstop');
const { scrapeCumulus } = require('../src/lib/scrapers/hackathons/cumulus');
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
 * Format date for display
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  if (!date) return 'N/A';
  try {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    return 'Invalid Date';
  }
}

/**
 * Display hackathon details
 * @param {object} hackathon - Hackathon data
 * @param {number} index - Hackathon index
 */
function displayHackathon(hackathon, index) {
  log(`\n${index + 1}. ${hackathon.title}`, colors.cyan);
  log(`   Platform: ${hackathon.platform}`, colors.magenta);
  log(`   URL: ${hackathon.url}`, colors.blue);
  
  if (hackathon.deadline) {
    log(`   Deadline: ${formatDate(hackathon.deadline)}`, colors.yellow);
  }
  
  if (hackathon.prizes && hackathon.prizes.length > 0) {
    log(`   Prizes: ${hackathon.prizes.slice(0, 3).join(', ')}${hackathon.prizes.length > 3 ? '...' : ''}`);
  }
  
  if (hackathon.tags && hackathon.tags.length > 0) {
    log(`   Tags: ${hackathon.tags.slice(0, 5).join(', ')}${hackathon.tags.length > 5 ? '...' : ''}`);
  }
  
  if (hackathon.participants) {
    log(`   Participants: ${hackathon.participants}`);
  }
  
  if (hackathon.description) {
    const shortDesc = hackathon.description.substring(0, 100);
    log(`   Description: ${shortDesc}${hackathon.description.length > 100 ? '...' : ''}`);
  }
}

/**
 * Test a single scraper
 * @param {string} scraperName - Name of the scraper
 * @param {Function} scraperFunction - Scraper function to test
 * @param {object} options - Scraper options
 * @returns {object} Test results
 */
async function testScraper(scraperName, scraperFunction, options = {}) {
  log(`\n${'='.repeat(60)}`, colors.blue);
  log(`Testing ${scraperName} Scraper`, colors.blue);
  log('='.repeat(60), colors.blue);
  
  const startTime = Date.now();
  const results = {
    name: scraperName,
    success: false,
    count: 0,
    duration: 0,
    error: null,
    hackathons: []
  };
  
  try {
    log(`Starting scrape with options: ${JSON.stringify(options)}`, colors.cyan);
    
    const hackathons = await scraperFunction(options);
    const duration = Date.now() - startTime;
    
    results.success = true;
    results.count = hackathons.length;
    results.duration = duration;
    results.hackathons = hackathons;
    
    log(`\n✓ ${scraperName} completed successfully!`, colors.green);
    log(`Found ${hackathons.length} hackathons in ${duration}ms`, colors.green);
    
    // Display sample hackathons
    if (hackathons.length > 0) {
      log(`\nSample hackathons:`, colors.yellow);
      const samplesToShow = Math.min(3, hackathons.length);
      for (let i = 0; i < samplesToShow; i++) {
        displayHackathon(hackathons[i], i);
      }
      
      if (hackathons.length > samplesToShow) {
        log(`\n... and ${hackathons.length - samplesToShow} more hackathons`, colors.cyan);
      }
    }
    
    // Data validation summary
    log(`\nData Validation:`, colors.yellow);
    const validationStats = {
      withDeadline: hackathons.filter(h => h.deadline).length,
      withPrizes: hackathons.filter(h => h.prizes && h.prizes.length > 0).length,
      withTags: hackathons.filter(h => h.tags && h.tags.length > 0).length,
      withImage: hackathons.filter(h => h.imageUrl).length,
      withDescription: hackathons.filter(h => h.description).length
    };
    
    log(`  - With deadline: ${validationStats.withDeadline}/${hackathons.length}`);
    log(`  - With prizes: ${validationStats.withPrizes}/${hackathons.length}`);
    log(`  - With tags: ${validationStats.withTags}/${hackathons.length}`);
    log(`  - With image: ${validationStats.withImage}/${hackathons.length}`);
    log(`  - With description: ${validationStats.withDescription}/${hackathons.length}`);
    
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
 * Test database connection and save
 * @param {Array} hackathons - Hackathons to save
 * @returns {boolean} Success status
 */
async function testDatabaseSave(hackathons) {
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
    const Hackathon = require('../src/lib/db/models/Hackathon').default;
    
    // Try to save one hackathon
    if (hackathons.length > 0) {
      log('Testing database save...', colors.cyan);
      
      const testHackathon = hackathons[0];
      const saved = await Hackathon.findOneAndUpdate(
        { 
          platform: testHackathon.platform, 
          sourceId: testHackathon.sourceId 
        },
        { 
          $set: { 
            ...testHackathon, 
            lastScraped: new Date() 
          } 
        },
        { 
          upsert: true, 
          new: true 
        }
      );
      
      log(`✓ Successfully saved hackathon: ${saved.title}`, colors.green);
      log(`  Database ID: ${saved._id}`, colors.cyan);
      
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
  log('\n🧪 D2D Designer Hackathon Scrapers Test Suite\n', colors.blue);
  
  const scrapers = [
    { 
      name: 'Devpost', 
      function: scrapeDevpost, 
      options: { limit: 5, timeout: 30000 } 
    },
    { 
      name: 'Unstop', 
      function: scrapeUnstop, 
      options: { limit: 5, timeout: 30000 } 
    },
    { 
      name: 'Cumulus', 
      function: scrapeCumulus, 
      options: { limit: 5, timeout: 30000 } 
    }
  ];
  
  const allResults = [];
  const allHackathons = [];
  
  // Test each scraper
  for (const scraper of scrapers) {
    const result = await testScraper(
      scraper.name, 
      scraper.function, 
      scraper.options
    );
    allResults.push(result);
    if (result.success) {
      allHackathons.push(...result.hackathons);
    }
  }
  
  // Summary
  log(`\n\n${'='.repeat(60)}`, colors.blue);
  log('Test Summary', colors.blue);
  log('='.repeat(60), colors.blue);
  
  const successful = allResults.filter(r => r.success).length;
  const failed = allResults.filter(r => !r.success).length;
  const totalHackathons = allResults.reduce((sum, r) => sum + r.count, 0);
  const totalDuration = allResults.reduce((sum, r) => sum + r.duration, 0);
  
  log(`\nScrapers tested: ${allResults.length}`, colors.cyan);
  log(`Successful: ${successful}`, colors.green);
  log(`Failed: ${failed}`, failed > 0 ? colors.red : colors.green);
  log(`Total hackathons found: ${totalHackathons}`, colors.cyan);
  log(`Total time: ${totalDuration}ms`, colors.cyan);
  
  log('\n\nDetailed Results:', colors.yellow);
  allResults.forEach(result => {
    const statusIcon = result.success ? '✓' : '✗';
    const statusColor = result.success ? colors.green : colors.red;
    log(
      `${statusIcon} ${result.name}: ${result.count} hackathons in ${result.duration}ms`,
      statusColor
    );
    if (result.error) {
      log(`  Error: ${result.error}`, colors.red);
    }
  });
  
  // Test database save
  if (allHackathons.length > 0) {
    await testDatabaseSave(allHackathons);
  }
  
  log('\n\n✅ All tests completed!\n', colors.green);
  
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