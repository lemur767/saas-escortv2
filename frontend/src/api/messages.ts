import axios from './index';
import type { Message, ConversationSummary } from '../types';

// Get messages between a profile and a client
export const getMessages = async (profileId: number, clientPhone: string) => {
  const response = await axios.get(`/api/profiles/${profileId}/messages/${clientPhone}`);
  return response.data as Message[];
};

// Send a message
export const sendMessage = async (profileId: number, recipient: string, message: string) => {
  const response = await axios.post('/api/messages/send', {
    profile_id: profileId,
    recipient,
    message
  });
  return response.data as Message;
};

// Mark messages as read
export const markMessagesAsRead = async (profileId: number, senderNumber: string) => {
  const response = await axios.post('/api/messages/read', {
    profile_id: profileId,
    sender_number: senderNumber
  });
  return response.data;
};

// Get conversations for a profile
export const getConversations = async (profileId: number) => {
  const response = await axios.get(`/api/profiles/${profileId}/conversations`);
  return response.data as ConversationSummary[];
};

// Get flagged messages for a profile
export const getFlaggedMessages = async (profileId: number) => {
  const response = await axios.get(`/api/profiles/${profileId}/flagged_messages`);
  return response.data as Message[];
};

// Review flagged message
export const reviewFlaggedMessage = async (messageId: number, reviewData: { is_approved: boolean; notes?: string }) => {
  const response = await axios.post(`/api/messages/${messageId}/review`, reviewData);
  return response.data;
};

// Get message stats for a profile
export const getMessageStats = async (profileId: number, period: 'day' | 'week' | 'month' = 'week') => {
  const response = await axios.get(`/api/profiles/${profileId}/message_stats?period=${period}`);
  return response.data;
};

// Export conversation history
export const exportConversation = async (profileId: number, clientPhone: string, format: 'csv' | 'json' = 'csv') => {
  const response = await axios.get(
    `/api/profiles/${profileId}/export_conversation/${clientPhone}?format=${format}`,
    { responseType: 'blob' }
  );
  
  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `conversation_${clientPhone}_${new Date().toISOString().slice(0, 10)}.${format}`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  
  return true;
};