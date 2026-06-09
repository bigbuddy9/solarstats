import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type CallOutcome = 'no-show' | 'disqualified' | 'no-sale' | 'follow-up' | 'closed'
export type DisqualifiedReason = 'bill-too-low' | 'roof-issue' | 'credit-financing' | ''

export interface Call {
  id: string
  created_at: string
  rep_name: string
  homeowner_first_name: string
  homeowner_last_name: string
  address: string
  phone: string
  email: string
  appointment_date: string
  outcome: CallOutcome
  disqualified_reason: DisqualifiedReason
  no_sale_reason: string
  follow_up_reason: string
  system_size: string
  deal_value: string
}

export interface Settings {
  id: string
  business_name: string
  logo_url: string
  brand_color: string
  subdomain: string
}
