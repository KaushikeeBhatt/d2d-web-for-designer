import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Logger } from '@/lib/utils/logger';

const logger = new Logger('DashboardLayout');

/**
 * Dashboard layout component
 * Provides authenticated layout with sidebar navigation
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} Dashboard layout
 */
export default async function DashboardLayout({ children }) {
  try {
    // Check authentication
    const session = await auth();
    
    // Log layout access
    logger.info('Dashboard layout accessed', {
      authenticated: !!session,
      userId: session?.user?.id || null,
      userEmail: session?.user?.email || null
    });

    // Redirect if not authenticated
    if (!session?.user) {
      logger.warn('Unauthenticated access to dashboard, redirecting to login');
      redirect('/login?callbackUrl=/dashboard');
    }

    // Verify user session is valid
    if (!session.user.email) {
      logger.error('Invalid user session - missing email', { session });
      redirect('/login?error=InvalidSession');
    }

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header with user info */}
        <Header user={session.user} />
        
        <div className="flex">
          {/* Sidebar Navigation */}
          <Sidebar />
          
          {/* Main Content Area */}
          <main className="flex-1 lg:pl-64">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Error Boundary wrapper for children */}
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
              </div>
            </div>
          </main>
        </div>

        {/* Footer - Hidden on mobile for better UX */}
        <footer className="hidden lg:block lg:pl-64 bg-white border-t border-gray-200">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
            <p className="text-center text-sm text-gray-500">
              © 2024 D2D Designer. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    );
  } catch (error) {
    // Log any errors during layout rendering
    logger.error('Error in dashboard layout', error);
    
    // Redirect to error page
    redirect('/error?message=LayoutError');
  }
}

/**
 * Error boundary component for catching render errors
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} Error boundary wrapper
 */
function ErrorBoundary({ children }) {
  try {
    return <>{children}</>;
  } catch (error) {
    logger.error('Error caught by dashboard error boundary', error);
    
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error loading content
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>
                There was an error loading this page. Please try refreshing or contact support if the problem persists.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

/**
 * Metadata for dashboard pages
 */
export const metadata = {
  title: 'Dashboard - D2D Designer',
  description: 'Manage your hackathon bookmarks and discover new opportunities',
};