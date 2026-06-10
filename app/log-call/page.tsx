import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import CallForm from '@/components/CallForm'
import Nav from '@/components/Nav'
import type { Settings, Profile } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default async function LogCallPage() {
  const supabase = createServerComponentClient({ cookies })

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const [{ data: settings }, { data: profile }] = await Promise.all([
    supabase.from('settings').select('*').single(),
    supabase.from('profiles').select('*').eq('id', session.user.id).single(),
  ])

  return (
    <div className="min-h-screen bg-black">
      <Nav settings={settings as Settings | null} profile={profile as Profile | null} />
      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white">Post-Call Log</h1>
          <p className="text-gray-500 mt-2">Fill this out immediately after every appointment.</p>
        </div>
        <CallForm
          userId={session.user.id}
          repName={(profile as Profile | null)?.name ?? ''}
        />
      </main>
    </div>
  )
}
