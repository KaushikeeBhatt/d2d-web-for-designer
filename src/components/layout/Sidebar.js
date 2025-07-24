/**
 * Sidebar Component
 * Dashboard navigation sidebar with responsive behavior
 * Collapsible on mobile, persistent on desktop
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Home,
  Bookmark,
  User,
  Users,
  Palette,
  Menu,
  X,
  LogOut,
  Settings,
  TrendingUp,
  Clock,
  ChevronRight
} from 'lucide-react';

/**
 * Navigation items configuration
 * Each item includes route, icon, label, and optional badge
 */
const navigationItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    description: 'Overview and stats'
  },
  {
    label: 'EyeCandy',
    href: '/eye-candy',
    icon: Palette,
    description: 'Design inspiration',
    badge: 'NEW'
  },
  {
    label: 'Bookmarks',
    href: '/bookmarks',
    icon: Bookmark,
    description: 'Saved hackathons'
  },
  {
    label: 'Community',
    href: '/community',
    icon: Users,
    description: 'Connect with designers'
  },
  {
    label: 'Profile',
    href: '/profile',
    icon: User,
    description: 'Account settings'
  }
];

/**
 * Quick stats configuration for sidebar footer
 */
const quickStats = [
  { label: 'Active Hackathons', icon: TrendingUp, value: '24' },
  { label: 'Ending Soon', icon: Clock, value: '7' }
];

/**
 * Sidebar Component
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Mobile sidebar open state
 * @param {Function} props.onClose - Mobile sidebar close handler
 * @returns {JSX.Element} Sidebar navigation
 */
export default function Sidebar({ isOpen = false, onClose = () => {} }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // Handle responsive behavior
  useEffect(() => {
    setMounted(true);
    
    const checkIsDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    checkIsDesktop();
    window.addEventListener('resize', checkIsDesktop);

    // Log sidebar initialization
    console.log('[Sidebar] Component mounted', { isOpen, pathname });

    return () => {
      window.removeEventListener('resize', checkIsDesktop);
    };
  }, [isOpen, pathname]);

  // Close mobile sidebar on route change
  useEffect(() => {
    if (!isDesktop && onClose) {
      onClose();
    }
  }, [pathname, isDesktop, onClose]);

  /**
   * Check if a navigation item is currently active
   * @param {string} href - Navigation item href
   * @returns {boolean} Whether the item is active
   */
  const isActiveRoute = useCallback((href) => {
    try {
      if (href === '/dashboard' && pathname === '/dashboard') {
        return true;
      }
      if (href !== '/dashboard' && pathname?.startsWith(href)) {
        return true;
      }
      return false;
    } catch (error) {
      console.error('[Sidebar] Error checking active route:', error);
      return false;
    }
  }, [pathname]);

  /**
   * Handle navigation item click
   * @param {Object} item - Navigation item
   */
  const handleNavClick = useCallback((item) => {
    try {
      console.log('[Sidebar] Navigation clicked:', item.label);
      
      // Close mobile sidebar after navigation
      if (!isDesktop && onClose) {
        onClose();
      }
    } catch (error) {
      console.error('[Sidebar] Error handling navigation:', error);
    }
  }, [isDesktop, onClose]);

  /**
   * Render navigation item
   * @param {Object} item - Navigation item configuration
   * @returns {JSX.Element} Navigation link element
   */
  const renderNavItem = (item) => {
    try {
      const isActive = isActiveRoute(item.href);
      const Icon = item.icon;

      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => handleNavClick(item)}
          className={`
            group flex items-center justify-between px-3 py-2 rounded-lg
            transition-all duration-200 relative
            ${isActive 
              ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400' 
              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
            }
          `}
          aria-current={isActive ? 'page' : undefined}
        >
          <div className="flex items-center flex-1">
            <Icon className={`
              h-5 w-5 mr-3 flex-shrink-0
              ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}
            `} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{item.label}</span>
                {item.badge && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-800 dark:text-primary-100">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {item.description}
              </span>
            </div>
          </div>
          {isActive && (
            <ChevronRight className="h-4 w-4 text-primary-600 dark:text-primary-400" />
          )}
        </Link>
      );
    } catch (error) {
      console.error('[Sidebar] Error rendering nav item:', error, item);
      return null;
    }
  };

  // Don't render until mounted
  if (!mounted) {
    return null;
  }

  const sidebarContent = (
    <>
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <img
            src="/logo.svg"
            alt="D2D Designer"
            className="h-8 w-auto"
            onError={(e) => {
              console.error('[Sidebar] Logo failed to load');
              e.target.style.display = 'none';
            }}
          />
          <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">
            D2D Designer
          </span>
        </div>
        {!isDesktop && (
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* User Info */}
      {status === 'authenticated' && session?.user && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            {session.user.image ? (
              <img
                src={session.user.image}
                alt={session.user.name || 'User'}
                className="h-10 w-10 rounded-full"
                onError={(e) => {
                  console.error('[Sidebar] User image failed to load');
                  e.target.src = '/images/placeholder.jpg';
                }}
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                <User className="h-6 w-6 text-gray-600 dark:text-gray-300" />
              </div>
            )}
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {session.user.name || 'User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {session.user.email}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Items */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigationItems.map(renderNavItem)}
      </nav>

      {/* Quick Stats */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          Quick Stats
        </h3>
        <div className="space-y-2">
          {quickStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <Icon className="h-4 w-4 mr-2 text-gray-400" />
                  <span>{stat.label}</span>
                </div>
                <span className="font-medium text-gray-900 dark:text-white">
                  {stat.value}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => console.log('[Sidebar] Settings clicked')}
          className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <Settings className="h-4 w-4 mr-3" />
          Settings
        </button>
        {status === 'authenticated' && (
          <button
            onClick={() => console.log('[Sidebar] Logout clicked')}
            className="flex items-center w-full px-3 py-2 mt-1 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4 mr-3" />
            Log out
          </button>
        )}
      </div>
    </>
  );

  // Desktop sidebar (always visible)
  if (isDesktop) {
    return (
      <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 h-screen flex flex-col">
        {sidebarContent}
      </aside>
    );
  }

  // Mobile sidebar (overlay)
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-900 
          border-r border-gray-200 dark:border-gray-700 z-50 
          transform transition-transform duration-300 ease-in-out lg:hidden
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="h-full flex flex-col">
          {sidebarContent}
        </div>
      </aside>
    </>
  );
}