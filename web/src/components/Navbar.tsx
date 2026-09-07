import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import ppoafLogo from '../assets/ppoaf-logo.jpeg'

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Competencies', href: '#competencies' },
  { label: 'For Teachers', href: '#for-teachers' },
  { label: 'About', href: '#about' },
]

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  const close = () => setIsOpen(false)

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#ede8e1]"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Brand */}
          <Link
            to="/"
            className="flex items-center gap-3 group"
            aria-label="PPOAF Teachers Assessment — return to home"
          >
            <img
              src={ppoafLogo}
              alt="PPOAF Foundation logo"
              className="h-9 w-9 object-contain rounded-full"
            />
            <span className="hidden sm:inline text-sm font-semibold text-[#0c3b6e] leading-tight">
              PPOAF Teachers Assessment
            </span>
            <span className="sm:hidden text-sm font-semibold text-[#0c3b6e]">
              PPOAF
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) =>
              link.href.startsWith('#') ? (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm text-gray-600 hover:text-[#0c3b6e] transition-colors font-medium"
                >
                  {link.label}
                </a>
              ) : (
                <NavLink
                  key={link.label}
                  to={link.href}
                  className={({ isActive }) =>
                    `text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-[#0c3b6e]'
                        : 'text-gray-600 hover:text-[#0c3b6e]'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              )
            )}
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              to="/login"
              className="text-sm font-medium text-gray-600 hover:text-[#0c3b6e] px-4 py-2 rounded-md transition-colors"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="text-sm font-semibold bg-[#0c3b6e] text-white px-5 py-2 rounded-md hover:bg-[#082a50] transition-colors"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-gray-600 hover:text-[#0c3b6e] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0c3b6e] focus:ring-offset-2"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isOpen}
            aria-controls="mobile-menu"
          >
            {isOpen
              ? <X className="h-5 w-5" aria-hidden="true" />
              : <Menu className="h-5 w-5" aria-hidden="true" />
            }
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div
          id="mobile-menu"
          className="md:hidden bg-white border-t border-[#ede8e1] px-4 pt-3 pb-5 space-y-1"
        >
          {navLinks.map((link) =>
            link.href.startsWith('#') ? (
              <a
                key={link.label}
                href={link.href}
                className="block text-sm text-gray-600 hover:text-[#0c3b6e] py-2 px-2 rounded-md font-medium"
                onClick={close}
              >
                {link.label}
              </a>
            ) : (
              <NavLink
                key={link.label}
                to={link.href}
                className={({ isActive }) =>
                  `block text-sm py-2 px-2 rounded-md font-medium transition-colors ${
                    isActive ? 'text-[#0c3b6e] bg-blue-50' : 'text-gray-600 hover:text-[#0c3b6e]'
                  }`
                }
                onClick={close}
              >
                {link.label}
              </NavLink>
            )
          )}
          <div className="pt-3 mt-2 border-t border-[#ede8e1] space-y-2">
            <Link
              to="/login"
              className="block text-sm font-medium text-gray-600 hover:text-[#0c3b6e] py-2 px-2"
              onClick={close}
            >
              Login
            </Link>
            <Link
              to="/register"
              className="block text-sm font-semibold bg-[#0c3b6e] text-white px-4 py-2.5 rounded-md hover:bg-[#082a50] text-center"
              onClick={close}
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
