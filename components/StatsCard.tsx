interface StatsCardProps {
  label: string
  value: string
  accent?: 'green' | 'yellow' | 'default'
  sub?: string
  goalPct?: number
  goalColor?: string
  size?: 'goal' | 'stat'  // goal = larger with ring, stat = compact
}

function Ring({ pct, color, size }: { pct: number; color: string; size: number }) {
  const stroke = 5
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const filled = Math.min(pct / 100, 1) * circ

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={`${filled} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  )
}

export default function StatsCard({ label, value, accent = 'default', sub, goalPct, goalColor, size = 'stat' }: StatsCardProps) {
  const valueColor =
    accent === 'green' ? 'text-green-400' :
    accent === 'yellow' ? 'text-brand' :
    'text-white'

  if (goalPct !== undefined && goalColor) {
    const ringSize = 88
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 flex flex-col gap-4 hover:border-white/10 transition-colors">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest leading-none">{label}</p>
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0" style={{ width: ringSize, height: ringSize }}>
            <Ring pct={goalPct} color={goalColor} size={ringSize} />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
              <span className="text-sm font-bold text-white leading-none">{Math.round(goalPct)}%</span>
              <span className="text-[9px] text-gray-600 leading-none">of goal</span>
            </div>
          </div>
          <div className="min-w-0">
            <p className={`text-2xl font-bold leading-none tracking-tight ${valueColor}`}>{value}</p>
            {sub && <p className="text-xs text-gray-600 mt-1.5">{sub}</p>}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 flex flex-col gap-3 hover:border-white/10 transition-colors">
      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest leading-none">{label}</p>
      <div>
        <p className={`text-3xl font-bold leading-none tracking-tight ${valueColor}`}>{value}</p>
        {sub && <p className="text-xs text-gray-600 mt-1.5">{sub}</p>}
      </div>
    </div>
  )
}
