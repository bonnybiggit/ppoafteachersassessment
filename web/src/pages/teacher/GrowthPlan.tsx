import { Link } from 'react-router-dom'
import {
  Compass,
  Target,
  BookOpen,
  CheckSquare,
  MessageSquare,
  TrendingUp,
  RotateCcw,
  FileCheck,
} from 'lucide-react'

const planStages = [
  {
    title: '1. Current Focus',
    description: 'Targeted competency gap identified from diagnostic assessment.',
    icon: Target,
    detail: 'Pending assessment completion',
  },
  {
    title: '2. Learning Actions',
    description: 'Selected micro-modules and professional reading.',
    icon: BookOpen,
    detail: 'Pending focus selection',
  },
  {
    title: '3. Classroom Practice',
    description: 'Practical classroom application challenges and routine adjustments.',
    icon: CheckSquare,
    detail: 'Pending learning actions',
  },
  {
    title: '4. Self-Reflection',
    description: 'Structured reflection on student outcomes and pedagogical adjustments.',
    icon: MessageSquare,
    detail: 'Pending classroom practice',
  },
  {
    title: '5. Progress Verification',
    description: 'Milestone tracking and competency readiness.',
    icon: TrendingUp,
    detail: 'Pending reflection logs',
  },
  {
    title: '6. Reassessment Cycle',
    description: 'Targeted reassessment of the competency domain.',
    icon: RotateCcw,
    detail: 'Pending progress verification',
  },
]

export default function GrowthPlan() {
  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0c3b6e]">
          Professional Growth Plan
        </h1>
        <p className="text-sm text-gray-600 max-w-3xl leading-relaxed">
          A structured, iterative framework enabling teachers to turn diagnostic insights into classroom practice and measurable development.
        </p>
      </div>

      {/* Empty State Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#ede8e1] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-[#b81c1c]" />
            <h2 className="text-base font-bold text-[#0c3b6e]">
              Growth Plan Inactive
            </h2>
          </div>
          <p className="text-xs text-gray-600 max-w-xl leading-relaxed">
            Your personalised growth plan will be generated based on your assessment results and development priorities.
          </p>
        </div>
        <Link
          to="/teacher/assessment"
          className="inline-flex items-center justify-center gap-2 bg-[#0c3b6e] text-white px-5 py-2.5 rounded-lg text-xs font-semibold hover:bg-[#082a50] transition-colors shrink-0"
        >
          <FileCheck className="h-4 w-4" />
          <span>Begin Assessment</span>
        </Link>
      </div>

      {/* Planned Growth Plan Architecture Grid */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-[#0c3b6e]">
          Growth Plan Framework Architecture
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {planStages.map((stage) => {
            const Icon = stage.icon
            return (
              <div
                key={stage.title}
                className="bg-white p-6 rounded-xl border border-[#ede8e1] space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#0c3b6e] flex items-center justify-center mb-3">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h4 className="text-xs font-bold text-gray-900 mb-1">
                    {stage.title}
                  </h4>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    {stage.description}
                  </p>
                </div>
                <div className="pt-3 border-t border-gray-100">
                  <span className="text-[10px] bg-[#faf8f5] text-gray-500 px-2 py-1 rounded border border-[#ede8e1] font-mono block text-center">
                    {stage.detail}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
