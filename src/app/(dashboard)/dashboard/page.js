'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useHackathons } from '@/hooks/useHackathons';
import { useBookmarks } from '@/hooks/useBookmarks';
import HackathonCard from '@/components/hackathons/HackathonCard';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import Badge from '@/components/ui/Badge';
import { Calendar, Trophy, Bookmark, TrendingUp, Clock, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { Logger } from '@/lib/utils/logger';

const logger = new Logger('DashboardPage');

/**
 * Dashboard statistics card component
 * @param {Object} props - Component props
 * @param {string} props.title - Card title
 * @param {string|number} props.value - Card value
 * @param {React.ReactNode} props.icon - Card icon
 * @param {string} props.description - Card description
 * @param {string} props.trend - Trend indicator
 */
function StatCard({ title, value, icon, description, trend }) {
  return (
    <Card className="p-6 hover:shadow-lg transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
          {description && (
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          )}
        </div>
        <div className="flex items-center justify-center w-12 h-12 bg-primary-50 rounded-lg">
          {icon}
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center text-sm">
          <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
          <span className="text-green-600">{trend}</span>
        </div>
      )}
    </Card>
  );
}

/**
 * Dashboard skeleton loader component
 */
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32 mt-2" />
              </div>
              <Skeleton className="w-12 h-12 rounded-lg" />
            </div>
          </Card>
        ))}
      </div>

      {/* Hackathons skeleton */}
      <div>
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-32 w-full mb-4" />
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Main dashboard page component
 */
export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { hackathons, loading: hackathonsLoading, error: hackathonsError } = useHackathons({
    sort: 'newest',
    limit: 6
  });
  const { bookmarks, loading: bookmarksLoading } = useBookmarks();
  
  const [stats, setStats] = useState({
    activeHackathons: 0,
    upcomingDeadlines: 0,
    totalBookmarks: 0,
    newThisWeek: 0
  });

  // Calculate dashboard statistics
  useEffect(() => {
    try {
      if (hackathons) {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const activeCount = hackathons.filter(h => 
          h.deadline && new Date(h.deadline) > now
        ).length;
        
        const upcomingCount = hackathons.filter(h => {
          if (!h.deadline) return false;
          const deadline = new Date(h.deadline);
          const daysUntil = (deadline - now) / (1000 * 60 * 60 * 24);
          return daysUntil > 0 && daysUntil <= 7;
        }).length;
        
        const newCount = hackathons.filter(h => 
          new Date(h.createdAt) > weekAgo
        ).length;
        
        setStats({
          activeHackathons: activeCount,
          upcomingDeadlines: upcomingCount,
          totalBookmarks: bookmarks?.length || 0,
          newThisWeek: newCount
        });
        
        logger.info('Dashboard stats calculated', stats);
      }
    } catch (error) {
      logger.error('Error calculating stats', error);
    }
  }, [hackathons, bookmarks]);

  // Handle loading states
  if (authLoading || hackathonsLoading || bookmarksLoading) {
    logger.debug('Dashboard loading...');
    return <DashboardSkeleton />;
  }

  // Handle errors
  if (hackathonsError) {
    logger.error('Dashboard error', hackathonsError);
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="text-red-500 mb-4">
          <Calendar className="w-12 h-12" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Unable to load dashboard
        </h2>
        <p className="text-gray-600 mb-4">
          {hackathonsError.message || 'Something went wrong'}
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Get bookmarked hackathon IDs for quick lookup
  const bookmarkedIds = new Set(bookmarks?.map(b => b.hackathonId) || []);

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name || 'Designer'}!
        </h1>
        <p className="text-gray-600 mt-2">
          Here's what's happening in the design hackathon world
        </p>
      </div>

      {/* Statistics cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Active Hackathons"
          value={stats.activeHackathons}
          icon={<Trophy className="w-6 h-6 text-primary-600" />}
          description="Currently accepting submissions"
          trend={`${stats.newThisWeek} new this week`}
        />
        
        <StatCard
          title="Upcoming Deadlines"
          value={stats.upcomingDeadlines}
          icon={<Clock className="w-6 h-6 text-orange-600" />}
          description="Ending in the next 7 days"
        />
        
        <StatCard
          title="Your Bookmarks"
          value={stats.totalBookmarks}
          icon={<Bookmark className="w-6 h-6 text-blue-600" />}
          description="Saved hackathons"
        />
        
        <StatCard
          title="Community"
          value="2.5k"
          icon={<Users className="w-6 h-6 text-green-600" />}
          description="Active designers"
        />
      </div>

      {/* Recent hackathons section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Recent Hackathons
          </h2>
          <Link
            href="/"
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            View all →
          </Link>
        </div>

        {hackathons && hackathons.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hackathons.map((hackathon) => (
              <HackathonCard
                key={hackathon._id}
                hackathon={hackathon}
                isBookmarked={bookmarkedIds.has(hackathon._id)}
                onBookmarkToggle={() => {
                  // Bookmark toggle is handled by the card component
                  logger.debug('Bookmark toggled', { hackathonId: hackathon._id });
                }}
              />
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No hackathons found</p>
            <p className="text-sm text-gray-500 mt-2">
              Check back later for new opportunities
            </p>
          </Card>
        )}
      </div>

      {/* Quick actions */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/eye-candy"
            className="flex items-center p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Browse EyeCandy</p>
              <p className="text-sm text-gray-600">Get design inspiration</p>
            </div>
          </Link>
          
          <Link
            href="/bookmarks"
            className="flex items-center p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <Bookmark className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">My Bookmarks</p>
              <p className="text-sm text-gray-600">View saved hackathons</p>
            </div>
          </Link>
          
          <Link
            href="/community"
            className="flex items-center p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Join Community</p>
              <p className="text-sm text-gray-600">Connect with designers</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}