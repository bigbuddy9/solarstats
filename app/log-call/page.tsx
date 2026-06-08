import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import CallForm from '@/components/CallForm'
import type { Settings } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default async function LogCallPage() {
  const supabase = createServerComponentClient({ cookies })
  const { data: settings } = await supabase.from('settings').select('*').single()
  const s = settings as Settings | null

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-10">
      <div className="w-full max-w-xl mx-auto">

        {/* Business name */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">{s?.business_name ?? 'Scale Solar'}</h1>
          <p className="text-gray-400 text-sm mt-1">Fill this out as soon as you finish a call.</p>
        </div>

        <CallForm />

        {/* Login link — subtle, out of the way */}
        <div className="mt-6 text-center">
          <a
            href="/login"
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            Login to view dashboard
          </a>
        </div>

      </div>
    </div>
  )
}
