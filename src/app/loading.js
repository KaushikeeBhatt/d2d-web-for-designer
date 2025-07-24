/**
 * Global Loading Component
 * 
 * This component is displayed while pages are loading in Next.js App Router.
 * It provides a consistent loading experience across the entire application.
 * 
 * @module app/loading
 */

import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Loading component that displays a skeleton UI during page transitions
 * 
 * @returns {JSX.Element} Loading UI with skeleton placeholders
 */
export default function Loading() {
  // Log loading state for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('[Loading] Global loading state active');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Skeleton */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo skeleton */}
            <Skeleton className="h-8 w-32" />
            
            {/* Navigation skeleton */}
            <div className="hidden md:flex space-x-4">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
            
            {/* User menu skeleton */}
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title Skeleton */}
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>

        {/* Content Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Generate 6 skeleton cards for a typical grid layout */}
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`skeleton-card-${index}`}
              className="bg-white rounded-lg shadow-sm p-6 space-y-4"
            >
              {/* Card image skeleton */}
              <Skeleton className="h-48 w-full rounded-md" />
              
              {/* Card title skeleton */}
              <Skeleton className="h-6 w-3/4" />
              
              {/* Card description skeleton */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
              
              {/* Card metadata skeleton */}
              <div className="flex justify-between items-center pt-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-20 rounded-md" />
              </div>
            </div>
          ))}
        </div>

        {/* Additional loading indicators for specific page types */}
        <div className="mt-8 flex justify-center">
          <div className="flex items-center space-x-2 text-gray-500">
            {/* Animated loading dots */}
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" 
                   style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" 
                   style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" 
                   style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-sm">Loading content...</span>
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * Custom styles for loading animation
 * These are included inline to ensure they're available immediately
 */
const loadingStyles = `
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: .5;
    }
  }
`;

// Inject loading styles if not already present
if (typeof window !== 'undefined' && !document.getElementById('loading-styles')) {
  const style = document.createElement('style');
  style.id = 'loading-styles';
  style.textContent = loadingStyles;
  document.head.appendChild(style);
}