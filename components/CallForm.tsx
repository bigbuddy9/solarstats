'use client'

import { useState, useRef, useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const schema = z.object({
  homeowner_name: z.string().min(1, 'Required'),
  address: z.string().min(1, 'Required'),
  phone: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  appointment_date: z.string().min(1, 'Required'),
  outcome: z.enum(['no-show', 'disqualified', 'no-sale', 'follow-up', 'closed']),
  disqualified_reason: z.string().optional(),
  no_sale_reason: z.string().optional(),
  follow_up_reason: z.string().optional(),
  follow_up_intent: z.string().optional(),
  system_size: z.string().optional(),
  battery_size: z.string().optional(),
  deal_value: z.string().optional(),
  payment_type: z.enum(['cash', 'finance']).optional(),
  sale_type: z.enum(['same-week', 'follow-up']).optional(),
})

type FormData = z.infer<typeof schema>

const OUTCOMES = [
  { value: 'no-show',      label: 'No Show' },
  { value: 'disqualified', label: 'Disqualified' },
  { value: 'no-sale',      label: 'No Sale' },
  { value: 'follow-up',    label: 'Follow Up' },
  { value: 'closed',       label: 'Closed' },
]

const DISQ_REASONS = [
  { value: 'bill-dnq',      label: 'Bill DNQ' },
  { value: 'property-dnq',  label: 'Property DNQ' },
  { value: 'finance-dnq',   label: 'Finance DNQ' },
  { value: 'other',         label: 'Other' },
]

const NO_SALE_REASONS = [
  { value: 'price',          label: 'Price',          tip: "Too expensive, can't afford it, doesn't see the value" },
  { value: 'think-about-it', label: 'Think About It', tip: "Classic stall — won't commit on the spot" },
  { value: 'compare-market', label: 'Compare Market', tip: 'Wants to compare quotes or see other options' },
  { value: 'authority',      label: 'Authority',      tip: 'Needs spouse, partner, or someone else to decide' },
  { value: 'timing',         label: 'Timing',         tip: 'Not ready, wants to wait, bad personal timing' },
  { value: 'not-interested', label: 'Not Interested', tip: 'Flat no — done with the conversation' },
]

const INTENT_LEVELS = [
  { value: 'cold', label: 'Cold', tip: 'Unlikely to close — probably not happening' },
  { value: 'warm', label: 'Warm', tip: 'Not sure — seemed good but could go either way' },
  { value: 'hot',  label: 'Hot',  tip: 'This should close — just needs the right push' },
]

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS = ['Mo','Tu','We','Th','Fr','Sa','Su']
const HOURS = [1,2,3,4,5,6,7,8,9,10,11,12]

function DateTimePicker({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: boolean }) {
  const now = new Date()
  const parsed = value ? new Date(value) : now

  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(parsed.getFullYear())
  const [viewMonth, setViewMonth] = useState(parsed.getMonth())
  const [selDate, setSelDate] = useState<Date | null>(value ? parsed : null)
  const [selHour, setSelHour] = useState<number | null>(value ? (parsed.getHours() % 12 || 12) : null)
  const [selAmPm, setSelAmPm] = useState<'am' | 'pm'>(value ? (parsed.getHours() >= 12 ? 'pm' : 'am') : 'am')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function commit(date: Date | null, hour: number | null, ampm: 'am' | 'pm') {
    if (!date || !hour) return
    const d = new Date(date)
    let h = hour % 12
    if (ampm === 'pm') h += 12
    d.setHours(h, 0, 0, 0)
    onChange(d.toISOString())
  }

  function selectDate(d: Date) {
    setSelDate(d)
    commit(d, selHour, selAmPm)
  }

  function selectHour(h: number) {
    setSelHour(h)
    commit(selDate, h, selAmPm)
  }

  function selectAmPm(ap: 'am' | 'pm') {
    setSelAmPm(ap)
    commit(selDate, selHour, ap)
  }

  // Calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1)
  const startDow = (firstDay.getDay() + 6) % 7 // Monday=0
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let i = 1; i <= daysInMonth; i++) cells.push(i)

  const displayValue = selDate && selHour
    ? `${selDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })} · ${selHour}${selAmPm}`
    : selDate
    ? `${selDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })} · pick a time`
    : 'Select date & time'

  const isToday = (day: number) => {
    const t = new Date()
    return day === t.getDate() && viewMonth === t.getMonth() && viewYear === t.getFullYear()
  }

  const isSelected = (day: number) =>
    selDate && day === selDate.getDate() && viewMonth === selDate.getMonth() && viewYear === selDate.getFullYear()

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full bg-white/5 border ${error ? 'border-red-500' : open ? 'border-brand' : 'border-white/10'} rounded-lg px-4 py-3 text-sm text-left transition-colors hover:border-white/20 flex items-center justify-between`}
      >
        <span className={selDate && selHour ? 'text-white' : 'text-gray-600'}>{displayValue}</span>
        <svg className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-2 bg-[#111] border border-white/10 rounded-2xl shadow-2xl p-4 w-full min-w-[320px]">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1) } else setViewMonth(m => m-1) }}
              className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <span className="text-sm font-semibold text-white">{MONTHS[viewMonth]} {viewYear}</span>
            <button type="button" onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1) } else setViewMonth(m => m+1) }}
              className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => <div key={d} className="text-center text-[10px] font-semibold text-gray-600 py-1">{d}</div>)}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7 gap-y-0.5 mb-4">
            {cells.map((day, i) => (
              <div key={i} className="flex items-center justify-center">
                {day ? (
                  <button
                    type="button"
                    onClick={() => selectDate(new Date(viewYear, viewMonth, day))}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-all
                      ${isSelected(day) ? 'bg-brand text-black font-bold' :
                        isToday(day) ? 'border border-brand/50 text-brand hover:bg-brand/10' :
                        'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                  >
                    {day}
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          {/* Hour picker */}
          <div className="border-t border-white/5 pt-3">
            <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-2">Time</p>
            <div className="grid grid-cols-6 gap-1 mb-2">
              {HOURS.map(h => (
                <button
                  key={h}
                  type="button"
                  onClick={() => selectHour(h)}
                  className={`py-1.5 rounded-lg text-xs font-medium transition-all
                    ${selHour === h ? 'bg-brand text-black font-bold' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                >
                  {h}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1">
              {(['am', 'pm'] as const).map(ap => (
                <button
                  key={ap}
                  type="button"
                  onClick={() => selectAmPm(ap)}
                  className={`py-1.5 rounded-lg text-xs font-semibold uppercase tracking-widest transition-all
                    ${selAmPm === ap ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  {ap}
                </button>
              ))}
            </div>
          </div>

          {selDate && selHour && (
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-3 w-full py-2 rounded-xl bg-brand text-black text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
      {children}
    </label>
  )
}

function inputCls(err?: boolean) {
  return `w-full bg-white/5 border ${err ? 'border-red-500' : 'border-white/10'} rounded-lg px-4 py-3 text-white placeholder-gray-600 text-sm transition-colors hover:border-white/20 focus:border-brand`
}

function ErrMsg({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="text-red-400 text-xs mt-1.5">{msg}</p>
}

interface CallFormProps {
  userId: string
  repName: string
  tenantId: string
}

export default function CallForm({ userId, repName, tenantId }: CallFormProps) {
  const supabase = createClientComponentClient()
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState('')

  const { register, handleSubmit, reset, control, setValue, watch, formState: { errors, isSubmitting, isValid } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'all',
    defaultValues: { appointment_date: '' },
  })

  const outcome = useWatch({ control, name: 'outcome' })
  const apptDate = watch('appointment_date')

  async function onSubmit(data: FormData) {
    setServerError('')
    const nameParts = data.homeowner_name.trim().split(/\s+/)
    const homeowner_first_name = nameParts[0]
    const homeowner_last_name = nameParts.slice(1).join(' ') || ''
    const { error } = await supabase.from('calls').insert([{
      tenant_id: tenantId,
      user_id: userId,
      rep_name: repName,
      homeowner_first_name,
      homeowner_last_name,
      address: data.address,
      phone: data.phone,
      email: data.email,
      appointment_date: data.appointment_date,
      outcome: data.outcome,
      disqualified_reason: data.disqualified_reason ?? '',
      no_sale_reason: data.no_sale_reason ?? '',
      follow_up_reason: data.follow_up_reason ?? '',
      follow_up_intent: data.follow_up_intent ?? '',
      system_size: data.system_size ?? '',
      battery_size: data.battery_size ?? '0',
      deal_value: data.deal_value ?? '',
      sale_type: data.sale_type ?? 'same-week',
      payment_type: data.payment_type ?? 'finance',
    }])
    if (error) { setServerError(error.message); return }
    setSuccess(true)
    reset({
      homeowner_name: '',
      address: '',
      phone: '',
      email: '',
      appointment_date: '',
      outcome: undefined,
      disqualified_reason: undefined,
      no_sale_reason: undefined,
      follow_up_reason: undefined,
      system_size: '',
      battery_size: '',
      deal_value: '',
      payment_type: undefined,
      sale_type: undefined,
    })
    setTimeout(() => setSuccess(false), 4000)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

      {success && (
        <div className="flex items-center gap-3 rounded-xl px-5 py-4" style={{ background: 'color-mix(in srgb, var(--brand-color) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--brand-color) 30%, transparent)' }}>
          <div className="h-2 w-2 rounded-full shrink-0" style={{ background: 'var(--brand-color)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--brand-color)' }}>Logged. On to the next one.</p>
        </div>
      )}
      {serverError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-4 text-red-400 text-sm">
          {serverError}
        </div>
      )}

      {/* Homeowner + Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Homeowner Full Name</Label>
          <input {...register('homeowner_name')} placeholder="Jane Doe" className={inputCls(!!errors.homeowner_name)} />
          <ErrMsg msg={errors.homeowner_name?.message} />
        </div>
        <div>
          <Label>Appointment Date &amp; Time</Label>
          <DateTimePicker
            value={apptDate}
            onChange={v => setValue('appointment_date', v, { shouldValidate: true })}
            error={!!errors.appointment_date}
          />
          <ErrMsg msg={errors.appointment_date?.message} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Phone</Label>
          <input {...register('phone')} placeholder="(555) 000-0000" className={inputCls(!!errors.phone)} />
          <ErrMsg msg={errors.phone?.message} />
        </div>
        <div>
          <Label>Email</Label>
          <input {...register('email')} type="email" placeholder="jane@example.com" className={inputCls(!!errors.email)} />
          <ErrMsg msg={errors.email?.message} />
        </div>
      </div>

      <div>
        <Label>Address</Label>
        <input {...register('address')} placeholder="123 Main St, City, State" className={inputCls(!!errors.address)} />
        <ErrMsg msg={errors.address?.message} />
      </div>

      {/* Outcome */}
      <div>
        <Label>Outcome</Label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {OUTCOMES.map(o => (
            <label key={o.value} className="cursor-pointer">
              <input type="radio" value={o.value} {...register('outcome')} className="sr-only peer" />
              <div className="text-center px-2 py-3 rounded-lg border border-white/10 text-xs font-medium text-gray-400 transition-all peer-checked:border-brand peer-checked:text-black peer-checked:bg-brand hover:border-white/20 leading-tight">
                {o.label}
              </div>
            </label>
          ))}
        </div>
        <ErrMsg msg={errors.outcome?.message} />
      </div>

      {/* Disqualified reason */}
      {outcome === 'disqualified' && (
        <div>
          <Label>Disqualified Reason</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DISQ_REASONS.map(r => (
              <label key={r.value} className="cursor-pointer">
                <input type="radio" value={r.value} {...register('disqualified_reason')} className="sr-only peer" />
                <div className="text-center px-3 py-3 rounded-lg border border-white/10 text-xs font-medium text-gray-400 transition-all peer-checked:border-red-500 peer-checked:text-red-400 peer-checked:bg-red-500/10 hover:border-white/20">
                  {r.label}
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* No Sale reason */}
      {outcome === 'no-sale' && (
        <div>
          <Label>Main Objection</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {NO_SALE_REASONS.map(r => (
              <label key={r.value} className="cursor-pointer" title={r.tip}>
                <input type="radio" value={r.value} {...register('no_sale_reason')} className="sr-only peer" />
                <div className="text-center px-3 py-3 rounded-lg border border-white/10 text-xs font-medium text-gray-400 transition-all peer-checked:border-orange-500 peer-checked:text-orange-400 peer-checked:bg-orange-500/10 hover:border-white/20 leading-tight">
                  {r.label}
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Follow Up reason + intent */}
      {outcome === 'follow-up' && (
        <div className="space-y-4">
          <div>
            <Label>Main Objection</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {NO_SALE_REASONS.map(r => (
                <label key={r.value} className="cursor-pointer" title={r.tip}>
                  <input type="radio" value={r.value} {...register('follow_up_reason')} className="sr-only peer" />
                  <div className="text-center px-3 py-3 rounded-lg border border-white/10 text-xs font-medium text-gray-400 transition-all peer-checked:border-yellow-500 peer-checked:text-yellow-400 peer-checked:bg-yellow-500/10 hover:border-white/20 leading-tight">
                    {r.label}
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Closed deal details */}
      {outcome === 'closed' && (
        <div className="space-y-4 p-4 rounded-xl bg-yellow-400/5 border border-yellow-400/20">
          {/* Sale type */}
          <div>
            <Label>Sale Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'same-week', label: 'One Call Close' },
                { value: 'follow-up', label: 'Follow Up Sale' },
              ].map(s => (
                <label key={s.value} className="cursor-pointer">
                  <input type="radio" value={s.value} {...register('sale_type')} className="sr-only peer" defaultChecked={s.value === 'same-week'} />
                  <div className="text-center px-3 py-3 rounded-lg border border-white/10 text-xs font-medium text-gray-400 transition-all peer-checked:border-brand peer-checked:text-black peer-checked:bg-brand hover:border-white/20">
                    {s.label}
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Solar kW</Label>
              <input type="number" step="0.01" min="0" placeholder=""
                {...register('system_size')} className={inputCls()} />
            </div>
            <div>
              <Label>Battery kW</Label>
              <input type="number" step="0.1" min="0" placeholder=""
                {...register('battery_size')} className={inputCls()} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Revenue ($)</Label>
              <input type="number" step="1" min="0" placeholder=""
                {...register('deal_value')} className={inputCls()} />
            </div>
            <div>
              <Label>Payment Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {[{ value: 'cash', label: 'Cash' }, { value: 'finance', label: 'Finance' }].map(p => (
                  <label key={p.value} className="cursor-pointer">
                    <input type="radio" value={p.value} {...register('payment_type')} className="sr-only peer" />
                    <div className="text-center px-3 py-3 rounded-lg border border-white/10 text-xs font-medium text-gray-400 transition-all peer-checked:border-brand peer-checked:text-black peer-checked:bg-brand hover:border-white/20">
                      {p.label}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting || !isValid}
        className={`w-full font-bold py-3.5 rounded-xl transition-all text-sm tracking-wide uppercase
          ${isValid && !isSubmitting
            ? 'bg-brand text-black hover:opacity-90 active:scale-[0.99] cursor-pointer'
            : 'bg-white/10 text-gray-600 cursor-not-allowed'
          }`}
      >
        {isSubmitting ? 'Saving…' : 'Submit'}
      </button>
    </form>
  )
}
