'use client';

import { useState, useEffect, useCallback } from 'react';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useAuth } from '@/hooks/useAuth';
import HackathonCard from '@/components/hackathons/HackathonCard';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import { Bookmark, Search, Filter, Calendar, Clock, Tag, Trash2, Edit } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Logger } from '@/lib/utils/logger';

const logger = new Logger('BookmarksPage');

/**
 * Bookmark filter component
 * @param {Object} props - Component props
 * @param {Object} props.filters - Current filter values
 * @param {Function} props.onFilterChange - Filter change handler
 */
function BookmarkFilters({ filters, onFilterChange }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search bookmarks..."
              value={filters.search}
              onChange={(e) => onFilterChange({ search: e.target.value })}
              className="pl-10"
            />
          </div>
        </div>
        
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="ml-4"
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </div>

      {isOpen && (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Platform
              </label>
              <select
                value={filters.platform}
                onChange={(e) => onFilterChange({ platform: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">All Platforms</option>
                <option value="devpost">Devpost</option>
                <option value="unstop">Unstop</option>
                <option value="cumulus">Cumulus</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => onFilterChange({ status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="upcoming">Upcoming</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <select
                value={filters.sort}
                onChange={(e) => onFilterChange({ sort: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="deadline">Deadline</option>
                <option value="name">Name</option>
              </select>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

/**
 * Empty bookmarks state component
 */
function EmptyBookmarks() {
  return (
    <Card className="p-12 text-center">
      <Bookmark className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        No bookmarks yet
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        Start saving hackathons you're interested in and they'll appear here.
      </p>
      <Button href="/" variant="primary">
        Explore Hackathons
      </Button>
    </Card>
  );
}

/**
 * Bookmarks loading skeleton
 */
function BookmarksSkeleton() {
  return (
    <div className="space-y-4">
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
  );
}

/**
 * Main bookmarks page component
 */
export default function BookmarksPage() {
  const { user } = useAuth();
  const { 
    bookmarks, 
    loading, 
    error, 
    removeBookmark,
    updateBookmark 
  } = useBookmarks();

  const [filters, setFilters] = useState({
    search: '',
    platform: '',
    status: '',
    sort: 'newest'
  });

  const [filteredBookmarks, setFilteredBookmarks] = useState([]);
  const [selectedBookmark, setSelectedBookmark] = useState(null);
  const [notes, setNotes] = useState('');

  /**
   * Filter and sort bookmarks based on current filters
   */
  const filterAndSortBookmarks = useCallback(() => {
    try {
      let filtered = [...(bookmarks || [])];

      // Apply search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(bookmark =>
          bookmark.hackathon.title.toLowerCase().includes(searchLower) ||
          bookmark.hackathon.description?.toLowerCase().includes(searchLower) ||
          bookmark.notes?.toLowerCase().includes(searchLower)
        );
      }

      // Apply platform filter
      if (filters.platform) {
        filtered = filtered.filter(bookmark =>
          bookmark.hackathon.platform === filters.platform
        );
      }

      // Apply status filter
      if (filters.status) {
        const now = new Date();
        filtered = filtered.filter(bookmark => {
          const deadline = bookmark.hackathon.deadline ? new Date(bookmark.hackathon.deadline) : null;
          
          switch (filters.status) {
            case 'active':
              return deadline && deadline > now;
            case 'upcoming':
              return bookmark.hackathon.startDate && new Date(bookmark.hackathon.startDate) > now;
            case 'expired':
              return deadline && deadline < now;
            default:
              return true;
          }
        });
      }

      // Apply sorting
      filtered.sort((a, b) => {
        switch (filters.sort) {
          case 'oldest':
            return new Date(a.createdAt) - new Date(b.createdAt);
          case 'deadline':
            const deadlineA = a.hackathon.deadline ? new Date(a.hackathon.deadline) : new Date('9999');
            const deadlineB = b.hackathon.deadline ? new Date(b.hackathon.deadline) : new Date('9999');
            return deadlineA - deadlineB;
          case 'name':
            return a.hackathon.title.localeCompare(b.hackathon.title);
          case 'newest':
          default:
            return new Date(b.createdAt) - new Date(a.createdAt);
        }
      });

      setFilteredBookmarks(filtered);
      logger.info('Bookmarks filtered', { count: filtered.length, filters });
    } catch (error) {
      logger.error('Error filtering bookmarks', error);
      setFilteredBookmarks([]);
    }
  }, [bookmarks, filters]);

  // Run filter when bookmarks or filters change
  useEffect(() => {
    filterAndSortBookmarks();
  }, [filterAndSortBookmarks]);

  /**
   * Handle filter changes
   * @param {Object} newFilters - New filter values
   */
  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  /**
   * Handle bookmark removal
   * @param {string} bookmarkId - Bookmark ID to remove
   */
  const handleRemoveBookmark = async (bookmarkId) => {
    try {
      await removeBookmark(bookmarkId);
      logger.info('Bookmark removed', { bookmarkId });
    } catch (error) {
      logger.error('Error removing bookmark', error);
    }
  };

  /**
   * Handle notes update
   * @param {Object} bookmark - Bookmark to update
   */
  const handleUpdateNotes = async (bookmark) => {
    try {
      await updateBookmark(bookmark._id, { notes });
      setSelectedBookmark(null);
      setNotes('');
      logger.info('Bookmark notes updated', { bookmarkId: bookmark._id });
    } catch (error) {
      logger.error('Error updating notes', error);
    }
  };

  // Handle loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <BookmarksSkeleton />
      </div>
    );
  }

  // Handle error state
  if (error) {
    logger.error('Bookmarks page error', error);
    return (
      <Card className="p-8 text-center">
        <div className="text-red-500 mb-4">
          <Bookmark className="w-12 h-12 mx-auto" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Unable to load bookmarks
        </h2>
        <p className="text-gray-600 mb-4">{error.message}</p>
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">My Bookmarks</h1>
        <p className="text-gray-600 mt-2">
          {bookmarks?.length || 0} saved hackathons
        </p>
      </div>

      {/* Filters */}
      {bookmarks && bookmarks.length > 0 && (
        <BookmarkFilters 
          filters={filters} 
          onFilterChange={handleFilterChange} 
        />
      )}

      {/* Bookmarks grid */}
      {filteredBookmarks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBookmarks.map((bookmark) => (
            <div key={bookmark._id} className="relative group">
              <HackathonCard
                hackathon={bookmark.hackathon}
                isBookmarked={true}
                onBookmarkToggle={() => handleRemoveBookmark(bookmark._id)}
              />
              
              {/* Bookmark metadata */}
              <div className="mt-2 px-1">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>
                    Saved {formatDistanceToNow(new Date(bookmark.createdAt), { addSuffix: true })}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedBookmark(bookmark);
                      setNotes(bookmark.notes || '');
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
                
                {bookmark.notes && (
                  <p className="text-sm text-gray-600 mt-1 italic">
                    "{bookmark.notes}"
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : bookmarks?.length > 0 ? (
        <Card className="p-8 text-center">
          <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No matching bookmarks
          </h3>
          <p className="text-gray-600">
            Try adjusting your filters or search terms
          </p>
        </Card>
      ) : (
        <EmptyBookmarks />
      )}

      {/* Notes edit modal */}
      {selectedBookmark && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">
              Edit Notes for "{selectedBookmark.hackathon.title}"
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your notes here..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 h-32"
              maxLength={500}
            />
            <div className="flex justify-end gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedBookmark(null);
                  setNotes('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => handleUpdateNotes(selectedBookmark)}
              >
                Save Notes
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}