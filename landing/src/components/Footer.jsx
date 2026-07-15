import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Gift, Mail } from 'lucide-react'

export default function Footer() {
  const { t } = useTranslation()

  const links = [
    { path: '/', key: 'nav.home' },
    { path: '/store', key: 'nav.store' },
    { path: '/download', key: 'nav.download' },
    { path: '/about', key: 'nav.about' },
    { path: '/faq', key: 'nav.faq' },
  ]

  return (
    <footer className="border-t border-border-light bg-surface-alt">
      <div className="container-main py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <Gift size={18} className="text-white" />
              </div>
              <span className="font-bold text-lg">{t('app.name')}</span>
            </div>
            <p className="text-text-secondary text-sm leading-relaxed mb-4 max-w-xs">
              {t('footer.description')}
            </p>
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <Mail size={14} />
              <span>{t('footer.email')}</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-text">
              {t('footer.links')}
            </h4>
            <ul className="space-y-2">
              {links.map((l) => (
                <li key={l.path}>
                  <Link
                    to={l.path}
                    className="text-text-secondary hover:text-accent transition-colors text-sm no-underline"
                  >
                    {t(l.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-text">
              {t('footer.legal')}
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/legal?tab=terms" className="text-text-secondary hover:text-accent transition-colors text-sm no-underline">
                  {t('footer.terms')}
                </Link>
              </li>
              <li>
                <Link to="/legal?tab=privacy" className="text-text-secondary hover:text-accent transition-colors text-sm no-underline">
                  {t('footer.privacy')}
                </Link>
              </li>
              <li>
                <a href="mailto:support@gifthaven.com" className="text-text-secondary hover:text-accent transition-colors text-sm no-underline">
                  {t('footer.contact')}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-border-light flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-text-muted text-sm">
            {t('footer.copyright')}
          </p>
        </div>
      </div>
    </footer>
  )
}
