interface StatsCardProps {
  label: string
  value: string
  accent?: 'green' | 'yellow' | 'default'
  sub?: string
}

export default function StatsCard({ label, value, accent = 'default', sub }: StatsCardProps) {
  const valueColor =
    accent === 'green' ? 'text-green-400' :
    accent === 'yellow' ? 'text-brand' :
    'text-white'

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
