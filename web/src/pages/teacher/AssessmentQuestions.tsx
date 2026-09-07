import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Info,
} from 'lucide-react'
import ppoafLogo from '../../assets/ppoaf-logo.jpeg'

export default function AssessmentQuestions() {
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const navigate = useNavigate()

  const demoOptions = [
    {
      id: 'A',
      text: 'Pause the lesson briefly, acknowledge the differing perspectives with empathy, and guide the class through a structured collaborative discussion to find common ground.',
    },
    {
      id: 'B',
      text: 'Quickly restate the classroom rules, assign individual reading tasks to defuse tension immediately, and address the dispute privately after class.',
    },
    {
      id: 'C',
      text: 'Allow the students to debate freely without teacher intervention so they learn to negotiate disagreement independently.',
    },
    {
      id: 'D',
      text: 'Reorganise the student groups on the spot and shift to a teacher-led lecture format for the remainder of the period.',
    },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Assessment Header Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#ede8e1] flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <img
            src={ppoafLogo}
            alt="PPOAF Logo"
            className="h-8 w-8 object-contain rounded-full"
          />
          <div>
            <h1 className="text-xs font-bold text-[#0c3b6e]">
              Teacher Competency Assessment
            </h1>
            <p className="text-[10px] text-gray-500">
              Section 1: Human-Centred Teaching & Classroom Scenarios
            </p>
          </div>
        </div>
        <Link
          to="/teacher"
          className="text-xs font-medium text-gray-500 hover:text-[#0c3b6e]"
        >
          Save & Exit
        </Link>
      </div>

      {/* Demo Notice Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3 text-xs text-[#0c3b6e]">
        <Info className="h-4 w-4 shrink-0" />
        <p>
          <strong>UI Prototype Demonstration:</strong> This is a sample interface question. The full adaptive PPOAF item bank, response routing, and psychometric evaluation will be integrated in subsequent steps.
        </p>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#ede8e1] shadow-xs space-y-6">
        {/* Progress & Question Counter */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#0c3b6e]">Question 1 of 1 (Demo)</span>
            <span className="text-gray-500 font-mono">100% (Sample)</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#0c3b6e] w-full rounded-full" />
          </div>
        </div>

        {/* Question Prompt */}
        <div className="space-y-3 pt-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#b81c1c] bg-red-50 px-2 py-0.5 rounded">
            Classroom Scenario
          </span>
          <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-relaxed">
            During a collaborative group activity, you observe two students who are disengaged and in open disagreement over project responsibilities. Which of the following best reflects your initial instructional decision?
          </h2>
        </div>

        {/* Answer Options */}
        <div className="space-y-3 pt-2">
          {demoOptions.map((opt) => (
            <label
              key={opt.id}
              onClick={() => setSelectedOption(opt.id)}
              className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                selectedOption === opt.id
                  ? 'border-[#0c3b6e] bg-blue-50/60 shadow-xs'
                  : 'border-[#ede8e1] bg-white hover:border-gray-300 hover:bg-[#faf8f5]'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 ${
                  selectedOption === opt.id
                    ? 'bg-[#0c3b6e] text-white'
                    : 'border border-gray-300 text-gray-600 bg-white'
                }`}
              >
                {opt.id}
              </div>
              <p className="text-xs sm:text-sm text-gray-800 leading-relaxed">
                {opt.text}
              </p>
            </label>
          ))}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-100">
          <Link
            to="/teacher/assessment"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Previous</span>
          </Link>

          <button
            type="button"
            onClick={() => navigate('/teacher/results')}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-semibold bg-[#0c3b6e] text-white hover:bg-[#082a50] transition-colors shadow-xs cursor-pointer"
          >
            <span>Finish Assessment (Demo)</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
