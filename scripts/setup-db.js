/**
 * Database Setup Script
 * Initializes MongoDB collections and creates necessary indexes
 * Run: npm run setup-db
 */

const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// MongoDB connection details
const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = process.env.DATABASE_NAME || 'd2d-designer';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
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
 * Create collection with validation schema
 * @param {Db} db - MongoDB database instance
 * @param {string} collectionName - Name of collection
 * @param {object} validationSchema - MongoDB validation schema
 * @param {Array} indexes - Array of index definitions
 */
async function createCollection(db, collectionName, validationSchema, indexes = []) {
  try {
    log(`Creating collection: ${collectionName}...`, colors.cyan);
    
    // Check if collection exists
    const collections = await db.listCollections({ name: collectionName }).toArray();
    if (collections.length > 0) {
      log(`Collection ${collectionName} already exists`, colors.yellow);
    } else {
      // Create collection with validation
      await db.createCollection(collectionName, {
        validator: validationSchema
      });
      log(`✓ Collection ${collectionName} created`, colors.green);
    }
    
    // Create indexes
    if (indexes.length > 0) {
      const collection = db.collection(collectionName);
      for (const index of indexes) {
        try {
          await collection.createIndex(index.fields, index.options || {});
          log(`  ✓ Index created: ${JSON.stringify(index.fields)}`, colors.green);
        } catch (error) {
          if (error.code === 85) { // Index already exists
            log(`  - Index already exists: ${JSON.stringify(index.fields)}`, colors.yellow);
          } else {
            throw error;
          }
        }
      }
    }
  } catch (error) {
    log(`✗ Error creating collection ${collectionName}: ${error.message}`, colors.red);
    throw error;
  }
}

/**
 * Main setup function
 */
async function setupDatabase() {
  let client;
  
  try {
    log('\n🚀 D2D Designer Database Setup\n', colors.blue);
    
    // Validate environment variables
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI not found in environment variables');
    }
    
    log(`Connecting to MongoDB...`, colors.cyan);
    log(`Database: ${DATABASE_NAME}`, colors.cyan);
    
    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    
    await client.connect();
    log('✓ Connected to MongoDB', colors.green);
    
    // Get database
    const db = client.db(DATABASE_NAME);
    
    // Users collection
    await createCollection(
      db,
      'users',
      {
        $jsonSchema: {
          bsonType: 'object',
          required: ['email'],
          properties: {
            email: {
              bsonType: 'string',
              pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
            },
            name: { bsonType: 'string' },
            image: { bsonType: 'string' },
            emailVerified: { bsonType: 'date' },
            preferences: {
              bsonType: 'object',
              properties: {
                notifications: { bsonType: 'bool' },
                categories: { bsonType: 'array' },
                platforms: { bsonType: 'array' }
              }
            },
            stats: {
              bsonType: 'object',
              properties: {
                totalBookmarks: { bsonType: 'int' },
                lastActive: { bsonType: 'date' }
              }
            }
          }
        }
      },
      [
        { fields: { email: 1 }, options: { unique: true } },
        { fields: { createdAt: -1 } }
      ]
    );
    
    // Hackathons collection
    await createCollection(
      db,
      'hackathons',
      {
        $jsonSchema: {
          bsonType: 'object',
          required: ['title', 'url', 'platform', 'sourceId'],
          properties: {
            title: { bsonType: 'string' },
            description: { bsonType: 'string' },
            url: { bsonType: 'string' },
            platform: {
              enum: ['devpost', 'unstop', 'cumulus']
            },
            sourceId: { bsonType: 'string' },
            deadline: { bsonType: 'date' },
            startDate: { bsonType: 'date' },
            endDate: { bsonType: 'date' },
            prizes: { bsonType: 'array' },
            tags: { bsonType: 'array' },
            eligibility: { bsonType: 'string' },
            imageUrl: { bsonType: 'string' },
            participants: { bsonType: 'int' },
            isActive: { bsonType: 'bool' },
            lastScraped: { bsonType: 'date' }
          }
        }
      },
      [
        { fields: { platform: 1, sourceId: 1 }, options: { unique: true } },
        { fields: { deadline: 1 } },
        { fields: { createdAt: -1 } },
        { fields: { title: 'text', description: 'text' } }
      ]
    );
    
    // Designs collection (for EyeCandy)
    await createCollection(
      db,
      'designs',
      {
        $jsonSchema: {
          bsonType: 'object',
          required: ['title', 'imageUrl', 'sourceUrl', 'source', 'category'],
          properties: {
            title: { bsonType: 'string' },
            description: { bsonType: 'string' },
            imageUrl: { bsonType: 'string' },
            thumbnailUrl: { bsonType: 'string' },
            sourceUrl: { bsonType: 'string' },
            source: {
              enum: ['behance', 'dribbble', 'awwwards', 'designspiration']
            },
            category: {
              enum: ['all', 'color-typography', 'illustrations', 'branding-logos', 'ui-ux', '3d-animations', 'experimental']
            },
            tags: { bsonType: 'array' },
            author: {
              bsonType: 'object',
              properties: {
                name: { bsonType: 'string' },
                profileUrl: { bsonType: 'string' },
                avatar: { bsonType: 'string' }
              }
            },
            stats: {
              bsonType: 'object',
              properties: {
                views: { bsonType: 'int' },
                likes: { bsonType: 'int' },
                saves: { bsonType: 'int' }
              }
            },
            colors: { bsonType: 'array' },
            isTrending: { bsonType: 'bool' },
            publishedAt: { bsonType: 'date' },
            lastScraped: { bsonType: 'date' }
          }
        }
      },
      [
        { fields: { sourceUrl: 1 }, options: { unique: true } },
        { fields: { category: 1, isTrending: -1 } },
        { fields: { createdAt: -1 } },
        { fields: { 'stats.likes': -1 } },
        { fields: { title: 'text', description: 'text' } }
      ]
    );
    
    // Bookmarks collection
    await createCollection(
      db,
      'bookmarks',
      {
        $jsonSchema: {
          bsonType: 'object',
          required: ['userId', 'hackathonId'],
          properties: {
            userId: { bsonType: 'objectId' },
            hackathonId: { bsonType: 'objectId' },
            notes: {
              bsonType: 'string',
              maxLength: 500
            },
            tags: { bsonType: 'array' },
            reminder: { bsonType: 'date' }
          }
        }
      },
      [
        { fields: { userId: 1, hackathonId: 1 }, options: { unique: true } },
        { fields: { userId: 1 } },
        { fields: { createdAt: -1 } }
      ]
    );
    
    // NextAuth collections (if not using Mongoose adapter)
    await createCollection(
      db,
      'accounts',
      {
        $jsonSchema: {
          bsonType: 'object',
          required: ['userId', 'type', 'provider', 'providerAccountId'],
          properties: {
            userId: { bsonType: 'objectId' },
            type: { bsonType: 'string' },
            provider: { bsonType: 'string' },
            providerAccountId: { bsonType: 'string' }
          }
        }
      },
      [
        { fields: { userId: 1 } },
        { fields: { provider: 1, providerAccountId: 1 }, options: { unique: true } }
      ]
    );
    
    await createCollection(
      db,
      'sessions',
      {
        $jsonSchema: {
          bsonType: 'object',
          required: ['sessionToken', 'userId', 'expires'],
          properties: {
            sessionToken: { bsonType: 'string' },
            userId: { bsonType: 'objectId' },
            expires: { bsonType: 'date' }
          }
        }
      },
      [
        { fields: { sessionToken: 1 }, options: { unique: true } },
        { fields: { userId: 1 } }
      ]
    );
    
    log('\n✅ Database setup completed successfully!\n', colors.green);
    
    // Test connection with Mongoose
    log('Testing Mongoose connection...', colors.cyan);
    await mongoose.connect(MONGODB_URI, {
      dbName: DATABASE_NAME,
      serverSelectionTimeoutMS: 5000
    });
    log('✓ Mongoose connection successful', colors.green);
    await mongoose.disconnect();
    
    // Summary
    log('\nSummary:', colors.blue);
    log(`- Database: ${DATABASE_NAME}`, colors.cyan);
    log('- Collections created: users, hackathons, designs, bookmarks, accounts, sessions', colors.cyan);
    log('- All indexes created successfully', colors.cyan);
    log('\nYou can now run the application with: npm run dev', colors.yellow);
    
  } catch (error) {
    log(`\n✗ Setup failed: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      log('\nDatabase connection closed', colors.cyan);
    }
  }
}

// Run setup
setupDatabase();