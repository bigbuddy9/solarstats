'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
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
  'no-show':      '#374151',
  'disqualified': '#ef4444',
  'no-sale':      '#f97316',
  'follow-up':    '#eab308',
  'closed':       '#22c55e',
}

const OUTCOME_LABELS: Record<CallOutcome, string> = {
  'no-show':      'No Show',
  'disqualified': 'Disqualified',
  'no-sale':      'No Sale',
  'follow-up':    'Follow Up',
  'closed':       'Closed',
}

function buildOutcomeData(calls: Call[]) {
  const map = new Map<string, number>()
  calls.forEach(c => map.set(c.outcome, (map.get(c.outcome) ?? 0) + 1))
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px' }}>
      {label && <p style={{ color: '#9ca3af', fontSize: 11, marginBottom: 4 }}>{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>{p.value}</p>
      ))}
    </div>
  )
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const entry = payload[0]
  return (
    <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px' }}>
      <p style={{ color: '#9ca3af', fontSize: 11, marginBottom: 2 }}>{OUTCOME_LABELS[entry.name as CallOutcome] ?? entry.name}</p>
      <p style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>{entry.value}</p>
    </div>
  )
}

const cardCls = "bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5"
const sectionLabel = "text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-4"

export default function Charts({ calls }: ChartsProps) {
  const weeklyData = buildWeeklyData(calls)
  const outcomeData = buildOutcomeData(calls)

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
      <div className={`${cardCls} p-8 text-center text-gray-600 text-sm`}>
        No appointments logged yet.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Weekly bar chart */}
      <div className={cardCls}>
        <h3 className={sectionLabel}>Appointments / Week</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={weeklyData} margin={{ top: 4, right: 0, left: -24, bottom: 0 }} barCategoryGap="40%">
            <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#4b5563' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#4b5563' }} allowDecimals={false} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="count" fill="#eab308" radius={[4, 4, 0, 0]} name="Appointments" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Outcome pie */}
      <div className={cardCls}>
        <h3 className={sectionLabel}>Outcome Breakdown</h3>
        <div className="flex items-center gap-4 h-[200px]">
          <ResponsiveContainer width="55%" height="100%">
            <PieChart>
              <Pie data={outcomeData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value" strokeWidth={0}>
                {outcomeData.map((entry, i) => (
                  <Cell key={i} fill={OUTCOME_COLORS[entry.name as CallOutcome] ?? '#374151'} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-2 flex-1">
            {outcomeData.map((entry, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: OUTCOME_COLORS[entry.name as CallOutcome] ?? '#374151' }} />
                <span className="text-xs text-gray-400 truncate">{OUTCOME_LABELS[entry.name as CallOutcome] ?? entry.name}</span>
                <span className="text-xs text-white font-semibold ml-auto">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Disqualification breakdown */}
      <div className={cardCls}>
        <h3 className={sectionLabel}>Disqualification Reasons</h3>
        {disqChartData.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-gray-600 text-sm">No disqualifications yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={disqChartData} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: '#4b5563' }} allowDecimals={false} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} width={90} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} name="Count" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
