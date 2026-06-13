import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type CallOutcome = 'no-show' | 'disqualified' | 'no-sale' | 'follow-up' | 'closed'
export type UserRole = 'rep' | 'owner'

export interface Profile {
  id: string
  name: string
  role: UserRole
}

export interface Call {
  id: string
  created_at: string
  user_id: string
  rep_name: string
  homeowner_first_name: string
  homeowner_last_name: string
  address: string
  phone: string
  email: string
  appointment_date: string
  outcome: CallOutcome
  disqualified_reason: string
  no_sale_reason: string
  follow_up_reason: string
  follow_up_intent: string
  system_size: string
  battery_size: string
  deal_value: string
  sale_type: 'same-week' | 'follow-up'
  payment_type: 'cash' | 'finance'
}

export interface Settings {
  id: string
  business_name: string
  logo_url: string
  brand_color: string
  subdomain: string
  show_leaderboard_to_reps: boolean
  color_theme: string
}
