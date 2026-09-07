import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  User,
  FileCheck,
  Award,
  BookOpen,
  Compass,
  RotateCcw,
  HelpCircle,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react'
import ppoafLogo from '../assets/ppoaf-logo.jpeg'

const mainNavItems = [
  { label: 'Overview', to: '/teacher', icon: LayoutDashboard, end: true },
  { label: 'My Profile', to: '/teacher/profile', icon: User },
  { label: 'Assessment', to: '/teacher/assessment', icon: FileCheck },
  { label: 'My Results', to: '/teacher/results', icon: Award },
  { label: 'Learning', to: '/teacher/learning', icon: BookOpen },
  { label: 'Growth Plan', to: '/teacher/growth-plan', icon: Compass },
  { label: 'Reassessment', to: '/teacher/reassessment', icon: RotateCcw },
]

const bottomNavItems = [
  { label: 'Help & Support', to: '#help', icon: HelpCircle },
  { label: 'Settings', to: '#settings', icon: Settings },
]

export default function TeacherLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const closeMobileMenu = () => setMobileMenuOpen(false)

  return (
    <div className="min-h-screen bg-[#faf8f5] flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-[#ede8e1] sticky top-0 z-40 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          {/* Mobile menu trigger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-md text-gray-600 hover:text-[#0c3b6e] hover:bg-gray-100"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Logo & Platform Name */}
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src={ppoafLogo}
              alt="PPOAF Foundation logo"
              className="h-9 w-9 object-contain rounded-full bg-white p-0.5"
            />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-[#0c3b6e] tracking-tight leading-none">
                PPOAF Teachers Assessment
              </span>
              <span className="text-[10px] text-gray-500 font-medium">
                Teacher Development Portal
              </span>
            </div>
          </Link>
        </div>

        {/* Right Actions: Notifications & Demo User */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="relative p-2 text-gray-500 hover:text-[#0c3b6e] rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#b81c1c] rounded-full" />
          </button>

          <div className="h-8 w-px bg-[#ede8e1] hidden sm:block" />

          {/* Teacher Profile / Avatar Area */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#0c3b6e] text-white flex items-center justify-center font-bold text-xs shadow-sm">
              AJ
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-[#0c3b6e]">Amaka Johnson</span>
                <span className="text-[9px] bg-blue-50 text-[#0c3b6e] border border-blue-200 px-1 rounded font-semibold uppercase tracking-wider">
                  Demo
                </span>
              </div>
              <span className="text-[11px] text-gray-500">Secondary Educator</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body with Sidebar */}
      <div className="flex-1 flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-[#ede8e1] p-4 justify-between">
          <div className="space-y-6">
            <div className="px-3 py-2 bg-[#faf8f5] rounded-lg border border-[#ede8e1]">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
                Assessment Status
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#b81c1c]">Not Started</span>
                <span className="text-[10px] text-gray-500">0%</span>
              </div>
            </div>

            <nav className="space-y-1" aria-label="Sidebar navigation">
              {mainNavItems.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-[#0c3b6e] border border-blue-100'
                          : 'text-gray-600 hover:bg-[#faf8f5] hover:text-[#0c3b6e]'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 opacity-40" />
                  </NavLink>
                )
              })}
            </nav>
          </div>

          <div className="pt-4 border-t border-[#ede8e1] space-y-1">
            {bottomNavItems.map((item) => {
              const Icon = item.icon
              return (
                <a
                  key={item.to}
                  href={item.to}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-gray-600 hover:bg-[#faf8f5] hover:text-[#0c3b6e] transition-colors"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </a>
              )
            })}
            <Link
              to="/login"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-[#b81c1c] hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Log Out (Demo)</span>
            </Link>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-black/30 backdrop-blur-xs"
              onClick={closeMobileMenu}
              aria-hidden="true"
            />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white border-r border-[#ede8e1] p-4 justify-between">
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-[#ede8e1]">
                  <div className="flex items-center gap-2">
                    <img
                      src={ppoafLogo}
                      alt="PPOAF Logo"
                      className="h-7 w-7 object-contain rounded-full"
                    />
                    <span className="text-xs font-bold text-[#0c3b6e]">Teacher Portal</span>
                  </div>
                  <button
                    type="button"
                    onClick={closeMobileMenu}
                    className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="px-3 py-2 bg-[#faf8f5] rounded-lg border border-[#ede8e1]">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
                    Assessment Status
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#b81c1c]">Not Started</span>
                    <span className="text-[10px] text-gray-500">0%</span>
                  </div>
                </div>

                <nav className="space-y-1">
                  {mainNavItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        onClick={closeMobileMenu}
                        className={({ isActive }) =>
                          `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                            isActive
                              ? 'bg-blue-50 text-[#0c3b6e] border border-blue-100'
                              : 'text-gray-600 hover:bg-[#faf8f5] hover:text-[#0c3b6e]'
                          }`
                        }
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4 shrink-0" />
                          <span>{item.label}</span>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 opacity-40" />
                      </NavLink>
                    )
                  })}
                </nav>
              </div>

              <div className="pt-4 border-t border-[#ede8e1] space-y-1">
                {bottomNavItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <a
                      key={item.to}
                      href={item.to}
                      onClick={closeMobileMenu}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-gray-600 hover:bg-[#faf8f5] hover:text-[#0c3b6e] transition-colors"
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </a>
                  )
                })}
                <Link
                  to="/login"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-[#b81c1c] hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span>Log Out (Demo)</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Content Outlet */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
