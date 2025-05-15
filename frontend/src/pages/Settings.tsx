import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getCurrentUser, updateUserProfile } from '../api/auth';
import { useAuth } from '../hooks/useAuth';
import type { User } from '../types';

// Import components
import ProfileForm from '../components/settings/ProfileForm';
import PasswordForm from '../components/settings/PasswordForm';
import NotificationSettings from '../components/settings/NotificationSettings';
import DeleteAccount from '../components/settings/DeleteAccount';

// Define tab types
type TabType = 'profile' | 'password' | 'notifications' | 'delete';

const Settings = () => {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  
  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast.error('Failed to load user profile');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserData();
  }, []);
  
  // Handle profile update
  const handleProfileUpdate = async (updatedUser: User) => {
    setUser(updatedUser);
    toast.success('Profile updated successfully');
  };
  
  // Handle notification settings change
  const handleNotificationChange = (setting: string, enabled: boolean) => {
    // This would be implemented with actual API calls
    console.log(`Setting ${setting} to ${enabled}`);
    toast.success(`Notification settings updated`);
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Account Settings</h1>
        <p className="text-gray-600">
          Manage your account settings and preferences.
        </p>
      </div>
      
      {/* Settings Tabs */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            {/* Tab buttons */}
            {[
              { id: 'profile', label: 'Profile' },
              { id: 'password', label: 'Password' },
              { id: 'notifications', label: 'Notifications' },
              { id: 'delete', label: 'Delete Account' }
            ].map((tab) => (
              <button
                key={tab.id}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab(tab.id as TabType)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="p-6">
          {/* Profile Settings */}
          {activeTab === 'profile' && user && (
            <ProfileForm user={user} onUpdate={handleProfileUpdate} />
          )}
          
          {/* Password Settings */}
          {activeTab === 'password' && (
            <PasswordForm />
          )}
          
          {/* Notification Settings */}
          {activeTab === 'notifications' && (
            <NotificationSettings onChange={handleNotificationChange} />
          )}
          
          {/* Delete Account */}
          {activeTab === 'delete' && (
            <DeleteAccount />
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;