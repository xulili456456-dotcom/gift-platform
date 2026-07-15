import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Users, Gift, Share2, TrendingUp, ChevronRight, Star } from 'lucide-react'
import SEO from '../components/SEO'

// Animated counter hook
function useCountUp(end, duration = 2000, start = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!start) return
    let startTime
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * end))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [end, duration, start])
  return count
}

function StatItem({ value, label, suffix = '+', start }) {
  const count = useCountUp(value, 2000, start)
  return (
    <div className="text-center animate-count-up" style={{ animationDelay: `${Math.random() * 0.2}s` }}>
      <div className="stat-number gradient-text mb-2">
        {count}{suffix}
      </div>
      <div className="text-text-secondary text-sm font-medium">{label}</div>
    </div>
  )
}

// Scroll reveal
function useReveal() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, visible]
}

function RevealSection({ children, className = '' }) {
  const [ref, visible] = useReveal()
  return (
    <div ref={ref} className={`reveal ${visible ? 'visible' : ''} ${className}`}>
      {children}
    </div>
  )
}

export default function HomePage() {
  const { t } = useTranslation()
  const [startCount, setStartCount] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setStartCount(true), 500)
    return () => clearTimeout(timer)
  }, [])

  const stats = [
    { value: 50, label: t('stats.users'), suffix: '万+' },
    { value: 120, label: t('stats.gifts'), suffix: '万+' },
    { value: 8, label: t('stats.invites'), suffix: '万+' },
    { value: 5000, label: t('stats.volume'), suffix: '万+' },
  ]

  const giftItems = [
    { emoji: '🧧', name: '现金红包', value: '$50', color: 'from-red-500 to-orange-500' },
    { emoji: '🎧', name: '无线耳机', value: '$29', color: 'from-blue-500 to-cyan-500' },
    { emoji: '⌚', name: '智能手表', value: '$59', color: 'from-purple-500 to-pink-500' },
    { emoji: '📱', name: '手机配件', value: '$15', color: 'from-green-500 to-teal-500' },
    { emoji: '🏠', name: '家居好物', value: '$39', color: 'from-yellow-500 to-amber-500' },
    { emoji: '💄', name: '美妆礼盒', value: '$45', color: 'from-pink-500 to-rose-500' },
  ]

  const howSteps = [
    { step: '01', title: t('how.step1_title'), desc: t('how.step1_desc'), icon: '📝' },
    { step: '02', title: t('how.step2_title'), desc: t('how.step2_desc'), icon: '📨' },
    { step: '03', title: t('how.step3_title'), desc: t('how.step3_desc'), icon: '🎁' },
  ]

  const testimonials = t('testimonials.items', { returnObjects: true })

  return (
    <>
      <SEO />
      <div className="page-enter">
        {/* ═══════ HERO ═══════ */}
        <section className="hero-gradient grid-pattern relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-20 left-[10%] w-72 h-72 bg-accent/10 rounded-full blur-3xl animate-float" />
            <div className="absolute top-40 right-[10%] w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
          </div>

          <div className="container-main relative z-10 pt-28 pb-20 md:pt-40 md:pb-32">
            <div className="max-w-3xl mx-auto text-center">
              {/* Badge */}
              <div className="animate-fade-in inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-semibold mb-8">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                {t('hero.badge')}
              </div>

              <h1 className="animate-fade-in-up text-4xl md:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight mb-6">
                {t('hero.title')}
              </h1>

              <p className="animate-fade-in-up text-lg md:text-xl text-text-secondary max-w-xl mx-auto mb-10" style={{ animationDelay: '0.15s' }}>
                {t('hero.subtitle')}
              </p>

              <div className="animate-fade-in-up flex flex-col sm:flex-row items-center justify-center gap-4" style={{ animationDelay: '0.3s' }}>
                <a
                  href="https://gift-platform-h6um.onrender.com/register"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-lg no-underline"
                >
                  {t('app.cta_register')}
                  <ArrowRight size={20} />
                </a>
                <Link to="/download" className="btn btn-outline btn-lg no-underline">
                  {t('app.cta_download')}
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════ STATS ═══════ */}
        <section className="section bg-white dark:bg-surface">
          <div className="container-main">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
              {stats.map((s, i) => (
                <div key={i} className="reveal" style={{ transitionDelay: `${i * 0.1}s` }}>
                  <StatItem value={parseInt(s.value)} label={s.label} suffix={s.suffix} start={startCount} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ HOW IT WORKS ═══════ */}
        <section className="section bg-surface-alt">
          <div className="container-main">
            <RevealSection className="text-center mb-16">
              <span className="section-label">{t('how.label')}</span>
              <h2 className="section-title">{t('how.title')}</h2>
              <p className="section-desc mx-auto">{t('how.desc')}</p>
            </RevealSection>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* Connector line (desktop only) */}
              <div className="hidden md:block step-connector" style={{ top: '56px' }} />

              {howSteps.map((s, i) => (
                <RevealSection key={i} style={{ transitionDelay: `${i * 0.15}s` }}>
                  <div className="card text-center relative">
                    <div className="w-16 h-16 rounded-2xl bg-accent/10 text-accent flex items-center justify-center text-2xl mb-5 mx-auto">
                      {s.icon}
                    </div>
                    <div className="absolute -top-3 -left-1 text-5xl font-extrabold text-accent/15 select-none">
                      {s.step}
                    </div>
                    <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                    <p className="text-text-secondary text-sm">{s.desc}</p>
                  </div>
                </RevealSection>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ GIFT SHOWCASE ═══════ */}
        <section className="section bg-white dark:bg-surface">
          <div className="container-main">
            <RevealSection className="text-center mb-16">
              <span className="section-label">{t('gifts.label')}</span>
              <h2 className="section-title">{t('gifts.title')}</h2>
              <p className="section-desc mx-auto">{t('gifts.desc')}</p>
            </RevealSection>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {giftItems.map((g, i) => (
                <RevealSection key={i} style={{ transitionDelay: `${i * 0.08}s` }}>
                  <div className="card p-5 text-center cursor-pointer">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${g.color} flex items-center justify-center text-2xl mb-3 mx-auto shadow-sm`}>
                      {g.emoji}
                    </div>
                    <h4 className="font-semibold text-sm mb-1">{g.name}</h4>
                    <p className="text-accent font-bold">{g.value}</p>
                  </div>
                </RevealSection>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ TESTIMONIALS ═══════ */}
        <section className="section bg-surface-alt">
          <div className="container-main">
            <RevealSection className="text-center mb-16">
              <span className="section-label">{t('testimonials.label')}</span>
              <h2 className="section-title">{t('testimonials.title')}</h2>
              <p className="section-desc mx-auto">{t('testimonials.desc')}</p>
            </RevealSection>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {testimonials.map((item, i) => (
                <RevealSection key={i} style={{ transitionDelay: `${i * 0.1}s` }}>
                  <div className="card p-6">
                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(5)].map((_, j) => (
                        <Star key={j} size={16} className="fill-accent text-accent" />
                      ))}
                    </div>
                    <p className="text-text text-sm leading-relaxed mb-5 italic">
                      "{item.text}"
                    </p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{item.name}</p>
                        <p className="text-text-muted text-xs">{item.role}</p>
                      </div>
                      <div className="text-accent font-bold text-sm">
                        {item.earned}
                      </div>
                    </div>
                  </div>
                </RevealSection>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ BOTTOM CTA ═══════ */}
        <section className="section bg-primary relative overflow-hidden">
          <div className="absolute inset-0 grid-pattern opacity-10" />
          <div className="absolute top-10 right-[-10%] w-[500px] h-[500px] bg-accent/10 rounded-full blur-3xl" />

          <div className="container-main relative z-10 text-center">
            <RevealSection>
              <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
                {t('cta.title')}
              </h2>
              <p className="text-white/60 text-lg mb-10">
                {t('cta.subtitle')}
              </p>
              <a
                href="https://gift-platform-h6um.onrender.com/register"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-accent btn-lg no-underline text-lg"
              >
                {t('cta.button')}
                <ArrowRight size={22} />
              </a>
            </RevealSection>
          </div>
        </section>
      </div>
    </>
  )
}
