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
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Minimal header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center">
            <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </div>
          <span className="font-bold text-white text-base">{s?.business_name ?? 'Scale Solar'}</span>
        </div>
        <a
          href="/login"
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          Dashboard →
        </a>
      </header>

      {/* Form */}
      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">Log a Call</h1>
            <p className="text-gray-400 text-sm mt-1">Fill this out after every call — takes 60 seconds.</p>
          </div>
          <CallForm />
        </div>
      </main>
    </div>
  )
}
