'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import ImageWithFallback from '@/components/ui/ImageWithFallback';
import { 
  Users, 
  MessageSquare, 
  Heart, 
  Share2, 
  Trophy,
  TrendingUp,
  Calendar,
  MapPin,
  Sparkles,
  BookOpen,
  Github,
  Linkedin,
  Twitter,
  Globe
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Logger } from '@/lib/utils/logger';

const logger = new Logger('CommunityPage');

/**
 * Community stats card component
 * @param {Object} props - Component props
 * @param {string} props.title - Card title
 * @param {string|number} props.value - Card value
 * @param {React.ReactNode} props.icon - Card icon
 * @param {string} props.color - Icon color class
 */
function CommunityStatCard({ title, value, icon, color }) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

/**
 * Featured designer card component
 * @param {Object} props - Component props
 * @param {Object} props.designer - Designer data
 */
function FeaturedDesignerCard({ designer }) {
  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start space-x-4">
        <ImageWithFallback
          src={designer.avatar}
          alt={designer.name}
          width={64}
          height={64}
          className="rounded-full"
          fallbackSrc="/images/placeholder.jpg"
        />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{designer.name}</h3>
          <p className="text-sm text-gray-600">{designer.title}</p>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-sm text-gray-500">
              <Trophy className="w-4 h-4 inline mr-1" />
              {designer.wins} wins
            </span>
            <span className="text-sm text-gray-500">
              <Heart className="w-4 h-4 inline mr-1" />
              {designer.likes} likes
            </span>
          </div>
          <div className="flex gap-2 mt-3">
            {designer.skills.map((skill, index) => (
              <Badge key={index} variant="default" size="sm">
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * Community activity item component
 * @param {Object} props - Component props
 * @param {Object} props.activity - Activity data
 */
function ActivityItem({ activity }) {
  const getActivityIcon = () => {
    switch (activity.type) {
      case 'win':
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 'submit':
        return <Share2 className="w-5 h-5 text-blue-500" />;
      case 'bookmark':
        return <Heart className="w-5 h-5 text-red-500" />;
      default:
        return <MessageSquare className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="flex items-start space-x-3 py-3">
      <div className="flex-shrink-0">
        {getActivityIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">
          <span className="font-medium">{activity.user}</span>
          {' '}{activity.action}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

/**
 * Community skeleton loader
 */
function CommunitySkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16" />
          </Card>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="flex items-start space-x-4">
                <Skeleton className="w-16 h-16 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-48 mb-3" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
        
        <div>
          <Card className="p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="py-3">
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * Main community page component
 */
export default function CommunityPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [communityData, setCommunityData] = useState({
    stats: {
      totalMembers: 2547,
      activeThisWeek: 324,
      totalSubmissions: 8921,
      totalWins: 156
    },
    featuredDesigners: [],
    recentActivity: [],
    upcomingEvents: []
  });

  // Load community data
  useEffect(() => {
    const loadCommunityData = async () => {
      try {
        setLoading(true);
        
        // Simulate API call - replace with actual API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock data
        setCommunityData({
          stats: {
            totalMembers: 2547,
            activeThisWeek: 324,
            totalSubmissions: 8921,
            totalWins: 156
          },
          featuredDesigners: [
            {
              id: 1,
              name: 'Sarah Chen',
              title: 'UI/UX Designer',
              avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
              wins: 12,
              likes: 234,
              skills: ['UI Design', 'Prototyping', 'Figma']
            },
            {
              id: 2,
              name: 'Alex Rivera',
              title: 'Visual Designer',
              avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
              wins: 8,
              likes: 189,
              skills: ['Branding', 'Illustration', 'Motion']
            },
            {
              id: 3,
              name: 'Maya Patel',
              title: 'Product Designer',
              avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
              wins: 15,
              likes: 312,
              skills: ['Product Design', 'Research', 'Systems']
            }
          ],
          recentActivity: [
            {
              id: 1,
              type: 'win',
              user: 'Sarah Chen',
              action: 'won the UI Challenge on Devpost',
              timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
            },
            {
              id: 2,
              type: 'submit',
              user: 'Alex Rivera',
              action: 'submitted to Brand Identity Hackathon',
              timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000)
            },
            {
              id: 3,
              type: 'bookmark',
              user: 'Maya Patel',
              action: 'bookmarked Mobile Design Sprint',
              timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000)
            },
            {
              id: 4,
              type: 'win',
              user: 'James Wilson',
              action: 'placed 2nd in Illustration Challenge',
              timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000)
            },
            {
              id: 5,
              type: 'submit',
              user: 'Lisa Zhang',
              action: 'submitted to Typography Contest',
              timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          ],
          upcomingEvents: [
            {
              id: 1,
              title: 'Design System Workshop',
              date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
              type: 'workshop'
            },
            {
              id: 2,
              title: 'Portfolio Review Session',
              date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              type: 'review'
            }
          ]
        });
        
        logger.info('Community data loaded');
      } catch (error) {
        logger.error('Error loading community data', error);
      } finally {
        setLoading(false);
      }
    };

    loadCommunityData();
  }, []);

  // Handle loading state
  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <CommunitySkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg shadow-sm p-8 text-white">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold mb-4">D2D Designer Community</h1>
          <p className="text-lg opacity-90">
            Connect with fellow designers, share your work, and get inspired by the amazing creations from our community.
          </p>
          <div className="flex gap-4 mt-6">
            <Button variant="secondary">
              <Users className="w-4 h-4 mr-2" />
              Join Discord
            </Button>
            <Button variant="outline" className="text-white border-white hover:bg-white hover:text-gray-900">
              <BookOpen className="w-4 h-4 mr-2" />
              Community Guidelines
            </Button>
          </div>
        </div>
      </div>

      {/* Community stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <CommunityStatCard
          title="Total Members"
          value={communityData.stats.totalMembers.toLocaleString()}
          icon={<Users className="w-6 h-6 text-white" />}
          color="bg-purple-500"
        />
        <CommunityStatCard
          title="Active This Week"
          value={communityData.stats.activeThisWeek}
          icon={<TrendingUp className="w-6 h-6 text-white" />}
          color="bg-green-500"
        />
        <CommunityStatCard
          title="Total Submissions"
          value={communityData.stats.totalSubmissions.toLocaleString()}
          icon={<Share2 className="w-6 h-6 text-white" />}
          color="bg-blue-500"
        />
        <CommunityStatCard
          title="Hackathon Wins"
          value={communityData.stats.totalWins}
          icon={<Trophy className="w-6 h-6 text-white" />}
          color="bg-yellow-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Featured designers */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Featured Designers
              </h2>
              <Badge variant="primary">
                <Sparkles className="w-3 h-3 mr-1" />
                This Week
              </Badge>
            </div>
            
            <div className="space-y-4">
              {communityData.featuredDesigners.map(designer => (
                <FeaturedDesignerCard key={designer.id} designer={designer} />
              ))}
            </div>

            <div className="mt-6 text-center">
              <Button variant="outline">
                View All Designers
              </Button>
            </div>
          </Card>

          {/* Upcoming events */}
          <Card className="p-6 mt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Upcoming Events
            </h2>
            <div className="space-y-4">
              {communityData.upcomingEvents.map(event => (
                <div key={event.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <Calendar className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{event.title}</p>
                      <p className="text-sm text-gray-600">
                        {formatDistanceToNow(event.date, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Learn More
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Recent activity sidebar */}
        <div>
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Recent Activity
            </h2>
            <div className="divide-y divide-gray-200">
              {communityData.recentActivity.map(activity => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4">
              View All Activity
            </Button>
          </Card>

          {/* Connect section */}
          <Card className="p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Connect With Us
            </h3>
            <div className="space-y-3">
              <a
                href="#"
                className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Github className="w-5 h-5 text-gray-700 mr-3" />
                <span className="text-sm font-medium text-gray-900">GitHub</span>
              </a>
              <a
                href="#"
                className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Twitter className="w-5 h-5 text-gray-700 mr-3" />
                <span className="text-sm font-medium text-gray-900">Twitter</span>
              </a>
              <a
                href="#"
                className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Linkedin className="w-5 h-5 text-gray-700 mr-3" />
                <span className="text-sm font-medium text-gray-900">LinkedIn</span>
              </a>
              <a
                href="#"
                className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Globe className="w-5 h-5 text-gray-700 mr-3" />
                <span className="text-sm font-medium text-gray-900">Blog</span>
              </a>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}