import { useState, useEffect, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Star, TrendingUp, Package, Truck, Headphones, ShoppingCart, ChevronDown } from 'lucide-react'
import SEO from '../components/SEO'

// Animated counter
function useCountUp(end, duration = 2000, start = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!start) return
    const startTime = performance.now()
    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * end))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [end, duration, start])
  return count
}

function StatItem({ value, label, suffix = '', prefix = '', start }) {
  const count = useCountUp(value, 2000, start)
  return (
    <div className="text-center stat-glow">
      <div className="text-3xl md:text-5xl font-extrabold tracking-tight mb-1" style={{ color: '#D4A574' }}>
        {prefix}{count}{suffix}
      </div>
      <div className="text-text-secondary text-sm font-medium">{label}</div>
    </div>
  )
}

// Scroll reveal with blur effect
function useReveal(threshold = 0.1) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])
  return [ref, visible]
}

function RevealSection({ children, className = '', style, enhanced = false }) {
  const [ref, visible] = useReveal()
  const cls = enhanced ? 'reveal-enhanced' : 'reveal'
  return (
    <div ref={ref} className={`${cls} ${visible ? 'visible' : ''} ${className}`} style={style}>
      {children}
    </div>
  )
}

const GLOW_CLASSES = ['platform-glow-amazon', 'platform-glow-shopee', 'platform-glow-lazada', 'platform-glow-aliexpress', 'platform-glow-tiktok', 'platform-glow-ebay']

const ICON_MAP = { Package, Truck, Headphones, TrendingUp }

// Hero particle config (pre-computed to avoid re-renders)
const PARTICLES = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  x: `${5 + Math.random() * 90}%`,
  delay: `${Math.random() * 6}s`,
  dur: `${4 + Math.random() * 6}s`,
  size: 1 + Math.random() * 2,
}))

