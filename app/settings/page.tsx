import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Nav from '@/components/Nav'
import SettingsClient from '@/components/SettingsClient'
import type { Settings, Profile } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = createServerComponentClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const [{ data: profile }, { data: settings }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', session.user.id).single(),
    supabase.from('settings').select('*').single(),
  ])

  if (profile?.role !== 'owner') redirect('/dashboard')

  return (
    <div className="min-h-screen bg-black">
      <Nav settings={settings as Settings | null} profile={profile as Profile | null} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Settings</h2>
          <p className="text-gray-500 text-sm mt-1">Branding and team preferences</p>
        </div>
        <SettingsClient settings={settings as Settings} />
      </main>
    </div>
  )
}
