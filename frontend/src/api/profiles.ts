import axios from './index';
import type { Profile, AutoReply, TextExample, AIModelSettings } from '../types';

// Get all profiles for current user
export const getProfiles = async () => {
  const response = await axios.get('/api/profiles');
  return response.data as Profile[];
};

// Get a specific profile
export const getProfile = async (profileId: number) => {
  const response = await axios.get(`/api/profiles/${profileId}`);
  return response.data as Profile;
};

// Create a new profile
export const createProfile = async (profileData: Partial<Profile>) => {
  const response = await axios.post('/api/profiles', profileData);
  return response.data as Profile;
};

// Update a profile
export const updateProfile = async (profileId: number, profileData: Partial<Profile>) => {
  const response = await axios.put(`/api/profiles/${profileId}`, profileData);
  return response.data as Profile;
};

// Delete a profile
export const deleteProfile = async (profileId: number) => {
  const response = await axios.delete(`/api/profiles/${profileId}`);
  return response.data;
};

// Toggle AI for a profile
export const toggleAI = async (profileId: number, enabled: boolean) => {
  const response = await axios.post(`/api/profiles/${profileId}/toggle_ai`, { enabled });
  return response.data;
};

// Get auto replies for a profile
export const getAutoReplies = async (profileId: number) => {
  const response = await axios.get(`/api/profiles/${profileId}/auto_replies`);
  return response.data as AutoReply[];
};

// Create auto reply
export const createAutoReply = async (profileId: number, data: { keyword: string; response: string; priority?: number }) => {
  const response = await axios.post(`/api/profiles/${profileId}/auto_replies`, data);
  return response.data as AutoReply;
};

// Update auto reply
export const updateAutoReply = async (profileId: number, replyId: number, data: Partial<AutoReply>) => {
  const response = await axios.put(`/api/profiles/${profileId}/auto_replies/${replyId}`, data);
  return response.data as AutoReply;
};

// Delete auto reply
export const deleteAutoReply = async (profileId: number, replyId: number) => {
  const response = await axios.delete(`/api/profiles/${profileId}/auto_replies/${replyId}`);
  return response.data;
};

// Get text examples for a profile
export const getTextExamples = async (profileId: number) => {
  const response = await axios.get(`/api/profiles/${profileId}/text_examples`);
  return response.data as TextExample[];
};

// Add text example
export const addTextExample = async (profileId: number, data: { content: string; is_incoming: boolean }) => {
  const response = await axios.post(`/api/profiles/${profileId}/text_examples`, data);
  return response.data as TextExample;
};

// Delete text example
export const deleteTextExample = async (profileId: number, exampleId: number) => {
  const response = await axios.delete(`/api/profiles/${profileId}/text_examples/${exampleId}`);
  return response.data;
};

// Get AI model settings
export const getAISettings = async (profileId: number) => {
  const response = await axios.get(`/api/profiles/${profileId}/ai_settings`);
  return response.data as AIModelSettings;
};

// Update AI model settings
export const updateAISettings = async (profileId: number, data: Partial<AIModelSettings>) => {
  const response = await axios.put(`/api/profiles/${profileId}/ai_settings`, data);
  return response.data as AIModelSettings;
};

// Set business hours
export const setBusinessHours = async (profileId: number, businessHours: any) => {
  const response = await axios.post(`/api/profiles/${profileId}/business_hours`, { business_hours: businessHours });
  return response.data;
};

// Get out of office reply
export const getOutOfOfficeReply = async (profileId: number) => {
  const response = await axios.get(`/api/profiles/${profileId}/out_of_office`);
  return response.data;
};

// Update out of office reply
export const updateOutOfOfficeReply = async (profileId: number, message: string, isActive: boolean) => {
  const response = await axios.put(`/api/profiles/${profileId}/out_of_office`, { message, is_active: isActive });
  return response.data;
};