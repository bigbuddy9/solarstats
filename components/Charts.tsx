'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import type { Call, CallOutcome } from '@/lib/supabase'

interface ChartsProps {
  calls: Call[]
}

function getWeekLabel(dateStr: string) {
  const date = new Date(dateStr)
  const start = new Date(date)
  start.setDate(date.getDate() - date.getDay())
  return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function buildWeeklyData(calls: Call[]) {
  const map = new Map<string, number>()
  calls.forEach(c => {
    const week = getWeekLabel(c.call_date)
    map.set(week, (map.get(week) ?? 0) + 1)
  })
  return Array.from(map.entries())
    .map(([week, count]) => ({ week, count }))
    .slice(-8)
}

const OUTCOME_COLORS: Record<CallOutcome, string> = {
  qualified: '#22c55e',
  disqualified: '#ef4444',
  'no-show': '#f59e0b',
  cancelled: '#6b7280',
  booked: '#3b82f6',
  closed: '#a855f7',
}

function buildOutcomeData(calls: Call[]) {
  const map = new Map<string, number>()
  calls.forEach(c => {
    map.set(c.outcome, (map.get(c.outcome) ?? 0) + 1)
  })
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
}

export default function Charts({ calls }: ChartsProps) {
  const weeklyData = buildWeeklyData(calls)
  const outcomeData = buildOutcomeData(calls)

  if (calls.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500">
        No calls logged yet. Log your first call to see charts.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Weekly bar chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Calls Per Week</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#9ca3af' }} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }}
              labelStyle={{ color: '#e5e7eb' }}
              itemStyle={{ color: '#e5e7eb' }}
            />
            <Bar dataKey="count" fill="var(--brand-color)" radius={[4, 4, 0, 0]} name="Calls" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Outcome pie chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Outcome Breakdown</h3>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={outcomeData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {outcomeData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={OUTCOME_COLORS[entry.name as CallOutcome] ?? '#6b7280'}
                />
              ))}
            </Pie>
            <Legend
              formatter={(value) => (
                <span style={{ color: '#9ca3af', fontSize: 12, textTransform: 'capitalize' }}>{value}</span>
              )}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }}
              itemStyle={{ color: '#e5e7eb' }}
              formatter={(value, name) => [value, String(name).charAt(0).toUpperCase() + String(name).slice(1)]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
