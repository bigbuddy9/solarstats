import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import DashboardClient from '@/components/DashboardClient'
import type { Call, Settings } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = createServerComponentClient({ cookies })

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const [{ data: calls }, { data: settings }] = await Promise.all([
    supabase.from('calls').select('*').order('appointment_date', { ascending: false }),
    supabase.from('settings').select('*').single(),
  ])

  return (
    <DashboardClient
      initialCalls={(calls ?? []) as Call[]}
      settings={settings as Settings | null}
    />
  )
}
