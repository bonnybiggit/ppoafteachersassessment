import { Link } from 'react-router-dom'
import { ArrowLeft, Lock, Mail, User } from 'lucide-react'
import ppoafLogo from '../assets/ppoaf-logo.jpeg'

export default function RegisterPage() {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
  }

  return (
    <div className="min-h-screen bg-[#faf8f5] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Link to="/" aria-label="PPOAF Teachers Assessment Home">
            <img
              src={ppoafLogo}
              alt="PPOAF Foundation logo"
              className="h-16 w-16 object-contain rounded-full shadow-sm bg-white p-0.5"
            />
          </Link>
        </div>
        <h1 className="mt-4 text-center text-2xl sm:text-3xl font-bold tracking-tight text-[#0c3b6e]">
          Create Your Account
        </h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          Join the PPOAF teacher development and upskilling platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm border border-[#ede8e1] rounded-xl sm:px-10">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="fullName"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1"
              >
                Full Name
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  placeholder="e.g. Oluwatobiloba Adeniyi"
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0c3b6e] focus:border-[#0c3b6e]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1"
              >
                Email Address
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="teacher@example.com"
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0c3b6e] focus:border-[#0c3b6e]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1"
              >
                Password
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0c3b6e] focus:border-[#0c3b6e]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1"
              >
                Confirm Password
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0c3b6e] focus:border-[#0c3b6e]"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-[#b81c1c] hover:bg-[#8f1515] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#b81c1c] transition-colors"
              >
                Create Account
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-xs text-gray-500">
            <span className="bg-[#faf8f5] px-2 py-1 rounded text-gray-600 border border-[#ede8e1]">
              UI Only — Account creation will be connected in a future step.
            </span>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-[#0c3b6e] hover:text-[#082a50] transition-colors"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-[#0c3b6e] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
