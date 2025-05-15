import { format } from 'date-fns';
import type { Profile } from '../../types';

interface ProfileCardProps {
  profile: Profile;
  onToggleAI: (profileId: number, enabled: boolean) => Promise<void>;
  onClick: () => void;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ profile, onToggleAI, onClick }) => {
  const { id, name, phone_number, is_active, ai_enabled, unread_messages, last_message_time } = profile;
  
  const handleToggleAI = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleAI(id, !ai_enabled);
  };
  
  return (
    <div 
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer"
      onClick={onClick}
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-gray-800">{name}</h3>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
            is_active ? 'status-active' : 'status-inactive'
          }`}>
            {is_active ? 'Active' : 'Inactive'}
          </div>
        </div>
        
        <p className="text-gray-600 mb-4">{phone_number}</p>
        
        {last_message_time && (
          <p className="text-gray-500 text-sm mb-4">
            Last message: {format(new Date(last_message_time), 'MMM d, h:mm a')}
          </p>
        )}
        
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <span className="text-gray-700 mr-2">AI Responses:</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={ai_enabled}
                onChange={handleToggleAI}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
          
          {unread_messages > 0 && (
            <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {unread_messages}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileCard;