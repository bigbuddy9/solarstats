export interface ColorTheme {
  id: string
  name: string
  desc: string
  tiers: [string, string, string, string, string]
}

export const COLOR_THEMES: ColorTheme[] = [
  // Spectrum presets
  { id: 'cyan-aurora',   name: 'Cyan Aurora',   desc: 'Cyan → deep purple',       tiers: ['#00FFFF','#38BDF8','#2563EB','#A78BFA','#7C3AED'] },
  { id: 'traffic-light', name: 'Traffic Light',  desc: 'Green → red',              tiers: ['#00FF80','#A2FF45','#FFF700','#FF9D00','#FF0400'] },
  { id: 'solar-flare',   name: 'Solar Flare',    desc: 'Solar yellow → ember',     tiers: ['#FFEA00','#FF9100','#FF3D00','#C62828','#4A0000'] },
  // Single-hue
  { id: 'crimson',       name: 'Crimson',        desc: 'Red → dark',               tiers: ['#FF5252','#E81E1E','#B71515','#7D0E0E','#3E0707'] },
  { id: 'tangerine',     name: 'Tangerine',      desc: 'Orange → ember',           tiers: ['#FFAE2B','#FF8800','#E66A00','#A8470A','#5A2400'] },
  { id: 'molten-gold',   name: 'Molten Gold',    desc: 'Gold → espresso',          tiers: ['#FFD60A','#F5A623','#C77F0A','#8A5408','#3D2604'] },
  { id: 'forest',        name: 'Forest',         desc: 'Green → pine',             tiers: ['#4ADE80','#22C55E','#15883D','#0D5827','#062E14'] },
  { id: 'lagoon',        name: 'Lagoon',         desc: 'Aqua → abyss',             tiers: ['#00F0FF','#00C2D6','#0B8E9E','#0A5A66','#052B30'] },
  { id: 'cobalt',        name: 'Cobalt',         desc: 'Bright blue → midnight',   tiers: ['#448AFF','#2962FF','#1A44CC','#0D2B99','#041452'] },
  { id: 'arctic',        name: 'Arctic',         desc: 'Ice → abyss',              tiers: ['#F0F8FF','#87CEEB','#4682B4','#265480','#142D47'] },
  { id: 'amethyst',      name: 'Amethyst',       desc: 'Lavender → indigo',        tiers: ['#C77DFF','#9D4EDF','#7B2CBF','#531B8C','#2A0E4A'] },
  { id: 'rose-quartz',   name: 'Rose Quartz',    desc: 'Blush → maroon',           tiers: ['#FFB3C6','#E8537A','#C2185B','#880E4F','#3C0520'] },
  { id: 'phantom',       name: 'Phantom',        desc: 'White → obsidian',         tiers: ['#FFFFFF','#B0B0B0','#707070','#404040','#262626'] },
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
