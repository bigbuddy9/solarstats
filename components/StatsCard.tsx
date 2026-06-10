interface StatsCardProps {
  label: string
  value: string
  wide?: boolean
}

export default function StatsCard({ label, value, wide }: StatsCardProps) {
  return (
    <div className={`bg-black border border-white/5 rounded-xl p-5 ${wide ? 'col-span-2 lg:col-span-1' : ''}`}>
      <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-white mt-1.5">{value}</p>
    </div>
  )
}
