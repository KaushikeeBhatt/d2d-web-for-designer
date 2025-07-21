# Master Prompt for D2D Designer Project (Next.js Edition with EyeCandy) - Complete Version

## Code Objectives
1. **Primary Goal**: Build an MVP web application for discovering and bookmarking design hackathons
2. **Core Features**: 
   - Automated web scraping from multiple platforms
   - Real-time hackathon discovery with search/filter
   - User authentication and bookmarking
   - **EyeCandy**: Curated design inspiration gallery with trending designs
   - Automatic data updates and cleanup
3. **Technical Goals**:
   - Single codebase with Next.js
   - Minimal operational complexity
   - Cost-effective deployment (free tier)
   - Easy maintenance and updates
   - Progressive TypeScript adoption for better type safety

## Technical Environment & Versions
```json
{
  "runtime": "Node.js 20.x LTS",
  "framework": "Next.js 14.2.x",
  "language": "JavaScript with TypeScript support",
  "typescript": "5.4.x",
  "database": "MongoDB 7.0 (MongoDB Atlas free tier)",
  "styling": "Tailwind CSS 3.4.x",
  "authentication": "Auth.js 5.x (NextAuth v5)",
  "webScraping": {
    "primary": "Playwright 1.44.x",
    "fallback": "Cheerio 1.0.0-rc.12"
  },
  "imageOptimization": "Next.js Image Component",
  "deployment": "Vercel (free tier)",
  "packageManager": "npm 10.x"
}
```

## Complete Project Structure

