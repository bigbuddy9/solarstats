'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Nav from '@/components/Nav'
import StatsCard from '@/components/StatsCard'
import Charts from '@/components/Charts'
import CallsTable from '@/components/CallsTable'
import type { Call, Settings } from '@/lib/supabase'

function computeStats(calls: Call[]) {
  const total = calls.length
  const showed = calls.filter(c => c.outcome !== 'no-show').length
  const closed = calls.filter(c => c.outcome === 'closed').length
  const pipeline = calls.filter(c => c.outcome === 'follow-up-booked').length

  const showRate = total > 0 ? Math.round((showed / total) * 100) : 0
  const closeRate = showed > 0 ? Math.round((closed / showed) * 100) : 0

  const dealMap: Record<string, number> = {
    'Under $20k': 15000,
    '$20k–$30k': 25000,
    '$30k–$40k': 35000,
    '$40k–$50k': 45000,
    '$50k–$60k': 55000,
    '$60k+': 65000,
  }

  const totalRevenue = calls
    .filter(c => c.outcome === 'closed')
    .reduce((sum, c) => sum + (dealMap[c.deal_value] ?? 0), 0)

  return { total, showRate, closeRate, closed, pipeline, totalRevenue }
}

interface DashboardClientProps {
  initialCalls: Call[]
  settings: Settings | null
}

export default function DashboardClient({ initialCalls, settings }: DashboardClientProps) {
  const supabase = createClientComponentClient()
  const [calls, setCalls] = useState<Call[]>(initialCalls)

  useEffect(() => {
    const channel = supabase
      .channel('calls-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, async () => {
        const { data } = await supabase
          .from('calls')
          .select('*')
          .order('appointment_date', { ascending: false })
        if (data) setCalls(data as Call[])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  const stats = computeStats(calls)

  return (
    <div className="min-h-screen bg-black">
      <Nav settings={settings} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Dashboard</h2>
            <p className="text-gray-500 text-sm mt-1">Updates automatically as calls are logged</p>
          </div>
          <LiveDot />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <StatsCard label="Total Appointments" value={stats.total.toString()} />
          <StatsCard label="Show Rate" value={`${stats.showRate}%`} />
          <StatsCard label="Close Rate" value={`${stats.closeRate}%`} />
          <StatsCard label="Closed" value={stats.closed.toString()} />
          <StatsCard label="Pipeline" value={stats.pipeline.toString()} />
          <StatsCard label="Total Revenue" value={`$${stats.totalRevenue.toLocaleString()}`} wide />
        </div>

        <div className="mb-8">
          <Charts calls={calls} />
        </div>

        <CallsTable calls={calls} />
      </main>
    </div>
  )
}

function LiveDot() {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-400" />
      </span>
      Live
    </div>
  )
}
