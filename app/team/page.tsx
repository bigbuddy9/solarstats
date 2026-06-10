import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Nav from '@/components/Nav'
import TeamManager from '@/components/TeamManager'
import type { Settings, Profile } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default async function TeamPage() {
  const supabase = createServerComponentClient({ cookies })

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const [{ data: settings }, { data: profile }, { data: profiles }] = await Promise.all([
    supabase.from('settings').select('*').single(),
    supabase.from('profiles').select('*').eq('id', session.user.id).single(),
    supabase.from('profiles').select('*').order('name'),
  ])

  // Only owners can access this page
  if ((profile as Profile | null)?.role !== 'owner') redirect('/dashboard')

  return (
    <div className="min-h-screen bg-black">
      <Nav settings={settings as Settings | null} profile={profile as Profile | null} />
      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white">Team</h1>
          <p className="text-gray-500 mt-2">Manage rep and admin accounts.</p>
        </div>
        <TeamManager profiles={(profiles ?? []) as Profile[]} />
      </main>
    </div>
  )
}
