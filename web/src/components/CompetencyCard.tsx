import type { LucideIcon } from 'lucide-react'

interface CompetencyCardProps {
  number: string
  title: string
  description: string
  icon: LucideIcon
}

export default function CompetencyCard({
  number,
  title,
  description,
  icon: Icon,
}: CompetencyCardProps) {
  return (
    <div className="bg-white border border-[#ede8e1] rounded-lg p-6 hover:shadow-md transition-shadow flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-[#0c3b6e]">
            <Icon className="h-6 w-6" aria-hidden="true" />
          </div>
          <span className="text-xs font-bold text-gray-400 font-mono tracking-wider">
            {number}
          </span>
        </div>
        <h3 className="text-lg font-semibold text-[#0c3b6e] mb-2 leading-snug">
          {title}
        </h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  )
}
