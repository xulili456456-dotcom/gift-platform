import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, X, Gift } from 'lucide-react'
import LanguageSwitcher from './LanguageSwitcher'
import DarkToggle from './DarkToggle'

const NAV_ITEMS = [
  { path: '/', key: 'nav.home' },
  { path: '/store', key: 'nav.store' },
  { path: '/download', key: 'nav.download' },
  { path: '/about', key: 'nav.about' },
  { path: '/faq', key: 'nav.faq' },
]

export default function Navbar() {
  const { t } = useTranslation()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-[#0A0A0F]/80 backdrop-blur-xl border-b border-border-light">
      <div className="container-main flex items-center justify-between h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 font-bold text-xl text-text no-underline">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Gift size={18} className="text-white" />
          </div>
          <span>{t('app.name')}</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors no-underline ${
                isActive(item.path)
                  ? 'text-accent bg-accent/10'
                  : 'text-text-secondary hover:text-text hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
            >
              {t(item.key)}
            </Link>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <DarkToggle />

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile nav overlay */}
      {mobileOpen && (
        <div className="md:hidden mobile-nav-overlay">
          <div className="container-main py-4 border-t border-border-light bg-white dark:bg-[#0A0A0F] flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`px-4 py-3 rounded-xl text-base font-medium transition-colors no-underline ${
                  isActive(item.path)
                    ? 'text-accent bg-accent/10'
                    : 'text-text-secondary hover:text-text hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                {t(item.key)}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}
