import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FileCheck,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Heart,
  MessageCircle,
  Layout,
  Lightbulb,
  BookOpen,
  Wrench,
  Cpu,
  Star,
  Building2,
} from 'lucide-react'

const domains = [
  { name: 'Human-Centred Teaching & Empathy', icon: Heart },
  { name: 'Communication & Influence', icon: MessageCircle },
  { name: 'Classroom Leadership & Behaviour Design', icon: Layout },
  { name: 'Adaptive Teaching & Problem Solving', icon: Lightbulb },
  { name: 'Practical Pedagogy & Learning Design', icon: BookOpen },
  { name: 'Resourcefulness & Entrepreneurial Thinking', icon: Wrench },
  { name: 'Digital & Future Skills', icon: Cpu },
  { name: 'Personal Effectiveness & Professional Identity', icon: Star },
  { name: 'Community Engagement', icon: Building2 },
]

export default function AssessmentIntro() {
  const [consented, setConsented] = useState(false)
  const navigate = useNavigate()

  const handleStart = () => {
    if (consented) {
      navigate('/teacher/assessment/questions')
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-[#0c3b6e] text-xs font-semibold uppercase tracking-wider">
          <FileCheck className="h-4 w-4" />
          <span>Diagnostic Assessment</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0c3b6e] tracking-tight">
          Your Teacher Competency Assessment
        </h1>
        <p className="text-base text-gray-700 leading-relaxed">
          This assessment is designed to help you understand your professional strengths, identify areas for development, and guide personalised learning opportunities.
        </p>
      </div>

      {/* Core Principle: Development, Not Judgement */}
      <div className="bg-gradient-to-r from-blue-50 to-[#faf8f5] border border-blue-200 rounded-2xl p-6 sm:p-8 space-y-3">
        <div className="flex items-center gap-3 text-[#0c3b6e]">
          <ShieldCheck className="h-6 w-6 text-[#b81c1c]" />
          <h2 className="text-lg font-bold">Development, Not Judgement</h2>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">
          The PPOAF assessment is developmental rather than punitive. It is not an employment ranking or dismissal tool. Its sole objective is to illuminate what you do well and illuminate targeted, practical pathways for your ongoing professional growth.
        </p>
      </div>

      {/* What the Assessment Explores */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#ede8e1] space-y-5">
        <h2 className="text-lg font-bold text-[#0c3b6e]">
          What the Assessment Explores
        </h2>
        <p className="text-xs text-gray-600">
          The evaluation evaluates teaching scenarios and reflective decisions mapped across 9 competency domains:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {domains.map((d, i) => {
            const Icon = d.icon
            return (
              <div
                key={d.name}
                className="p-3 bg-[#faf8f5] rounded-lg border border-[#ede8e1] flex items-center gap-3"
              >
                <div className="w-7 h-7 rounded bg-blue-50 text-[#0c3b6e] flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="overflow-hidden">
                  <span className="text-[10px] font-mono text-gray-400 font-bold block">
                    Domain 0{i + 1}
                  </span>
                  <span className="text-xs font-semibold text-gray-800 line-clamp-1">
                    {d.name}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* How it Works & Before You Begin Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* How It Works */}
        <div className="bg-white rounded-2xl p-6 border border-[#ede8e1] space-y-4">
          <h3 className="text-base font-bold text-[#0c3b6e]">How It Works</h3>
          <ul className="space-y-3 text-xs text-gray-700">
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-50 text-[#0c3b6e] font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              <span>Answer questions based on authentic classroom scenarios and pedagogical situations.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-50 text-[#0c3b6e] font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              <span>Your responses are analyzed across all nine competency domains with multi-dimensional scoring.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-50 text-[#0c3b6e] font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                3
              </span>
              <span>Receive a personalised competency profile alongside actionable upskilling recommendations.</span>
            </li>
          </ul>
        </div>

        {/* Before You Begin */}
        <div className="bg-white rounded-2xl p-6 border border-[#ede8e1] space-y-4">
          <h3 className="text-base font-bold text-[#0c3b6e]">Before You Begin</h3>
          <ul className="space-y-2.5 text-xs text-gray-700">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#b81c1c] shrink-0" />
              <span><strong>Answer honestly:</strong> Reflect what you actually do in your classroom.</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#b81c1c] shrink-0" />
              <span><strong>Take your time:</strong> Think carefully through each realistic teaching scenario.</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#b81c1c] shrink-0" />
              <span><strong>No trick questions:</strong> Designed to capture nuanced pedagogical instincts.</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#b81c1c] shrink-0" />
              <span><strong>Save & resume:</strong> Your progress is saved as you complete questions.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Consent & Privacy Notice */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#ede8e1] space-y-5">
        <h3 className="text-base font-bold text-[#0c3b6e]">
          Consent & Developmental Participation
        </h3>
        <p className="text-xs text-gray-600 leading-relaxed">
          By participating, you acknowledge that your responses and profile context will be analyzed strictly for generating your competency profile and recommending upskilling content aligned with the PPOAF Teacher Development Framework.
        </p>

        <label className="flex items-start gap-3 p-4 bg-[#faf8f5] rounded-xl border border-[#ede8e1] cursor-pointer">
          <input
            type="checkbox"
            checked={consented}
            onChange={(e) => setConsented(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#0c3b6e] focus:ring-[#0c3b6e]"
          />
          <span className="text-xs font-semibold text-gray-800">
            I understand the purpose of this assessment and consent to participate in this developmental evaluation.
          </span>
        </label>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <Link
            to="/teacher"
            className="text-xs font-semibold text-gray-500 hover:text-[#0c3b6e] transition-colors"
          >
            ← Return to Dashboard
          </Link>

          <button
            type="button"
            onClick={handleStart}
            disabled={!consented}
            className={`inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg text-sm font-semibold transition-colors shadow-xs ${
              consented
                ? 'bg-[#0c3b6e] text-white hover:bg-[#082a50] cursor-pointer'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <span>Start Assessment</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