```
d2d-designer-nextjs/
├── .env.local                        # Environment variables
├── .env.example                      # Environment template
├── .gitignore                        # Git ignore rules
├── next.config.js                    # Next.js configuration
├── package.json                      # Dependencies and scripts
├── tailwind.config.js                # Tailwind CSS config
├── tsconfig.json                     # TypeScript config with path aliases
├── postcss.config.js                 # PostCSS config for Tailwind
├── README.md                         # Project documentation
├── vercel.json                       # Vercel deployment config
│
├── public/                           # Static assets
│   ├── favicon.ico
│   ├── logo.svg
│   └── images/
│       └── placeholder.jpg           # Fallback image
│
├── src/
│   ├── auth.js                       # Auth.js v5 configuration
│   ├── middleware.js                 # Auth middleware
│   │
│   ├── app/                          # Next.js 14 App Router
│   │   ├── layout.js                 # Root layout
│   │   ├── page.js                   # Home page
│   │   ├── globals.css               # Global styles
│   │   ├── loading.js                # Global loading state
│   │   ├── error.js                  # Global error boundary
│   │   │
│   │   ├── api/                      # API Routes
│   │   │   ├── auth/                 # Auth.js endpoints
│   │   │   │   └── [...nextauth]/
│   │   │   │       └── route.js      # Export handlers from auth.js
│   │   │   ├── hackathons/
│   │   │   │   ├── route.js          # GET all, POST new
│   │   │   │   └── [id]/
│   │   │   │       └── route.js      # GET, PUT, DELETE by ID
│   │   │   ├── bookmarks/
│   │   │   │   ├── route.js          # GET user bookmarks, POST new
│   │   │   │   └── [id]/
│   │   │   │       └── route.js      # DELETE bookmark
│   │   │   ├── eyecandy/             # Design inspiration endpoints
│   │   │   │   ├── route.js          # GET all designs with filters
│   │   │   │   ├── [category]/
│   │   │   │   │   └── route.js      # GET designs by category
│   │   │   │   └── trending/
│   │   │   │       └── route.js      # GET trending designs
│   │   │   ├── scrape/
│   │   │   │   ├── route.js          # Manual hackathon scraping
│   │   │   │   └── designs/
│   │   │   │       └── route.js      # Manual design scraping
│   │   │   └── cron/
│   │   │       └── route.js          # Cron job endpoints
│   │   │
│   │   ├── (auth)/                   # Auth group routes
│   │   │   ├── login/
│   │   │   │   └── page.js
│   │   │   └── signup/
│   │   │       └── page.js
│   │   │
│   │   ├── (dashboard)/              # Protected routes
│   │   │   ├── layout.js             # Dashboard layout
│   │   │   ├── dashboard/
│   │   │   │   └── page.js           # Main dashboard
│   │   │   ├── bookmarks/
│   │   │   │   └── page.js           # User bookmarks
│   │   │   ├── profile/
│   │   │   │   └── page.js           # User profile
│   │   │   └── community/
│   │   │       └── page.js           # Community page
│   │   │
│   │   └── eye-candy/                # Design inspiration showcase
│   │       ├── page.js               # Main gallery page
│   │       └── [category]/
│   │           └── page.js           # Category filtered view
│   │
│   ├── components/                   # Reusable components
│   │   ├── ui/                       # Base UI components
│   │   │   ├── Button.js
│   │   │   ├── Card.js
│   │   │   ├── Input.js
│   │   │   ├── Badge.js
│   │   │   ├── Skeleton.js
│   │   │   └── ImageWithFallback.js  # Image component with error handling
│   │   ├── layout/                   # Layout components
│   │   │   ├── Header.js
│   │   │   ├── Footer.js
│   │   │   └── Sidebar.js
│   │   ├── hackathons/               # Feature components
│   │   │   ├── HackathonCard.js
│   │   │   ├── HackathonGrid.js
│   │   │   ├── SearchBar.js
│   │   │   └── FilterPanel.js
│   │   ├── eyecandy/                 # EyeCandy components
│   │   │   ├── DesignCard.js         # Individual design card
│   │   │   ├── DesignGrid.js         # Masonry/Grid layout
│   │   │   ├── CategoryFilter.js     # Category filter tabs
│   │   │   ├── DesignModal.js        # Full view modal
│   │   │   └── LoadMoreButton.js     # Infinite scroll trigger
│   │   └── auth/                     # Auth components
│   │       ├── LoginForm.js
│   │       └── SignupForm.js
│   │
│   ├── lib/                          # Core libraries
│   │   ├── db/                       # Database
│   │   │   ├── mongodb.js            # MongoDB connection
│   │   │   └── models/               # Mongoose models
│   │   │       ├── User.js
│   │   │       ├── Hackathon.js
│   │   │       ├── Bookmark.js
│   │   │       └── Design.js         # Design inspiration model
│   │   ├── scrapers/                 # Web scraping
│   │   │   ├── index.js              # Scraper orchestrator
│   │   │   ├── hackathons/           # Hackathon scrapers
│   │   │   │   ├── devpost.js
│   │   │   │   ├── unstop.js
│   │   │   │   └── cumulus.js
│   │   │   ├── designs/              # Design scrapers
│   │   │   │   ├── index.js          # Design scraper orchestrator
│   │   │   │   ├── behance.js        # Behance scraper
│   │   │   │   ├── dribbble.js       # Dribbble scraper
│   │   │   │   ├── awwwards.js       # Awwwards scraper
│   │   │   │   └── categories.js     # Category mapping
│   │   │   ├── config.js             # Scraper configuration
│   │   │   └── keywords.js           # Design keywords
│   │   ├── utils/                    # Utilities
│   │   │   ├── logger.js             # Logging utility
│   │   │   ├── errors.js             # Error classes
│   │   │   ├── validators.js         # Data validation
│   │   │   ├── dateHelpers.js        # Date utilities
│   │   │   ├── imageHelpers.js       # Image processing
│   │   │   ├── apiResponse.js        # API response helpers
│   │   │   ├── rateLimiter.js        # Rate limiting utility
│   │   │   └── cache.js              # Caching utility
│   │   ├── middleware/               # Custom middleware
│   │   │   └── withAuth.js           # Auth middleware wrapper
│   │   └── cron/                     # Scheduled jobs
│   │       ├── scrapeJob.js          # Hourly hackathon scraping
│   │       ├── designScrapeJob.js    # Design scraping job
│   │       └── cleanupJob.js         # Delete old data
│   │
│   └── hooks/                        # Custom React hooks
│       ├── useHackathons.js
│       ├── useBookmarks.js
│       ├── useDesigns.js             # Design gallery hook
│       ├── useInfiniteScroll.js     # Infinite scroll hook
│       └── useAuth.js
│
└── scripts/                          # Utility scripts
    ├── setup-db.js                   # Database initialization
    ├── test-scrapers.js              # Scraper testing
    └── test-design-scrapers.js       # Design scraper testing
```

## Complete Configuration Files

