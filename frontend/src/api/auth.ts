import axios from './index';
import type { LoginCredentials, RegisterData, User } from '../types';


// Login user
export const loginUser = async (credentials: LoginCredentials) => {
  const response = await axios.post('http://172.236.115.212:5000/api/auth/login', credentials);
  return response.data;
};

// Register user
export const registerUser = async (data: RegisterData) => {
  const response = await axios.post('http://172.236.115.212:5000/api/auth/register', data);
  return response.data;
};

// Get current user
export const getCurrentUser = async () => {
  const response = await axios.get('http://172.236.115.212:5000/api/auth/me');
  return response.data as User;
};

// Update user profile
export const updateUserProfile = async (data: Partial<User>) => {
  const response = await axios.put('http://172.236.115.212:5000/api/auth/profile', data);
  return response.data as User;
};

// Change password
export const changePassword = async (data: { current_password: string; new_password: string; confirm_password: string }) => {
  const response = await axios.post('http://172.236.115.212:5000/api/auth/change-password', data);
  return response.data;
};

// Request password reset
export const requestPasswordReset = async (email: string) => {
  const response = await axios.post('http://172.236.115.212:5000/api/auth/forgot-password', { email });
  return response.data;
};

// Reset password with token
export const resetPassword = async (token: string, password: string, confirm_password: string) => {
  const response = await axios.post('http://172.236.115.212:5000/api/auth/reset-password', { token, password, confirm_password });
  return response.data;
};