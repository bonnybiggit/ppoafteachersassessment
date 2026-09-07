import { Link } from 'react-router-dom'
import {
  BookOpen,
  Sparkles,
  Layers,
  FileCheck,
  Clock,
} from 'lucide-react'

export default function TeacherLearning() {
  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0c3b6e]">
          Learning & Professional Upskilling Hub
        </h1>
        <p className="text-sm text-gray-600 max-w-3xl leading-relaxed">
          Access courses, pedagogical toolkits, and micro-learning modules matched to your developmental priorities.
        </p>
      </div>

      {/* Section 1: Recommended For You (Empty State) */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#ede8e1] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2 text-[#0c3b6e]">
            <Sparkles className="h-5 w-5 text-[#b81c1c]" />
            <h2 className="text-base font-bold">1. Recommended For You</h2>
          </div>
          <span className="text-xs text-gray-400 font-mono">Personalised</span>
        </div>

        <div className="bg-[#faf8f5] p-8 rounded-xl border border-[#ede8e1] text-center space-y-3">
          <BookOpen className="h-10 w-10 text-gray-400 mx-auto" />
          <h3 className="text-sm font-bold text-gray-800">
            No Recommendations Available Yet
          </h3>
          <p className="text-xs text-gray-600 max-w-md mx-auto leading-relaxed">
            Your personalised learning recommendations will appear here after completing your teacher competency assessment.
          </p>
          <div className="pt-2">
            <Link
              to="/teacher/assessment"
              className="inline-flex items-center gap-2 bg-[#0c3b6e] text-white px-5 py-2.5 rounded-lg text-xs font-semibold hover:bg-[#082a50] transition-colors"
            >
              <FileCheck className="h-4 w-4" />
              <span>Start Assessment</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Section 2: Explore Courses (Framework Area Structure) */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#ede8e1] shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2 text-[#0c3b6e]">
            <Layers className="h-5 w-5 text-[#0c3b6e]" />
            <h2 className="text-base font-bold">2. Explore Course Catalogues</h2>
          </div>
          <span className="text-xs bg-blue-50 text-[#0c3b6e] px-2.5 py-0.5 rounded font-semibold">
            Catalog Structure
          </span>
        </div>
        <p className="text-xs text-gray-600">
          Curated learning pathways aligned with the PPOAF Teacher Competency Framework domains:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl border border-[#ede8e1] bg-[#faf8f5] space-y-2">
            <h3 className="text-xs font-bold text-[#0c3b6e]">Pedagogy & Classroom Practices</h3>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              Foundational and advanced instructional techniques, learning design, and differentiated instruction.
            </p>
            <span className="text-[10px] text-gray-400 block pt-1">Modules in development</span>
          </div>

          <div className="p-5 rounded-xl border border-[#ede8e1] bg-[#faf8f5] space-y-2">
            <h3 className="text-xs font-bold text-[#0c3b6e]">Leadership & Culture Design</h3>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              Constructive classroom routines, behaviour systems, and relational learner empathy.
            </p>
            <span className="text-[10px] text-gray-400 block pt-1">Modules in development</span>
          </div>

          <div className="p-5 rounded-xl border border-[#ede8e1] bg-[#faf8f5] space-y-2">
            <h3 className="text-xs font-bold text-[#0c3b6e]">Future Skills & Digital Literacy</h3>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              Purposeful digital integration, problem solving, and resource optimization in diverse settings.
            </p>
            <span className="text-[10px] text-gray-400 block pt-1">Modules in development</span>
          </div>
        </div>
      </div>

      {/* Section 3: Your Learning Progress */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#ede8e1] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2 text-[#0c3b6e]">
            <Clock className="h-5 w-5 text-[#0c3b6e]" />
            <h2 className="text-base font-bold">3. Your Learning Progress</h2>
          </div>
          <span className="text-xs text-gray-400 font-mono">0 Active Modules</span>
        </div>

        <div className="p-6 bg-[#faf8f5] rounded-xl border border-[#ede8e1] text-center text-xs text-gray-600">
          No courses currently enrolled. Complete your diagnostic assessment to generate your personalized learning plan.
        </div>
      </div>
    </div>
  )
}
