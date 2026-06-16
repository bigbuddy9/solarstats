'use client'

import { useState, useRef, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Settings, Goal, GoalMetric, Profile } from '@/lib/supabase'
import { COLOR_THEMES, getTheme, type ColorTheme } from '@/lib/themes'

// Metrics the owner types in manually
const MANUAL_METRICS: { metric: GoalMetric; label: string }[] = [
  { metric: 'total_sales',      label: 'Total Sales'      },
  { metric: 'revenue',          label: 'Revenue ($)'      },
  { metric: 'sat_rate',         label: 'Sat Rate (%)'     },
  { metric: 'close_rate',       label: 'Close Rate (%)'   },
  { metric: 'appointments',     label: 'Appointments'     },
  { metric: 'total_solar_kw',   label: 'Total Solar kW'   },
  { metric: 'total_battery_kw', label: 'Total Battery kW' },
]

function calcAverages(goals: Record<GoalMetric, string>): Partial<Record<GoalMetric, number>> {
  const sales = parseFloat(goals['total_sales'])
  const revenue = parseFloat(goals['revenue'])
  const solar = parseFloat(goals['total_solar_kw'])
  const battery = parseFloat(goals['total_battery_kw'])
  return {
    avg_revenue:      sales > 0 && revenue > 0  ? Math.round(revenue / sales)            : undefined,
    avg_solar_kw:     sales > 0 && solar > 0    ? Math.round((solar / sales) * 100) / 100 : undefined,
    avg_battery_kw:   sales > 0 && battery > 0  ? Math.round((battery / sales) * 100) / 100 : undefined,
  }
}

const TIER_LABELS = ['Tier 1 — Crushing It (90–100%)', 'Tier 2 — Strong (70–89%)', 'Tier 3 — On Track (50–69%)', 'Tier 4 — Needs Work (30–49%)', 'Tier 5 — Struggling (0–29%)']