### package.json
```json
{
  "name": "d2d-designer-nextjs",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "setup-db": "node scripts/setup-db.js",
    "test-scrapers": "node scripts/test-scrapers.js"
  },
  "dependencies": {
    "next": "14.2.3",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "next-auth": "^5.0.0-beta.16",
    "@auth/mongodb-adapter": "^3.0.0",
    "mongodb": "^6.5.0",
    "mongoose": "^8.3.0",
    "playwright": "^1.44.0",
    "cheerio": "1.0.0-rc.12",
    "tailwindcss": "^3.4.0",
    "lucide-react": "^0.365.0",
    "zod": "^3.22.4",
    "date-fns": "^3.6.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/react": "^18.3.0",
    "@types/node": "^20.12.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "eslint": "^8.57.0",
    "eslint-config-next": "14.2.3"
  }
}
```

### .env.example
```bash
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
DATABASE_NAME=d2d-designer

# Auth.js v5
AUTH_SECRET=generate-with-openssl-rand-base64-32
AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Scraping Configuration
SCRAPING_ENABLED=true
SCRAPING_INTERVAL=3600000
SCRAPING_DESIGNS_LIMIT=50
DESIGNS_CACHE_TTL=3600

# External APIs (optional)
BEHANCE_API_KEY=your-behance-api-key-if-using-api
DRIBBBLE_ACCESS_TOKEN=your-dribbble-token-if-using-api

# Vercel
VERCEL_URL=
```

### next.config.js
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.behance.net' },
      { protocol: 'https', hostname: '*.dribbble.com' },
      { protocol: 'https', hostname: '*.awwwards.com' },
      { protocol: 'https', hostname: 'cdn.dribbble.com' },
      { protocol: 'https', hostname: 'mir-s3-cdn-cf.behance.net' },
      { protocol: 'https', hostname: 'assets.awwwards.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'd2xqcdy4mzt31b.cloudfront.net' },
      { protocol: 'https', hostname: 'assets.devpost.com' }
    ],
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' }
        ]
      }
    ];
  },
  experimental: {
    serverComponentsExternalPackages: ['mongoose']
  }
}

