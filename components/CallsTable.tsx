'use client'

import { useState, useMemo } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Call, CallOutcome } from '@/lib/supabase'

interface CallsTableProps {
  calls: Call[]
  isOwner?: boolean
  onDelete?: (id: string) => void
}

const OUTCOME_BADGES: Record<CallOutcome, string> = {
  'no-show':      'bg-gray-800 text-gray-400 border-gray-700',
  'disqualified': 'bg-red-900/40 text-red-400 border-red-800',
  'no-sale':      'bg-orange-900/40 text-orange-400 border-orange-800',
  'follow-up':    'bg-yellow-900/40 text-yellow-400 border-yellow-800',
  'closed':       'bg-green-900/40 text-green-400 border-green-800',
}

const OUTCOME_LABELS: Record<CallOutcome, string> = {
  'no-show':      'No Show',
  'disqualified': 'Disqualified',
  'no-sale':      'No Sale',
  'follow-up':    'Follow Up',
  'closed':       'Closed',
}

const ALL_OUTCOMES: CallOutcome[] = ['no-show', 'disqualified', 'no-sale', 'follow-up', 'closed']

type SortKey = 'appointment_date' | 'rep_name' | 'outcome'
type SortDir = 'asc' | 'desc'

function fmt(val: string) {
  return val.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

export default function CallsTable({ calls, isOwner, onDelete }: CallsTableProps) {
  const supabase = createClientComponentClient()
  const [outcomeFilter, setOutcomeFilter] = useState<CallOutcome | 'all'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('appointment_date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('Delete this call log? This cannot be undone.')) return
    setDeleting(id)
    await supabase.from('calls').delete().eq('id', id)
    setDeleting(null)
    setExpanded(null)
    onDelete?.(id)
  }

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
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-white/5 flex flex-wrap items-center gap-3">
        <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mr-2">All Appointments</h3>
        <select
          value={outcomeFilter}
          onChange={e => setOutcomeFilter(e.target.value as CallOutcome | 'all')}
          className="bg-white/5 border border-white/10 text-gray-300 text-xs rounded-lg px-3 py-1.5 focus:border-brand"
        >
          <option value="all">All outcomes</option>
          {ALL_OUTCOMES.map(o => (
            <option key={o} value={o}>{OUTCOME_LABELS[o]}</option>
          ))}
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="bg-white/5 border border-white/10 text-gray-300 text-xs rounded-lg px-3 py-1.5 focus:border-brand" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="bg-white/5 border border-white/10 text-gray-300 text-xs rounded-lg px-3 py-1.5 focus:border-brand" />
      </div>

      {filtered.length === 0 ? (
        <div className="p-8 text-center text-gray-600 text-sm">No appointments match your filters.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left">
                <th className="px-4 py-3 text-gray-500 font-medium cursor-pointer hover:text-white text-xs" onClick={() => toggleSort('appointment_date')}>
                  Date <SortIcon col="appointment_date" />
                </th>
                <th className="px-4 py-3 text-gray-500 font-medium cursor-pointer hover:text-white text-xs" onClick={() => toggleSort('rep_name')}>
                  Rep <SortIcon col="rep_name" />
                </th>
                <th className="px-4 py-3 text-gray-500 font-medium text-xs">Homeowner</th>
                <th className="px-4 py-3 text-gray-500 font-medium text-xs">Address</th>
                <th className="px-4 py-3 text-gray-500 font-medium cursor-pointer hover:text-white text-xs" onClick={() => toggleSort('outcome')}>
                  Outcome <SortIcon col="outcome" />
                </th>
                <th className="px-4 py-3 text-gray-500 font-medium text-xs">Detail</th>
                <th className="px-4 py-3 text-gray-500 font-medium text-xs">Deal Value</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(call => {
                const isOpen = expanded === call.id
                const detail = call.outcome === 'disqualified' ? fmt(call.disqualified_reason || '')
                  : call.outcome === 'no-sale' ? fmt(call.no_sale_reason || '')
                  : call.outcome === 'follow-up' ? fmt(call.follow_up_reason || '')
                  : call.system_size ? `${call.system_size} kW` : ''

                return (
                  <>
                    <tr
                      key={call.id}
                      onClick={() => setExpanded(isOpen ? null : call.id)}
                      className={`border-b border-white/5 cursor-pointer transition-colors ${isOpen ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'}`}
                    >
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                        {new Date(call.appointment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-white font-semibold whitespace-nowrap text-xs">{call.rep_name}</td>
                      <td className="px-4 py-3 text-gray-300 whitespace-nowrap text-xs">{call.homeowner_first_name} {call.homeowner_last_name}</td>
                      <td className="px-4 py-3 text-gray-400 max-w-[160px] truncate text-xs">{call.address}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${OUTCOME_BADGES[call.outcome]}`}>
                          {OUTCOME_LABELS[call.outcome]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{detail || '—'}</td>
                      <td className="px-4 py-3 text-gray-300 whitespace-nowrap text-xs">
                        {call.deal_value ? `$${Number(call.deal_value).toLocaleString()}` : '—'}
                      </td>
                    </tr>

                    {isOpen && (
                      <tr key={`${call.id}-expanded`} className="border-b border-white/5 bg-white/[0.03]">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
                            <div>
                              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-0.5">Phone</p>
                              <p className="text-sm text-white">{call.phone || '—'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-0.5">Email</p>
                              <p className="text-sm text-white">{call.email || '—'}</p>
                            </div>
                            {call.outcome === 'closed' && (
                              <>
                                <div>
                                  <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-0.5">Sale Type</p>
                                  <p className="text-sm text-white">{call.sale_type === 'same-week' ? 'One Call Close' : 'Follow Up Sale'}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-0.5">Payment</p>
                                  <p className="text-sm text-white capitalize">{call.payment_type || '—'}</p>
                                </div>
                                {call.battery_size && Number(call.battery_size) > 0 && (
                                  <div>
                                    <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-0.5">Battery kW</p>
                                    <p className="text-sm text-white">{call.battery_size}</p>
                                  </div>
                                )}
                              </>
                            )}
                            {isOwner && (
                              <button
                                onClick={e => { e.stopPropagation(); handleDelete(call.id) }}
                                disabled={deleting === call.id}
                                className="ml-auto text-xs text-gray-600 hover:text-red-400 transition-colors border border-white/10 hover:border-red-500/40 px-3 py-1.5 rounded-lg disabled:opacity-40"
                              >
                                {deleting === call.id ? 'Deleting…' : 'Delete Record'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
