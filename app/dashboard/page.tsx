import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Nav from '@/components/Nav'
import DashboardClient from '@/components/DashboardClient'
import type { Call, Settings, Profile, Goal } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = createServerComponentClient({ cookies })

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const [{ data: settings }, { data: profile }, { data: calls }, { data: allProfiles }, { data: goals }] = await Promise.all([
    supabase.from('settings').select('*').single(),
    supabase.from('profiles').select('*').eq('id', session.user.id).single(),
    supabase.from('calls').select('*').order('appointment_date', { ascending: false }),
    supabase.from('profiles').select('*'),
    supabase.from('goals').select('*'),
  ])

  return (
    <div className="min-h-screen bg-black">
      <Nav settings={settings as Settings | null} profile={profile as Profile | null} />
      <DashboardClient
        initialCalls={(calls ?? []) as Call[]}
        settings={settings as Settings | null}
        profile={profile as Profile | null}
        allProfiles={(allProfiles ?? []) as Profile[]}
        goals={(goals ?? []) as Goal[]}
      />
    </div>
  )
}
