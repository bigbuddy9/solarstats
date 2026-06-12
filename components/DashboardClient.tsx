'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import StatsCard from '@/components/StatsCard'
import Charts from '@/components/Charts'
import CallsTable from '@/components/CallsTable'
import type { Call, Settings, Profile } from '@/lib/supabase'

type Period = 'today' | 'week' | 'month' | 'year' | 'all'

function getWindow(period: Period, offset: number): { start: Date | null; end: Date | null; label: string } {
  if (period === 'all') return { start: null, end: null, label: 'All Time' }

  const now = new Date()

  if (period === 'today') {
    const d = new Date(now)
    d.setDate(d.getDate() - offset)
    const start = new Date(d); start.setHours(0, 0, 0, 0)
    const end   = new Date(d); end.setHours(23, 59, 59, 999)
    const label = offset === 0 ? 'Today' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return { start, end, label }
  }

  if (period === 'week') {
    const end = new Date(now)
    end.setDate(end.getDate() - offset * 7)
    end.setHours(23, 59, 59, 999)
    const start = new Date(end)
    start.setDate(end.getDate() - 6)
    start.setHours(0, 0, 0, 0)
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const label = offset === 0 ? 'This Week' : `${fmt(start)} – ${fmt(end)}`
    return { start, end, label }
  }

  if (period === 'month') {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    const start = new Date(d.getFullYear(), d.getMonth(), 1)
    const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
    const label = offset === 0 ? 'This Month' : d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    return { start, end, label }
  }

  // year
  const yr = now.getFullYear() - offset
  const start = new Date(yr, 0, 1)
  const end   = new Date(yr, 11, 31, 23, 59, 59, 999)
  const label = offset === 0 ? 'This Year' : `${yr}`
  return { start, end, label }
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
  const [offset, setOffset] = useState(0)
  const [selectedRep, setSelectedRep] = useState<string>('all')
  const isOwner = profile?.role === 'owner'

  // Reset offset when period changes
  function handlePeriodChange(p: Period) {
    setPeriod(p)
    setOffset(0)
  }

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

  const { start, end, label: periodLabel } = useMemo(() => getWindow(period, offset), [period, offset])

  const filtered = useMemo(() => {
    let rows = calls

    if (!isOwner) {
      rows = rows.filter(c => c.user_id === profile?.id)
    } else if (selectedRep !== 'all') {
      rows = rows.filter(c => c.user_id === selectedRep)
    }

    if (start) rows = rows.filter(c => new Date(c.appointment_date) >= start)
    if (end)   rows = rows.filter(c => new Date(c.appointment_date) <= end)

    return rows
  }, [calls, period, offset, selectedRep, isOwner, profile, start, end])

  const stats = computeStats(filtered)
  const reps = allProfiles.filter(p => p.role === 'rep')

  const PERIODS: { value: Period; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'week',  label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'year',  label: 'Year' },
    { value: 'all',   label: 'All Time' },
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

          {/* Period selector + navigation */}
          <div className="flex items-center gap-2">
            <div className="flex bg-white/5 border border-white/10 rounded-lg p-1 gap-1">
              {PERIODS.map(p => (
                <button
                  key={p.value}
                  onClick={() => handlePeriodChange(p.value)}
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

            {/* Prev / label / next — hidden for All Time */}
            {period !== 'all' && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setOffset(o => o + 1)}
                  className="h-7 w-7 flex items-center justify-center rounded-md bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-colors text-sm"
                >
                  ‹
                </button>
                <span className="text-xs text-gray-400 min-w-[90px] text-center">{periodLabel}</span>
                <button
                  onClick={() => setOffset(o => Math.max(0, o - 1))}
                  disabled={offset === 0}
                  className="h-7 w-7 flex items-center justify-center rounded-md bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-colors text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ›
                </button>
              </div>
            )}
          </div>

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
        <div>
          <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-widest mb-3">Sales</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatsCard label="One Call Closes" value={stats.sameWeekSales.toString()} accent="yellow" />
            <StatsCard label="Follow Up Sales" value={stats.followUpSales.toString()} accent="yellow" />
            <StatsCard label="Total Sales" value={stats.totalSales.toString()} accent="yellow" />
            <StatsCard label="Revenue" value={stats.totalRevenue > 0 ? `$${stats.totalRevenue.toLocaleString()}` : '$0'} accent="green" />
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-widest mb-3">System</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatsCard label="Total Solar kW" value={stats.totalSolarKw > 0 ? stats.totalSolarKw.toFixed(2) : '—'} />
            <StatsCard label="Avg Solar kW" value={stats.avgSolarKw > 0 ? stats.avgSolarKw.toFixed(2) : '—'} />
            <StatsCard label="Total Battery kW" value={stats.totalBatteryKw > 0 ? stats.totalBatteryKw.toFixed(1) : '—'} />
            <StatsCard label="Avg Battery kW" value={stats.avgBatteryKw > 0 ? stats.avgBatteryKw.toFixed(1) : '—'} />
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-widest mb-3">Activity</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <StatsCard label="Appointments" value={stats.confirmedBookings.toString()} />
            <StatsCard label="Meetings Sat" value={stats.meetingsSat.toString()} />
            <StatsCard label="Sat Rate" value={`${stats.satRate}%`} />
            <StatsCard label="Close Rate" value={`${stats.closeRate}%`} />
            <StatsCard label="Cash / Finance" value={`${stats.cashSales} / ${stats.financeSales}`} sub={`${stats.cashPct}% cash · ${100 - stats.cashPct}% finance`} />
          </div>
        </div>
      </div>

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
