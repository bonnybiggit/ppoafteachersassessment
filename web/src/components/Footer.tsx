import { Link } from 'react-router-dom'
import ppoafLogo from '../assets/ppoaf-logo.jpeg'

const footerNav = [
  { label: 'Home', href: '/' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Competencies', href: '#competencies' },
  { label: 'For Teachers', href: '#for-teachers' },
  { label: 'About', href: '#about' },
]

const footerAccount = [
  { label: 'Login', href: '/login' },
  { label: 'Register', href: '/register' },
]

export default function Footer() {
  return (
    <footer id="about" className="bg-[#0c3b6e] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

          {/* Brand column */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img
                src={ppoafLogo}
                alt="PPOAF Foundation logo"
                className="h-12 w-12 object-contain rounded-full bg-white p-0.5"
              />
              <span className="text-base font-semibold leading-snug">
                PPOAF Teachers Assessment
              </span>
            </div>
            <p className="text-sm text-blue-100 leading-relaxed max-w-xs">
              Teacher competency assessment, gap diagnosis and personalised professional development.
            </p>
          </div>

          {/* Navigation column */}
          <div>
            <h3 className="text-xs font-semibold tracking-widest uppercase text-blue-300 mb-4">
              Navigation
            </h3>
            <ul className="space-y-2">
              {footerNav.map((link) => (
                <li key={link.label}>
                  {link.href.startsWith('#') ? (
                    <a
                      href={link.href}
                      className="text-sm text-blue-100 hover:text-white transition-colors"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      to={link.href}
                      className="text-sm text-blue-100 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Account column */}
          <div>
            <h3 className="text-xs font-semibold tracking-widest uppercase text-blue-300 mb-4">
              Account
            </h3>
            <ul className="space-y-2">
              {footerAccount.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm text-blue-100 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-blue-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-blue-300">
            &copy; {new Date().getFullYear()} PPOAF Teachers Assessment. All rights reserved.
          </p>
          <p className="text-xs text-blue-400">
            A professional development initiative of the PPOA Foundation.
          </p>
        </div>
      </div>
    </footer>
  )
}
