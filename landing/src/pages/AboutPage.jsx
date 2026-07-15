import { useRef, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Target, Eye, Heart, Globe, Users, Zap } from 'lucide-react'
import SEO from '../components/SEO'

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

const valueIcons = [Heart, Target, Eye]
const BIG_ICONS = [Users, Globe, Zap]

export default function AboutPage() {
  const { t } = useTranslation()
  const values = t('about.values', { returnObjects: true }) || []

  return (
    <>
      <SEO title={t('nav.about')} />
      <div className="page-enter">
        {/* Header */}
        <section className="bg-primary relative overflow-hidden pt-24 pb-32 text-center">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="orb absolute top-1/4 left-[15%] w-[600px] h-[600px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #D4A574, transparent 70%)' }} />
            <div className="orb-slow absolute -bottom-32 right-[10%] w-[500px] h-[500px] rounded-full opacity-08" style={{ background: 'radial-gradient(circle, #E8C99B, transparent 70%)' }} />
          </div>
          <div className="hero-particles">
            {Array.from({ length: 15 }, (_, i) => (
              <div key={i} className="hero-particle" style={{ left: `${10 + Math.random() * 80}%`, animationDelay: `${Math.random() * 5}s`, width: 1 + Math.random() * 2, height: 1 + Math.random() * 2 }} />
            ))}
          </div>
          <div className="container-main relative z-10">
            <div className="animate-fade-in inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-accent-light text-sm font-semibold mb-6 border border-white/10">
              <Globe size={14} />
              {t('about.label')}
            </div>
            <h1 className="animate-fade-in-up text-3xl md:text-5xl font-extrabold text-white mb-4">{t('about.title')}</h1>
            <p className="animate-fade-in-up text-white/60 text-lg max-w-2xl mx-auto" style={{ animationDelay: '0.1s' }}>{t('about.desc')}</p>

            {/* Big stat numbers */}
            <div className="animate-fade-in-up grid grid-cols-3 gap-8 max-w-lg mx-auto mt-14" style={{ animationDelay: '0.25s' }}>
              {[
                { icon: Users, num: '500K+', label: 'Global Resellers' },
                { icon: Globe, num: '20+', label: 'Platform Partners' },
                { icon: Zap, num: '$38M+', label: 'Total Payouts' },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <s.icon size={24} className="text-accent mx-auto mb-2 opacity-60" />
                  <div className="text-2xl md:text-3xl font-extrabold text-white mb-1">{s.num}</div>
                  <div className="text-white/40 text-xs">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Wave bottom */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 60" className="w-full" preserveAspectRatio="none"><path fill="var(--color-bg)" d="M0,30 C360,60 1080,0 1440,30 L1440,60 L0,60 Z" /></svg>
          </div>
        </section>

        <section className="section bg-bg">
          <div className="container-main max-w-4xl">
            {/* Mission & Vision */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
              {[
                { icon: Target, title: t('about.mission_title'), text: t('about.mission'), color: '#FF9900' },
                { icon: Eye, title: t('about.vision_title'), text: t('about.vision'), color: '#D4A574' },
              ].map((item, i) => (
                <div key={i} className="reveal-enhanced visible card p-8 border-0 shadow-lg relative overflow-hidden" style={{ transitionDelay: `${i * 0.15}s` }}>
                  <div className="absolute top-0 left-0 w-full h-1.5" style={{ background: `linear-gradient(90deg, ${item.color}, ${item.color}44)` }} />
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 relative" style={{ background: `${item.color}15` }}>
                    <item.icon size={26} style={{ color: item.color }} />
                  </div>
                  <h3 className="text-lg font-bold mb-3">{item.title}</h3>
                  <p className="text-text-secondary leading-relaxed text-sm">{item.text}</p>
                </div>
              ))}
            </div>

            {/* Values */}
            <div>
              <h3 className="text-2xl font-bold mb-10 text-center">{t('about.values_title')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {values.map((v, i) => {
                  const Icon = valueIcons[i] || Heart
                  return (
                    <div key={i} className="reveal-enhanced visible card p-6 text-center border-0 shadow-lg tilt-card" style={{ transitionDelay: `${i * 0.12}s` }}>
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent/10 text-accent flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-accent/5" />
                        <Icon size={30} className="relative z-10" />
                      </div>
                      <h4 className="font-bold mb-2">{v.title}</h4>
                      <p className="text-text-secondary text-sm leading-relaxed">{v.desc}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
