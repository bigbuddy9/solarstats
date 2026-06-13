export interface ColorTheme {
  id: string
  name: string
  desc: string
  tiers: [string, string, string, string, string] // T1→T5
}

export const COLOR_THEMES: ColorTheme[] = [
  {
    id: 'traffic-light',
    name: 'Traffic Light',
    desc: 'Green → red — instinctive performance signal',
    tiers: ['#00FF80', '#A2FF45', '#FFF700', '#FF9D00', '#FF0400'],
  },
  {
    id: 'solar-flare',
    name: 'Solar Flare',
    desc: 'Solar yellow → ember — fits the industry',
    tiers: ['#FFEA00', '#FF9100', '#FF3D00', '#C62828', '#4A0000'],
  },
  {
    id: 'cyan-aurora',
    name: 'Cyan Aurora',
    desc: 'Cyan → deep purple — premium tech feel',
    tiers: ['#00FFFF', '#38BDF8', '#2563EB', '#A78BFA', '#7C3AED'],
  },
  {
    id: 'emerald',
    name: 'Emerald',
    desc: 'Mint → forest — clean green spectrum',
    tiers: ['#00FFD1', '#00D4AA', '#0097A7', '#00695C', '#1B3A2D'],
  },
  {
    id: 'cobalt',
    name: 'Cobalt',
    desc: 'Bright blue → midnight — sharp and professional',
    tiers: ['#448AFF', '#2962FF', '#1A44CC', '#0D2B99', '#041452'],
  },
  {
    id: 'sunset',
    name: 'Sunset',
    desc: 'Magenta → wine — high-energy warm sweep',
    tiers: ['#FF3D7F', '#FF6F47', '#FF9E1F', '#C0392B', '#5E1024'],
  },
  {
    id: 'neon-bloom',
    name: 'Neon Bloom',
    desc: 'Neon pink → midnight — bold and electric',
    tiers: ['#FF00CC', '#C026D3', '#9333EA', '#6B21A8', '#3B0764'],
  },
  {
    id: 'phantom',
    name: 'Phantom',
    desc: 'Pure greyscale — zero color, max contrast',
    tiers: ['#FFFFFF', '#B0B0B0', '#707070', '#404040', '#262626'],
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
