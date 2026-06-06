import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Nav from '@/components/Nav'
import StatsCard from '@/components/StatsCard'
import Charts from '@/components/Charts'
import CallsTable from '@/components/CallsTable'
import type { Call, Settings } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

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

export default async function DashboardPage() {
  const supabase = createServerComponentClient({ cookies })

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const [{ data: calls }, { data: settings }] = await Promise.all([
    supabase.from('calls').select('*').order('call_date', { ascending: false }),
    supabase.from('settings').select('*').single(),
  ])

  const stats = computeStats((calls ?? []) as Call[])

  return (
    <div className="min-h-screen bg-gray-950">
      <Nav settings={settings as Settings | null} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Dashboard</h2>
          <p className="text-gray-400 text-sm mt-1">Your call performance at a glance</p>
        </div>

        {/* Stats row */}
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

        {/* Charts */}
        <div className="mb-8">
          <Charts calls={(calls ?? []) as Call[]} />
        </div>

        {/* Calls table */}
        <CallsTable calls={(calls ?? []) as Call[]} />
      </main>
    </div>
  )
}
