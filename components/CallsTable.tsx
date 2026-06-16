'use client'

import { useState, useMemo, Fragment } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Call, CallOutcome } from '@/lib/supabase'

interface CallsTableProps {
  calls: Call[]
  isOwner?: boolean
  userId?: string
  onDelete?: (id: string) => void
  onUpdate?: (call: Call) => void
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

const DISQ_REASONS = ['bill-dnq', 'property-dnq', 'finance-dnq', 'other']
const OBJECTIONS = ['price', 'think-about-it', 'compare-market', 'authority', 'timing', 'not-interested']

type SortKey = 'appointment_date' | 'rep_name' | 'outcome'
type SortDir = 'asc' | 'desc'

function fmt(val: string) {
  return val.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function iCls(err?: boolean) {
  return `w-full bg-white/5 border ${err ? 'border-red-500' : 'border-white/10'} rounded-lg px-3 py-2 text-white placeholder-gray-600 text-xs transition-colors hover:border-white/20 focus:border-brand`
}

function RadioGroup({ options, value, onChange, selectedCls }: {
  options: string[]
  value: string
  onChange: (v: string) => void
  selectedCls?: string
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all
            ${value === o
              ? selectedCls ?? 'border-brand bg-brand text-black'
              : 'border-white/10 text-gray-500 hover:border-white/20 hover:text-gray-300'}`}
        >
          {fmt(o)}
        </button>
      ))}
    </div>
  )
}

function EditForm({ call, onSave, onCancel }: { call: Call; onSave: (c: Call) => void; onCancel: () => void }) {
  const supabase = createClientComponentClient()
  const [outcome, setOutcome] = useState<CallOutcome>(call.outcome)
  const [disqReason, setDisqReason] = useState(call.disqualified_reason || '')
  const [noSaleReason, setNoSaleReason] = useState(call.no_sale_reason || '')
  const [followUpReason, setFollowUpReason] = useState(call.follow_up_reason || '')
  const [saleType, setSaleType] = useState(call.sale_type || 'same-week')
  const [paymentType, setPaymentType] = useState(call.payment_type || 'finance')
  const [systemSize, setSystemSize] = useState(call.system_size || '')
  const [batterySize, setBatterySize] = useState(call.battery_size || '')
  const [dealValue, setDealValue] = useState(call.deal_value || '')
  // ISO → datetime-local value (YYYY-MM-DDTHH:mm) in local time
  const [apptDate, setApptDate] = useState(() => {
    const d = new Date(call.appointment_date)
    if (isNaN(d.getTime())) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setSaving(true)
    setError('')
    const isClosed = outcome === 'closed'
    const updates = {
      outcome,
      appointment_date: apptDate ? new Date(apptDate).toISOString() : call.appointment_date,
      disqualified_reason: outcome === 'disqualified' ? disqReason : '',
      no_sale_reason: outcome === 'no-sale' ? noSaleReason : '',
      follow_up_reason: outcome === 'follow-up' ? followUpReason : '',
      sale_type: isClosed ? saleType : 'same-week',
      payment_type: isClosed ? paymentType : 'finance',
      system_size: isClosed ? systemSize : '',
      battery_size: isClosed ? batterySize : '0',
      deal_value: isClosed ? dealValue : '',
    }
    const { error: err } = await supabase.from('calls').update(updates).eq('id', call.id)
    setSaving(false)
    if (err) { setError(err.message); return }
    onSave({ ...call, ...updates })
  }

  return (
    <div className="space-y-4 pt-2" onClick={e => e.stopPropagation()}>
      {/* Appointment date */}
      <div>
        <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-2">Appointment Date &amp; Time</p>
        <input
          type="datetime-local"
          value={apptDate}
          onChange={e => setApptDate(e.target.value)}
          className={iCls()}
        />
      </div>

      {/* Outcome */}
      <div>
        <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-2">Outcome</p>
        <div className="flex flex-wrap gap-1.5">
          {ALL_OUTCOMES.map(o => (
            <button
              key={o}
              type="button"
              onClick={() => setOutcome(o)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all
                ${outcome === o ? 'border-brand bg-brand text-black' : 'border-white/10 text-gray-500 hover:border-white/20 hover:text-gray-300'}`}
            >
              {OUTCOME_LABELS[o]}
            </button>
          ))}
        </div>
      </div>

      {outcome === 'disqualified' && (
        <div>
          <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-2">Disqualified Reason</p>
          <RadioGroup options={DISQ_REASONS} value={disqReason} onChange={setDisqReason} selectedCls="border-red-500 text-red-400 bg-red-500/10" />
        </div>
      )}

      {(outcome === 'no-sale' || outcome === 'follow-up') && (
        <div>
          <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-2">Main Objection</p>
          <RadioGroup
            options={OBJECTIONS}
            value={outcome === 'no-sale' ? noSaleReason : followUpReason}
            onChange={outcome === 'no-sale' ? setNoSaleReason : setFollowUpReason}
            selectedCls="border-orange-500 text-orange-400 bg-orange-500/10"
          />
        </div>
      )}

      {outcome === 'closed' && (
        <div className="space-y-3 p-3 rounded-xl bg-yellow-400/5 border border-yellow-400/20">
          <div>
            <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-2">Sale Type</p>
            <div className="flex gap-1.5">
              {[['same-week', 'One Call Close'], ['follow-up', 'Follow Up Sale']].map(([v, l]) => (
                <button key={v} type="button" onClick={() => setSaleType(v as 'same-week' | 'follow-up')}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all
                    ${saleType === v ? 'border-brand bg-brand text-black' : 'border-white/10 text-gray-500 hover:border-white/20'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Solar kW</p>
              <input type="number" value={systemSize} onChange={e => setSystemSize(e.target.value)} className={iCls()} />
            </div>
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Battery kW</p>
              <input type="number" value={batterySize} onChange={e => setBatterySize(e.target.value)} className={iCls()} />
            </div>
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Revenue ($)</p>
              <input type="number" value={dealValue} onChange={e => setDealValue(e.target.value)} className={iCls()} />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-2">Payment</p>
            <div className="flex gap-1.5">
              {['cash', 'finance'].map(p => (
                <button key={p} type="button" onClick={() => setPaymentType(p as 'cash' | 'finance')}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all capitalize
                    ${paymentType === p ? 'border-brand bg-brand text-black' : 'border-white/10 text-gray-500 hover:border-white/20'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-1.5 rounded-lg bg-brand text-black text-xs font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-1.5 rounded-lg border border-white/10 text-gray-500 text-xs font-medium hover:text-gray-300 hover:border-white/20 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function CallsTable({ calls, isOwner, userId, onDelete, onUpdate }: CallsTableProps) {
  const supabase = createClientComponentClient()
  const [outcomeFilter, setOutcomeFilter] = useState<CallOutcome | 'all'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('appointment_date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('Delete this call log? This cannot be undone.')) return
    setExpanded(null)
    onDelete?.(id)
    supabase.from('calls').delete().eq('id', id)
  }

  function handleSaved(updated: Call) {
    onUpdate?.(updated)
    setEditing(null)
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

  const canEdit = (call: Call) => isOwner || call.user_id === userId

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
                const isEditOpen = editing === call.id
                const detail = call.outcome === 'disqualified' ? fmt(call.disqualified_reason || '')
                  : call.outcome === 'no-sale' ? fmt(call.no_sale_reason || '')
                  : call.outcome === 'follow-up' ? fmt(call.follow_up_reason || '')
                  : call.system_size ? `${call.system_size} kW` : ''

                return (
                  <Fragment key={call.id}>
                    <tr
                      onClick={() => { setExpanded(isOpen ? null : call.id); setEditing(null) }}
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
                          {isEditOpen ? (
                            <EditForm
                              call={call}
                              onSave={handleSaved}
                              onCancel={() => setEditing(null)}
                            />
                          ) : (
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
                              {canEdit(call) && (
                                <div className="ml-auto flex items-center gap-2">
                                  <button
                                    onClick={e => { e.stopPropagation(); setEditing(call.id) }}
                                    className="text-xs text-gray-600 hover:text-white transition-colors border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={e => { e.stopPropagation(); handleDelete(call.id) }}
                                    disabled={deleting === call.id}
                                    className="text-xs text-gray-600 hover:text-red-400 transition-colors border border-white/10 hover:border-red-500/40 px-3 py-1.5 rounded-lg disabled:opacity-40"
                                  >
                                    {deleting === call.id ? 'Deleting…' : 'Delete'}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
