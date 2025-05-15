import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getProfile, updateProfile, toggleAI } from '../api/profiles';
import { getConversations } from '../api/messages';
import { useUI } from '../hooks/useUI';
import type { Profile, ConversationSummary } from '../types';
import ConversationList from '../components/messaging/ConversationList';
//import BusinessHoursSettings from '../components/profile/BusinessHoursSettings';
//import AISettings from '../components/profile/AISettings';
///import AutoReplyList from '../components/profile/AutoReplyList';
//import TrainingExamples from '../components/profile/TrainingExamples';

const ProfileDetail = () => {
  const { profileId } = useParams<{ profileId: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeTab, setActiveTab] = useState<'conversations' | 'settings' | 'ai' | 'auto-replies' | 'training'>('conversations');
  const [isLoading, setIsLoading] = useState(true);
  const { setCurrentProfile } = useUI();
  const navigate = useNavigate();
  
  // Validate param
  if (!profileId) {
    navigate('/dashboard');
    return null;
  }
  
  // Fetch profile and conversations
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch profile
        const profileData = await getProfile(parseInt(profileId));
        setProfile(profileData);
        setCurrentProfile(profileData.id);
        
        // Fetch conversations
        const conversationsData = await getConversations(parseInt(profileId));
        setConversations(conversationsData);
      } catch (error) {
        console.error('Error fetching profile data:', error);
        toast.error('Failed to load profile data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProfileData();
  }, [profileId]);
  
  // Handle toggle AI
  const handleToggleAI = async () => {
    if (!profile) return;
    
    try {
      await toggleAI(profile.id, !profile.ai_enabled);
      
      // Update local state
      setProfile(prev => prev ? { ...prev, ai_enabled: !prev.ai_enabled } : null);
      
      toast.success(`AI responses ${!profile.ai_enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error toggling AI:', error);
      toast.error('Failed to toggle AI');
    }
  };
  
  // Handle update profile
  const handleUpdateProfile = async (data: Partial<Profile>) => {
    if (!profile) return;
    
    try {
      const updatedProfile = await updateProfile(profile.id, data);
      setProfile(updatedProfile);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };
  
  // Handle select conversation
  const handleSelectConversation = (phoneNumber: string) => {
    navigate(`/conversations/${profileId}/${phoneNumber}`);
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }
  
  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">Profile not found</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{profile.name}</h1>
            <p className="text-gray-600">{profile.phone_number}</p>
            {profile.description && (
              <p className="text-gray-500 mt-2">{profile.description}</p>
            )}
          </div>
          
          <div className="mt-4 md:mt-0">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <span className="text-gray-700 mr-2">AI Responses:</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={profile.ai_enabled}
                    onChange={handleToggleAI}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
              
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                profile.is_active ? 'status-active' : 'status-inactive'
              }`}>
                {profile.is_active ? 'Active' : 'Inactive'}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'conversations'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('conversations')}
            >
              Conversations
            </button>
            
            <button
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('settings')}
            >
              Settings
            </button>
            
            <button
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'ai'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('ai')}
            >
              AI Settings
            </button>
            
            <button
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'auto-replies'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('auto-replies')}
            >
              Auto-Replies
            </button>
            
            <button
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'training'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('training')}
            >
              Training Data
            </button>
          </nav>
        </div>
      </div>
      
      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-md">
        {activeTab === 'conversations' && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Conversations</h2>
            
            {conversations.length === 0 ? (
              <div className="text-center py-8">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No conversations yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  When clients text this profile, conversations will appear here.
                </p>
              </div>
            ) : (
              <ConversationList
                conversations={conversations}
                onSelectConversation={handleSelectConversation}
              />
            )}
          </div>
        )}
        
        {activeTab === 'settings' && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Profile Settings</h2>
            
            <BusinessHoursSettings
              profileId={profile.id}
              initialBusinessHours={profile.business_hours}
              onUpdate={(businessHours) => handleUpdateProfile({ business_hours: businessHours })}
            />
          </div>
        )}
        
        {activeTab === 'ai' && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">AI Response Settings</h2>
            
            <AISettings
              profileId={profile.id}
              isEnabled={profile.ai_enabled}
              onToggleAI={handleToggleAI}
            />
          </div>
        )}
        
        {activeTab === 'auto-replies' && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Auto-Replies</h2>
            
            <AutoReplyList profileId={profile.id} />
          </div>
        )}
        
        {activeTab === 'training' && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Training Examples</h2>
            
            <TrainingExamples profileId={profile.id} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileDetail;