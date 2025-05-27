import axios from './index';
import type { SubscriptionPlan, Subscription, Invoice, UsageRecord, UsageSummary } from '../types';
import axiosBase from './index';

// Get available subscription plans
export const getSubscriptionPlans = async () => {
  const response = await axios.get(`${axiosBase}/api/subscriptions/plans`);
  return response.data as SubscriptionPlan[];
};

// Get current subscription
export const getCurrentSubscription = async () => {
  const response = await axios.get(`${axiosBase}/api/subscriptions/current`);
  return response.data as Subscription;
};

// Create checkout session for subscription
export const createCheckoutSession = async (planId: number) => {
  const response = await axios.post(`${axiosBase}/api/subscriptions/checkout`, { plan_id: planId });
  return response.data;
};

// Cancel subscription
export const cancelSubscription = async (reason?: string) => {
  const response = await axios.post(`${axiosBase}/api/subscriptions/cancel`, { reason });
  return response.data;
};

// Update subscription
export const updateSubscription = async (planId: number) => {
  const response = await axios.post(`${axiosBase}/api/subscriptions/update`, { plan_id: planId });
  return response.data;
};

// Get invoices
export const getInvoices = async () => {
  const response = await axios.get(`${axiosBase}/api/invoices`);
  return response.data as Invoice[];
};

// Get invoice by ID
export const getInvoice = async (invoiceId: number) => {
  const response = await axios.get(`${axiosBase}/api/invoices/${invoiceId}`);
  return response.data as Invoice;
};

// Get usage records
export const getUsageRecords = async (startDate?: string, endDate?: string) => {
  let url = `${axiosBase}/api/usage/records`;
  if (startDate && endDate) {
    url += `?start=${startDate}&end=${endDate}`;
  }
  const response = await axios.get(url);
  return response.data as UsageRecord[];
};

// Get usage summary
export const getUsageSummary = async () => {
  const response = await axios.get(`${axiosBase}summary`);
  return response.data as UsageSummary;
};

// Add payment method
export const addPaymentMethod = async (paymentMethodId: string) => {
  const response = await axios.post(`${axiosBase}/api/payment_methods`, { payment_method_id: paymentMethodId });
  return response.data;
};

// Get payment methods
export const getPaymentMethods = async () => {
  const response = await axios.get(`${axiosBase}/api/payment_methods`);
  return response.data;
};

// Delete payment method
export const deletePaymentMethod = async (paymentMethodId: string) => {
  const response = await axios.delete(`${axiosBase}/api/payment_methods/${paymentMethodId}`);
  return response.data;
};

// Set default payment method
export const setDefaultPaymentMethod = async (paymentMethodId: string) => {
  const response = await axios.post(`${axiosBase}/api/payment_methods/${paymentMethodId}/default`);
  return response.data;
};