import { useTranslation } from 'react-i18next'
import { Download, Smartphone, Shield, Zap, Bell, ChevronRight, Android } from 'lucide-react'
import SEO from '../components/SEO'

const ICON_MAP = { Zap, Bell, Shield, Smartphone }

export default function DownloadPage() {
  const { t } = useTranslation()
  const features = t('download.features', { returnObjects: true })
  const steps = t('download.install_steps', { returnObjects: true })

  return (
    <>
      <SEO title={t('nav.download')} />
      <div className="page-enter">
        {/* Header */}
        <section className="bg-primary pt-20 pb-16 text-center">
          <div className="container-main">
            <span className="section-label text-accent-light">{t('download.label')}</span>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4">{t('download.title')}</h1>
            <p className="text-white/60 text-lg max-w-xl mx-auto">{t('download.desc')}</p>
          </div>
        </section>

        <section className="section bg-bg">
          <div className="container-main">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              {/* Left: APK Download Card */}
              <div className="card p-8 text-center order-2 lg:order-1">
                <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                  <Android size={44} className="text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">{t('app.name')}</h3>
                <p className="text-text-secondary text-sm mb-4">
                  {t('download.version')} · {t('download.size')}
                </p>

                {/* APK Placeholder */}
                <div className="bg-accent/5 border-2 border-dashed border-accent/30 rounded-2xl p-6 mb-6">
                  <Download size={32} className="text-accent/50 mx-auto mb-2" />
                  <p className="text-text-muted text-sm font-medium">{t('download.coming_soon')}</p>
                  <p className="text-text-muted text-xs mt-1">{t('download.apk_placeholder')}</p>
                </div>

                {/* Share button */}
                <button className="btn btn-outline w-full justify-center text-sm py-3">
                  {t('app.cta_share')}
                </button>
              </div>

              {/* Right: Features */}
              <div className="order-1 lg:order-2">
                <h3 className="text-xl font-bold mb-6">{t('download.features_title')}</h3>
                <div className="space-y-4">
                  {features.map((f, i) => {
                    const Icon = ICON_MAP[f.icon] || Zap
                    return (
                      <div key={i} className="flex gap-4 p-4 rounded-2xl hover:bg-white dark:hover:bg-surface transition-colors">
                        <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                          <Icon size={22} />
                        </div>
                        <div>
                          <h4 className="font-semibold mb-1">{f.title}</h4>
                          <p className="text-text-secondary text-sm">{f.desc}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Install Guide */}
            <div className="mt-20">
              <h3 className="text-xl font-bold mb-8 text-center">{t('download.install_title')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {steps.map((s, i) => (
                  <div key={i} className="card text-center relative">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg">
                      {s.step}
                    </div>
                    <h4 className="font-semibold mb-2">{s.title}</h4>
                    <p className="text-text-secondary text-sm">{s.desc}</p>
                    {i < 2 && (
                      <div className="hidden md:block absolute top-8 -right-4 text-accent/30">
                        <ChevronRight size={24} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
