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
  const showed = calls.filter(c => !['no-show', 'cancelled'].includes(c.outcome)).length
  const qualified = calls.filter(c => ['qualified', 'booked', 'closed'].includes(c.outcome)).length
  const closed = calls.filter(c => c.outcome === 'closed').length

  const showRate = total > 0 ? Math.round((showed / total) * 100) : 0
  const qualifiedRate = showed > 0 ? Math.round((qualified / showed) * 100) : 0
  const closeRate = showed > 0 ? Math.round((closed / showed) * 100) : 0

  const revenueMap: Record<string, number> = {
    '$0 - $5k': 2500,
    '$5k - $10k': 7500,
    '$10k - $25k': 17500,
    '$25k - $50k': 37500,
    '$50k - $100k': 75000,
    '$100k+': 100000,
  }

  const totalRevenue = calls
    .filter(c => c.outcome === 'closed')
    .reduce((sum, c) => sum + (revenueMap[c.monthly_revenue] ?? 0), 0)

  return { total, showRate, qualifiedRate, closeRate, totalRevenue }
}

interface DashboardClientProps {
  initialCalls: Call[]
  settings: Settings | null
}

export default function DashboardClient({ initialCalls, settings }: DashboardClientProps) {
  const supabase = createClientComponentClient()
  const [calls, setCalls] = useState<Call[]>(initialCalls)

  useEffect(() => {
    // Subscribe to real-time inserts/updates/deletes on the calls table
    const channel = supabase
      .channel('calls-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calls' },
        async () => {
          // Re-fetch the full list on any change
          const { data } = await supabase
            .from('calls')
            .select('*')
            .order('call_date', { ascending: false })
          if (data) setCalls(data as Call[])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const stats = computeStats(calls)

  return (
    <div className="min-h-screen bg-gray-950">
      <Nav settings={settings} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Dashboard</h2>
            <p className="text-gray-400 text-sm mt-1">Updates automatically as calls are logged</p>
          </div>
          <LiveDot />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatsCard label="Total Calls" value={stats.total.toString()} />
          <StatsCard label="Show Rate" value={`${stats.showRate}%`} />
          <StatsCard label="Qualified Rate" value={`${stats.qualifiedRate}%`} />
          <StatsCard label="Close Rate" value={`${stats.closeRate}%`} />
          <StatsCard
            label="Pipeline Revenue"
            value={`$${stats.totalRevenue.toLocaleString()}`}
            wide
          />
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
    <div className="flex items-center gap-2 text-xs text-gray-400">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
      </span>
      Live
    </div>
  )
}
