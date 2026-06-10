'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/lib/supabase'

const ROLE_BADGE: Record<string, string> = {
  owner: 'bg-yellow-400/20 text-yellow-400',
  rep:   'bg-white/10 text-gray-400',
}

export default function TeamManager({ profiles }: { profiles: Profile[] }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'rep' | 'owner'>('rep')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [removing, setRemoving] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role }),
    })

    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }

    setName(''); setEmail(''); setPassword(''); setRole('rep')
    setShowForm(false)
    setLoading(false)
    router.refresh()
  }

  async function handleRemove(userId: string) {
    if (!confirm('Remove this user? This cannot be undone.')) return
    setRemoving(userId)

    await fetch('/api/team', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })

    setRemoving(null)
    router.refresh()
  }

  const inputCls = 'w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 text-sm focus:border-brand transition-colors'

  return (
    <div className="space-y-4">
      {/* Member list */}
      <div className="bg-black border border-white/5 rounded-xl overflow-hidden">
        {profiles.length === 0 ? (
          <p className="p-6 text-gray-600 text-sm text-center">No team members yet.</p>
        ) : (
          profiles.map(p => (
            <div key={p.id} className="flex items-center justify-between px-5 py-4 border-b border-white/5 last:border-0">
              <div>
                <p className="text-white text-sm font-medium">{p.name}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded font-medium capitalize ${ROLE_BADGE[p.role]}`}>
                  {p.role}
                </span>
                <button
                  onClick={() => handleRemove(p.id)}
                  disabled={removing === p.id}
                  className="text-xs text-gray-600 hover:text-red-400 transition-colors disabled:opacity-40"
                >
                  {removing === p.id ? 'Removing…' : 'Remove'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add member */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full bg-brand text-black font-bold py-3.5 rounded-xl hover:opacity-90 transition-all text-sm tracking-wide uppercase"
        >
          + Add Team Member
        </button>
      ) : (
        <form onSubmit={handleAdd} className="bg-black border border-white/5 rounded-xl p-6 space-y-4">
          <h3 className="text-white font-semibold">New Team Member</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" required className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Role</label>
              <select value={role} onChange={e => setRole(e.target.value as 'rep' | 'owner')} className={inputCls}>
                <option value="rep">Rep</option>
                <option value="owner">Admin</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="rep@example.com" required className={inputCls} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Temporary Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" minLength={6} required className={inputCls} />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading}
              className="flex-1 bg-brand text-black font-bold py-3 rounded-xl hover:opacity-90 transition-all disabled:opacity-40 text-sm uppercase tracking-wide">
              {loading ? 'Creating…' : 'Create Account'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setError('') }}
              className="px-6 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white text-sm transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