export default function HomePage() {
  const { t } = useTranslation()
  const [startCount, setStartCount] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setStartCount(true), 300)
    return () => clearTimeout(timer)
  }, [])

  const platforms = t('platforms.items', { returnObjects: true }) || []
  const valueItems = t('value.items', { returnObjects: true }) || []
  const testimonials = t('testimonials.items', { returnObjects: true }) || []

  const profitItems = useMemo(() => [
    { emoji: '🎧', name: 'Sony Noise Cancelling Headphones', cost: '$255', price: '$299', profit: '$44', cat: 'Amazon', color: '#FF9900' },
    { emoji: '⌚', name: 'Apple Watch Series 10', cost: '$340', price: '$399', profit: '$59', cat: 'Amazon', color: '#FF9900' },
    { emoji: '📱', name: 'Samsung Galaxy S25', cost: '$523', price: '$599', profit: '$76', cat: 'Shopee', color: '#EE4D2D' },
    { emoji: '💻', name: 'MacBook Air M4', cost: '$935', price: '$1099', profit: '$164', cat: 'Amazon', color: '#FF9900' },
    { emoji: '👟', name: 'Nike Air Max 2025', cost: '$85', price: '$120', profit: '$35', cat: 'Lazada', color: '#0F1470' },
    { emoji: '💄', name: 'SK-II Facial Essence', cost: '$196', price: '$245', profit: '$49', cat: 'Shopee', color: '#EE4D2D' },
  ], [])

  return (
    <>
      <SEO />
      <div className="page-enter">
        {/* ═══════ HERO ═══════ */}
        <section className="hero-gradient grid-pattern relative overflow-hidden min-h-[90vh] flex items-center">
          {/* Floating gradient orbs */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="orb absolute -top-20 -left-20 w-[500px] h-[500px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #FF9900, transparent 70%)' }} />
            <div className="orb-slow absolute top-1/3 -right-32 w-[400px] h-[400px] rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #EE4D2D, transparent 70%)' }} />
            <div className="orb-reverse absolute -bottom-20 left-1/3 w-[350px] h-[350px] rounded-full opacity-12" style={{ background: 'radial-gradient(circle, #0F1470, transparent 70%)' }} />
            <div className="orb absolute top-1/2 left-1/2 w-[300px] h-[300px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #D4A574, transparent 70%)', animationDelay: '-4s' }} />
          </div>

          {/* Particle grid */}
          <div className="hero-particles">
            {PARTICLES.map((p) => (
              <div
                key={p.id}
                className="hero-particle"
                style={{ left: p.x, animationDelay: p.delay, '--dur': p.dur, '--delay': p.delay, width: p.size, height: p.size }}
              />
            ))}
          </div>

          <div className="container-main relative z-10 py-20 md:py-28">
            <div className="max-w-4xl mx-auto text-center">
              {/* Badge */}
              <div className="animate-fade-in inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-semibold mb-8 border border-accent/20">
                <span className="w-2 h-2 rounded-full bg-accent glow-dot" />
                {t('hero.badge')}
              </div>

              <h1 className="animate-fade-in-up text-3xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight mb-4 whitespace-pre-line">
                {t('hero.title')}
              </h1>

              <p className="animate-fade-in-up text-base md:text-xl text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed" style={{ animationDelay: '0.1s' }}>
                {t('hero.subtitle')}
              </p>

              <div className="animate-fade-in-up flex flex-col sm:flex-row items-center justify-center gap-4" style={{ animationDelay: '0.2s' }}>
                <a
                  href="https://gift-platform-h6um.onrender.com/register"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-accent btn-lg no-underline text-base glow-pulse"
                >
                  {t('app.cta_register')}
                  <ArrowRight size={20} />
                </a>
                <Link to="/store" className="btn btn-outline btn-lg no-underline text-base">
                  <ShoppingCart size={20} />
                  {t('nav.store')}
                </Link>
              </div>

              {/* Platform logos */}
              <div className="animate-fade-in-up mt-14 flex flex-wrap items-center justify-center gap-6 opacity-70" style={{ animationDelay: '0.4s' }}>
                {platforms.map((p, i) => (
                  <span key={i} className="text-sm md:text-base font-extrabold tracking-wide hover:opacity-100 transition-all duration-300 cursor-default hover:scale-110" style={{ color: p.color, opacity: 0.65 }}>
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-text-muted">
            <span className="text-[11px] uppercase tracking-widest font-semibold opacity-50">Scroll</span>
            <ChevronDown size={20} className="scroll-indicator" />
          </div>
        </section>

        {/* ═══════ STATS ═══════ */}
        <section className="section bg-white dark:bg-surface section-wave">
          <div className="container-main">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
              {[
                { value: 50, suffix: 'K+', label: t('stats.users') },
                { value: 20, suffix: 'K+', label: t('stats.gifts') },
                { value: 15, suffix: 'K+', label: t('stats.invites') },
                { value: 38, prefix: '$', suffix: 'M+', label: t('stats.volume') },
              ].map((s, i) => (
                <RevealSection key={i} enhanced>
                  <StatItem value={s.value} prefix={s.prefix || ''} label={s.label} suffix={s.suffix} start={startCount} />
                </RevealSection>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ HOW IT WORKS ═══════ */}
        <section className="section bg-surface-alt">
          <div className="container-main">
            <RevealSection enhanced className="text-center mb-16">
              <span className="section-label">{t('how.label')}</span>
              <h2 className="section-title">{t('how.title')}</h2>
              <p className="section-desc mx-auto">{t('how.desc')}</p>
            </RevealSection>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative max-w-4xl mx-auto">
              <div className="hidden md:block step-connector" style={{ top: '64px' }} />
              {[
                { step: '01', title: t('how.step1_title'), desc: t('how.step1_desc'), emoji: '🎯', color: '#FF9900' },
                { step: '02', title: t('how.step2_title'), desc: t('how.step2_desc'), emoji: '🚀', color: '#EE4D2D' },
                { step: '03', title: t('how.step3_title'), desc: t('how.step3_desc'), emoji: '💎', color: '#D4A574' },
              ].map((s, i) => (
                <RevealSection key={i} enhanced style={{ transitionDelay: `${i * 0.15}s` }}>
                  <div className="tilt-card card text-center relative overflow-hidden border-0 shadow-md">
                    <div className="absolute top-0 left-0 w-full h-1.5" style={{ background: `linear-gradient(90deg, ${s.color}, ${s.color}88)` }} />
                    <div className="pt-6">
                      <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-5 mx-auto relative" style={{ background: `${s.color}15` }}>
                        {s.emoji}
                        <div className="absolute inset-0 rounded-2xl opacity-20" style={{ background: `radial-gradient(circle at center, ${s.color}, transparent)` }} />
                      </div>
                      <div className="absolute -top-2 left-0 text-6xl font-extrabold opacity-[0.04] select-none" style={{ color: s.color }}>
                        {s.step}
                      </div>
                      <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                      <p className="text-text-secondary text-sm leading-relaxed px-2">{s.desc}</p>
                    </div>
                  </div>
                </RevealSection>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ PROFIT SHOWCASE ═══════ */}
        <section className="section bg-white dark:bg-surface">
          <div className="container-main">
            <RevealSection enhanced className="text-center mb-16">
              <span className="section-label">{t('gifts.label')}</span>
              <h2 className="section-title">{t('gifts.title')}</h2>
              <p className="section-desc mx-auto">{t('gifts.desc')}</p>
            </RevealSection>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
              {profitItems.map((g, i) => (
                <RevealSection key={i} enhanced style={{ transitionDelay: `${i * 0.06}s` }}>
                  <div className="tilt-card card p-5 cursor-pointer border-0 shadow-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 rounded-bl-full opacity-10" style={{ background: g.color }} />
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-3xl">{g.emoji}</span>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: `${g.color}18`, color: g.color }}>
                        {g.cat}
                      </span>
                    </div>
                    <h4 className="font-semibold text-sm mb-3 truncate">{g.name}</h4>
                    <div className="flex items-center justify-between text-xs mb-3 bg-gray-50 dark:bg-white/5 rounded-xl p-3">
                      <div className="text-center">
                        <div className="text-text-muted mb-0.5">Cost</div>
                        <div className="text-text font-bold">{g.cost}</div>
                      </div>
                      <span className="text-text-muted text-lg">→</span>
                      <div className="text-center">
                        <div className="text-text-muted mb-0.5">Market</div>
                        <div className="text-text font-bold">{g.price}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-border-light">
                      <span className="text-xs text-text-muted font-medium">Your Profit</span>
                      <span className="text-xl font-extrabold profit-pop" style={{ color: '#22c55e' }}>{g.profit}</span>
                    </div>
                  </div>
                </RevealSection>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ VALUE PROPOSITION ═══════ */}
        <section className="section bg-surface-alt">
          <div className="container-main">
            <RevealSection enhanced className="text-center mb-16">
              <span className="section-label">{t('value.label')}</span>
              <h2 className="section-title">{t('value.title')}</h2>
              <p className="section-desc mx-auto">{t('value.desc')}</p>
            </RevealSection>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {valueItems.map((v, i) => {
                const Icon = ICON_MAP[v.icon] || Package
                return (
                  <RevealSection key={i} enhanced style={{ transitionDelay: `${i * 0.1}s` }}>
                    <div className="card p-6 flex gap-5 border-0 shadow-md hover:border-accent/20">
                      <div className="w-14 h-14 rounded-2xl bg-accent/10 text-accent flex items-center justify-center shrink-0 relative overflow-hidden">
                        <div className="absolute inset-0 bg-accent/5" />
                        <Icon size={26} className="relative z-10" />
                      </div>
                      <div>
                        <h4 className="font-bold mb-1.5 text-base">{v.title}</h4>
                        <p className="text-text-secondary text-sm leading-relaxed">{v.desc}</p>
                      </div>
                    </div>
                  </RevealSection>
                )
              })}
            </div>
          </div>
        </section>

        {/* ═══════ PLATFORMS ═══════ */}
        <section className="section bg-white dark:bg-surface">
          <div className="container-main">
            <RevealSection enhanced className="text-center mb-16">
              <span className="section-label">{t('platforms.label')}</span>
              <h2 className="section-title">{t('platforms.title')}</h2>
              <p className="section-desc mx-auto max-w-2xl">{t('platforms.desc')}</p>
            </RevealSection>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-5xl mx-auto">
              {platforms.map((p, i) => (
                <RevealSection key={i} enhanced style={{ transitionDelay: `${i * 0.08}s` }}>
                  <div className={`platform-card ${GLOW_CLASSES[i % GLOW_CLASSES.length]} card p-6 text-center h-full border-0 shadow-md cursor-default`}>
                    <div className="text-3xl font-extrabold mb-3 tracking-tight" style={{ color: p.color }}>
                      {p.name}
                    </div>
                    <p className="text-text-muted text-xs leading-relaxed">{p.desc}</p>
                  </div>
                </RevealSection>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ TESTIMONIALS ═══════ */}
        <section className="section bg-surface-alt">
          <div className="container-main">
            <RevealSection enhanced className="text-center mb-16">
              <span className="section-label">{t('testimonials.label')}</span>
              <h2 className="section-title">{t('testimonials.title')}</h2>
              <p className="section-desc mx-auto">{t('testimonials.desc')}</p>
            </RevealSection>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {testimonials.map((item, i) => (
                <RevealSection key={i} enhanced style={{ transitionDelay: `${i * 0.1}s` }}>
                  <div className="card p-6 border-0 shadow-md relative">
                    {/* Quote mark */}
                    <div className="absolute top-4 right-6 text-6xl font-serif text-accent/10 select-none leading-none">"</div>
                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(5)].map((_, j) => (
                        <Star key={j} size={14} className="fill-accent text-accent" />
                      ))}
                    </div>
                    <p className="text-text text-sm leading-relaxed mb-5 relative z-10">
                      {item.text}
                    </p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{item.name}</p>
                        <p className="text-text-muted text-[12px]">{item.role}</p>
                      </div>
                      <div className="text-accent font-bold text-sm">{item.earned}</div>
                    </div>
                  </div>
                </RevealSection>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ BOTTOM CTA ═══════ */}
        <section className="section bg-primary relative overflow-hidden">
          {/* Floating orbs in CTA */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="orb absolute -top-20 right-[20%] w-[400px] h-[400px] rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #D4A574, transparent 70%)' }} />
            <div className="orb-slow absolute bottom-0 left-[10%] w-[350px] h-[350px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #E8C99B, transparent 70%)' }} />
          </div>
          <div className="absolute inset-0 grid-pattern opacity-5" />

          <div className="container-main relative z-10 text-center py-8">
            <RevealSection enhanced>
              <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
                {t('cta.title')}
              </h2>
              <p className="text-white/60 text-lg mb-10 max-w-xl mx-auto">
                {t('cta.subtitle')}
              </p>
              <a
                href="https://gift-platform-h6um.onrender.com/register"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-accent btn-lg no-underline text-lg glow-pulse"
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
