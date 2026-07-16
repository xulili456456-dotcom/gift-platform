import { useRef, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Smartphone, Shield, Zap, Bell, ChevronRight, QrCode } from 'lucide-react'
import SEO from '../components/SEO'

const ICON_MAP = { Zap, Bell, Shield, Smartphone }

function useReveal() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return [ref, visible]
}

export default function DownloadPage() {
  const { t } = useTranslation()
  const features = t('download.features', { returnObjects: true }) || []
  const steps = t('download.install_steps', { returnObjects: true }) || []

  return (
    <>
      <SEO title={t('nav.download')} />
      <div className="page-enter">
        {/* Header */}
        <section className="bg-primary relative overflow-hidden pt-24 pb-20 text-center">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="orb absolute top-1/4 right-[20%] w-[400px] h-[400px] rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #D4A574, transparent 70%)' }} />
            <div className="orb-slow absolute bottom-0 left-[10%] w-[350px] h-[350px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #E8C99B, transparent 70%)' }} />
          </div>
          <div className="hero-particles">
            {Array.from({ length: 20 }, (_, i) => (
              <div key={i} className="hero-particle" style={{ left: `${5 + Math.random() * 90}%`, animationDelay: `${Math.random() * 5}s`, width: 1 + Math.random() * 2, height: 1 + Math.random() * 2 }} />
            ))}
          </div>
          <div className="container-main relative z-10">
            <div className="animate-fade-in inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-accent-light text-sm font-semibold mb-6 border border-white/10">
              <Download size={14} />
              {t('download.label')}
            </div>
            <h1 className="animate-fade-in-up text-3xl md:text-5xl font-extrabold text-white mb-4">{t('download.title')}</h1>
            <p className="animate-fade-in-up text-white/60 text-lg max-w-xl mx-auto" style={{ animationDelay: '0.1s' }}>{t('download.desc')}</p>
          </div>
        </section>

        <section className="section bg-bg">
          <div className="container-main">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              {/* Left: Download Card */}
              <div className="order-2 lg:order-1">
                <div className="card p-8 text-center border-0 shadow-xl relative overflow-hidden gradient-border">
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-bl-full opacity-8" style={{ background: 'radial-gradient(circle at top right, #D4A574, transparent)' }} />
                  <div className="w-28 h-28 mx-auto mb-6 rounded-3xl bg-primary flex items-center justify-center shadow-2xl shadow-primary/40 relative">
                    <div className="absolute inset-0 rounded-3xl animate-pulse opacity-20" style={{ background: 'radial-gradient(circle at center, #D4A574, transparent)' }} />
                    <Smartphone size={48} className="text-white relative z-10" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{t('app.name')}</h3>
                  <p className="text-text-secondary text-sm mb-6">{t('download.version')} · {t('download.size')}</p>

                  {/* Download Button */}
                  <a
                    href="https://cdn.trackusp.com/apks/sched/131bba388eeb580e/release.apk"
                    download
                    className="btn btn-accent btn-lg w-full justify-center text-base mb-4 glow-pulse no-underline"
                  >
                    <Download size={20} />
                    Download APK
                  </a>
                  <p className="text-text-muted text-xs">{t('download.version')} · {t('download.size')}</p>
                </div>
              </div>

              {/* Right: Features */}
              <div className="order-1 lg:order-2">
                <h3 className="text-xl font-bold mb-6">{t('download.features_title')}</h3>
                <div className="space-y-4">
                  {features.map((f, i) => {
                    const Icon = ICON_MAP[f.icon] || Zap
                    return (
                      <div key={i} className="reveal-enhanced visible card p-5 flex gap-4 border-0 shadow-md hover:shadow-lg" style={{ transitionDelay: `${i * 0.1}s` }}>
                        <div className="w-14 h-14 rounded-2xl bg-accent/10 text-accent flex items-center justify-center shrink-0 relative overflow-hidden">
                          <div className="absolute inset-0 bg-accent/5" />
                          <Icon size={24} className="relative z-10" />
                        </div>
                        <div>
                          <h4 className="font-semibold mb-1.5">{f.title}</h4>
                          <p className="text-text-secondary text-sm leading-relaxed">{f.desc}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Install Steps */}
            <div className="mt-20">
              <h3 className="text-2xl font-bold mb-10 text-center reveal-enhanced visible">{t('download.install_title')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
                {steps.map((s, i) => (
                  <div key={i} className="reveal-enhanced visible card text-center relative border-0 shadow-md" style={{ transitionDelay: `${i * 0.1}s` }}>
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-primary/30 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-accent/30 to-transparent" />
                      <span className="relative z-10">{s.step}</span>
                    </div>
                    <h4 className="font-semibold mb-2">{s.title}</h4>
                    <p className="text-text-secondary text-sm leading-relaxed">{s.desc}</p>
                    {i < 2 && (
                      <div className="hidden md:block absolute top-10 -right-6 text-accent/20">
                        <ChevronRight size={28} />
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
