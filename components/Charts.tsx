'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import type { Call, CallOutcome } from '@/lib/supabase'

interface ChartsProps { calls: Call[] }

function getWeekLabel(dateStr: string) {
  const date = new Date(dateStr)
  const start = new Date(date)
  start.setDate(date.getDate() - date.getDay())
  return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function buildWeeklyData(calls: Call[]) {
  const map = new Map<string, number>()
  calls.forEach(c => {
    const week = getWeekLabel(c.appointment_date)
    map.set(week, (map.get(week) ?? 0) + 1)
  })
  return Array.from(map.entries()).map(([week, count]) => ({ week, count })).slice(-8)
}

const OUTCOME_COLORS: Record<CallOutcome, string> = {
  'no-show':          '#6b7280',
  'disqualified':     '#ef4444',
  'no-sale':          '#f97316',
  'follow-up': '#eab308',
  'closed':           '#22c55e',
}

const OUTCOME_LABELS: Record<CallOutcome, string> = {
  'no-show':          'No Show',
  'disqualified':     'Disqualified',
  'no-sale':          'No Sale',
  'follow-up': 'Follow Up',
  'closed':           'Closed',
}

function buildOutcomeData(calls: Call[]) {
  const map = new Map<string, number>()
  calls.forEach(c => map.set(c.outcome, (map.get(c.outcome) ?? 0) + 1))
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
}

const tooltipStyle = {
  contentStyle: { backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 },
  labelStyle: { color: '#e5e7eb' },
  itemStyle: { color: '#e5e7eb' },
}

export default function Charts({ calls }: ChartsProps) {
  const weeklyData = buildWeeklyData(calls)
  const outcomeData = buildOutcomeData(calls)

  // Disqualification breakdown
  const disqData = calls
    .filter(c => c.outcome === 'disqualified' && c.disqualified_reason)
    .reduce((acc, c) => {
      const k = c.disqualified_reason.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      acc[k] = (acc[k] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)
  const disqChartData = Object.entries(disqData).map(([name, value]) => ({ name, value }))

  if (calls.length === 0) {
    return (
      <div className="bg-gray-950 border border-white/5 rounded-xl p-8 text-center text-gray-600">
        No appointments logged yet.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Weekly bar chart */}
      <div className="bg-gray-950 border border-white/5 rounded-xl p-5 lg:col-span-1">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Appointments / Week</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#6b7280' }} />
            <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} allowDecimals={false} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="count" fill="var(--brand-color)" radius={[4, 4, 0, 0]} name="Appointments" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Outcome pie */}
      <div className="bg-gray-950 border border-white/5 rounded-xl p-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Outcome Breakdown</h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={outcomeData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
              {outcomeData.map((entry, i) => (
                <Cell key={i} fill={OUTCOME_COLORS[entry.name as CallOutcome] ?? '#6b7280'} />
              ))}
            </Pie>
            <Legend formatter={(value) => (
              <span style={{ color: '#9ca3af', fontSize: 11 }}>{OUTCOME_LABELS[value as CallOutcome] ?? value}</span>
            )} />
            <Tooltip {...tooltipStyle} formatter={(value, name) => [value, OUTCOME_LABELS[name as CallOutcome] ?? name]} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Disqualification breakdown */}
      <div className="bg-gray-950 border border-white/5 rounded-xl p-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Disqualification Reasons</h3>
        {disqChartData.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-gray-600 text-sm">No disqualifications yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={disqChartData} layout="vertical" margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} width={100} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} name="Count" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
