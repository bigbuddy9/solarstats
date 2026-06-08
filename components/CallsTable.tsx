'use client'

import { useState, useMemo } from 'react'
import type { Call, CallOutcome } from '@/lib/supabase'

interface CallsTableProps {
  calls: Call[]
}

const OUTCOME_BADGES: Record<CallOutcome, string> = {
  'no-show':          'bg-gray-800 text-gray-400 border-gray-700',
  'disqualified':     'bg-red-900/40 text-red-400 border-red-800',
  'no-sale':          'bg-orange-900/40 text-orange-400 border-orange-800',
  'follow-up-booked': 'bg-yellow-900/40 text-yellow-400 border-yellow-800',
  'closed':           'bg-green-900/40 text-green-400 border-green-800',
}

const OUTCOME_LABELS: Record<CallOutcome, string> = {
  'no-show':          'No Show',
  'disqualified':     'Disqualified',
  'no-sale':          'No Sale',
  'follow-up-booked': 'Follow Up',
  'closed':           'Closed',
}

const ALL_OUTCOMES: CallOutcome[] = ['no-show', 'disqualified', 'no-sale', 'follow-up-booked', 'closed']

type SortKey = 'appointment_date' | 'rep_name' | 'outcome'
type SortDir = 'asc' | 'desc'

export default function CallsTable({ calls }: CallsTableProps) {
  const [outcomeFilter, setOutcomeFilter] = useState<CallOutcome | 'all'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('appointment_date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const filtered = useMemo(() => {
    let rows = [...calls]
    if (outcomeFilter !== 'all') rows = rows.filter(c => c.outcome === outcomeFilter)
    if (dateFrom) rows = rows.filter(c => c.appointment_date >= dateFrom)
    if (dateTo) rows = rows.filter(c => c.appointment_date <= dateTo + 'T23:59:59')
    rows.sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
    return rows
  }, [calls, outcomeFilter, dateFrom, dateTo, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="text-gray-600 ml-1">↕</span>
    return <span className="text-brand ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div className="bg-gray-950 border border-white/5 rounded-xl overflow-hidden">
      <div className="p-5 border-b border-white/5">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">All Appointments</h3>
        <div className="flex flex-wrap gap-3">
          <select
            value={outcomeFilter}
            onChange={e => setOutcomeFilter(e.target.value as CallOutcome | 'all')}
            className="bg-white/5 border border-white/10 text-gray-300 text-sm rounded-lg px-3 py-1.5 focus:border-brand"
          >
            <option value="all">All outcomes</option>
            {ALL_OUTCOMES.map(o => (
              <option key={o} value={o}>{OUTCOME_LABELS[o]}</option>
            ))}
          </select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="bg-white/5 border border-white/10 text-gray-300 text-sm rounded-lg px-3 py-1.5 focus:border-brand" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="bg-white/5 border border-white/10 text-gray-300 text-sm rounded-lg px-3 py-1.5 focus:border-brand" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-8 text-center text-gray-600 text-sm">No appointments match your filters.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left">
                <th className="px-4 py-3 text-gray-500 font-medium cursor-pointer hover:text-white" onClick={() => toggleSort('appointment_date')}>
                  Date <SortIcon col="appointment_date" />
                </th>
                <th className="px-4 py-3 text-gray-500 font-medium cursor-pointer hover:text-white" onClick={() => toggleSort('rep_name')}>
                  Rep <SortIcon col="rep_name" />
                </th>
                <th className="px-4 py-3 text-gray-500 font-medium">Homeowner</th>
                <th className="px-4 py-3 text-gray-500 font-medium">Address</th>
                <th className="px-4 py-3 text-gray-500 font-medium cursor-pointer hover:text-white" onClick={() => toggleSort('outcome')}>
                  Outcome <SortIcon col="outcome" />
                </th>
                <th className="px-4 py-3 text-gray-500 font-medium">Detail</th>
                <th className="px-4 py-3 text-gray-500 font-medium">Deal Value</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(call => (
                <tr key={call.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                    {new Date(call.appointment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{call.rep_name}</td>
                  <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{call.homeowner_name}</td>
                  <td className="px-4 py-3 text-gray-400 max-w-[180px] truncate">{call.address}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${OUTCOME_BADGES[call.outcome]}`}>
                      {OUTCOME_LABELS[call.outcome]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {call.disqualified_reason
                      ? call.disqualified_reason.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                      : call.system_size || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{call.deal_value || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
