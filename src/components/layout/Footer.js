/**
 * Footer Component
 * Global footer with navigation links and app information
 * Responsive design with mobile-first approach
 */

'use client';

import Link from 'next/link';
import { Github, Twitter, Linkedin, Mail, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';

/**
 * Footer navigation configuration
 * Organized by sections for easy maintenance
 */
const footerLinks = {
  product: [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'EyeCandy Gallery', href: '/eye-candy' },
    { label: 'Bookmarks', href: '/bookmarks' },
    { label: 'Community', href: '/community' }
  ],
  resources: [
    { label: 'About', href: '/about' },
    { label: 'Blog', href: '/blog', external: true },
    { label: 'API Docs', href: 'https://docs.anthropic.com', external: true },
    { label: 'Support', href: 'https://support.anthropic.com', external: true }
  ],
  legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Cookie Policy', href: '/cookies' }
  ],
  social: [
    { label: 'GitHub', href: 'https://github.com', icon: Github },
    { label: 'Twitter', href: 'https://twitter.com', icon: Twitter },
    { label: 'LinkedIn', href: 'https://linkedin.com', icon: Linkedin },
    { label: 'Email', href: 'mailto:hello@d2ddesigner.com', icon: Mail }
  ]
};

/**
 * Footer Component
 * @returns {JSX.Element} Footer element with navigation and info
 */
export default function Footer() {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [mounted, setMounted] = useState(false);

  // Handle client-side mounting to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    setCurrentYear(new Date().getFullYear());
    
    // Log footer render for debugging
    console.log('[Footer] Component mounted');
  }, []);

  /**
   * Render a footer link with proper styling and attributes
   * @param {Object} link - Link configuration object
   * @param {string} key - Unique key for React
   * @returns {JSX.Element} Link element
   */
  const renderLink = (link, key) => {
    try {
      // Handle external links
      if (link.external) {
        return (
          <a
            key={key}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors duration-200 flex items-center gap-1"
            aria-label={`${link.label} (opens in new tab)`}
          >
            {link.label}
            <ExternalLink className="h-3 w-3" />
          </a>
        );
      }

      // Handle internal links
      return (
        <Link
          key={key}
          href={link.href}
          className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors duration-200"
          aria-label={link.label}
        >
          {link.label}
        </Link>
      );
    } catch (error) {
      console.error('[Footer] Error rendering link:', error, link);
      return null;
    }
  };

  /**
   * Render social media icon links
   * @param {Object} social - Social link configuration
   * @param {number} index - Array index for key
   * @returns {JSX.Element} Social icon link
   */
  const renderSocialLink = (social, index) => {
    try {
      const Icon = social.icon;
      
      return (
        <a
          key={index}
          href={social.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors duration-200"
          aria-label={`Follow us on ${social.label}`}
        >
          <Icon className="h-5 w-5" />
        </a>
      );
    } catch (error) {
      console.error('[Footer] Error rendering social link:', error, social);
      return null;
    }
  };

  // Don't render until mounted to avoid hydration issues
  if (!mounted) {
    return null;
  }

  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center mb-4">
              <img
                src="/logo.svg"
                alt="D2D Designer Logo"
                className="h-8 w-auto"
                onError={(e) => {
                  console.error('[Footer] Logo failed to load');
                  e.target.style.display = 'none';
                }}
              />
              <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">
                D2D Designer
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Discover design hackathons and get inspired with curated design collections.
            </p>
            <div className="flex space-x-4">
              {footerLinks.social.map((social, index) => renderSocialLink(social, index))}
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
              Product
            </h3>
            <ul className="space-y-3">
              {footerLinks.product.map((link, index) => (
                <li key={index}>{renderLink(link, `product-${index}`)}</li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
              Resources
            </h3>
            <ul className="space-y-3">
              {footerLinks.resources.map((link, index) => (
                <li key={index}>{renderLink(link, `resources-${index}`)}</li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
              Legal
            </h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link, index) => (
                <li key={index}>{renderLink(link, `legal-${index}`)}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              © {currentYear} D2D Designer. All rights reserved.
            </p>
            <div className="mt-4 md:mt-0 flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
              <span>Built with Next.js & MongoDB</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">Powered by Vercel</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}