'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import CallForm from '@/components/CallForm'

interface PinGateProps {
  businessName: string
}

export default function PinGate({ businessName }: PinGateProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [checking, setChecking] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setChecking(true)

    const { data: settings } = await supabase.from('settings').select('team_pin').single()

    if (!settings?.team_pin || pin === settings.team_pin) {
      setUnlocked(true)
    } else {
      setError('Incorrect PIN. Try again.')
      setPin('')
    }
    setChecking(false)
  }

  if (unlocked) {
    return <CallForm />
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-xs text-center">
        <div className="w-12 h-12 rounded-2xl bg-brand flex items-center justify-center mx-auto mb-6">
          <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <h2 className="text-white font-bold text-xl mb-1">{businessName}</h2>
        <p className="text-gray-500 text-sm mb-8">Enter your team PIN to continue</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={pin}
            onChange={e => setPin(e.target.value)}
            maxLength={6}
            placeholder="••••"
            autoFocus
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white text-center text-2xl tracking-[0.5em] placeholder-gray-700 focus:border-brand transition-colors"
          />

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={pin.length < 4 || checking}
            className="w-full bg-brand text-black font-bold py-3.5 rounded-xl hover:opacity-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed text-sm tracking-wide uppercase"
          >
            {checking ? 'Checking…' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  )
}
