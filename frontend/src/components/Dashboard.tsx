// Dashboard.tsx - Main dashboard component

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ProfileCard from '../components/dashboard/ProfileCard';
import StatsSummary from '../components/dashboard/StatsSummary';
import RecentActivity from '../components/dashboard/RecentActivity';
import NewProfileModal from '../components/dashboard/NewProfileModal';
import { useAuth } from '../hooks/useAuth';
import { socket } from '../services/socket';

interface Profile {
  id: number;
  name: string;
  phone_number: string;
  description: string;
  is_active: boolean;
  ai_enabled: boolean;
  unread_messages: number;
  last_message_time: string;
}

interface Stats {
  total_messages: number;
  ai_responses: number;
  flagged_messages: number;
  active_conversations: number;
}

const Dashboard: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [stats, setStats] = useState<Stats>({
    total_messages: 0,
    ai_responses: 0,
    flagged_messages: 0,
    active_conversations: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showNewProfileModal, setShowNewProfileModal] = useState(false);
  const { user, token } = useAuth();
  const navigate = useNavigate();

  // Fetch profiles and stats on component mount
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch profiles
        const profilesResponse = await axios.get('/api/profiles', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Fetch stats
        const statsResponse = await axios.get('/api/stats/summary', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setProfiles(profilesResponse.data);
        setStats(statsResponse.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [token]);

  // Set up socket.io for real-time updates
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }
    
    // Listen for new messages
    socket.on('new_message', (data) => {
      // Update unread message count for the profile
      setProfiles(prevProfiles => 
        prevProfiles.map(profile => 
          profile.id === data.profile_id 
            ? { 
                ...profile, 
                unread_messages: profile.unread_messages + 1,
                last_message_time: data.timestamp
              } 
            : profile
        )
      );
      
      // Update stats
      setStats(prevStats => ({
        ...prevStats,
        total_messages: prevStats.total_messages + 1,
        ai_responses: data.is_ai_response ? prevStats.ai_responses + 1 : prevStats.ai_responses,
        flagged_messages: data.is_flagged ? prevStats.flagged_messages + 1 : prevStats.flagged_messages
      }));
    });
    
    return () => {
      socket.off('new_message');
    };
  }, []);

  // Toggle AI for a profile
  const handleToggleAI = async (profileId: number, enabled: boolean) => {
    try {
      await axios.post(`/api/profiles/${profileId}/toggle_ai`, 
        { enabled },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local state
      setProfiles(prevProfiles => 
        prevProfiles.map(profile => 
          profile.id === profileId 
            ? { ...profile, ai_enabled: enabled } 
            : profile
        )
      );
    } catch (error) {
      console.error('Error toggling AI:', error);
    }
  };

  // Create new profile
  const handleCreateProfile = async (profileData: any) => {
    try {
      const response = await axios.post('/api/profiles', 
        profileData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Add new profile to state
      setProfiles(prevProfiles => [...prevProfiles, response.data]);
      
      // Close modal
      setShowNewProfileModal(false);
    } catch (error) {
      console.error('Error creating profile:', error);
    }
  };

  // Navigate to profile details
  const handleProfileClick = (profileId: number) => {
    navigate(`/profiles/${profileId}`);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <button 
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded"
          onClick={() => setShowNewProfileModal(true)}
        >
          Create New Profile
        </button>
      </div>
      
      {/* Stats Summary */}
      <StatsSummary stats={stats} />
      
      {/* Profiles Section */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Your Profiles</h2>
        {profiles.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-500">You don't have any profiles yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles.map(profile => (
              <ProfileCard 
                key={profile.id}
                profile={profile}
                onToggleAI={handleToggleAI}
                onClick={() => handleProfileClick(profile.id)}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Recent Activity */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Recent Activity</h2>
        <RecentActivity />
      </div>
      
      {/* New Profile Modal */}
      {showNewProfileModal && (
        <NewProfileModal 
          onClose={() => setShowNewProfileModal(false)}
          onSubmit={handleCreateProfile}
        />
      )}
    </div>
  );
};

export default Dashboard;