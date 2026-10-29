import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Menu, X, Sun, Moon } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

const NAV_LINKS = [
  { href: '/#features', label: 'Features' },
  { href: '/#pricing', label: 'Pricing' },
  { href: '/#why-us', label: 'Why Us' },
  { href: '/#testimonials', label: 'Testimonials' },
  { href: '/#faq', label: 'FAQ' },
]

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const navigate = useNavigate()
  const { darkMode, toggleTheme } = useTheme()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out px-4 sm:px-6 lg:px-8 ${
      scrolled ? 'pt-3' : 'pt-4'
    }`}>
      <header className={`mx-auto flex items-center justify-between transition-all duration-500 ease-in-out border rounded-full ${
        scrolled
          ? 'max-w-5xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border-black/10 dark:border-white/15 shadow-2xl py-2.5 px-6'
          : 'max-w-7xl bg-white/10 dark:bg-black/15 backdrop-blur-sm border-black/10 dark:border-white/20 shadow-md py-3.5 px-8'
      }`}>
        {/* Logo / Brand Name: Bilix — 3D Blue B Logo */}
        <div
          onClick={() => navigate('/')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-11 h-11 rounded-xl bg-black flex items-center justify-center shadow-xl group-hover:scale-105 transition-all overflow-hidden border border-blue-900/40">
            <img src="/bilix_logo.png" alt="Bilix" className="w-full h-full object-cover" />
          </div>
          <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Bilix
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 font-semibold text-sm text-slate-800 dark:text-white">
          {NAV_LINKS.map((link) => (
            <a key={link.label} href={link.href} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              {link.label}
            </a>
          ))}
          <Link to="/contact" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Contact Us
          </Link>
        </nav>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2.5 rounded-full text-slate-800 dark:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <button
            variant="ghost"
            onClick={() => navigate('/auth/login')}
            className="hidden sm:flex cursor-pointer font-semibold text-slate-800 dark:text-white hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-full px-5 text-sm"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/auth/register')}
            className="cursor-pointer bg-blue-800 hover:bg-blue-700 text-white rounded-full font-bold text-xs sm:text-sm tracking-wider uppercase px-6 py-2.5 shadow-xl shadow-blue-800/30 hover:scale-105 transition-all"
          >
            GET FREE DEMO
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden cursor-pointer p-2 text-slate-800 dark:text-white"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-2 max-w-6xl mx-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-2xl shadow-xl p-4 space-y-3 text-slate-800 dark:text-slate-200 font-medium">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 hover:text-blue-500 dark:hover:text-blue-400"
            >
              {link.label}
            </a>
          ))}
          <Link to="/contact" onClick={() => setMobileMenuOpen(false)} className="block py-2 hover:text-blue-500 dark:hover:text-blue-400">
            Contact Us
          </Link>
          <div className="pt-3 border-t border-black/10 dark:border-white/10 flex items-center justify-between gap-2">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2.5 rounded-full border border-black/10 dark:border-white/15 text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <div className="flex flex-1 gap-2">
              <button
                variant="outline"
                onClick={() => { setMobileMenuOpen(false); navigate('/auth/login'); }}
                className="flex-1 rounded-full border-black/15 dark:border-white/20 text-slate-800 dark:text-white hover:bg-black/5 dark:hover:bg-white/10"
              >
                Sign In
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); navigate('/auth/register'); }}
                className="flex-1 bg-blue-800 hover:bg-blue-700 text-white rounded-full"
              >
                GET FREE DEMO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Navbar
