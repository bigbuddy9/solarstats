'use client'

import { useState, useMemo } from 'react'
import type { Call, CallOutcome } from '@/lib/supabase'

interface CallsTableProps {
  calls: Call[]
}

const OUTCOME_BADGES: Record<CallOutcome, string> = {
  qualified: 'bg-green-900/40 text-green-400 border-green-800',
  disqualified: 'bg-red-900/40 text-red-400 border-red-800',
  'no-show': 'bg-yellow-900/40 text-yellow-400 border-yellow-800',
  cancelled: 'bg-gray-800 text-gray-400 border-gray-700',
  booked: 'bg-neutral-800 text-neutral-300 border-neutral-600',
  closed: 'bg-purple-900/40 text-purple-400 border-purple-800',
}

const ALL_OUTCOMES: CallOutcome[] = ['qualified', 'disqualified', 'no-show', 'cancelled', 'booked', 'closed']

type SortKey = 'call_date' | 'caller_name' | 'outcome'
type SortDir = 'asc' | 'desc'

export default function CallsTable({ calls }: CallsTableProps) {
  const [outcomeFilter, setOutcomeFilter] = useState<CallOutcome | 'all'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('call_date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const filtered = useMemo(() => {
    let rows = [...calls]

    if (outcomeFilter !== 'all') {
      rows = rows.filter(c => c.outcome === outcomeFilter)
    }
    if (dateFrom) {
      rows = rows.filter(c => c.call_date >= dateFrom)
    }
    if (dateTo) {
      rows = rows.filter(c => c.call_date <= dateTo + 'T23:59:59')
    }

    rows.sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })

    return rows
  }, [calls, outcomeFilter, dateFrom, dateTo, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="text-gray-600 ml-1">↕</span>
    return <span className="text-brand ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="p-5 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">All Calls</h3>
        <div className="flex flex-wrap gap-3">
          <select
            value={outcomeFilter}
            onChange={e => setOutcomeFilter(e.target.value as CallOutcome | 'all')}
            className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <option value="all">All outcomes</option>
            {ALL_OUTCOMES.map(o => (
              <option key={o} value={o} className="capitalize">{o.charAt(0).toUpperCase() + o.slice(1)}</option>
            ))}
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand"
            placeholder="From"
          />
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand"
            placeholder="To"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-8 text-center text-gray-500 text-sm">No calls match your filters.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left">
                <th
                  className="px-4 py-3 text-gray-400 font-medium cursor-pointer hover:text-white"
                  onClick={() => toggleSort('call_date')}
                >
                  Date <SortIcon col="call_date" />
                </th>
                <th
                  className="px-4 py-3 text-gray-400 font-medium cursor-pointer hover:text-white"
                  onClick={() => toggleSort('caller_name')}
                >
                  Name <SortIcon col="caller_name" />
                </th>
                <th className="px-4 py-3 text-gray-400 font-medium">Phone</th>
                <th
                  className="px-4 py-3 text-gray-400 font-medium cursor-pointer hover:text-white"
                  onClick={() => toggleSort('outcome')}
                >
                  Outcome <SortIcon col="outcome" />
                </th>
                <th className="px-4 py-3 text-gray-400 font-medium">Revenue</th>
                <th className="px-4 py-3 text-gray-400 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(call => (
                <tr key={call.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                    {new Date(call.call_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{call.caller_name}</td>
                  <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{call.caller_phone}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium capitalize ${OUTCOME_BADGES[call.outcome] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                      {call.outcome}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{call.monthly_revenue || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 max-w-xs truncate">{call.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
