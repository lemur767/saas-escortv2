import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getProfiles, toggleAI } from '../api/profiles';
import { getUsageSummary } from '../api/billing';
import { useUI } from '../hooks/useUI';
import type { Profile, UsageSummary } from '../types/';
import ProfileCard from '../components/dashboard/ProfileCard';
import StatsSummary from '../components/dashboard/StatsSummary';
import NewProfileModal from '../components/dashboard/NewProfileModal';

const Dashboard = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewProfileModal, setShowNewProfileModal] = useState(false);
  const { setCurrentProfile } = useUI();
  const navigate = useNavigate();

  // Fetch profiles and usage data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const [profilesData, usageData] = await Promise.all([
          getProfiles(),
          getUsageSummary()
        ]);
        
        setProfiles(profilesData);
        setUsage(usageData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to fetch dashboard data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  // Handle toggle AI
  const handleToggleAI = async (profileId: number, enabled: boolean) => {
    try {
      await toggleAI(profileId, enabled);
      
      // Update local state
      setProfiles(prevProfiles => 
        prevProfiles.map(profile => 
          profile.id === profileId 
            ? { ...profile, ai_enabled: enabled } 
            : profile
        )
      );
      
      toast.success(`AI responses ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error toggling AI:', error);
      toast.error('Failed to toggle AI');
    }
  };

  // Handle profile click
  const handleProfileClick = (profile: Profile) => {
    setCurrentProfile(profile.id);
    navigate(`/profiles/${profile.id}`);
  };

  // Handle create profile
  const handleCreateProfile = (newProfile: Profile) => {
    setProfiles(prevProfiles => [...prevProfiles, newProfile]);
    setShowNewProfileModal(false);
    toast.success('Profile created successfully');
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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <button 
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md transition-colors duration-200"
          onClick={() => setShowNewProfileModal(true)}
        >
          Create New Profile
        </button>
      </div>
      
      {/* Usage Stats */}
      {usage && (
        <div className="mb-8">
          <StatsSummary usage={usage} />
        </div>
      )}
      
      {/* Profiles Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Your Profiles</h2>
        
        {profiles.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-10 text-center">
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
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" 
              />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No profiles yet</h3>
            <p className="mt-1 text-gray-500">Get started by creating your first profile.</p>
            <div className="mt-6">
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                onClick={() => setShowNewProfileModal(true)}
              >
                <svg 
                  className="-ml-1 mr-2 h-5 w-5" 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 20 20" 
                  fill="currentColor" 
                  aria-hidden="true"
                >
                  <path 
                    fillRule="evenodd" 
                    d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" 
                    clipRule="evenodd" 
                  />
                </svg>
                Create a profile
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles.map(profile => (
              <ProfileCard 
                key={profile.id}
                profile={profile}
                onToggleAI={handleToggleAI}
                onClick={() => handleProfileClick(profile)}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* New Profile Modal */}
      {showNewProfileModal && (
        <NewProfileModal 
          onClose={() => setShowNewProfileModal(false)}
          onCreateProfile={handleCreateProfile}
        />
      )}
    </div>
  );
};

export default Dashboard;