module.exports = nextConfig
```

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### vercel.json
```json
{
  "crons": [
    {
      "path": "/api/cron?job=scrape",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron?job=scrape-designs",
      "schedule": "0 */3 * * *"
    },
    {
      "path": "/api/cron?job=cleanup",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### tailwind.config.js
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
```

### postcss.config.js
```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

## Core Library Files

### src/lib/utils/apiResponse.js
```javascript
import { NextResponse } from 'next/server';

export function apiResponse(data, status = 200) {
  return NextResponse.json({
    success: true,
    data,
    error: null,
    timestamp: new Date().toISOString()
  }, { status });
}

export function apiError(message, status = 500, details = null) {
  return NextResponse.json({
    success: false,
    data: null,
    error: { 
      message,
      details,
      timestamp: new Date().toISOString()
    }
  }, { status });
}

export function apiValidationError(errors) {
  return apiError('Validation failed', 400, errors);
}
```

### src/lib/utils/rateLimiter.js
```javascript
export class RateLimiter {
  constructor(maxRequests = 10, timeWindow = 60000) {
    this.requests = [];
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
  }
  
  async throttle() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.timeWindow - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.requests.push(now);
  }
  
  reset() {
    this.requests = [];
  }
}

// Scraper-specific rate limiters
export const scraperRateLimiters = {
  behance: new RateLimiter(10, 60000),    // 10 requests per minute
  dribbble: new RateLimiter(15, 60000),   // 15 requests per minute
  awwwards: new RateLimiter(5, 60000),    // 5 requests per minute
  devpost: new RateLimiter(20, 60000),    // 20 requests per minute
  unstop: new RateLimiter(20, 60000),     // 20 requests per minute
};
```

### src/lib/utils/cache.js
```javascript
class MemoryCache {
  constructor() {
    this.cache = new Map();
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  set(key, data, ttl = 3600000) { // Default 1 hour
    const expiry = Date.now() + ttl;
    this.cache.set(key, { data, expiry });
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

export const cache = new MemoryCache();

// Run cleanup every 10 minutes
if (typeof window === 'undefined') {
  setInterval(() => cache.cleanup(), 600000);
}
```

### src/lib/utils/validators.js
```javascript
import { z } from 'zod';

// Hackathon validation schema
export const hackathonSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  url: z.string().url(),
  platform: z.enum(['devpost', 'unstop', 'cumulus']),
  deadline: z.string().datetime().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  prizes: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  eligibility: z.string().optional(),
  imageUrl: z.string().url().optional(),
  participants: z.number().optional(),
  sourceId: z.string(),
});

// Design validation schema
export const designSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  imageUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  sourceUrl: z.string().url(),
  source: z.enum(['behance', 'dribbble', 'awwwards', 'designspiration']),
  category: z.string(),
  tags: z.array(z.string()).optional(),
  author: z.object({
    name: z.string().optional(),
    profileUrl: z.string().url().optional(),
    avatar: z.string().url().optional(),
  }).optional(),
  stats: z.object({
    views: z.number().default(0),
    likes: z.number().default(0),
    saves: z.number().default(0),
  }).optional(),
  colors: z.array(z.string()).optional(),
  publishedAt: z.string().datetime().optional(),
});

// Bookmark validation schema
export const bookmarkSchema = z.object({
  hackathonId: z.string(),
  notes: z.string().max(500).optional(),
});

// Search params validation
export const searchParamsSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  platform: z.string().optional(),
  sort: z.enum(['newest', 'deadline', 'popular', 'trending']).optional(),
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(20),
});
```

### src/lib/middleware/withAuth.js
```javascript
import { auth } from '@/auth';
import { apiError } from '@/lib/utils/apiResponse';

export function withAuth(handler) {
  return async (request, context) => {
    const session = await auth();
    
    if (!session?.user) {
      return apiError('Unauthorized', 401);
    }
    
    // Add session to request for handler use
    request.session = session;
    
    return handler(request, context);
  };
}

// Usage example:
// export const GET = withAuth(async (request, context) => {
//   const userId = request.session.user.id;
//   // ... rest of handler
// });
```

## Auth.js v5 Configuration

### src/auth.js
```javascript
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import clientPromise from "@/lib/db/mongodb"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  adapter: MongoDBAdapter(clientPromise),
  session: {
    strategy: "jwt",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.image = user.image
      }
      return token
    },
    session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id
        session.user.email = token.email
        session.user.name = token.name
        session.user.image = token.image
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  debug: process.env.NODE_ENV === 'development',
})
```

### src/middleware.js
```javascript
import { auth } from "@/auth"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isOnDashboard = req.nextUrl.pathname.startsWith('/dashboard') ||
                        req.nextUrl.pathname.startsWith('/bookmarks') ||
                        req.nextUrl.pathname.startsWith('/profile') ||
                        req.nextUrl.pathname.startsWith('/community')

  if (isOnDashboard && !isLoggedIn) {
    return Response.redirect(new URL('/login', req.nextUrl))
  }
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

## Database Configuration

### src/lib/db/mongodb.js
```javascript
import { MongoClient } from 'mongodb';
import mongoose from 'mongoose';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MongoDB URI to .env.local');
}

const uri = process.env.MONGODB_URI;
const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

let client;
let clientPromise;

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Mongoose connection for models
let isConnected = false;

export async function connectDB() {
  if (isConnected) {
    return;
  }

  try {
    await mongoose.connect(uri, {
      dbName: process.env.DATABASE_NAME || 'd2d-designer',
      ...options
    });
    isConnected = true;
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// Export both for different use cases
export default clientPromise; // For NextAuth adapter
export { connectDB }; // For API routes using Mongoose
```

## Database Models

### src/lib/db/models/User.js
```javascript
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true,
  },
  name: String,
  image: String,
  emailVerified: Date,
  preferences: {
    notifications: { type: Boolean, default: true },
    categories: [String],
    platforms: [String],
  },
  stats: {
    totalBookmarks: { type: Number, default: 0 },
    lastActive: { type: Date, default: Date.now },
  }
}, {
  timestamps: true,
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });

export default mongoose.models.User || mongoose.model('User', userSchema);
```

### src/lib/db/models/Hackathon.js
```javascript
import mongoose from 'mongoose';

const hackathonSchema = new mongoose.Schema({
  title: { type: String, required: true, index: true },
  description: String,
  url: { type: String, required: true },
  platform: { 
    type: String, 
    enum: ['devpost', 'unstop', 'cumulus'],
    required: true,
    index: true 
  },
  deadline: Date,
  startDate: Date,
  endDate: Date,
  prizes: [String],
  tags: [String],
  eligibility: String,
  imageUrl: String,
  participants: Number,
  sourceId: { type: String, required: true },
  platformData: mongoose.Schema.Types.Mixed,
  isActive: { type: Boolean, default: true },
  lastScraped: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

// Compound index for unique constraint
hackathonSchema.index({ platform: 1, sourceId: 1 }, { unique: true });
hackathonSchema.index({ deadline: 1 });
hackathonSchema.index({ createdAt: -1 });
hackathonSchema.index({ title: 'text', description: 'text' });

// Virtual for checking if deadline passed
hackathonSchema.virtual('isExpired').get(function() {
  return this.deadline && this.deadline < new Date();
});

export default mongoose.models.Hackathon || mongoose.model('Hackathon', hackathonSchema);
```

### src/lib/db/models/Design.js
```javascript
import mongoose from 'mongoose';
import { DESIGN_CATEGORIES } from '@/lib/scrapers/designs/categories';

const designSchema = new mongoose.Schema({
  title: { type: String, required: true, index: true },
  description: String,
  imageUrl: { type: String, required: true },
  thumbnailUrl: String,
  sourceUrl: { type: String, required: true, unique: true },
  source: { 
    type: String, 
    enum: ['behance', 'dribbble', 'awwwards', 'designspiration'],
    required: true 
  },
  category: {
    type: String,
    enum: Object.values(DESIGN_CATEGORIES),
    required: true,
    index: true
  },
  tags: [String],
  author: {
    name: String,
    profileUrl: String,
    avatar: String
  },
  stats: {
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    saves: { type: Number, default: 0 }
  },
  colors: [String],
  isTrending: { type: Boolean, default: false, index: true },
  publishedAt: Date,
  lastScraped: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

// Indexes
designSchema.index({ category: 1, isTrending: -1 });
designSchema.index({ createdAt: -1 });
designSchema.index({ 'stats.likes': -1 });
designSchema.index({ title: 'text', description: 'text' });

// Virtual for age calculation
designSchema.virtual('isNew').get(function() {
  const daysSincePublished = (Date.now() - this.publishedAt) / (1000 * 60 * 60 * 24);
  return daysSincePublished <= 7;
});

export default mongoose.models.Design || mongoose.model('Design', designSchema);
```

### src/lib/db/models/Bookmark.js
```javascript
import mongoose from 'mongoose';

const bookmarkSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  hackathonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hackathon',
    required: true,
    index: true,
  },
  notes: {
    type: String,
    maxlength: 500,
  },
  tags: [String],
  reminder: Date,
}, {
  timestamps: true,
});

// Compound unique index
bookmarkSchema.index({ userId: 1, hackathonId: 1 }, { unique: true });
bookmarkSchema.index({ createdAt: -1 });

export default mongoose.models.Bookmark || mongoose.model('Bookmark', bookmarkSchema);
```

## Scraper Configuration

### src/lib/scrapers/designs/categories.js
```javascript
export const DESIGN_CATEGORIES = {
  ALL: 'all',
  COLOR_TYPOGRAPHY: 'color-typography',
  ILLUSTRATIONS: 'illustrations',
  BRANDING_LOGOS: 'branding-logos',
  UI_UX: 'ui-ux',
  THREE_D_ANIMATIONS: '3d-animations',
  EXPERIMENTAL: 'experimental'
};

export const CATEGORY_LABELS = {
  [DESIGN_CATEGORIES.ALL]: 'All',
  [DESIGN_CATEGORIES.COLOR_TYPOGRAPHY]: 'Color & Typography',
  [DESIGN_CATEGORIES.ILLUSTRATIONS]: 'Illustrations',
  [DESIGN_CATEGORIES.BRANDING_LOGOS]: 'Branding / Logos',
  [DESIGN_CATEGORIES.UI_UX]: 'UI/UX',
  [DESIGN_CATEGORIES.THREE_D_ANIMATIONS]: '3D & Animations',
  [DESIGN_CATEGORIES.EXPERIMENTAL]: 'Experimental'
};

// Platform to category mapping
export const BEHANCE_CATEGORY_MAP = {
  'graphic-design': DESIGN_CATEGORIES.BRANDING_LOGOS,
  'ui-ux': DESIGN_CATEGORIES.UI_UX,
  'illustration': DESIGN_CATEGORIES.ILLUSTRATIONS,
  'typography': DESIGN_CATEGORIES.COLOR_TYPOGRAPHY,
  '3d': DESIGN_CATEGORIES.THREE_D_ANIMATIONS,
  'motion': DESIGN_CATEGORIES.THREE_D_ANIMATIONS,
};

export const DRIBBBLE_CATEGORY_MAP = {
  'branding': DESIGN_CATEGORIES.BRANDING_LOGOS,
  'illustration': DESIGN_CATEGORIES.ILLUSTRATIONS,
  'mobile': DESIGN_CATEGORIES.UI_UX,
  'web-design': DESIGN_CATEGORIES.UI_UX,
  'typography': DESIGN_CATEGORIES.COLOR_TYPOGRAPHY,
  'animation': DESIGN_CATEGORIES.THREE_D_ANIMATIONS,
};
```

### src/lib/scrapers/index.js
```javascript
import { scrapeDevpost } from './hackathons/devpost';
import { scrapeUnstop } from './hackathons/unstop';
import { scrapeCumulus } from './hackathons/cumulus';
import { Hackathon } from '@/lib/db/models/Hackathon';
import { Logger } from '@/lib/utils/logger';
import { scraperRateLimiters } from '@/lib/utils/rateLimiter';

const logger = new Logger('HackathonScraper');

// Vercel function timeout safety (9 seconds to be safe)
const SCRAPER_TIMEOUT = 9000;

async function runScraperWithTimeout(scraperFn, scraperName, options = {}) {
  return Promise.race([
    scraperFn(options),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`${scraperName} timeout`)), SCRAPER_TIMEOUT)
    )
  ]);
}

