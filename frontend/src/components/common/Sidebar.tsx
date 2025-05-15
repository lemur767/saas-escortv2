import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getProfiles } from '../../api/profiles';
import { useUI } from '../../hooks/useUI';
import type { Profile } from '../../types/profile';

const Sidebar: React.FC = () => {
  const { sidebarOpen, setCurrentProfile } = useUI();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const location = useLocation();
  
  // Fetch profiles
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const profilesData = await getProfiles();
        setProfiles(profilesData);
      } catch (error) {
        console.error('Error fetching profiles:', error);
      }
    };
    
    fetchProfiles();
  }, []);
  
  // Check if a route is active
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  
  // Set current profile when clicking on a profile link
  const handleProfileClick = (profileId: number) => {
    setCurrentProfile(profileId);
  };
  
  return (
    <div 
      className={`bg-gray-800 text-white w-64 fixed h-full overflow-y-auto transition-transform duration-300 transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="p-4">
        <div className="py-4">
          <h2 className="text-lg font-semibold text-white mb-2">Navigation</h2>
          
          <nav className="mt-5 space-y-1">
            <Link
              to="/dashboard"
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                isActive('/dashboard')
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <svg
                className={`mr-3 h-6 w-6 ${
                  isActive('/dashboard') ? 'text-gray-300' : 'text-gray-400 group-hover:text-gray-300'
                }`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Dashboard
            </Link>
            
            <Link
              to="/clients"
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                isActive('/clients')
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <svg
                className={`mr-3 h-6 w-6 ${
                  isActive('/clients') ? 'text-gray-300' : 'text-gray-400 group-hover:text-gray-300'
                }`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              Clients
            </Link>
            
            <Link
              to="/analytics"
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                isActive('/analytics')
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <svg
                className={`mr-3 h-6 w-6 ${
                  isActive('/analytics') ? 'text-gray-300' : 'text-gray-400 group-hover:text-gray-300'
                }`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              Analytics
            </Link>
            
            <Link
              to="/settings"
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                isActive('/settings')
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <svg
                className={`mr-3 h-6 w-6 ${
                  isActive('/settings') ? 'text-gray-300' : 'text-gray-400 group-hover:text-gray-300'
                }`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Settings
            </Link>
            
            <Link
              to="/billing"
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                isActive('/billing')
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <svg
                className={`mr-3 h-6 w-6 ${
                  isActive('/billing') ? 'text-gray-300' : 'text-gray-400 group-hover:text-gray-300'
                }`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
              Billing
            </Link>
          </nav>
        </div>
        
        {/* Profiles Section */}
        {profiles.length > 0 && (
          <div className="mt-8">
            <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Your Profiles
            </h3>
            <div className="mt-1 space-y-1">
              {profiles.map(profile => (
                <Link
                  key={profile.id}
                  to={`/profiles/${profile.id}`}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    isActive(`/profiles/${profile.id}`)
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                  onClick={() => handleProfileClick(profile.id)}
                >
                  <div className="w-2 h-2 mr-3 rounded-full bg-green-400"></div>
                  <span className="truncate">{profile.name}</span>
                  {profile.unread_messages > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                      {profile.unread_messages}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;