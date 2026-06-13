'use client'

import { useState, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Settings } from '@/lib/supabase'
import { COLOR_THEMES, getTheme } from '@/lib/themes'

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
      {children}
    </label>
  )
}

function inputCls() {
  return 'w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 text-sm transition-colors hover:border-white/20 focus:border-brand focus:outline-none'
}

interface Props { settings: Settings }

export default function SettingsClient({ settings: initial }: Props) {
  const supabase = createClientComponentClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [businessName, setBusinessName] = useState(initial.business_name)
  const [colorTheme,   setColorTheme]   = useState(initial.color_theme || 'traffic-light')
  const [logoUrl,      setLogoUrl]      = useState(initial.logo_url || '')
  const [showLb,       setShowLb]       = useState(initial.show_leaderboard_to_reps ?? false)
  const [uploading,    setUploading]    = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)
  const [error,        setError]        = useState('')

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    const ext = file.name.split('.').pop()
    const path = `logo.${ext}`
    const { error: upErr } = await supabase.storage.from('logos').upload(path, file, { upsert: true })
    if (upErr) { setError(upErr.message); setUploading(false); return }
    const { data } = supabase.storage.from('logos').getPublicUrl(path)
    setLogoUrl(data.publicUrl)
    setUploading(false)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    const theme = getTheme(colorTheme)
    const { error: err } = await supabase
      .from('settings')
      .update({
        business_name: businessName,
        color_theme: colorTheme,
        brand_color: theme.tiers[0],
        logo_url: logoUrl,
        show_leaderboard_to_reps: showLb,
      })
      .eq('id', initial.id)
    if (err) { setError(err.message); setSaving(false); return }
    // Apply theme live
    const root = document.documentElement
    root.style.setProperty('--brand-color', theme.tiers[0])
    root.style.setProperty('--tier-1', theme.tiers[0])
    root.style.setProperty('--tier-2', theme.tiers[1])
    root.style.setProperty('--tier-3', theme.tiers[2])
    root.style.setProperty('--tier-4', theme.tiers[3])
    root.style.setProperty('--tier-5', theme.tiers[4])
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="max-w-xl space-y-8">
      {saved && (
        <div className="flex items-center gap-3 bg-green-400/10 border border-green-400/30 rounded-xl px-5 py-4">
          <div className="h-2 w-2 rounded-full bg-green-400 shrink-0" />
          <p className="text-green-300 text-sm font-medium">Settings saved.</p>
        </div>
      )}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-4 text-red-400 text-sm">{error}</div>
      )}

      {/* Business Name */}
      <div>
        <Label>Business Name</Label>
        <input
          value={businessName}
          onChange={e => setBusinessName(e.target.value)}
          placeholder="Scale Solar"
          className={inputCls()}
        />
        <p className="text-xs text-gray-600 mt-1.5">Appears in the nav and dashboard header.</p>
      </div>

      {/* Logo */}
      <div>
        <Label>Logo</Label>
        <div className="flex items-center gap-4">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-10 w-auto rounded object-contain bg-white/5 px-2 py-1" />
          ) : (
            <div className="h-10 w-10 rounded bg-white/5 border border-white/10 flex items-center justify-center text-gray-600 text-xs">None</div>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="text-xs px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:border-white/20 hover:text-white transition-colors disabled:opacity-40"
          >
            {uploading ? 'Uploading…' : 'Upload Logo'}
          </button>
          {logoUrl && (
            <button onClick={() => setLogoUrl('')} className="text-xs text-gray-600 hover:text-red-400 transition-colors">Remove</button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
        <p className="text-xs text-gray-600 mt-2">PNG or SVG recommended. Shown in the top nav.</p>
      </div>

      {/* Color Theme */}
      <div>
        <Label>Color Theme</Label>
        <p className="text-xs text-gray-600 mb-4">Sets accent color and progress ring tiers across the app.</p>
        <div className="space-y-2">
          {COLOR_THEMES.map(theme => {
            const selected = colorTheme === theme.id
            return (
              <button
                key={theme.id}
                onClick={() => setColorTheme(theme.id)}
                className={`w-full flex items-center gap-4 p-3 rounded-xl border transition-all text-left ${
                  selected
                    ? 'border-white/30 bg-white/[0.04]'
                    : 'border-white/[0.06] bg-white/[0.02] hover:border-white/10'
                }`}
              >
                {/* Gradient bar */}
                <div
                  className="h-6 w-24 rounded-md flex-shrink-0"
                  style={{ background: `linear-gradient(90deg, ${theme.tiers.join(', ')})` }}
                />
                {/* 5 dots */}
                <div className="flex gap-1.5 flex-shrink-0">
                  {theme.tiers.map((color, i) => (
                    <div
                      key={i}
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}88` }}
                    />
                  ))}
                </div>
                {/* Name + desc */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${selected ? 'text-white' : 'text-gray-300'}`}>{theme.name}</p>
                  <p className="text-xs text-gray-600 truncate">{theme.desc}</p>
                </div>
                {/* Selected indicator */}
                {selected && (
                  <div className="h-2 w-2 rounded-full bg-brand flex-shrink-0" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Leaderboard */}
      <div>
        <Label>Leaderboard</Label>
        <label className="flex items-center gap-3 cursor-pointer group">
          <div
            onClick={() => setShowLb(v => !v)}
            className={`relative w-10 h-5 rounded-full transition-colors ${showLb ? 'bg-brand' : 'bg-white/10'}`}
          >
            <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${showLb ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
            Show leaderboard to reps
          </span>
        </label>
        <p className="text-xs text-gray-600 mt-2">When on, reps can see the full team leaderboard on their dashboard.</p>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-brand text-black font-bold py-3.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 text-sm tracking-wide uppercase"
      >
        {saving ? 'Saving…' : 'Save Settings'}
      </button>
    </div>
  )
}
