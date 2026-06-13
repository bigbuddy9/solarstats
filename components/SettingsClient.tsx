'use client'

import { useState, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Settings, Goal, GoalMetric, Profile } from '@/lib/supabase'
import { COLOR_THEMES, getTheme, type ColorTheme } from '@/lib/themes'

const GOAL_METRICS: { metric: GoalMetric; label: string; placeholder: string }[] = [
  { metric: 'total_sales',      label: 'Total Sales',       placeholder: '20' },
  { metric: 'revenue',          label: 'Revenue ($)',        placeholder: '100000' },
  { metric: 'appointments',     label: 'Appointments',       placeholder: '40' },
  { metric: 'sat_rate',         label: 'Sat Rate (%)',       placeholder: '80' },
  { metric: 'close_rate',       label: 'Close Rate (%)',     placeholder: '50' },
  { metric: 'same_week_sales',  label: 'One Call Closes',    placeholder: '10' },
  { metric: 'follow_up_sales',  label: 'Follow Up Sales',    placeholder: '10' },
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
  const [showRepBreakdown, setShowRepBreakdown] = useState(false)
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
        brand_color: tiers[0],
        logo_url: logoUrl,
        show_leaderboard_to_reps: showLb,
      })
      .eq('id', initial.id)
    if (err) { setError(err.message); setSaving(false); return }
    const root = document.documentElement
    root.style.setProperty('--brand-color', tiers[0])
    tiers.forEach((c, i) => root.style.setProperty(`--tier-${i + 1}`, c))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  function repTarget(metric: GoalMetric): number {
    const val = parseFloat(teamGoals[metric])
    if (!val || reps.length === 0) return 0
    return Math.round((val / reps.length) * 10) / 10
  }

  async function handleSaveGoals(includeReps: boolean) {
    setSavingGoals(true)
    setError('')
    const teamUpserts = GOAL_METRICS
      .filter(({ metric }) => teamGoals[metric] !== '')
      .map(({ metric }) => ({
        metric,
        target: parseFloat(teamGoals[metric]) || 0,
        rep_id: null as string | null,
      }))

    const repUpserts = includeReps
      ? reps.flatMap(rep =>
          GOAL_METRICS
            .filter(({ metric }) => teamGoals[metric] !== '')
            .map(({ metric }) => ({
              metric,
              target: repTarget(metric),
              rep_id: rep.id as string | null,
            }))
        )
      : []

    const { error: err } = await supabase
      .from('goals')
      .upsert([...teamUpserts, ...repUpserts], { onConflict: 'metric,rep_id' })
    if (err) { setError(err.message); setSavingGoals(false); return }
    setSavingGoals(false)
    setShowRepBreakdown(false)
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
      <div>
        <Label>Color Theme</Label>
        <p className="text-xs text-gray-600 mb-4">Sets accent color and goal progress ring tiers.</p>

        <div className="space-y-2 mb-4">
          {/* Preset themes */}
          {COLOR_THEMES.map(theme => {
            const selected = colorTheme === theme.id
            return (
              <button
                key={theme.id}
                onClick={() => setColorTheme(theme.id)}
                className={`w-full flex items-center gap-4 p-3 rounded-xl border transition-all text-left ${
                  selected ? 'border-white/30 bg-white/[0.04]' : 'border-white/[0.06] bg-white/[0.02] hover:border-white/10'
                }`}
              >
                <div className="h-7 w-28 rounded-md flex-shrink-0 overflow-hidden flex">
                  {theme.tiers.map((color, i) => (
                    <div key={i} className="flex-1 h-full" style={{ backgroundColor: color }} />
                  ))}
                </div>
                <p className={`flex-1 text-sm font-semibold ${selected ? 'text-white' : 'text-gray-400'}`}>{theme.name}</p>
                {selected && <div className="h-2 w-2 rounded-full bg-brand flex-shrink-0" />}
              </button>
            )
          })}

          {/* Custom theme option */}
          <button
            onClick={() => setColorTheme('custom')}
            className={`w-full flex items-center gap-4 p-3 rounded-xl border transition-all text-left ${
              colorTheme === 'custom' ? 'border-white/30 bg-white/[0.04]' : 'border-white/[0.06] bg-white/[0.02] hover:border-white/10'
            }`}
          >
            <div className="h-6 w-24 rounded-md flex-shrink-0 flex items-center justify-center border border-white/10 border-dashed">
              <span className="text-gray-600 text-xs">Custom</span>
            </div>
            <div className="flex-1">
              <p className={`text-sm font-semibold ${colorTheme === 'custom' ? 'text-white' : 'text-gray-300'}`}>Custom</p>
              <p className="text-xs text-gray-600">Enter your own 5 hex codes</p>
            </div>
            {colorTheme === 'custom' && <div className="h-2 w-2 rounded-full bg-brand flex-shrink-0" />}
          </button>
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
                  }}
                  placeholder="#000000"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono focus:border-brand focus:outline-none"
                />
                <span className="text-xs text-gray-600 w-32 shrink-0">{TIER_LABELS[i].split('—')[0].trim()}</span>
              </div>
            ))}
          </div>
        )}

        {/* Live preview */}
        <div className="mt-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-3">Preview</p>
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              {activeTiers.map((color, i) => (
                <div key={i} className="h-8 w-8 rounded-lg" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}66` }} />
              ))}
            </div>
            <div className="flex-1 h-2 rounded-full" style={{ background: `linear-gradient(90deg, ${activeTiers.join(', ')})` }} />
          </div>
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
      <div className="border-t border-white/[0.06] pt-8 mt-2">
        <div className="mb-6">
          <h3 className="text-base font-bold text-white">Monthly Goals</h3>
          <p className="text-xs text-gray-500 mt-1">Set monthly targets for the whole team. We'll calculate what each rep needs to hit.</p>
        </div>

        {savedGoals && (
          <div className="flex items-center gap-3 bg-green-400/10 border border-green-400/30 rounded-xl px-5 py-4 mb-4">
            <div className="h-2 w-2 rounded-full bg-green-400 shrink-0" />
            <p className="text-green-300 text-sm font-medium">Goals saved.</p>
          </div>
        )}

        {/* Team target inputs */}
        <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-widest mb-3">Team Target</p>
        <div className="space-y-3 mb-6">
          {GOAL_METRICS.map(({ metric, label, placeholder }) => (
            <div key={metric} className="flex items-center gap-4">
              <label className="text-sm text-gray-300 w-40 shrink-0">{label}</label>
              <input
                type="number"
                min="0"
                value={teamGoals[metric]}
                onChange={e => {
                  setTeamGoals(prev => ({ ...prev, [metric]: e.target.value }))
                  setShowRepBreakdown(false)
                }}
                placeholder={placeholder}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-brand focus:outline-none placeholder-gray-700"
              />
            </div>
          ))}
        </div>

        {/* Per-rep breakdown */}
        {reps.length > 0 && !showRepBreakdown && (
          <button
            onClick={() => setShowRepBreakdown(true)}
            className="w-full mb-4 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm hover:border-white/20 hover:text-white transition-colors"
          >
            Calculate per-rep targets ({reps.length} rep{reps.length !== 1 ? 's' : ''}) →
          </button>
        )}

        {showRepBreakdown && reps.length > 0 && (
          <div className="mb-5 rounded-xl border border-white/[0.08] overflow-hidden">
            <div className="px-4 py-3 bg-white/[0.02] border-b border-white/[0.06] flex items-center justify-between">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
                Per Rep — {reps.length} rep{reps.length !== 1 ? 's' : ''}
              </p>
              <p className="text-[11px] text-gray-600">Team target ÷ {reps.length}</p>
            </div>

            {/* Header row */}
            <div className="grid gap-2 px-4 py-2 border-b border-white/[0.04]" style={{ gridTemplateColumns: `1fr repeat(${GOAL_METRICS.length}, minmax(0,1fr))` }}>
              <span className="text-[11px] text-gray-600">Rep</span>
              {GOAL_METRICS.map(({ label }) => (
                <span key={label} className="text-[10px] text-gray-600 text-center truncate">{label}</span>
              ))}
            </div>

            {reps.map((rep, i) => (
              <div
                key={rep.id}
                className={`grid gap-2 px-4 py-3 items-center ${i < reps.length - 1 ? 'border-b border-white/[0.04]' : ''}`}
                style={{ gridTemplateColumns: `1fr repeat(${GOAL_METRICS.length}, minmax(0,1fr))` }}
              >
                <span className="text-sm text-white font-medium truncate">{rep.name}</span>
                {GOAL_METRICS.map(({ metric }) => {
                  const t = repTarget(metric)
                  return (
                    <span key={metric} className={`text-sm text-center font-semibold ${t > 0 ? 'text-brand' : 'text-gray-600'}`}>
                      {t > 0 ? t : '—'}
                    </span>
                  )
                })}
              </div>
            ))}

            <div className="px-4 py-3 bg-white/[0.02] border-t border-white/[0.06] flex gap-3">
              <button
                onClick={() => handleSaveGoals(true)}
                disabled={savingGoals}
                className="flex-1 bg-brand text-black font-bold py-2.5 rounded-lg text-sm tracking-wide uppercase disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {savingGoals ? 'Saving…' : 'Approve & Save All'}
              </button>
              <button
                onClick={() => handleSaveGoals(false)}
                disabled={savingGoals}
                className="flex-1 bg-white/5 border border-white/10 text-gray-300 font-bold py-2.5 rounded-lg text-sm tracking-wide uppercase disabled:opacity-50 hover:border-white/20 hover:text-white transition-colors"
              >
                Team Only
              </button>
            </div>
          </div>
        )}

        {!showRepBreakdown && (
          <button
            onClick={() => handleSaveGoals(false)}
            disabled={savingGoals}
            className="w-full bg-white/5 border border-white/10 text-gray-300 font-bold py-3 rounded-xl hover:border-white/20 hover:text-white transition-colors disabled:opacity-50 text-sm tracking-wide uppercase"
          >
            {savingGoals ? 'Saving…' : 'Save Team Goals'}
          </button>
        )}
      </div>
    </div>
  )
}
