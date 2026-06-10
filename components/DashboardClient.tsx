'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import StatsCard from '@/components/StatsCard'
import Charts from '@/components/Charts'
import CallsTable from '@/components/CallsTable'
import type { Call, Settings, Profile } from '@/lib/supabase'

type Period = 'week' | 'month' | 'year' | 'all'

function startOf(period: Period): Date | null {
  const now = new Date()
  if (period === 'week') { const d = new Date(now); d.setDate(now.getDate() - 7); return d }
  if (period === 'month') { const d = new Date(now); d.setMonth(now.getMonth() - 1); return d }
  if (period === 'year') { const d = new Date(now); d.setFullYear(now.getFullYear() - 1); return d }
  return null
}

function computeStats(calls: Call[]) {
  const total = calls.length
  const showed = calls.filter(c => c.outcome !== 'no-show').length
  const closed = calls.filter(c => c.outcome === 'closed').length
  const pipeline = calls.filter(c => c.outcome === 'follow-up').length
  const showRate = total > 0 ? Math.round((showed / total) * 100) : 0
  const closeRate = showed > 0 ? Math.round((closed / showed) * 100) : 0

  const dealMap: Record<string, number> = {
    'Under $20k': 15000, '$20k–$30k': 25000, '$30k–$40k': 35000,
    '$40k–$50k': 45000, '$50k–$60k': 55000, '$60k+': 65000,
  }
  const totalRevenue = calls
    .filter(c => c.outcome === 'closed')
    .reduce((sum, c) => sum + (dealMap[c.deal_value] ?? 0), 0)

  return { total, showRate, closeRate, closed, pipeline, totalRevenue }
}

interface Props {
  initialCalls: Call[]
  settings: Settings | null
  profile: Profile | null
  allProfiles: Profile[]
}

export default function DashboardClient({ initialCalls, profile, allProfiles }: Props) {
  const supabase = createClientComponentClient()
  const [calls, setCalls] = useState<Call[]>(initialCalls)
  const [period, setPeriod] = useState<Period>('month')
  const [selectedRep, setSelectedRep] = useState<string>('all')
  const isOwner = profile?.role === 'owner'

  useEffect(() => {
    const channel = supabase
      .channel('calls-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, async () => {
        const { data } = await supabase.from('calls').select('*').order('appointment_date', { ascending: false })
        if (data) setCalls(data as Call[])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  const filtered = useMemo(() => {
    let rows = calls

    // Reps only see their own
    if (!isOwner) {
      rows = rows.filter(c => c.user_id === profile?.id)
    } else if (selectedRep !== 'all') {
      rows = rows.filter(c => c.user_id === selectedRep)
    }

    // Time filter
    const start = startOf(period)
    if (start) rows = rows.filter(c => new Date(c.appointment_date) >= start)

    return rows
  }, [calls, period, selectedRep, isOwner, profile])

  const stats = computeStats(filtered)
  const reps = allProfiles.filter(p => p.role === 'rep')

  const PERIODS: { value: Period; label: string }[] = [
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' },
    { value: 'all', label: 'All Time' },
  ]

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">
            {isOwner ? 'Team Dashboard' : 'My Stats'}
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            {isOwner ? 'Full team performance' : `Stats for ${profile?.name}`}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Owner: rep filter */}
          {isOwner && (
            <select
              value={selectedRep}
              onChange={e => setSelectedRep(e.target.value)}
              className="bg-white/5 border border-white/10 text-gray-300 text-sm rounded-lg px-3 py-2 focus:border-brand"
            >
              <option value="all">All Reps</option>
              {reps.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          )}

          {/* Period filter */}
          <div className="flex bg-white/5 border border-white/10 rounded-lg p-1 gap-1">
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  period === p.value
                    ? 'bg-brand text-black'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Live dot */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-400" />
            </span>
            Live
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        <StatsCard label="Appointments" value={stats.total.toString()} />
        <StatsCard label="Show Rate" value={`${stats.showRate}%`} />
        <StatsCard label="Close Rate" value={`${stats.closeRate}%`} />
        <StatsCard label="Closed" value={stats.closed.toString()} />
        <StatsCard label="Pipeline" value={stats.pipeline.toString()} />
        <StatsCard label="Revenue" value={`$${stats.totalRevenue.toLocaleString()}`} wide />
      </div>

      {/* Owner: rep leaderboard */}
      {isOwner && selectedRep === 'all' && reps.length > 1 && (
        <div className="bg-gray-950 border border-white/5 rounded-xl p-5 mb-8">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Rep Leaderboard</h3>
          <div className="space-y-2">
            {reps.map(rep => {
              const repCalls = filtered.filter(c => c.user_id === rep.id)
              const repStats = computeStats(repCalls)
              return (
                <div key={rep.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <span className="text-white text-sm font-medium">{rep.name}</span>
                  <div className="flex items-center gap-6 text-xs text-gray-400">
                    <span>{repStats.total} appts</span>
                    <span>{repStats.closeRate}% close</span>
                    <span>{repStats.closed} closed</span>
                    <span className="text-green-400">${repStats.totalRevenue.toLocaleString()}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="mb-8"><Charts calls={filtered} /></div>
      <CallsTable calls={filtered} />
    </main>
  )
}
