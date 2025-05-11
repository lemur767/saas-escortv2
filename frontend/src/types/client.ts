export interface Client {
  id?: number;
  phone_number: string;
  name?: string;
  email?: string;
  notes?: string;
  is_blocked: boolean;
  blacklist_reason?: string;
  is_regular: boolean;
  last_contact_date?: string;
}