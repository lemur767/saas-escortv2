import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getMessages, sendMessage, markMessagesAsRead } from '../api/messages';
import { getClient, updateClient, toggleClientBlock } from '../api/clients';
import { useSocket } from '../hooks/useSocket';
import MessageBubble from '../components/messaging/MessageBubble';
import MessageInput from '../components/messaging/MessageInput';
import ClientInfo from '../components/messaging/ClientInfo';
import type { Message, Client } from '../types';

const ConversationView = () => {
  const { profileId, clientPhone } = useParams<{ profileId: string; clientPhone: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { socket } = useSocket();
  
  // Validate params
  if (!profileId || !clientPhone) {
    navigate('/dashboard');
    return null;
  }
  
  // Fetch messages and client info
  useEffect(() => {
    const fetchConversation = async () => {
      try {
        setIsLoading(true);
        
        // Fetch messages
        const messagesData = await getMessages(parseInt(profileId), clientPhone);
        setMessages(messagesData);
        
        // Fetch client info
        const clientData = await getClient(clientPhone);
        setClient(clientData);
        
        // Mark messages as read
        await markMessagesAsRead(parseInt(profileId), clientPhone);
      } catch (error) {
        console.error('Error fetching conversation:', error);
        toast.error('Failed to load conversation');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchConversation();
  }, [profileId, clientPhone]);
  
  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Listen for new messages via socket
  useEffect(() => {
    if (!socket) return;
    
    const handleNewMessage = (message: Message) => {
      if (
        message.profile_id === parseInt(profileId) && 
        message.sender_number === clientPhone
      ) {
        setMessages(prev => [...prev, message]);
        
        // Mark message as read if we're viewing this conversation
        markMessagesAsRead(parseInt(profileId), clientPhone).catch(console.error);
      }
    };
    
    socket.on('new_message', handleNewMessage);
    
    return () => {
      socket.off('new_message', handleNewMessage);
    };
  }, [socket, profileId, clientPhone]);
  
  // Handle send message
  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;
    
    try {
      const newMessage = await sendMessage(parseInt(profileId), clientPhone, content);
      setMessages(prev => [...prev, newMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };
  
  // Handle update client notes
  const handleUpdateClientNotes = async (notes: string) => {
    if (!client) return;
    
    try {
      const updatedClient = await updateClient(clientPhone, { notes });
      setClient(updatedClient);
      toast.success('Client notes updated');
    } catch (error) {
      console.error('Error updating client notes:', error);
      toast.error('Failed to update client notes');
    }
  };
  
  // Handle toggle client block
  const handleToggleBlock = async (reason?: string) => {
    if (!client) return;
    
    try {
      await toggleClientBlock(clientPhone, !client.is_blocked, reason);
      setClient(prev => prev ? { ...prev, is_blocked: !prev.is_blocked } : null);
      toast.success(`Client ${client.is_blocked ? 'unblocked' : 'blocked'}`);
    } catch (error) {
      console.error('Error toggling block status:', error);
      toast.error('Failed to update block status');
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }
  
  return (
    <div className="flex h-full bg-gray-100">
      {/* Messages section */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              {client?.name || clientPhone}
            </h2>
            <p className="text-gray-500 text-sm">{clientPhone}</p>
          </div>
          <div>
            <button 
              className={`px-4 py-2 rounded-md font-medium ${
                client?.is_blocked 
                  ? 'bg-red-100 text-red-800 hover:bg-red-200' 
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
              onClick={() => handleToggleBlock()}
            >
              {client?.is_blocked ? 'Unblock' : 'Block'}
            </button>
          </div>
        </div>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 my-8">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map(message => (
              <MessageBubble 
                key={message.id}
                message={message}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Message input */}
        <div className="bg-white border-t px-6 py-4">
          {client?.is_blocked ? (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">
                    This client is blocked. Unblock to send messages.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <MessageInput onSendMessage={handleSendMessage} />
          )}
        </div>
      </div>
      
      {/* Client info sidebar */}
      <div className="w-80 bg-white shadow-lg border-l">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Client Information</h3>
          
          {client ? (
            <ClientInfo 
              client={client}
              onUpdateNotes={handleUpdateClientNotes}
              onToggleBlock={handleToggleBlock}
            />
          ) : (
            <div className="text-gray-500">No client information available</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationView;