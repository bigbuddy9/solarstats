import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import PinGate from '@/components/PinGate'
import type { Settings } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default async function LogCallPage() {
  const supabase = createServerComponentClient({ cookies })
  const { data: settings } = await supabase.from('settings').select('*').single()
  const s = settings as Settings | null

  return (
    <div className="min-h-screen bg-black">
      <div className="border-b border-white/5 px-6 py-4 flex items-center justify-between max-w-2xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="h-2 w-2 rounded-full bg-brand" />
          <span className="text-sm font-semibold text-white tracking-wide uppercase">
            {s?.business_name ?? 'Scale Solar'}
          </span>
        </div>
        <a href="/login" className="text-xs font-semibold bg-white/10 hover:bg-white/15 text-gray-300 hover:text-white px-4 py-2 rounded-lg transition-all border border-white/10">
          Dashboard →
        </a>
      </div>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <PinGate businessName={s?.business_name ?? 'Scale Solar'} />
      </main>
    </div>
  )
}
