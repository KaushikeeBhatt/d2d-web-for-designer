// src/app/layout.js

import { Inter } from 'next/font/google';
import './globals.css';
import { Logger } from '@/lib/utils/logger';

// Initialize logger for layout operations
const logger = new Logger('RootLayout');

// Configure Inter font with Latin subset and variable font
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

/**
 * Generate metadata for the application
 * @returns {Object} Metadata object for Next.js
 */
export const metadata = {
  title: {
    default: 'D2D Designer - Discover Design Hackathons & Inspiration',
    template: '%s | D2D Designer'
  },
  description: 'Discover and bookmark design hackathons from multiple platforms. Get inspired with curated design galleries from Behance, Dribbble, and more.',
  keywords: [
    'design hackathons',
    'hackathon discovery',
    'design competitions',
    'UI/UX challenges',
    'design inspiration',
    'creative challenges',
    'Behance',
    'Dribbble',
    'Awwwards'
  ],
  authors: [{ name: 'D2D Designer Team' }],
  creator: 'D2D Designer',
  publisher: 'D2D Designer',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'D2D Designer - Discover Design Hackathons & Inspiration',
    description: 'Your one-stop platform for discovering design hackathons and getting inspired by curated design galleries.',
    url: '/',
    siteName: 'D2D Designer',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'D2D Designer Platform',
      }
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'D2D Designer - Discover Design Hackathons',
    description: 'Discover and bookmark design hackathons. Get inspired with curated design galleries.',
    images: ['/twitter-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' }
    ],
    apple: [
      { url: '/apple-touch-icon.png' }
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/safari-pinned-tab.svg',
      }
    ]
  },
  manifest: '/site.webmanifest',
  alternates: {
    canonical: '/',
  },
};

/**
 * Generate viewport configuration
 * @returns {Object} Viewport settings
 */
export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' }
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

/**
 * Root layout component for the entire application
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} Root layout wrapper
 */
export default function RootLayout({ children }) {
  try {
    // Log layout render for debugging
    logger.debug('Rendering root layout');

    return (
      <html 
        lang="en" 
        className={inter.variable}
        suppressHydrationWarning
      >
        <head>
          {/* Preconnect to external domains for performance */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          
          {/* DNS prefetch for external resources */}
          <link rel="dns-prefetch" href="https://cdn.dribbble.com" />
          <link rel="dns-prefetch" href="https://mir-s3-cdn-cf.behance.net" />
          <link rel="dns-prefetch" href="https://assets.awwwards.com" />
          
          {/* Add structured data for SEO */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "WebApplication",
                "name": "D2D Designer",
                "description": "Discover and bookmark design hackathons from multiple platforms",
                "url": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
                "applicationCategory": "DesignApplication",
                "operatingSystem": "Any",
                "offers": {
                  "@type": "Offer",
                  "price": "0",
                  "priceCurrency": "USD"
                }
              })
            }}
          />
        </head>
        <body 
          className={`${inter.className} antialiased min-h-screen bg-background text-foreground`}
          suppressHydrationWarning
        >
          {/* Skip to main content link for accessibility */}
          <a 
            href="#main-content" 
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50"
          >
            Skip to main content
          </a>

          {/* Main application wrapper */}
          <div className="relative flex min-h-screen flex-col">
            {/* Gradient background effect */}
            <div 
              className="fixed inset-0 -z-10 h-full w-full bg-white dark:bg-gray-950"
              aria-hidden="true"
            >
              <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
            </div>

            {/* Main content */}
            <main id="main-content" className="flex-1">
              {children}
            </main>
          </div>

          {/* Portal root for modals */}
          <div id="modal-root" />

          {/* Notification container */}
          <div 
            id="notification-root" 
            className="fixed top-4 right-4 z-50 pointer-events-none"
            aria-live="polite"
            aria-atomic="true"
          />

          {/* Development mode indicator */}
          {process.env.NODE_ENV === 'development' && (
            <div className="fixed bottom-4 left-4 bg-yellow-500 text-black px-2 py-1 rounded text-xs font-bold z-50">
              DEV MODE
            </div>
          )}

          {/* No script fallback */}
          <noscript>
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 text-center">
              <p className="font-bold">JavaScript Required</p>
              <p>Please enable JavaScript to use D2D Designer.</p>
            </div>
          </noscript>
        </body>
      </html>
    );
  } catch (error) {
    // Log error and provide fallback
    logger.error('Error rendering root layout', error);
    
    // Return minimal fallback layout
    return (
      <html lang="en">
        <body>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
              <p className="text-gray-600">Please refresh the page to try again.</p>
            </div>
          </div>
        </body>
      </html>
    );
  }
}

/**
 * Configure runtime for the layout
 * Using edge runtime for better performance
 */
export const runtime = 'nodejs';

/**
 * Configure dynamic behavior
 * Force dynamic rendering for authenticated content
 */
export const dynamic = 'auto';

/**
 * Configure revalidation
 * Revalidate static pages every hour
 */
export const revalidate = 3600;