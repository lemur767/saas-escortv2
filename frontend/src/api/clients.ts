import axios from './index';
import type { Client } from '../types';

// Get client information
export const getClient = async (phoneNumber: string) => {
  const response = await axios.get(`/api/clients/${phoneNumber}`);
  return response.data as Client;
};

// Update client information
export const updateClient = async (phoneNumber: string, data: Partial<Client>) => {
  const response = await axios.put(`/api/clients/${phoneNumber}`, data);
  return response.data as Client;
};

// Toggle client block status
export const toggleClientBlock = async (phoneNumber: string, isBlocked: boolean, reason?: string) => {
  const response = await axios.post(`/api/clients/${phoneNumber}/toggle_block`, {
    is_blocked: isBlocked,
    reason
  });
  return response.data;
};

// Get all clients
export const getAllClients = async () => {
  const response = await axios.get('/api/clients');
  return response.data as Client[];
};

// Search clients
export const searchClients = async (query: string) => {
  const response = await axios.get(`/api/clients/search?q=${encodeURIComponent(query)}`);
  return response.data as Client[];
};

// Get blocked clients
export const getBlockedClients = async () => {
  const response = await axios.get('/api/clients/blocked');
  return response.data as Client[];
};

// Get regular clients
export const getRegularClients = async () => {
  const response = await axios.get('/api/clients/regular');
  return response.data as Client[];
};

// Mark client as regular
export const markClientAsRegular = async (phoneNumber: string, isRegular: boolean) => {
  const response = await axios.post(`/api/clients/${phoneNumber}/mark_regular`, {
    is_regular: isRegular
  });
  return response.data;
};  