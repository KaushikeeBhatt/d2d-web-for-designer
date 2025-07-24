'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from 'next-auth/react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import ImageWithFallback from '@/components/ui/ImageWithFallback';
import { 
  User, 
  Mail, 
  Calendar, 
  Bell, 
  Shield, 
  LogOut,
  Check,
  X,
  Camera,
  Save,
  AlertCircle
} from 'lucide-react';
import { formatDate } from '@/lib/utils/dateHelpers';
import { Logger } from '@/lib/utils/logger';

const logger = new Logger('ProfilePage');

/**
 * Profile section component
 * @param {Object} props - Component props
 * @param {string} props.title - Section title
 * @param {React.ReactNode} props.children - Section content
 */
function ProfileSection({ title, children }) {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
      {children}
    </Card>
  );
}

/**
 * Profile skeleton loader
 */
function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="w-24 h-24 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </Card>
      
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </Card>
      ))}
    </div>
  );
}

/**
 * Main profile page component
 */
export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    notifications: true,
    categories: [],
    platforms: []
  });

  // Available options
  const availableCategories = [
    'UI/UX Design',
    'Graphic Design',
    'Web Development',
    'Mobile Design',
    'Illustration',
    'Branding'
  ];

  const availablePlatforms = [
    { value: 'devpost', label: 'Devpost' },
    { value: 'unstop', label: 'Unstop' },
    { value: 'cumulus', label: 'Cumulus' }
  ];

  // Initialize form data from user
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        notifications: user.preferences?.notifications ?? true,
        categories: user.preferences?.categories || [],
        platforms: user.preferences?.platforms || []
      });
      logger.debug('Profile data loaded', { userId: user.id });
    }
  }, [user]);

  /**
   * Handle form field changes
   * @param {string} field - Field name
   * @param {any} value - Field value
   */
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  /**
   * Toggle array field value (categories/platforms)
   * @param {string} field - Field name
   * @param {string} value - Value to toggle
   */
  const toggleArrayField = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value]
    }));
  };

  /**
   * Handle profile save
   */
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveMessage(null);
      
      // Make API call to update user preferences
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          preferences: {
            notifications: formData.notifications,
            categories: formData.categories,
            platforms: formData.platforms
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      setSaveMessage({ type: 'success', text: 'Profile updated successfully' });
      setIsEditing(false);
      logger.info('Profile updated successfully');
      
      // Clear message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      logger.error('Error updating profile', error);
      setSaveMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handle sign out
   */
  const handleSignOut = async () => {
    try {
      logger.info('User signing out', { userId: user?.id });
      await signOut({ callbackUrl: '/' });
    } catch (error) {
      logger.error('Error signing out', error);
    }
  };

  // Loading state
  if (authLoading || !user) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-gray-600 mt-2">
          Manage your account information and preferences
        </p>
      </div>

      {/* Save message */}
      {saveMessage && (
        <div className={`rounded-lg p-4 flex items-center ${
          saveMessage.type === 'success' 
            ? 'bg-green-50 text-green-800' 
            : 'bg-red-50 text-red-800'
        }`}>
          {saveMessage.type === 'success' ? (
            <Check className="w-5 h-5 mr-2" />
          ) : (
            <AlertCircle className="w-5 h-5 mr-2" />
          )}
          {saveMessage.text}
        </div>
      )}

      {/* Profile overview */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <ImageWithFallback
                src={user.image}
                alt={user.name}
                width={96}
                height={96}
                className="rounded-full"
                fallbackSrc="/images/placeholder.jpg"
              />
              {isEditing && (
                <button className="absolute bottom-0 right-0 p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700">
                  <Camera className="w-4 h-4" />
                </button>
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{user.name}</h2>
              <p className="text-gray-600">{user.email}</p>
              <p className="text-sm text-gray-500 mt-1">
                Member since {formatDate(user.createdAt)}
              </p>
            </div>
          </div>
          
          <Button
            variant={isEditing ? 'outline' : 'primary'}
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Cancel' : 'Edit Profile'}
          </Button>
        </div>
      </Card>

      {/* Account information */}
      <ProfileSection title="Account Information">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            {isEditing ? (
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="Your name"
              />
            ) : (
              <p className="py-2 text-gray-900">{formData.name || 'Not set'}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="flex items-center">
              <Mail className="w-4 h-4 text-gray-400 mr-2" />
              <p className="py-2 text-gray-900">{formData.email}</p>
              {user.emailVerified && (
                <Badge variant="success" className="ml-2">
                  Verified
                </Badge>
              )}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Type
            </label>
            <div className="flex items-center">
              <Shield className="w-4 h-4 text-gray-400 mr-2" />
              <p className="py-2 text-gray-900">Google Account</p>
            </div>
          </div>
        </div>
      </ProfileSection>

      {/* Preferences */}
      <ProfileSection title="Preferences">
        <div className="space-y-6">
          {/* Notifications */}
          <div>
            <label className="flex items-center justify-between">
              <div className="flex items-center">
                <Bell className="w-4 h-4 text-gray-400 mr-2" />
                <span className="text-sm font-medium text-gray-700">
                  Email Notifications
                </span>
              </div>
              {isEditing ? (
                <button
                  type="button"
                  onClick={() => handleFieldChange('notifications', !formData.notifications)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.notifications ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.notifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              ) : (
                <span className="text-sm text-gray-600">
                  {formData.notifications ? 'Enabled' : 'Disabled'}
                </span>
              )}
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              Receive updates about new hackathons and deadlines
            </p>
          </div>

          {/* Interested Categories */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Interested Categories
            </label>
            {isEditing ? (
              <div className="flex flex-wrap gap-2">
                {availableCategories.map(category => (
                  <Badge
                    key={category}
                    variant={formData.categories.includes(category) ? 'primary' : 'default'}
                    className="cursor-pointer"
                    onClick={() => toggleArrayField('categories', category)}
                  >
                    {formData.categories.includes(category) && (
                      <Check className="w-3 h-3 mr-1" />
                    )}
                    {category}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {formData.categories.length > 0 ? (
                  formData.categories.map(category => (
                    <Badge key={category} variant="primary">
                      {category}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No categories selected</p>
                )}
              </div>
            )}
          </div>

          {/* Preferred Platforms */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preferred Platforms
            </label>
            {isEditing ? (
              <div className="space-y-2">
                {availablePlatforms.map(platform => (
                  <label key={platform.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.platforms.includes(platform.value)}
                      onChange={() => toggleArrayField('platforms', platform.value)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {platform.label}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {formData.platforms.length > 0 ? (
                  formData.platforms.map(platform => {
                    const platformLabel = availablePlatforms.find(p => p.value === platform)?.label;
                    return (
                      <Badge key={platform} variant="default">
                        {platformLabel || platform}
                      </Badge>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-500">All platforms</p>
                )}
              </div>
            )}
          </div>
        </div>
      </ProfileSection>

      {/* Actions */}
      {isEditing ? (
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setIsEditing(false);
              // Reset form data
              setFormData({
                name: user.name || '',
                email: user.email || '',
                notifications: user.preferences?.notifications ?? true,
                categories: user.preferences?.categories || [],
                platforms: user.preferences?.platforms || []
              });
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      ) : (
        <ProfileSection title="Account Actions">
          <div className="space-y-4">
            <div className="pb-4 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Export Data
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Download a copy of your bookmarks and preferences
              </p>
              <Button variant="outline" size="sm">
                Export My Data
              </Button>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-red-600 mb-2">
                Sign Out
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Sign out of your account on this device
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </ProfileSection>
      )}
    </div>
  );
}