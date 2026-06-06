import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Nav from '@/components/Nav'
import CallForm from '@/components/CallForm'
import type { Settings } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default async function LogCallPage() {
  const supabase = createServerComponentClient({ cookies })

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: settings } = await supabase.from('settings').select('*').single()

  return (
    <div className="min-h-screen bg-gray-950">
      <Nav settings={settings as Settings | null} />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Log a Call</h2>
          <p className="text-gray-400 text-sm mt-1">Record the details from your latest call</p>
        </div>

        <CallForm />
      </main>
    </div>
  )
}
