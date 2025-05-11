export interface Subscription {
  id: number;
  user_id: number;
  plan_id: number;
  plan: SubscriptionPlan;
  status: 'active' | 'canceled' | 'past_due';
  stripe_subscription_id?: string;
  start_date: string;
  end_date: string;
  trial_end_date?: string;
  ai_responses_used: number;
  cancellation_date?: string;
  cancellation_reason?: string;
}

export interface SubscriptionPlan {
  id: number;
  name: string;
  price: number;
  profile_limit: number;
  ai_responses_limit: number;
  message_history_days: number;
  features: string[];
}

export interface Invoice {
  id: number;
  user_id: number;
  subscription_id: number;
  amount: number;
  status: 'paid' | 'open' | 'failed';
  invoice_date: string;
  due_date?: string;
  paid_date?: string;
  invoice_pdf_url?: string;
}

export interface UsageRecord {
  date: string;
  ai_responses_count: number;
  messages_sent_count: number;
  messages_received_count: number;
}

export interface UsageSummary {
  ai_responses_used: number;
  ai_responses_limit: number;
  percentage_used: number;
  days_remaining: number;
}