import { Link } from 'react-router-dom'
import {
  RotateCcw,
  FileCheck,
} from 'lucide-react'

export default function Reassessment() {
  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0c3b6e]">
          Competency Reassessment
        </h1>
        <p className="text-sm text-gray-600 max-w-3xl leading-relaxed">
          Return to your competency assessment after completing learning and classroom practice to measure your professional growth over time.
        </p>
      </div>

      {/* Cycle Overview Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#ede8e1] shadow-xs space-y-4">
        <div className="flex items-center gap-3 text-[#0c3b6e]">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-[#0c3b6e]">
            <RotateCcw className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold">The Continuous Upskilling Cycle</h2>
            <p className="text-xs text-gray-500">
              Measuring longitudinal growth, not one-off evaluation
            </p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-gray-700 leading-relaxed max-w-2xl">
          The PPOAF framework encourages teachers to complete developmental cycles (Assessment → Upskilling → Classroom Practice → Reflection) before taking targeted or full reassessments. This provides tangible evidence of your competency evolution.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <Link
            to="/teacher/assessment"
            className="inline-flex items-center justify-center gap-2 bg-[#0c3b6e] text-white px-5 py-2.5 rounded-lg text-xs font-semibold hover:bg-[#082a50] transition-colors"
          >
            <FileCheck className="h-4 w-4" />
            <span>Complete Initial Assessment</span>
          </Link>
        </div>
      </div>

      {/* Reassessment Timeline Architecture Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 border border-[#ede8e1] space-y-3">
          <div className="text-xs font-bold font-mono text-[#b81c1c]">PHASE 1</div>
          <h3 className="text-sm font-bold text-[#0c3b6e]">Initial Baseline</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Complete the full 9-domain diagnostic to map baseline competencies and identify priority gaps.
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-[#ede8e1] space-y-3">
          <div className="text-xs font-bold font-mono text-[#b81c1c]">PHASE 2</div>
          <h3 className="text-sm font-bold text-[#0c3b6e]">Targeted Upskilling</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Apply personalised courses and classroom strategies focused on identified development priorities.
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-[#ede8e1] space-y-3">
          <div className="text-xs font-bold font-mono text-[#b81c1c]">PHASE 3</div>
          <h3 className="text-sm font-bold text-[#0c3b6e]">Reassessment & Growth</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Retake competency evaluations to observe demonstrable improvements and update your professional profile.
          </p>
        </div>
      </div>
    </div>
  )
}
