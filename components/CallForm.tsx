'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const schema = z.object({
  caller_name: z.string().min(1, 'Name is required'),
  caller_phone: z.string().min(1, 'Phone is required'),
  call_date: z.string().min(1, 'Date is required'),
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

const CLOSE_RATE_OPTIONS = [
  'Under 10%',
  '10% - 20%',
  '20% - 30%',
  '30% - 40%',
  '40%+',
]

const REVENUE_OPTIONS = [
  '$0 - $5k',
  '$5k - $10k',
  '$10k - $25k',
  '$25k - $50k',
  '$50k - $100k',
  '$100k+',
]

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-gray-300 mb-1.5">
      {children}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  )
}

function inputClass(hasError?: boolean) {
  return `w-full bg-gray-800 border ${hasError ? 'border-red-600' : 'border-gray-700'} rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent text-sm`
}

export default function CallForm() {
  const router = useRouter()
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      call_date: new Date().toISOString().slice(0, 16),
    },
  })

  async function onSubmit(data: FormData) {
    setServerError('')

    const { error } = await supabase.from('calls').insert([{
      ...data,
      notes: data.notes ?? '',
    }])

    if (error) {
      setServerError(error.message)
      return
    }

    setSuccess(true)
    reset({ call_date: new Date().toISOString().slice(0, 16) })
    setTimeout(() => {
      setSuccess(false)
      router.push('/dashboard')
    }, 1500)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
      {success && (
        <div className="bg-green-900/30 border border-green-700 text-green-400 rounded-lg px-4 py-3 text-sm">
          Call logged successfully! Redirecting to dashboard…
        </div>
      )}

      {serverError && (
        <div className="bg-red-900/20 border border-red-700 text-red-400 rounded-lg px-4 py-3 text-sm">
          {serverError}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <FieldLabel required>Caller Name</FieldLabel>
          <input
            {...register('caller_name')}
            placeholder="John Smith"
            className={inputClass(!!errors.caller_name)}
          />
          {errors.caller_name && <p className="text-red-400 text-xs mt-1">{errors.caller_name.message}</p>}
        </div>

        <div>
          <FieldLabel required>Phone Number</FieldLabel>
          <input
            {...register('caller_phone')}
            placeholder="(555) 000-0000"
            className={inputClass(!!errors.caller_phone)}
          />
          {errors.caller_phone && <p className="text-red-400 text-xs mt-1">{errors.caller_phone.message}</p>}
        </div>
      </div>

      <div>
        <FieldLabel required>Call Date &amp; Time</FieldLabel>
        <input
          type="datetime-local"
          {...register('call_date')}
          className={inputClass(!!errors.call_date)}
        />
        {errors.call_date && <p className="text-red-400 text-xs mt-1">{errors.call_date.message}</p>}
      </div>

      <div>
        <FieldLabel required>Outcome</FieldLabel>
        <select {...register('outcome')} className={inputClass(!!errors.outcome)}>
          <option value="">Select outcome…</option>
          <option value="qualified">Qualified</option>
          <option value="disqualified">Disqualified</option>
          <option value="no-show">No-show</option>
          <option value="cancelled">Cancelled</option>
          <option value="booked">Booked</option>
          <option value="closed">Closed</option>
        </select>
        {errors.outcome && <p className="text-red-400 text-xs mt-1">{errors.outcome.message}</p>}
      </div>

      <div>
        <FieldLabel required>Monthly Booking Volume</FieldLabel>
        <select {...register('monthly_bookings')} className={inputClass(!!errors.monthly_bookings)}>
          <option value="">Select volume…</option>
          {MONTHLY_BOOKING_OPTIONS.map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        {errors.monthly_bookings && <p className="text-red-400 text-xs mt-1">{errors.monthly_bookings.message}</p>}
      </div>

      <div>
        <FieldLabel required>Business-Wide Close Rate</FieldLabel>
        <select {...register('close_rate')} className={inputClass(!!errors.close_rate)}>
          <option value="">Select close rate…</option>
          {CLOSE_RATE_OPTIONS.map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        {errors.close_rate && <p className="text-red-400 text-xs mt-1">{errors.close_rate.message}</p>}
      </div>

      <div>
        <FieldLabel required>Monthly Revenue</FieldLabel>
        <select {...register('monthly_revenue')} className={inputClass(!!errors.monthly_revenue)}>
          <option value="">Select revenue range…</option>
          {REVENUE_OPTIONS.map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        {errors.monthly_revenue && <p className="text-red-400 text-xs mt-1">{errors.monthly_revenue.message}</p>}
      </div>

      <div>
        <FieldLabel>Notes</FieldLabel>
        <textarea
          {...register('notes')}
          rows={4}
          placeholder="Key objections, next steps, anything worth remembering…"
          className={`${inputClass()} resize-none`}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-brand text-black font-semibold py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      >
        {isSubmitting ? 'Saving…' : 'Log Call'}
      </button>
    </form>
  )
}
