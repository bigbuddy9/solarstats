'use client'

import { useState, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Settings, Goal, GoalMetric, Profile } from '@/lib/supabase'
import { COLOR_THEMES, getTheme, type ColorTheme } from '@/lib/themes'

const GOAL_METRICS: { metric: GoalMetric; label: string; placeholder: string }[] = [
  { metric: 'total_sales',      label: 'Total Sales',       placeholder: '' },
  { metric: 'revenue',          label: 'Revenue ($)',        placeholder: '' },
  { metric: 'appointments',     label: 'Appointments',       placeholder: '' },
  { metric: 'sat_rate',         label: 'Sat Rate (%)',       placeholder: '' },
  { metric: 'close_rate',       label: 'Close Rate (%)',     placeholder: '' },
  { metric: 'same_week_sales',  label: 'One Call Closes',    placeholder: '' },
  { metric: 'follow_up_sales',  label: 'Follow Up Sales',    placeholder: '' },
]

const TIER_LABELS = ['Tier 1 — Crushing It (90–100%)', 'Tier 2 — Strong (70–89%)', 'Tier 3 — On Track (50–69%)', 'Tier 4 — Needs Work (30–49%)', 'Tier 5 — Struggling (0–29%)']

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

interface Props { settings: Settings; goals: Goal[]; reps: Profile[] }

