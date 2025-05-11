export interface Message {
  id: number;
  profile_id: number;
  sender_number: string;
  content: string;
  is_incoming: boolean;
  ai_generated: boolean;
  is_read: boolean;
  is_flagged?: boolean;
  twilio_sid?: string;
  send_status?: string;
  send_error?: string;
  timestamp: string;
}

export interface ConversationSummary {
  phone_number: string;
  client_name?: string;
  message_count: number;
  unread_count: number;
  last_message_time: string;
  is_blocked: boolean;
}