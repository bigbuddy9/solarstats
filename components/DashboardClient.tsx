'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import StatsCard from '@/components/StatsCard'
import Charts from '@/components/Charts'
import CallsTable from '@/components/CallsTable'
import type { Call, Settings, Profile } from '@/lib/supabase'

type Period = 'today' | 'week' | 'month' | 'year' | 'all'

function startOf(period: Period): Date | null {
  const now = new Date()
  if (period === 'today') { const d = new Date(now); d.setHours(0, 0, 0, 0); return d }
  if (period === 'week') { const d = new Date(now); d.setDate(now.getDate() - 7); return d }
  if (period === 'month') { const d = new Date(now); d.setMonth(now.getMonth() - 1); return d }
  if (period === 'year') { const d = new Date(now); d.setFullYear(now.getFullYear() - 1); return d }
  return null
}

function computeStats(calls: Call[]) {
  const confirmedBookings = calls.length
  const meetingsSat = calls.filter(c => c.outcome !== 'no-show').length
  const closes = calls.filter(c => c.outcome === 'closed')
  const sameWeekSales = closes.filter(c => c.sale_type === 'same-week').length
  const followUpSales = closes.filter(c => c.sale_type === 'follow-up').length
  const totalSales = closes.length

  const satRate = confirmedBookings > 0 ? Math.round((meetingsSat / confirmedBookings) * 100) : 0
  const closeRate = meetingsSat > 0 ? Math.round((totalSales / meetingsSat) * 100) : 0

  const totalRevenue = closes.reduce((sum, c) => sum + (parseFloat(c.deal_value) || 0), 0)
  const cashSales = closes.filter(c => c.payment_type === 'cash').length
  const financeSales = closes.filter(c => c.payment_type === 'finance').length
  const cashPct = totalSales > 0 ? Math.round((cashSales / totalSales) * 100) : 0

  const totalSolarKw = closes.reduce((sum, c) => sum + (parseFloat(c.system_size) || 0), 0)
  const avgSolarKw = totalSales > 0 ? totalSolarKw / totalSales : 0
  const totalBatteryKw = closes.reduce((sum, c) => sum + (parseFloat(c.battery_size) || 0), 0)
  const avgBatteryKw = totalSales > 0 ? totalBatteryKw / totalSales : 0

  return {
    confirmedBookings, meetingsSat, satRate, closeRate,
    sameWeekSales, followUpSales, totalSales,
    totalSolarKw, avgSolarKw, totalBatteryKw, avgBatteryKw,
    totalRevenue, cashSales, financeSales, cashPct,
  }
}

interface Props {
  initialCalls: Call[]
  settings: Settings | null
  profile: Profile | null
  allProfiles: Profile[]
}

export default function DashboardClient({ initialCalls, settings, profile, allProfiles }: Props) {
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
    { value: 'today', label: 'Today' },
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
            {isOwner ? `${settings?.business_name ?? 'Team'} Dashboard` : `${settings?.business_name ?? 'My'} Stats`}
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
      <div className="space-y-6 mb-10">
        {/* Sales */}
        <div>
          <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-widest mb-3">Sales</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatsCard label="One Call Closes" value={stats.sameWeekSales.toString()} accent="yellow" />
            <StatsCard label="Follow Up Sales" value={stats.followUpSales.toString()} accent="yellow" />
            <StatsCard label="Total Sales" value={stats.totalSales.toString()} accent="yellow" />
            <StatsCard label="Revenue" value={stats.totalRevenue > 0 ? `$${stats.totalRevenue.toLocaleString()}` : '$0'} accent="green" />
          </div>
        </div>

        {/* System */}
        <div>
          <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-widest mb-3">System</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatsCard label="Total Solar kW" value={stats.totalSolarKw > 0 ? stats.totalSolarKw.toFixed(2) : '—'} />
            <StatsCard label="Avg Solar kW" value={stats.avgSolarKw > 0 ? stats.avgSolarKw.toFixed(2) : '—'} />
            <StatsCard label="Total Battery kW" value={stats.totalBatteryKw > 0 ? stats.totalBatteryKw.toFixed(1) : '—'} />
            <StatsCard label="Avg Battery kW" value={stats.avgBatteryKw > 0 ? stats.avgBatteryKw.toFixed(1) : '—'} />
          </div>
        </div>

        {/* Activity */}
        <div>
          <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-widest mb-3">Activity</p>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <StatsCard label="Sat Rate" value={`${stats.satRate}%`} />
            <StatsCard label="Close Rate" value={`${stats.closeRate}%`} />
            <StatsCard label="Confirmed Bookings" value={stats.confirmedBookings.toString()} />
            <StatsCard label="Meetings Sat" value={stats.meetingsSat.toString()} />
            <StatsCard label="Cash" value={stats.cashSales.toString()} sub={`${stats.cashPct}% of sales`} />
            <StatsCard label="Finance" value={stats.financeSales.toString()} sub={`${100 - stats.cashPct}% of sales`} />
          </div>
        </div>
      </div>

      {/* Owner: rep leaderboard */}
      {isOwner && selectedRep === 'all' && reps.length > 1 && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 mb-8">
          <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-5">Leaderboard</h3>
          <div className="space-y-2">
            {reps.map(rep => {
              const repCalls = filtered.filter(c => c.user_id === rep.id)
              const repStats = computeStats(repCalls)
              return (
                <div key={rep.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <span className="text-white text-sm font-medium">{rep.name}</span>
                  <div className="flex items-center gap-6 text-xs text-gray-400">
                    <span>{repStats.confirmedBookings} bookings</span>
                    <span>{repStats.satRate}% sat</span>
                    <span>{repStats.totalSales} sales ({repStats.followUpSales} FU)</span>
                    <span>{repStats.closeRate}% close</span>
                    <span>{repStats.totalSolarKw > 0 ? `${repStats.totalSolarKw.toFixed(1)} kW` : '—'}</span>
                    <span className="text-green-400">${repStats.totalRevenue.toLocaleString()}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="mb-8"><Charts calls={filtered} /></div>
      <CallsTable calls={filtered} isOwner={isOwner} onDelete={id => setCalls(prev => prev.filter(c => c.id !== id))} />
    </main>
  )
}
