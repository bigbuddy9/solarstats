'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'

const schema = z.object({
  caller_name: z.string().min(1, 'Required'),
  caller_phone: z.string().min(1, 'Required'),
  call_date: z.string().min(1, 'Required'),
  outcome: z.enum(['qualified', 'disqualified', 'no-show', 'cancelled', 'booked', 'closed']),
  monthly_bookings: z.string().min(1, 'Required'),
  close_rate: z.string().min(1, 'Required'),
  monthly_revenue: z.string().min(1, 'Required'),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const MONTHLY_BOOKING_OPTIONS = [
  '0 - 5 calls/month',
  '5 - 10 calls/month',
  '10 - 20 calls/month',
  '20 - 40 calls/month',
  '40+ calls/month',
]

const CLOSE_RATE_OPTIONS = ['Under 10%', '10% - 20%', '20% - 30%', '30% - 40%', '40%+']

const REVENUE_OPTIONS = ['$0 - $5k', '$5k - $10k', '$10k - $25k', '$25k - $50k', '$50k - $100k', '$100k+']

const OUTCOMES = [
  { value: 'qualified', label: 'Qualified' },
  { value: 'disqualified', label: 'Disqualified' },
  { value: 'no-show', label: 'No-show' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'booked', label: 'Booked' },
  { value: 'closed', label: 'Closed' },
]

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
      {children}
    </label>
  )
}

function inputCls(err?: boolean) {
  return `w-full bg-white/5 border ${err ? 'border-red-500' : 'border-white/10'} rounded-lg px-4 py-3 text-white placeholder-gray-600 text-sm transition-colors hover:border-white/20 focus:border-brand focus:bg-white/8`
}

function ErrMsg({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="text-red-400 text-xs mt-1.5">{msg}</p>
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 h-px bg-white/5" />
      <span className="text-xs text-gray-600 uppercase tracking-widest">{label}</span>
      <div className="flex-1 h-px bg-white/5" />
    </div>
  )
}

export default function CallForm() {
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { call_date: new Date().toISOString().slice(0, 16) },
  })

  async function onSubmit(data: FormData) {
    setServerError('')
    const { error } = await supabase.from('calls').insert([{ ...data, notes: data.notes ?? '' }])
    if (error) { setServerError(error.message); return }
    setSuccess(true)
    reset({ call_date: new Date().toISOString().slice(0, 16) })
    setTimeout(() => setSuccess(false), 4000)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

      {success && (
        <div className="flex items-center gap-3 bg-yellow-400/10 border border-yellow-400/30 rounded-xl px-5 py-4">
          <div className="h-2 w-2 rounded-full bg-yellow-400 shrink-0" />
          <p className="text-yellow-300 text-sm font-medium">Call logged. Good work — on to the next one.</p>
        </div>
      )}

      {serverError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-4 text-red-400 text-sm">
          {serverError}
        </div>
      )}

      {/* Who + When */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Caller Name</Label>
          <input {...register('caller_name')} placeholder="John Smith" className={inputCls(!!errors.caller_name)} />
          <ErrMsg msg={errors.caller_name?.message} />
        </div>
        <div>
          <Label>Phone Number</Label>
          <input {...register('caller_phone')} placeholder="(555) 000-0000" className={inputCls(!!errors.caller_phone)} />
          <ErrMsg msg={errors.caller_phone?.message} />
        </div>
      </div>

      <div>
        <Label>Call Date &amp; Time</Label>
        <input type="datetime-local" {...register('call_date')} className={inputCls(!!errors.call_date)} />
        <ErrMsg msg={errors.call_date?.message} />
      </div>

      <Divider label="Call Result" />

      {/* Outcome — pill selector */}
      <div>
        <Label>Outcome</Label>
        <div className="grid grid-cols-3 gap-2">
          {OUTCOMES.map(o => (
            <label key={o.value} className="cursor-pointer">
              <input type="radio" value={o.value} {...register('outcome')} className="sr-only peer" />
              <div className="text-center px-3 py-2.5 rounded-lg border border-white/10 text-sm text-gray-400 transition-all peer-checked:border-brand peer-checked:text-brand peer-checked:bg-yellow-400/10 hover:border-white/20">
                {o.label}
              </div>
            </label>
          ))}
        </div>
        <ErrMsg msg={errors.outcome?.message} />
      </div>

      <Divider label="Business Context" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label>Monthly Bookings</Label>
          <select {...register('monthly_bookings')} className={inputCls(!!errors.monthly_bookings)}>
            <option value="">Select…</option>
            {MONTHLY_BOOKING_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <ErrMsg msg={errors.monthly_bookings?.message} />
        </div>
        <div>
          <Label>Close Rate</Label>
          <select {...register('close_rate')} className={inputCls(!!errors.close_rate)}>
            <option value="">Select…</option>
            {CLOSE_RATE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <ErrMsg msg={errors.close_rate?.message} />
        </div>
        <div>
          <Label>Monthly Revenue</Label>
          <select {...register('monthly_revenue')} className={inputCls(!!errors.monthly_revenue)}>
            <option value="">Select…</option>
            {REVENUE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <ErrMsg msg={errors.monthly_revenue?.message} />
        </div>
      </div>

      <div>
        <Label>Notes <span className="normal-case text-gray-600 tracking-normal font-normal">(optional)</span></Label>
        <textarea
          {...register('notes')}
          rows={3}
          placeholder="Objections, next steps, anything worth remembering…"
          className={`${inputCls()} resize-none`}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-brand text-black font-bold py-3.5 rounded-xl hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm tracking-wide uppercase"
      >
        {isSubmitting ? 'Saving…' : 'Submit Call'}
      </button>

    </form>
  )
}
