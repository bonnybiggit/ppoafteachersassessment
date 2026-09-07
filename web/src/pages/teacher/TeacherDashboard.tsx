import { Link } from 'react-router-dom'
import {
  FileCheck,
  User,
  Heart,
  MessageCircle,
  Layout,
  Lightbulb,
  BookOpen,
  Wrench,
  Cpu,
  Star,
  Building2,
  ArrowRight,
  Sparkles,
  Clock,
} from 'lucide-react'

const competencies = [
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

const growthStages = [
  { stage: '01', title: 'Assessment', status: 'Next Step', current: true },
  { stage: '02', title: 'Understand', status: 'Pending Assessment', current: false },
  { stage: '03', title: 'Learn', status: 'Pending Profile', current: false },
  { stage: '04', title: 'Practice', status: 'Classroom Application', current: false },
  { stage: '05', title: 'Reassess', status: 'Future Milestone', current: false },
]

export default function TeacherDashboard() {
  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#ede8e1] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#b81c1c]">
              Teacher Workspace
            </span>
            <span className="text-[10px] bg-slate-100 text-gray-600 px-2 py-0.5 rounded font-mono font-medium">
              Demo Environment
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0c3b6e]">
            Welcome back, Amaka
          </h1>
          <p className="text-sm text-gray-600 max-w-xl leading-relaxed">
            Your professional growth journey starts with understanding where you are today.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/teacher/assessment"
            className="inline-flex items-center justify-center gap-2 bg-[#0c3b6e] text-white px-5 py-2.5 rounded-lg text-xs font-semibold hover:bg-[#082a50] transition-colors shadow-xs"
          >
            <FileCheck className="h-4 w-4" />
            <span>Start Assessment</span>
          </Link>
          <Link
            to="/teacher/profile"
            className="inline-flex items-center justify-center gap-2 border border-[#ede8e1] bg-white text-gray-700 px-5 py-2.5 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors"
          >
            <User className="h-4 w-4 text-gray-500" />
            <span>View My Profile</span>
          </Link>
        </div>
      </div>

      {/* Prominent Assessment Status Card */}
      <div className="bg-gradient-to-br from-[#0c3b6e] to-[#082a50] text-white rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="bg-white/10 text-blue-200 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                Status: Not Started
              </span>
              <span className="text-blue-200 text-xs">0% Complete</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Your Teacher Competency Assessment
            </h2>
            <p className="text-sm text-blue-100 leading-relaxed">
              Complete your assessment to understand your competency strengths and identify areas for professional growth across all 9 PPOAF domains.
            </p>
          </div>
          <div className="shrink-0">
            <Link
              to="/teacher/assessment"
              className="inline-flex items-center justify-center gap-2 bg-[#b81c1c] text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-[#8f1515] transition-colors shadow-sm"
            >
              <span>Begin Assessment</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Progress Bar Visual */}
        <div className="mt-6 pt-6 border-t border-white/10">
          <div className="flex items-center justify-between text-xs text-blue-200 mb-2">
            <span>Assessment Progress</span>
            <span className="font-mono">0 of 9 Domains Complete</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-[#b81c1c] w-0 rounded-full" />
          </div>
        </div>
      </div>

      {/* Competency Preview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#0c3b6e]">Your Competency Areas</h2>
            <p className="text-xs text-gray-500">
              The 9 PPOAF developmental domains. Scores will be generated upon assessment completion.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {competencies.map((comp, idx) => {
            const Icon = comp.icon
            return (
              <div
                key={comp.name}
                className="bg-white p-4 rounded-xl border border-[#ede8e1] flex items-center justify-between hover:border-[#0c3b6e]/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#0c3b6e] flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-gray-400">
                      0{idx + 1}
                    </span>
                    <h3 className="text-xs font-semibold text-gray-900 leading-snug line-clamp-1">
                      {comp.name}
                    </h3>
                  </div>
                </div>
                <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-2 py-1 rounded shrink-0">
                  Not assessed
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Growth Journey & Learning Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Your Growth Journey */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-[#ede8e1] space-y-6">
          <div>
            <h2 className="text-base font-bold text-[#0c3b6e]">Your Growth Journey</h2>
            <p className="text-xs text-gray-500">
              Structured developmental pathway from self-assessment to continuous reassessment.
            </p>
          </div>

          <div className="relative pl-6 border-l-2 border-[#ede8e1] space-y-6">
            {growthStages.map((stage) => (
              <div key={stage.stage} className="relative">
                <div
                  className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 ${
                    stage.current
                      ? 'border-[#0c3b6e] bg-[#0c3b6e]'
                      : 'border-gray-300 bg-white'
                  }`}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#0c3b6e]">{stage.title}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                        stage.current
                          ? 'bg-blue-50 text-[#0c3b6e] font-semibold'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {stage.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {stage.current
                      ? 'Begin your competency evaluation across nine pedagogical domains.'
                      : 'Unlocks upon completing the prior developmental milestone.'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Learning & Activity */}
        <div className="lg:col-span-5 space-y-6">
          {/* Recommended Learning */}
          <div className="bg-white rounded-2xl p-6 border border-[#ede8e1] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#0c3b6e]">Recommended Learning</h2>
              <Sparkles className="h-4 w-4 text-[#b81c1c]" />
            </div>
            <div className="bg-[#faf8f5] p-5 rounded-xl border border-[#ede8e1] text-center space-y-3">
              <BookOpen className="h-8 w-8 text-gray-400 mx-auto" />
              <p className="text-xs text-gray-600 leading-relaxed max-w-xs mx-auto">
                Your personalised learning recommendations will appear after your assessment.
              </p>
              <Link
                to="/teacher/learning"
                className="inline-flex items-center justify-center text-xs font-semibold text-gray-600 hover:text-[#0c3b6e] bg-white border border-[#ede8e1] px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
              >
                Explore Learning Hub
              </Link>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl p-6 border border-[#ede8e1] space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#0c3b6e]" />
              <h2 className="text-base font-bold text-[#0c3b6e]">Recent Activity</h2>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-lg">
                <p className="text-xs font-bold text-[#0c3b6e]">
                  Welcome to PPOAF Teachers Assessment
                </p>
                <p className="text-[11px] text-gray-600 mt-1">
                  Complete your profile to prepare for your assessment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
