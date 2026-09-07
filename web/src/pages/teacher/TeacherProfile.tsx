import { useState } from 'react'
import {
  User,
  GraduationCap,
  Building2,
  BookOpen,
  Info,
  CheckCircle2,
  Save,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function TeacherProfile() {
  const { teacher } = useAuth()
  const [savedNotice, setSavedNotice] = useState(false)

  const defaultTeacherName = teacher
    ? `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || teacher.email
    : 'Teacher'

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSavedNotice(true)
    setTimeout(() => setSavedNotice(false), 4000)
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0c3b6e]">
          Teacher Profile & Teaching Context
        </h1>
        <p className="text-sm text-gray-600 max-w-3xl leading-relaxed">
          Provide your educational background and teaching context to help contextualize your assessment recommendations.
        </p>
      </div>

      {/* Framework Context & Fairness Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex items-start gap-4">
        <Info className="h-5 w-5 text-[#0c3b6e] shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs text-gray-700 leading-relaxed">
          <p className="font-bold text-[#0c3b6e]">
            PPOAF Framework Context & Fairness Principle:
          </p>
          <p>
            Profile and contextual information is used solely for <strong>question routing, contextualizing feedback, accessibility, and tailoring recommendations</strong>. Demographic and background data do <strong>not</strong> influence or determine your competency assessment scores.
          </p>
        </div>
      </div>

      {savedNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>Profile changes recorded for this session (UI Demo — backend persistence in a future step).</span>
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Personal Information */}
        <div className="bg-white rounded-2xl p-6 border border-[#ede8e1] shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
            <User className="h-5 w-5 text-[#0c3b6e]" />
            <h2 className="text-base font-bold text-[#0c3b6e]">
              1. Personal Information
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="fullName" className="block text-xs font-semibold text-gray-700 mb-1">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                defaultValue={defaultTeacherName}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0c3b6e] focus:border-[#0c3b6e]"
              />
            </div>

            <div>
              <label htmlFor="ageRange" className="block text-xs font-semibold text-gray-700 mb-1">
                Age Bracket
              </label>
              <select
                id="ageRange"
                defaultValue="25-34"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#0c3b6e] focus:border-[#0c3b6e]"
              >
                <option value="under-25">Under 25</option>
                <option value="25-34">25 – 34</option>
                <option value="35-44">35 – 44</option>
                <option value="45-54">45 – 54</option>
                <option value="55-plus">55+</option>
              </select>
            </div>

            <div>
              <label htmlFor="gender" className="block text-xs font-semibold text-gray-700 mb-1">
                Gender
              </label>
              <select
                id="gender"
                defaultValue="female"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#0c3b6e] focus:border-[#0c3b6e]"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </div>

            <div>
              <label htmlFor="maritalStatus" className="block text-xs font-semibold text-gray-700 mb-1">
                Marital Status
              </label>
              <select
                id="maritalStatus"
                defaultValue="married"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#0c3b6e] focus:border-[#0c3b6e]"
              >
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Education & Professional Background */}
        <div className="bg-white rounded-2xl p-6 border border-[#ede8e1] shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
            <GraduationCap className="h-5 w-5 text-[#0c3b6e]" />
            <h2 className="text-base font-bold text-[#0c3b6e]">
              2. Education & Professional Background
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="highestEducation" className="block text-xs font-semibold text-gray-700 mb-1">
                Highest Educational Qualification
              </label>
              <select
                id="highestEducation"
                defaultValue="bachelor"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#0c3b6e] focus:border-[#0c3b6e]"
              >
                <option value="nce">NCE / Diploma in Education</option>
                <option value="bachelor">B.Ed / B.Sc (Ed) / Bachelor's Degree</option>
                <option value="pgde">PGDE (Postgraduate Diploma in Education)</option>
                <option value="masters">Master's Degree (M.Ed / M.Sc)</option>
                <option value="doctorate">Doctorate (Ph.D / Ed.D)</option>
              </select>
            </div>

            <div>
              <label htmlFor="yearsExperience" className="block text-xs font-semibold text-gray-700 mb-1">
                Years of Teaching Experience
              </label>
              <select
                id="yearsExperience"
                defaultValue="3-5"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#0c3b6e] focus:border-[#0c3b6e]"
              >
                <option value="0-2">0 – 2 years (Early Career)</option>
                <option value="3-5">3 – 5 years (Developing)</option>
                <option value="6-10">6 – 10 years (Proficient)</option>
                <option value="11-plus">11+ years (Master / Lead)</option>
              </select>
            </div>

            <div>
              <label htmlFor="currentRole" className="block text-xs font-semibold text-gray-700 mb-1">
                Current Role
              </label>
              <input
                id="currentRole"
                type="text"
                defaultValue="Classroom Teacher / Subject Specialist"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0c3b6e] focus:border-[#0c3b6e]"
              />
            </div>

            <div>
              <label htmlFor="subject" className="block text-xs font-semibold text-gray-700 mb-1">
                Primary Teaching Subject
              </label>
              <input
                id="subject"
                type="text"
                defaultValue="English & Literature"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0c3b6e] focus:border-[#0c3b6e]"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="gradeLevel" className="block text-xs font-semibold text-gray-700 mb-1">
                Grade / Class Level
              </label>
              <select
                id="gradeLevel"
                defaultValue="senior-secondary"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#0c3b6e] focus:border-[#0c3b6e]"
              >
                <option value="early-childhood">Early Childhood / Kindergarten</option>
                <option value="primary">Primary / Elementary</option>
                <option value="junior-secondary">Junior Secondary</option>
                <option value="senior-secondary">Senior Secondary</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Teaching Context */}
        <div className="bg-white rounded-2xl p-6 border border-[#ede8e1] shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
            <Building2 className="h-5 w-5 text-[#0c3b6e]" />
            <h2 className="text-base font-bold text-[#0c3b6e]">
              3. Teaching Context & School Environment
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="schoolType" className="block text-xs font-semibold text-gray-700 mb-1">
                School Type
              </label>
              <select
                id="schoolType"
                defaultValue="public"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#0c3b6e] focus:border-[#0c3b6e]"
              >
                <option value="public">Public / Government School</option>
                <option value="private">Private Independent School</option>
                <option value="community">Community / Faith-Based School</option>
              </select>
            </div>

            <div>
              <label htmlFor="schoolLocation" className="block text-xs font-semibold text-gray-700 mb-1">
                School Location
              </label>
              <select
                id="schoolLocation"
                defaultValue="urban"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#0c3b6e] focus:border-[#0c3b6e]"
              >
                <option value="urban">Urban</option>
                <option value="semi-urban">Semi-Urban / Peri-Urban</option>
                <option value="rural">Rural</option>
              </select>
            </div>

            <div>
              <label htmlFor="classSize" className="block text-xs font-semibold text-gray-700 mb-1">
                Average Class Size
              </label>
              <select
                id="classSize"
                defaultValue="31-50"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#0c3b6e] focus:border-[#0c3b6e]"
              >
                <option value="under-30">Under 30 learners</option>
                <option value="31-50">31 – 50 learners</option>
                <option value="51-70">51 – 70 learners</option>
                <option value="71-plus">71+ learners</option>
              </select>
            </div>

            <div>
              <label htmlFor="incomeBracket" className="block text-xs font-semibold text-gray-700 mb-1">
                Institutional Resource / Income Range
              </label>
              <select
                id="incomeBracket"
                defaultValue="mid"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#0c3b6e] focus:border-[#0c3b6e]"
              >
                <option value="low">Resource-Constrained Environment</option>
                <option value="mid">Moderately Resourced Environment</option>
                <option value="high">Well-Resourced Environment</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 4: Professional Development */}
        <div className="bg-white rounded-2xl p-6 border border-[#ede8e1] shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
            <BookOpen className="h-5 w-5 text-[#0c3b6e]" />
            <h2 className="text-base font-bold text-[#0c3b6e]">
              4. Professional Development & Learning Disposition
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cpdExperience" className="block text-xs font-semibold text-gray-700 mb-1">
                Previous CPD Experience
              </label>
              <select
                id="cpdExperience"
                defaultValue="some"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#0c3b6e] focus:border-[#0c3b6e]"
              >
                <option value="none">No formal CPD attended</option>
                <option value="some">1 – 2 workshops in past 2 years</option>
                <option value="frequent">Regular continuous training (3+ per year)</option>
              </select>
            </div>

            <div>
              <label htmlFor="digitalExperience" className="block text-xs font-semibold text-gray-700 mb-1">
                Digital Teaching Experience
              </label>
              <select
                id="digitalExperience"
                defaultValue="intermediate"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#0c3b6e] focus:border-[#0c3b6e]"
              >
                <option value="basic">Basic (Smartphones, messaging)</option>
                <option value="intermediate">Intermediate (Presentations, LMS, online resources)</option>
                <option value="advanced">Advanced (EdTech authoring, adaptive software)</option>
              </select>
            </div>

            <div>
              <label htmlFor="adaptability" className="block text-xs font-semibold text-gray-700 mb-1">
                Openness to New Pedagogical Methods
              </label>
              <select
                id="adaptability"
                defaultValue="high"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#0c3b6e] focus:border-[#0c3b6e]"
              >
                <option value="moderate">Moderate — Prefer established routines</option>
                <option value="high">High — Eager to trial novel pedagogical strategies</option>
              </select>
            </div>

            <div>
              <label htmlFor="resilience" className="block text-xs font-semibold text-gray-700 mb-1">
                Teaching Self-Efficacy & Resilience
              </label>
              <select
                id="resilience"
                defaultValue="confident"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#0c3b6e] focus:border-[#0c3b6e]"
              >
                <option value="developing">Developing confidence in complex situations</option>
                <option value="confident">Confident in adapting to classroom challenges</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="inline-flex items-center gap-2 bg-[#0c3b6e] text-white px-6 py-3 rounded-lg text-xs font-semibold hover:bg-[#082a50] transition-colors shadow-xs cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>Save Profile (Demo UI)</span>
          </button>
        </div>
      </form>
    </div>
  )
}
