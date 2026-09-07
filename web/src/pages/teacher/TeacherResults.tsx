import { Link } from 'react-router-dom'
import {
  Award,
  FileCheck,
  TrendingUp,
  Info,
  Layers,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'

const domainPlaceholders = [
  'Human-Centred Teaching & Empathy',
  'Communication & Influence',
  'Classroom Leadership & Behaviour Design',
  'Adaptive Teaching & Problem Solving',
  'Practical Pedagogy & Learning Design',
  'Resourcefulness & Entrepreneurial Thinking',
  'Digital & Future Skills',
  'Personal Effectiveness & Professional Identity',
  'Community Engagement',
]

export default function TeacherResults() {
  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0c3b6e]">
          Your Assessment Results & Competency Profile
        </h1>
        <p className="text-sm text-gray-600 max-w-3xl leading-relaxed">
          Review your developmental evaluation breakdown across the 9 PPOAF teacher competency domains.
        </p>
      </div>

      {/* Prominent Empty State / Status Banner */}
      <div className="bg-white rounded-2xl p-8 sm:p-12 border border-[#ede8e1] shadow-xs text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#0c3b6e] flex items-center justify-center mx-auto mb-2">
          <Award className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-[#0c3b6e]">
          Complete Your Assessment to Unlock Your Results
        </h2>
        <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
          Your multidimensional competency scores, strengths, priority development gaps, and personalised recommendations will be calculated after you finish the assessment.
        </p>
        <div className="pt-2">
          <Link
            to="/teacher/assessment"
            className="inline-flex items-center gap-2 bg-[#0c3b6e] text-white px-6 py-3 rounded-lg text-xs font-semibold hover:bg-[#082a50] transition-colors shadow-xs"
          >
            <FileCheck className="h-4 w-4" />
            <span>Go to Assessment</span>
          </Link>
        </div>
      </div>

      {/* Planned Results Structure Overview (UI Placeholders) */}
      <div className="space-y-6 opacity-75">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[#0c3b6e]">
            Competency Profile Architecture (Preview)
          </h3>
          <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded font-mono">
            Pending Assessment
          </span>
        </div>

        {/* Section 1: 9 Domains Preview */}
        <div className="bg-white rounded-2xl p-6 border border-[#ede8e1] space-y-4">
          <h4 className="text-sm font-bold text-[#0c3b6e] flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#0c3b6e]" />
            <span>1. Nine Competency Domains</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {domainPlaceholders.map((name) => (
              <div
                key={name}
                className="p-3 bg-[#faf8f5] rounded-lg border border-[#ede8e1] flex items-center justify-between"
              >
                <span className="text-xs font-medium text-gray-700">{name}</span>
                <span className="text-[10px] text-gray-400 font-mono">-- / 100</span>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Strengths & Priority Development Areas Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Strengths */}
          <div className="bg-white rounded-2xl p-6 border border-[#ede8e1] space-y-3">
            <div className="flex items-center gap-2 text-[#0c3b6e]">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <h4 className="text-sm font-bold">2. Identified Core Strengths</h4>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Your highest-scoring competency domains will be highlighted here with qualitative observations on what you do well in the classroom.
            </p>
            <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-lg text-xs text-emerald-800 italic">
              Strengths will be determined automatically upon assessment completion.
            </div>
          </div>

          {/* Priority Development Areas */}
          <div className="bg-white rounded-2xl p-6 border border-[#ede8e1] space-y-3">
            <div className="flex items-center gap-2 text-[#0c3b6e]">
              <TrendingUp className="h-5 w-5 text-[#b81c1c]" />
              <h4 className="text-sm font-bold">3. Priority Development Gaps</h4>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Targeted growth opportunities where focused upskilling will produce the greatest pedagogical impact.
            </p>
            <div className="p-4 bg-red-50/50 border border-red-100 rounded-lg text-xs text-red-800 italic">
              Development focus areas will appear following assessment diagnosis.
            </div>
          </div>
        </div>

        {/* Section 3: Understanding Your Results & Next Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Understanding Results */}
          <div className="bg-white rounded-2xl p-6 border border-[#ede8e1] space-y-3">
            <div className="flex items-center gap-2 text-[#0c3b6e]">
              <Info className="h-5 w-5 text-[#0c3b6e]" />
              <h4 className="text-sm font-bold">4. Understanding Your Results</h4>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Explanations of competency bands, developmental scoring criteria, and how your profile reflects pedagogical growth over time.
            </p>
          </div>

          {/* Recommended Next Steps */}
          <div className="bg-white rounded-2xl p-6 border border-[#ede8e1] space-y-3">
            <div className="flex items-center gap-2 text-[#0c3b6e]">
              <Sparkles className="h-5 w-5 text-[#b81c1c]" />
              <h4 className="text-sm font-bold">5. Recommended Next Steps</h4>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Direct links to your personalized professional growth plan and tailored course recommendations.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
