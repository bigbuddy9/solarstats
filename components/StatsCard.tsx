interface StatsCardProps {
  label: string
  value: string
  accent?: 'green' | 'yellow' | 'default'
  sub?: string
  goalPct?: number   // 0–100+, percentage of goal achieved
  goalColor?: string // hex color from tier system
}

function Ring({ pct, color }: { pct: number; color: string }) {
  const r = 28
  const circ = 2 * Math.PI * r
  const filled = Math.min(pct / 100, 1) * circ

  return (
    <svg width="72" height="72" className="absolute inset-0 m-auto" style={{ top: 0, left: 0, right: 0, bottom: 0, margin: 'auto', position: 'absolute' }}>
      <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
      <circle
        cx="36" cy="36" r={r} fill="none"
        stroke={color} strokeWidth="4"
        strokeDasharray={`${filled} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
        style={{ filter: `drop-shadow(0 0 4px ${color}88)`, transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  )
}

export default function StatsCard({ label, value, accent = 'default', sub, goalPct, goalColor }: StatsCardProps) {
  const valueColor =
    accent === 'green' ? 'text-green-400' :
    accent === 'yellow' ? 'text-brand' :
    'text-white'

  const hasRing = goalPct !== undefined && goalColor !== undefined

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 flex flex-col gap-3 hover:border-white/10 transition-colors">
      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest leading-none">{label}</p>
      <div className={hasRing ? 'flex items-center gap-4' : ''}>
        {hasRing && (
          <div className="relative flex-shrink-0 h-[72px] w-[72px]">
            <Ring pct={goalPct!} color={goalColor!} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] font-bold text-gray-400">{Math.round(goalPct!)}%</span>
            </div>
          </div>
        )}
        <div>
          <p className={`text-3xl font-bold leading-none tracking-tight ${valueColor}`}>{value}</p>
          {sub && <p className="text-xs text-gray-600 mt-1.5">{sub}</p>}
        </div>
      </div>
    </div>
  )
}
