import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type CallOutcome =
  | 'qualified'
  | 'disqualified'
  | 'no-show'
  | 'cancelled'
  | 'booked'
  | 'closed'

export interface Call {
  id: string
  created_at: string
  caller_name: string
  caller_phone: string
  call_date: string
  outcome: CallOutcome
  monthly_revenue: string
  close_rate: string
  monthly_bookings: string
  notes: string
}

export interface Settings {
  id: string
  business_name: string
  logo_url: string
  brand_color: string
  subdomain: string
}