function ThemeDropdown({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = value === 'custom' ? null : COLOR_THEMES.find(t => t.id === value)
  const selectedTiers = selected?.tiers ?? null

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-left hover:border-white/20 transition-colors"
      >
        {selectedTiers ? (
          <div className="flex gap-0.5 rounded overflow-hidden flex-shrink-0">
            {selectedTiers.map((c, i) => <div key={i} className="h-5 w-5" style={{ backgroundColor: c }} />)}
          </div>
        ) : (
          <div className="h-5 w-[100px] rounded border border-white/10 border-dashed flex items-center justify-center flex-shrink-0">
            <span className="text-gray-600 text-[10px]">Custom</span>
          </div>
        )}
        <span className="flex-1 text-sm text-white font-medium">{selected?.name ?? 'Custom'}</span>
        <svg className={`text-gray-500 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Options panel */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-[#0f0f0f] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
          <div className="max-h-72 overflow-y-auto">
            {COLOR_THEMES.map(theme => {
              const isSelected = value === theme.id
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => { onChange(theme.id); setOpen(false) }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/[0.04] transition-colors ${isSelected ? 'bg-white/[0.03]' : ''}`}
                >
                  <div className="flex gap-0.5 rounded overflow-hidden flex-shrink-0">
                    {theme.tiers.map((c, i) => <div key={i} className="h-5 w-5" style={{ backgroundColor: c }} />)}
                  </div>
                  <span className={`flex-1 text-sm ${isSelected ? 'text-white font-semibold' : 'text-gray-300'}`}>{theme.name}</span>
                  {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-brand flex-shrink-0" />}
                </button>
              )
            })}
            {/* Custom */}
            <button
              type="button"
              onClick={() => { onChange('custom'); setOpen(false) }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/[0.04] transition-colors ${value === 'custom' ? 'bg-white/[0.03]' : ''}`}
            >
              <div className="h-5 w-[100px] rounded border border-white/10 border-dashed flex items-center justify-center flex-shrink-0">
                <span className="text-gray-600 text-[10px]">Custom</span>
              </div>
              <span className={`flex-1 text-sm ${value === 'custom' ? 'text-white font-semibold' : 'text-gray-300'}`}>Custom</span>
              {value === 'custom' && <div className="h-1.5 w-1.5 rounded-full bg-brand flex-shrink-0" />}
            </button>
          </div>
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
    MANUAL_METRICS.forEach(({ metric }) => {
      const found = initialGoals.find(g => g.metric === metric && g.scope === 'team')
      init[metric] = found ? String(found.target) : ''
    })
    return init
  })
  const [repGoals, setRepGoals] = useState<Record<GoalMetric, string>>(() => {
    const init = {} as Record<GoalMetric, string>
    MANUAL_METRICS.forEach(({ metric }) => {
      const found = initialGoals.find(g => g.metric === metric && g.scope === 'rep')
      init[metric] = found ? String(found.target) : ''
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
    // Namespace by tenant so businesses never overwrite each other's logo.
    // Cache-bust with a timestamp so the new upload shows immediately.
    const path = `${initial.id}/logo-${Date.now()}.${ext}`
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

    function buildUpserts(goals: Record<GoalMetric, string>, scope: 'team' | 'rep') {
      const manual = MANUAL_METRICS
        .filter(({ metric }) => goals[metric] !== '' && goals[metric] !== undefined)
        .map(({ metric }) => ({ metric, target: parseFloat(goals[metric]) || 0, scope, tenant_id: initial.id }))
      const avgs = calcAverages(goals)
      const auto = (Object.entries(avgs) as [GoalMetric, number | undefined][])
        .filter(([, v]) => v !== undefined)
        .map(([metric, target]) => ({ metric, target: target!, scope, tenant_id: initial.id }))
      return [...manual, ...auto]
    }

    const upserts = [
      ...buildUpserts(teamGoals, 'team'),
      ...buildUpserts(repGoals, 'rep'),
    ]

    const { error: err } = await supabase
      .from('goals')
      .upsert(upserts, { onConflict: 'metric,scope,tenant_id' })
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
          <ThemeDropdown
            value={colorTheme}
            onChange={id => {
              setColorTheme(id)
              if (id !== 'custom') setPrimaryColor(getTheme(id).tiers[0])
            }}
          />
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
            {MANUAL_METRICS.map(({ metric, label }) => (
              <div key={metric} className="flex items-center gap-4">
                <label className="text-sm text-gray-300 w-40 shrink-0">{label}</label>
                <input
                  type="number" min="0"
                  value={teamGoals[metric] ?? ''}
                  onChange={e => setTeamGoals(prev => ({ ...prev, [metric]: e.target.value }))}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-brand focus:outline-none"
                />
              </div>
            ))}
          </div>
          {/* Auto-calculated averages preview */}
          {(() => {
            const avgs = calcAverages(teamGoals)
            const labels: Partial<Record<GoalMetric, string>> = { avg_revenue: 'Avg Revenue', avg_solar_kw: 'Avg Solar kW', avg_battery_kw: 'Avg Battery kW' }
            const entries = (Object.entries(avgs) as [GoalMetric, number | undefined][]).filter(([, v]) => v !== undefined)
            if (!entries.length) return null
            return (
              <div className="mt-3 px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] flex flex-wrap gap-x-6 gap-y-1">
                {entries.map(([metric, val]) => (
                  <span key={metric} className="text-xs text-gray-500">
                    <span className="text-gray-600">{labels[metric]}:</span> <span className="text-gray-300 font-medium">{metric === 'avg_revenue' ? `$${val!.toLocaleString()}` : val}</span> <span className="text-gray-700">auto</span>
                  </span>
                ))}
              </div>
            )
          })()}
        </div>

        {/* Per-rep goals — one set applies to all reps */}
        <div>
          <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-widest mb-1">Rep Goals</p>
          <p className="text-xs text-gray-600 mb-3">Applies to every rep. Used for progress rings on individual rep dashboards.</p>
          <div className="space-y-3">
            {MANUAL_METRICS.map(({ metric, label }) => (
              <div key={metric} className="flex items-center gap-4">
                <label className="text-sm text-gray-300 w-40 shrink-0">{label}</label>
                <input
                  type="number" min="0"
                  value={repGoals[metric] ?? ''}
                  onChange={e => setRepGoals(prev => ({ ...prev, [metric]: e.target.value }))}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-brand focus:outline-none"
                />
              </div>
            ))}
          </div>
          {(() => {
            const avgs = calcAverages(repGoals)
            const labels: Partial<Record<GoalMetric, string>> = { avg_revenue: 'Avg Revenue', avg_solar_kw: 'Avg Solar kW', avg_battery_kw: 'Avg Battery kW' }
            const entries = (Object.entries(avgs) as [GoalMetric, number | undefined][]).filter(([, v]) => v !== undefined)
            if (!entries.length) return null
            return (
              <div className="mt-3 px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] flex flex-wrap gap-x-6 gap-y-1">
                {entries.map(([metric, val]) => (
                  <span key={metric} className="text-xs text-gray-500">
                    <span className="text-gray-600">{labels[metric]}:</span> <span className="text-gray-300 font-medium">{metric === 'avg_revenue' ? `$${val!.toLocaleString()}` : val}</span> <span className="text-gray-700">auto</span>
                  </span>
                ))}
              </div>
            )
          })()}
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
