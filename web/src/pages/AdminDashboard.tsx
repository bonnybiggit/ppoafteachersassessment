import { Link } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import ppoafLogo from '../assets/ppoaf-logo.jpeg'

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full">
        <div className="bg-white border border-[#ede8e1] rounded-2xl p-10 text-center shadow-sm">
          <div className="flex justify-center mb-6">
            <img
              src={ppoafLogo}
              alt="PPOAF Foundation logo"
              className="h-16 w-16 object-contain rounded-full bg-white p-0.5 shadow-sm"
            />
          </div>
          <div className="flex items-center justify-center w-12 h-12 bg-red-50 text-[#b81c1c] rounded-full mx-auto mb-4">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-[#0c3b6e] mb-3">Admin Dashboard</h1>
          <p className="text-gray-600 text-sm mb-3 leading-relaxed font-medium">
            The administrative management workspace will appear here.
          </p>
          <p className="text-gray-500 text-xs mb-8 leading-relaxed max-w-sm mx-auto">
            This dashboard will be built in a future step. Teacher management, assessment administration, and aggregate analytical reports will be available here.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-[#0c3b6e] hover:text-[#082a50] font-semibold transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Home</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