export async function runAllScrapers() {
  logger.info('Starting hackathon scraping job');
  
  const scrapers = [
    { name: 'Devpost', fn: scrapeDevpost, rateLimiter: scraperRateLimiters.devpost },
    { name: 'Unstop', fn: scrapeUnstop, rateLimiter: scraperRateLimiters.unstop },
    { name: 'Cumulus', fn: scrapeCumulus, rateLimiter: scraperRateLimiters.cumulus },
  ];
  
  const allHackathons = [];
  const results = { success: 0, failed: 0 };
  
  for (const scraper of scrapers) {
    try {
      await scraper.rateLimiter.throttle();
      const hackathons = await runScraperWithTimeout(
        scraper.fn,
        scraper.name,
        { limit: 20 }
      );
      allHackathons.push(...hackathons);
      results.success++;
      logger.info(`${scraper.name}: ${hackathons.length} hackathons scraped`);
    } catch (error) {
      results.failed++;
      logger.error(`${scraper.name} failed`, error);
    }
  }
  
  // Bulk upsert to database
  if (allHackathons.length > 0) {
    try {
      const bulkOps = allHackathons.map(hackathon => ({
        updateOne: {
          filter: { 
            platform: hackathon.platform, 
            sourceId: hackathon.sourceId 
          },
          update: { 
            $set: { 
              ...hackathon, 
              lastScraped: new Date() 
            } 
          },
          upsert: true
        }
      }));
      
      const result = await Hackathon.bulkWrite(bulkOps);
      logger.info('Hackathon scraping completed', {
        upserted: result.upsertedCount,
        modified: result.modifiedCount,
        total: allHackathons.length
      });
    } catch (error) {
      logger.error('Database bulk write failed', error);
    }
  }
  
  return { hackathons: allHackathons, results };
}
```

## File Generation Order

```
1. package.json
2. .env.example
3. next.config.js
4. tailwind.config.js
5. postcss.config.js
6. tsconfig.json
7. vercel.json
8. src/lib/db/mongodb.js
9. src/lib/db/models/User.js
10. src/lib/db/models/Hackathon.js
11. src/lib/db/models/Design.js
12. src/lib/db/models/Bookmark.js
13. src/lib/utils/logger.js
14. src/lib/utils/errors.js
15. src/lib/utils/apiResponse.js
16. src/lib/utils/validators.js
17. src/lib/utils/dateHelpers.js
18. src/lib/utils/imageHelpers.js
19. src/lib/utils/rateLimiter.js
20. src/lib/utils/cache.js
21. src/lib/middleware/withAuth.js
22. src/auth.js
23. src/middleware.js
24. src/app/globals.css
25. src/app/layout.js
26. src/app/page.js
27. src/app/loading.js
28. src/app/error.js
29. src/app/api/auth/[...nextauth]/route.js
30. src/components/ui/Button.js
31. src/components/ui/Card.js
32. src/components/ui/Input.js
33. src/components/ui/Badge.js
34. src/components/ui/Skeleton.js
35. src/components/ui/ImageWithFallback.js
36. src/components/layout/Header.js
37. src/components/layout/Footer.js
38. src/components/layout/Sidebar.js
39. src/lib/scrapers/designs/categories.js
40. src/lib/scrapers/keywords.js
41. src/lib/scrapers/config.js
42. src/lib/scrapers/hackathons/devpost.js
43. src/lib/scrapers/hackathons/unstop.js
44. src/lib/scrapers/hackathons/cumulus.js
45. src/lib/scrapers/index.js
46. src/lib/scrapers/designs/behance.js
47. src/lib/scrapers/designs/dribbble.js
48. src/lib/scrapers/designs/awwwards.js
49. src/lib/scrapers/designs/index.js
50. src/lib/cron/scrapeJob.js
51. src/lib/cron/designScrapeJob.js
52. src/lib/cron/cleanupJob.js
53. src/app/api/cron/route.js
54. src/app/api/hackathons/route.js
55. src/app/api/hackathons/[id]/route.js
56. src/app/api/bookmarks/route.js
57. src/app/api/bookmarks/[id]/route.js
58. src/app/api/eyecandy/route.js
59. src/app/api/eyecandy/[category]/route.js
60. src/app/api/eyecandy/trending/route.js
61. src/app/api/scrape/route.js
62. src/app/api/scrape/designs/route.js
63. src/hooks/useAuth.js
64. src/hooks/useHackathons.js
65. src/hooks/useBookmarks.js
66. src/hooks/useDesigns.js
67. src/hooks/useInfiniteScroll.js
68. src/components/hackathons/HackathonCard.js
69. src/components/hackathons/HackathonGrid.js
70. src/components/hackathons/SearchBar.js
71. src/components/hackathons/FilterPanel.js
72. src/components/eyecandy/DesignCard.js
73. src/components/eyecandy/DesignGrid.js
74. src/components/eyecandy/CategoryFilter.js
75. src/components/eyecandy/DesignModal.js
76. src/components/eyecandy/LoadMoreButton.js
77. src/components/auth/LoginForm.js
78. src/components/auth/SignupForm.js
79. src/app/(auth)/login/page.js
80. src/app/(auth)/signup/page.js
81. src/app/(dashboard)/layout.js
82. src/app/(dashboard)/dashboard/page.js
83. src/app/(dashboard)/bookmarks/page.js
84. src/app/(dashboard)/profile/page.js
85. src/app/(dashboard)/community/page.js
86. src/app/eye-candy/page.js
87. src/app/eye-candy/[category]/page.js
88. scripts/setup-db.js
89. scripts/test-scrapers.js
90. scripts/test-design-scrapers.js
91. .gitignore
92. README.md
```

## File Dependency Flow

```mermaid
graph TD
    A[package.json] --> B[Configuration Files]
    B --> C[Database Layer]
    C --> D[Utility Layer]
    D --> E[Auth Layer]
    E --> F[API Routes]
    F --> G[UI Components]
    G --> H[Pages]
    
    C --> I[Models]
    I --> J[Scrapers]
    J --> K[Cron Jobs]
    K --> F
    
    D --> L[Middleware]
    L --> F
    L --> H
```

## Important Implementation Notes

1. **Error Handling**: All API routes should use the standardized `apiResponse` and `apiError` utilities
2. **Rate Limiting**: Scrapers must use the rate limiter to avoid IP bans
3. **Caching**: Use the cache utility for frequently accessed data
4. **Validation**: All input should be validated using Zod schemas
5. **Authentication**: Protected routes must use the `withAuth` middleware
6. **Image Handling**: All external images must use the `ImageWithFallback` component
7. **Database Connections**: Always use `connectDB()` at the start of API routes
8. **Timeouts**: Consider Vercel's 10-second timeout limit for serverless functions
9. **TypeScript**: Files can be gradually converted from `.js` to `.ts` as needed
10. **Environment Variables**: Never commit actual values, use `.env.example` as reference

## Testing Commands

```bash
# Initial setup
npm install
npm run setup-db

# Development
npm run dev

# Test scrapers
npm run test-scrapers
npm run test-design-scrapers

# Production build
npm run build
npm run start
```

This master prompt provides a complete, production-ready blueprint for the D2D Designer project with all necessary configurations, error handling, rate limiting, caching, and security measures in place.
