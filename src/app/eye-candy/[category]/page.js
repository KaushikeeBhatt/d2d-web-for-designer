'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { notFound } from 'next/navigation';
import { DESIGN_CATEGORIES } from '@/lib/scrapers/designs/categories';
import { Logger } from '@/lib/utils/logger';

const logger = new Logger('EyeCandyCategoryPage');

/**
 * Category-specific Eye Candy page
 * Redirects to main page with category query parameter
 */
export default function EyeCandyCategoryPage({ params }) {
  const router = useRouter();
  const { category } = params;

  useEffect(() => {
    logger.info('Category page accessed', { category });

    // Validate category
    const validCategories = Object.values(DESIGN_CATEGORIES);
    if (!validCategories.includes(category)) {
      logger.error('Invalid category accessed', { category });
      notFound();
      return;
    }

    // Redirect to main eye-candy page with category parameter
    const redirectUrl = `/eye-candy?category=${encodeURIComponent(category)}`;
    logger.info('Redirecting to main page with category', { redirectUrl });
    
    router.replace(redirectUrl);
  }, [category, router]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center space-x-2">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-lg text-gray-600">Loading designs...</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Generate static params for all valid categories
 * This enables static generation for category pages
 */
export async function generateStaticParams() {
  const categories = Object.values(DESIGN_CATEGORIES).filter(
    cat => cat !== DESIGN_CATEGORIES.ALL
  );

  logger.info('Generating static params for categories', { count: categories.length });

  return categories.map((category) => ({
    category: category,
  }));
}

/**
 * Generate metadata for category pages
 */
export async function generateMetadata({ params }) {
  const { category } = params;
  const { CATEGORY_LABELS } = await import('@/lib/scrapers/designs/categories');
  
  // Validate category
  if (!Object.values(DESIGN_CATEGORIES).includes(category)) {
    return {
      title: 'Category Not Found | Eye Candy',
      description: 'The requested design category was not found.',
    };
  }

  const categoryLabel = CATEGORY_LABELS[category] || category;

  return {
    title: `${categoryLabel} Designs | Eye Candy`,
    description: `Explore curated ${categoryLabel.toLowerCase()} design inspiration from top creative platforms.`,
    openGraph: {
      title: `${categoryLabel} Designs | Eye Candy`,
      description: `Discover the best ${categoryLabel.toLowerCase()} designs and get inspired.`,
      type: 'website',
    },
  };
}