export default function SettingsClient({ settings: initial, goals: initialGoals, reps }: Props) {
  const supabase = createClientComponentClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [businessName, setBusinessName] = useState(initial.business_name)
  const [colorTheme,   setColorTheme]   = useState(initial.color_theme || 'cyan-aurora')
  const [customTiers,  setCustomTiers]  = useState<[string,string,string,string,string]>(['#00FFFF','#38BDF8','#2563EB','#A78BFA','#7C3AED'])
  const [primaryColor, setPrimaryColor] = useState(initial.brand_color || getTheme(initial.color_theme || 'cyan-aurora').tiers[0])
  const [logoUrl,      setLogoUrl]      = useState(initial.logo_url || '')
  const [showLb,       setShowLb]       = useState(initial.show_leaderboard_to_reps ?? false)
  const [uploading,    setUploading]    = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)
  const [error,        setError]        = useState('')

  const [teamGoals, setTeamGoals] = useState<Record<GoalMetric, string>>(() => {
    const init = {} as Record<GoalMetric, string>
    GOAL_METRICS.forEach(({ metric }) => {
      const found = initialGoals.find(g => g.metric === metric && g.rep_id === null)
      init[metric] = found ? String(found.target) : ''
    })
    return init
  })
  // repGoals[repId][metric] = target string
  const [repGoals, setRepGoals] = useState<Record<string, Record<GoalMetric, string>>>(() => {
    const init: Record<string, Record<GoalMetric, string>> = {}
    reps.forEach(rep => {
      init[rep.id] = {} as Record<GoalMetric, string>
      GOAL_METRICS.forEach(({ metric }) => {
        const found = initialGoals.find(g => g.metric === metric && g.rep_id === rep.id)
        init[rep.id][metric] = found ? String(found.target) : ''
      })
    })
    return init
  })
  const [savingGoals, setSavingGoals] = useState(false)
  const [savedGoals, setSavedGoals] = useState(false)

  function getActiveTiers(): ColorTheme['tiers'] {
    if (colorTheme === 'custom') return customTiers
    return getTheme(colorTheme).tiers
  }

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
    const tiers = getActiveTiers()
    const { error: err } = await supabase
      .from('settings')
      .update({
        business_name: businessName,
        color_theme: colorTheme,
        brand_color: primaryColor,
        logo_url: logoUrl,
        show_leaderboard_to_reps: showLb,
      })
      .eq('id', initial.id)
    if (err) { setError(err.message); setSaving(false); return }
    const root = document.documentElement
    root.style.setProperty('--brand-color', primaryColor)
    tiers.forEach((c, i) => root.style.setProperty(`--tier-${i + 1}`, c))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handleSaveGoals() {
    setSavingGoals(true)
    setError('')

    const teamUpserts = GOAL_METRICS
      .filter(({ metric }) => teamGoals[metric] !== '')
      .map(({ metric }) => ({
        metric,
        target: parseFloat(teamGoals[metric]) || 0,
        rep_id: null as string | null,
      }))

    const repUpserts = reps.flatMap(rep =>
      GOAL_METRICS
        .filter(({ metric }) => repGoals[rep.id]?.[metric] !== '')
        .map(({ metric }) => ({
          metric,
          target: parseFloat(repGoals[rep.id]?.[metric] ?? '0') || 0,
          rep_id: rep.id as string | null,
        }))
    )

    const { error: err } = await supabase
      .from('goals')
      .upsert([...teamUpserts, ...repUpserts], { onConflict: 'metric,rep_id' })
    if (err) { setError(err.message); setSavingGoals(false); return }
    setSavingGoals(false)
    setSavedGoals(true)
    setTimeout(() => setSavedGoals(false), 3000)
  }

  const activeTiers = getActiveTiers()

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
      <div className="space-y-4">
        <div>
          <Label>Color Theme</Label>
          {/* Dropdown */}
          <div className="relative">
            <select
              value={colorTheme}
              onChange={e => {
                setColorTheme(e.target.value)
                if (e.target.value !== 'custom') {
                  setPrimaryColor(getTheme(e.target.value).tiers[0])
                }
              }}
              className="w-full appearance-none bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:border-brand focus:outline-none pr-10"
            >
              {COLOR_THEMES.map(t => (
                <option key={t.id} value={t.id} style={{ background: '#111' }}>{t.name}</option>
              ))}
              <option value="custom" style={{ background: '#111' }}>Custom</option>
            </select>
            {/* Swatch preview inside the dropdown trigger */}
            <div className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 flex gap-0.5 overflow-hidden rounded">
              {activeTiers.map((color, i) => (
                <div key={i} className="h-4 w-4" style={{ backgroundColor: color }} />
              ))}
            </div>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>
        </div>

        {/* Custom tier inputs */}
        {colorTheme === 'custom' && (
          <div className="space-y-2 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            {customTiers.map((color, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-md flex-shrink-0 border border-white/10" style={{ backgroundColor: color }} />
                <input
                  value={color}
                  onChange={e => {
                    const next = [...customTiers] as typeof customTiers
                    next[i] = e.target.value
                    setCustomTiers(next)
                    if (i === 0) setPrimaryColor(e.target.value)
                  }}
                  placeholder="#000000"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono focus:border-brand focus:outline-none"
                />
                <span className="text-xs text-gray-600 w-16 shrink-0">{['T1','T2','T3','T4','T5'][i]}</span>
              </div>
            ))}
          </div>
        )}

        {/* Primary color */}
        <div>
          <Label>Primary Color</Label>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg flex-shrink-0 border border-white/10" style={{ backgroundColor: primaryColor }} />
            <input
              value={primaryColor}
              onChange={e => setPrimaryColor(e.target.value)}
              placeholder="#00FFFF"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm font-mono focus:border-brand focus:outline-none placeholder-gray-700"
            />
            {primaryColor !== activeTiers[0] && (
              <button
                onClick={() => setPrimaryColor(activeTiers[0])}
                className="text-xs text-gray-600 hover:text-white transition-colors whitespace-nowrap"
              >
                Reset
              </button>
            )}
          </div>
          <p className="text-xs text-gray-600 mt-1.5">Used for nav accent, buttons, and live indicator. Defaults to the theme's top tier.</p>
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
          <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Show leaderboard to reps</span>
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

      {/* Monthly Goals */}
      <div className="border-t border-white/[0.06] pt-8 mt-2 space-y-8">
        <div>
          <h3 className="text-base font-bold text-white mb-1">Monthly Goals</h3>
          <p className="text-xs text-gray-500">Set targets for the team and for individual reps independently.</p>
        </div>

        {savedGoals && (
          <div className="flex items-center gap-3 bg-green-400/10 border border-green-400/30 rounded-xl px-5 py-4">
            <div className="h-2 w-2 rounded-full bg-green-400 shrink-0" />
            <p className="text-green-300 text-sm font-medium">Goals saved.</p>
          </div>
        )}

        {/* Team goals */}
        <div>
          <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-widest mb-3">Team</p>
          <div className="space-y-3">
            {GOAL_METRICS.map(({ metric, label, placeholder }) => (
              <div key={metric} className="flex items-center gap-4">
                <label className="text-sm text-gray-300 w-40 shrink-0">{label}</label>
                <input
                  type="number" min="0"
                  value={teamGoals[metric]}
                  onChange={e => setTeamGoals(prev => ({ ...prev, [metric]: e.target.value }))}
                  placeholder={placeholder}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-brand focus:outline-none placeholder-gray-700"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Per-rep goals */}
        <div>
          <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-widest mb-3">Per Rep</p>
          {reps.length === 0 ? (
            <p className="text-sm text-gray-600">No reps on the team yet. Add reps and their goals will appear here.</p>
          ) : (
            <div className="space-y-6">
              {reps.map(rep => (
                <div key={rep.id}>
                  <p className="text-sm font-semibold text-white mb-2">{rep.name}</p>
                  <div className="space-y-2">
                    {GOAL_METRICS.map(({ metric, label }) => (
                      <div key={metric} className="flex items-center gap-4">
                        <label className="text-sm text-gray-500 w-40 shrink-0">{label}</label>
                        <input
                          type="number" min="0"
                          value={repGoals[rep.id]?.[metric] ?? ''}
                          onChange={e => setRepGoals(prev => ({
                            ...prev,
                            [rep.id]: { ...prev[rep.id], [metric]: e.target.value }
                          }))}
                          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-brand focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleSaveGoals}
          disabled={savingGoals}
          className="w-full bg-white/5 border border-white/10 text-gray-300 font-bold py-3 rounded-xl hover:border-white/20 hover:text-white transition-colors disabled:opacity-50 text-sm tracking-wide uppercase"
        >
          {savingGoals ? 'Saving…' : 'Save Goals'}
        </button>
      </div>
    </div>
  )
}
