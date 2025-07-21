/**
 * @type {import('next').NextConfig}
 * Next.js configuration for D2D Designer project
 */
const nextConfig = {
  // Configure allowed remote image sources for Next.js Image component
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
  // Add security headers for API routes
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
  // Allow external packages for server components (Next.js 15+)
  serverExternalPackages: ['mongoose']
};

module.exports = nextConfig;
