'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import type { Call, CallOutcome } from '@/lib/supabase'

interface ChartsProps { calls: Call[] }

// --- Outcome chart ---

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

// --- Objection chart ---

const OBJECTION_COLORS: Record<string, string> = {
  'price':          '#ef4444',
  'think-about-it': '#f97316',
  'compare-market': '#eab308',
  'authority':      '#a855f7',
  'timing':         '#3b82f6',
  'not-interested': '#6b7280',
}

const OBJECTION_LABELS: Record<string, string> = {
  'price':          'Price',
  'think-about-it': 'Think About It',
  'compare-market': 'Compare Market',
  'authority':      'Authority',
  'timing':         'Timing',
  'not-interested': 'Not Interested',
}

function buildObjectionData(calls: Call[]) {
  const map = new Map<string, number>()
  calls
    .filter(c => (c.outcome === 'no-sale' && c.no_sale_reason) || (c.outcome === 'follow-up' && c.follow_up_reason))
    .forEach(c => {
      const reason = c.outcome === 'no-sale' ? c.no_sale_reason : c.follow_up_reason
      if (reason) map.set(reason, (map.get(reason) ?? 0) + 1)
    })
  return Array.from(map.entries())
    .map(([key, value]) => ({ key, name: OBJECTION_LABELS[key] ?? key, value, color: OBJECTION_COLORS[key] ?? '#6b7280' }))
    .sort((a, b) => b.value - a.value)
}

// --- Disq chart ---

const DISQ_COLORS: Record<string, string> = {
  'Bill Dnq':      '#f97316',
  'Property Dnq':  '#ef4444',
  'Finance Dnq':   '#a855f7',
  'Other':         '#6b7280',
}

function buildDisqData(calls: Call[]) {
  const map: Record<string, number> = {}
  calls
    .filter(c => c.outcome === 'disqualified' && c.disqualified_reason)
    .forEach(c => {
      const k = c.disqualified_reason.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      map[k] = (map[k] ?? 0) + 1
    })
  return Object.entries(map).map(([name, value]) => ({ name, value, color: DISQ_COLORS[name] ?? '#6b7280' }))
}

// --- Tooltips ---

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px' }}>
      {label && <p style={{ color: '#9ca3af', fontSize: 11, marginBottom: 4 }}>{label}</p>}
      <p style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>{payload[0].value}</p>
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

// --- Colored horizontal bar ---

function ColoredBarChart({ data, emptyMsg }: { data: { name: string; value: number; color: string }[]; emptyMsg: string }) {
  if (data.length === 0) {
    return <div className="h-[200px] flex items-center justify-center text-gray-600 text-sm">{emptyMsg}</div>
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
        <XAxis type="number" tick={{ fontSize: 10, fill: '#4b5563' }} allowDecimals={false} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} width={105} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

const cardCls = "bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5"
const sectionLabel = "text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-4"

export default function Charts({ calls }: ChartsProps) {
  const outcomeData = buildOutcomeData(calls)
  const objData     = buildObjectionData(calls)
  const disqData    = buildDisqData(calls)

  if (calls.length === 0) {
    return (
      <div className={`${cardCls} p-8 text-center text-gray-600 text-sm`}>
        No appointments logged yet.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Top left: Outcome breakdown */}
      <div className={cardCls}>
        <h3 className={sectionLabel}>Outcome Breakdown</h3>
        <div className="flex items-center gap-4 h-[200px]">
          <ResponsiveContainer width="50%" height="100%">
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

      {/* Top right: Objection breakdown */}
      <div className={cardCls}>
        <h3 className={sectionLabel}>Objection Breakdown</h3>
        <ColoredBarChart data={objData} emptyMsg="No objections logged yet" />
      </div>

      {/* Bottom right: Disqualification reasons */}
      <div className={cardCls}>
        <h3 className={sectionLabel}>Disqualification Reasons</h3>
        <ColoredBarChart data={disqData} emptyMsg="No disqualifications yet" />
      </div>
    </div>
  )
}
