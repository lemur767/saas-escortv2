export interface Profile {
  id: number;
  user_id: number;
  name: string;
  phone_number: string;
  description?: string;
  timezone?: string;
  is_active: boolean;
  ai_enabled: boolean;
  business_hours?: BusinessHours;
  daily_auto_response_limit: number;
  twilio_sid?: string;
  unread_messages: number;
  last_message_time?: string;
  created_at: string;
  updated_at: string;
}

export interface BusinessHours {
  monday?: DayHours;
  tuesday?: DayHours;
  wednesday?: DayHours;
  thursday?: DayHours;
  friday?: DayHours;
  saturday?: DayHours;
  sunday?: DayHours;
}

export interface DayHours {
  start: string;
  end: string;
}

export interface AutoReply {
  id: number;
  profile_id: number;
  keyword: string;
  response: string;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface TextExample {
  id: number;
  profile_id: number;
  content: string;
  is_incoming: boolean;
  timestamp: string;
}

export interface AIModelSettings {
  id: number;
  profile_id: number;
  model_version: string;
  temperature: number;
  response_length: number;
  style_notes?: string;
  custom_instructions?: string;
}