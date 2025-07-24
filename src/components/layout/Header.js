/**
 * Header Component
 * Main navigation header for the application
 * Includes auth status, navigation links, and mobile menu
 */

'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';
import { Button } from '@/components/ui/Button';
import { Menu, X, Search, Bookmark, Palette, User, LogOut } from 'lucide-react';

/**
 * Main header component with navigation
 * @param {Object} props - Component props
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} Header component
 */
export function Header({ className = '' }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  console.log('[Header] Rendering header', { 
    pathname, 
    isAuthenticated: !!session,
    status 
  });

  /**
   * Navigation links configuration
   */
  const navigationLinks = [
    { href: '/', label: 'Discover', icon: Search },
    { href: '/eye-candy', label: 'EyeCandy', icon: Palette },
    ...(session ? [
      { href: '/dashboard', label: 'Dashboard', icon: null },
      { href: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
      { href: '/community', label: 'Community', icon: null },
    ] : []),
  ];

  /**
   * Check if link is active
   */
  const isLinkActive = useCallback((href) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  }, [pathname]);

  /**
   * Handle sign out
   */
  const handleSignOut = useCallback(async () => {
    console.log('[Header] Signing out user');
    try {
      await signOut({ callbackUrl: '/' });
    } catch (error) {
      console.error('[Header] Sign out error', error);
    }
  }, []);

  /**
   * Toggle mobile menu
   */
  const toggleMobileMenu = useCallback(() => {
    console.log('[Header] Toggling mobile menu');
    setIsMobileMenuOpen(!isMobileMenuOpen);
    setIsProfileDropdownOpen(false);
  }, [isMobileMenuOpen]);

  /**
   * Toggle profile dropdown
   */
  const toggleProfileDropdown = useCallback(() => {
    console.log('[Header] Toggling profile dropdown');
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
    setIsMobileMenuOpen(false);
  }, [isProfileDropdownOpen]);

  /**
   * Close all menus when clicking outside
   */
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.profile-dropdown') && !event.target.closest('.profile-button')) {
        setIsProfileDropdownOpen(false);
      }
    };

    if (isProfileDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isProfileDropdownOpen]);

  return (
    <header className={`bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 ${className}`}>
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link 
              href="/" 
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
            >
              <img 
                src="/logo.svg" 
                alt="D2D Designer" 
                className="h-8 w-8"
              />
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                D2D Designer
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navigationLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium
                  transition-colors duration-200
                  ${isLinkActive(link.href)
                    ? 'text-primary-600 bg-primary-50 dark:text-primary-400 dark:bg-primary-900/20'
                    : 'text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400'
                  }
                `}
              >
                {link.icon && <link.icon className="w-4 h-4" />}
                <span>{link.label}</span>
              </Link>
            ))}
          </div>

          {/* Auth Section */}
          <div className="flex items-center space-x-4">
            {status === 'loading' ? (
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
            ) : session ? (
              <>
                {/* Desktop Profile Dropdown */}
                <div className="relative hidden md:block">
                  <button
                    onClick={toggleProfileDropdown}
                    className="profile-button flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    aria-expanded={isProfileDropdownOpen}
                    aria-haspopup="true"
                  >
                    <ImageWithFallback
                      src={session.user?.image || ''}
                      alt={session.user?.name || 'User'}
                      width={32}
                      height={32}
                      className="rounded-full"
                      fallbackSrc="/images/default-avatar.png"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {session.user?.name || 'User'}
                    </span>
                  </button>

                  {/* Dropdown Menu */}
                  {isProfileDropdownOpen && (
                    <div className="profile-dropdown absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                      <Link
                        href="/profile"
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => setIsProfileDropdownOpen(false)}
                      >
                        <User className="w-4 h-4" />
                        <span>Profile</span>
                      </Link>
                      <hr className="my-1 border-gray-200 dark:border-gray-700" />
                      <button
                        onClick={handleSignOut}
                        className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="hidden md:flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/login')}
                >
                  Log In
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => router.push('/signup')}
                >
                  Sign Up
                </Button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMobileMenu}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-expanded={isMobileMenuOpen}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              ) : (
                <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="space-y-1">
              {navigationLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium
                    ${isLinkActive(link.href)
                      ? 'text-primary-600 bg-primary-50 dark:text-primary-400 dark:bg-primary-900/20'
                      : 'text-gray-700 dark:text-gray-300'
                    }
                  `}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.icon && <link.icon className="w-5 h-5" />}
                  <span>{link.label}</span>
                </Link>
              ))}

              {/* Mobile Auth Section */}
              <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                {session ? (
                  <>
                    <Link
                      href="/profile"
                      className="flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <ImageWithFallback
                        src={session.user?.image || ''}
                        alt={session.user?.name || 'User'}
                        width={24}
                        height={24}
                        className="rounded-full"
                        fallbackSrc="/images/default-avatar.png"
                      />
                      <span>{session.user?.name || 'User'}</span>
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center space-x-2 w-full px-3 py-2 mt-2 rounded-md text-base font-medium text-red-600 dark:text-red-400"
                    >
                      <LogOut className="w-5 h-5" />
                      <span>Sign Out</span>
                    </button>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="md"
                      fullWidth
                      onClick={() => {
                        router.push('/login');
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      Log In
                    </Button>
                    <Button
                      variant="primary"
                      size="md"
                      fullWidth
                      onClick={() => {
                        router.push('/signup');
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      Sign Up
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

export default Header;