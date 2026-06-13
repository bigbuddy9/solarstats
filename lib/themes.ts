export interface ColorTheme {
  id: string
  name: string
  desc: string
  tiers: [string, string, string, string, string] // T1→T5
}

export const COLOR_THEMES: ColorTheme[] = [
  {
    id: 'cyan-aurora',
    name: 'Cyan Aurora',
    desc: 'Cyan → deep purple — premium tech feel',
    tiers: ['#00FFFF', '#38BDF8', '#2563EB', '#A78BFA', '#7C3AED'],
  },
]

export const TIER_6 = '#4B5563'

export function getTheme(id: string): ColorTheme {
  return COLOR_THEMES.find(t => t.id === id) ?? COLOR_THEMES[0]
}

export function getTierColor(theme: ColorTheme, pct: number): string {
  if (pct >= 90) return theme.tiers[0]
  if (pct >= 70) return theme.tiers[1]
  if (pct >= 50) return theme.tiers[2]
  if (pct >= 30) return theme.tiers[3]
  if (pct > 0)   return theme.tiers[4]
  return TIER_6
}
