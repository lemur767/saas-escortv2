import React, { useState } from 'react';
import { format } from 'date-fns';
import type { ConversationSummary } from '../../types/';

interface ConversationListProps {
  conversations: ConversationSummary[];
  onSelectConversation: (phoneNumber: string) => void;
  selectedPhone?: string;
  isLoading?: boolean;
}

const ConversationList: React.FC<ConversationListProps> = ({ 
  conversations, 
  onSelectConversation,
  selectedPhone,
  isLoading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'blocked'>('all');
  
  // Filter conversations based on search term and filter type
  const filteredConversations = conversations
    .filter(convo => {
      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const hasName = convo.client_name?.toLowerCase().includes(searchLower);
        const hasPhone = convo.phone_number.includes(searchLower);
        if (!hasName && !hasPhone) return false;
      }
      
      // Apply conversation type filter
      if (filter === 'unread' && convo.unread_count === 0) return false;
      if (filter === 'blocked' && !convo.is_blocked) return false;
      
      return true;
    })
    .sort((a, b) => {
      // Sort by unread first, then by most recent
      if (a.unread_count > 0 && b.unread_count === 0) return -1;
      if (a.unread_count === 0 && b.unread_count > 0) return 1;
      
      // Then sort by last message time (most recent first)
      const dateA = new Date(a.last_message_time);
      const dateB = new Date(b.last_message_time);
      return dateB.getTime() - dateA.getTime();
    });
  
  // Format relative time (e.g. "2 hours ago", "Yesterday", etc.)
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 24) {
      if (diffHours === 0) return 'Just now';
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return format(date, 'EEEE'); // Day name (e.g. "Monday")
    } else {
      return format(date, 'MMM d'); // Month day (e.g. "Jan 5")
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b">
          <div className="h-10 bg-gray-200 rounded animate-pulse mb-4"></div>
          <div className="flex space-x-2">
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 border-b flex items-center space-x-3">
              <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-32 animate-pulse"></div>
              </div>
              <div className="h-3 w-8 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Search and filter header */}
      <div className="p-4 border-b">
        <div className="relative mb-4">
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            className={`px-3 py-1 text-sm font-medium rounded-md ${
              filter === 'all'
                ? 'bg-indigo-100 text-indigo-800'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`px-3 py-1 text-sm font-medium rounded-md ${
              filter === 'unread'
                ? 'bg-indigo-100 text-indigo-800'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
            onClick={() => setFilter('unread')}
          >
            Unread
          </button>
          <button
            className={`px-3 py-1 text-sm font-medium rounded-md ${
              filter === 'blocked'
                ? 'bg-indigo-100 text-indigo-800'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
            onClick={() => setFilter('blocked')}
          >
            Blocked
          </button>
        </div>
      </div>
      
      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
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
            <h3 className="mt-2 text-sm font-medium text-gray-900">No conversations</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm
                ? `No results found for "${searchTerm}"`
                : filter === 'unread'
                  ? "You don't have any unread messages"
                  : filter === 'blocked'
                    ? "You don't have any blocked conversations"
                    : "You haven't had any conversations yet"}
            </p>
          </div>
        ) : (
          <div>
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.phone_number}
                className={`p-4 border-b cursor-pointer ${
                  selectedPhone === conversation.phone_number 
                    ? 'bg-indigo-50' 
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => onSelectConversation(conversation.phone_number)}
              >
                <div className="flex items-start">
                  <div className="relative flex-shrink-0">
                    <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <span className="text-indigo-800 font-medium text-lg">
                        {conversation.client_name 
                          ? conversation.client_name[0].toUpperCase() 
                          : conversation.phone_number[0]}
                      </span>
                    </div>
                    {conversation.unread_count > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">
                          {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-3 flex-1">
                    <div className="flex justify-between">
                      <p className={`text-sm font-medium ${
                        conversation.unread_count > 0 ? 'text-gray-900' : 'text-gray-700'
                      }`}>
                        {conversation.client_name || conversation.phone_number}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatRelativeTime(conversation.last_message_time)}
                      </p>
                    </div>
                    
                    <div className="flex items-center mt-1">
                      {conversation.is_blocked && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 mr-2">
                          Blocked
                        </span>
                      )}
                      {/* Here you could add a message preview if available */}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationList;