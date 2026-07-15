import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Star, TrendingUp, Package, Truck, Headphones, ShoppingCart } from 'lucide-react'
import SEO from '../components/SEO'

// Animated counter
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

function StatItem({ value, label, suffix = '', prefix = '' }) {
  const count = useCountUp(value, 2000, true)
  return (
    <div className="text-center">
      <div className="text-3xl md:text-5xl font-extrabold tracking-tight mb-1" style={{ color: '#D4A574' }}>
        {prefix}{count}{suffix}
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
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, visible]
}

function RevealSection({ children, className = '', style }) {
  const [ref, visible] = useReveal()
  return (
    <div ref={ref} className={`reveal ${visible ? 'visible' : ''} ${className}`} style={style}>
      {children}
    </div>
  )
}

const ICON_MAP = { Package, Truck, Headphones, TrendingUp }

export default function HomePage() {
  const { t } = useTranslation()

  const platforms = t('platforms.items', { returnObjects: true }) || []
  const valueItems = t('value.items', { returnObjects: true }) || []
  const testimonials = t('testimonials.items', { returnObjects: true }) || []

  const profitItems = [
    { emoji: '🎧', name: 'Sony降噪耳机', cost: '$255', price: '$299', profit: '$44', cat: 'Amazon' },
    { emoji: '⌚', name: 'Apple Watch', cost: '$340', price: '$399', profit: '$59', cat: 'Amazon' },
    { emoji: '📱', name: 'Samsung 手机', cost: '$523', price: '$599', profit: '$76', cat: 'Shopee' },
    { emoji: '💻', name: 'MacBook Air', cost: '$935', price: '$1099', profit: '$164', cat: 'Amazon' },
    { emoji: '👟', name: 'Nike 跑鞋', cost: '$85', price: '$120', profit: '$35', cat: 'Lazada' },
    { emoji: '💄', name: 'SK-II 精华', cost: '$196', price: '$245', profit: '$49', cat: 'Shopee' },
  ]

  return (
    <>
      <SEO />
      <div className="page-enter">
        {/* ═══════ HERO ═══════ */}
        <section className="hero-gradient grid-pattern relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-20 left-[10%] w-72 h-72 bg-accent/10 rounded-full blur-3xl animate-float" />
            <div className="absolute bottom-20 right-[10%] w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
          </div>

          <div className="container-main relative z-10 pt-24 pb-16 md:pt-36 md:pb-24">
            <div className="max-w-4xl mx-auto text-center">
              {/* Badge */}
              <div className="animate-fade-in inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-semibold mb-8">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                {t('hero.badge')}
              </div>

              <h1 className="animate-fade-in-up text-3xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight mb-4 whitespace-pre-line">
                {t('hero.title')}
              </h1>

              <p className="animate-fade-in-up text-base md:text-xl text-text-secondary max-w-2xl mx-auto mb-10" style={{ animationDelay: '0.1s' }}>
                {t('hero.subtitle')}
              </p>

              <div className="animate-fade-in-up flex flex-col sm:flex-row items-center justify-center gap-4" style={{ animationDelay: '0.2s' }}>
                <a
                  href="https://gift-platform-h6um.onrender.com/register"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-accent btn-lg no-underline text-base"
                >
                  {t('app.cta_register')}
                  <ArrowRight size={20} />
                </a>
                <Link to="/store" className="btn btn-outline btn-lg no-underline text-base">
                  <ShoppingCart size={20} />
                  {t('nav.store')}
                </Link>
              </div>

              {/* Platform logos row */}
              <div className="animate-fade-in-up mt-12 flex flex-wrap items-center justify-center gap-3 md:gap-5 opacity-60" style={{ animationDelay: '0.35s' }}>
                {platforms.map((p, i) => (
                  <span key={i} className="text-xs md:text-sm font-bold tracking-wide text-text-secondary hover:text-accent transition-colors cursor-default"
                    style={{ color: p.color, opacity: 0.7 }}>
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════ STATS ═══════ */}
        <section className="section bg-white dark:bg-surface">
          <div className="container-main">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
              <RevealSection><StatItem value={50} suffix="万+" label={t('stats.users')} /></RevealSection>
              <RevealSection><StatItem value={20} suffix="万+" label={t('stats.gifts')} /></RevealSection>
              <RevealSection><StatItem value={15000} suffix="+" label={t('stats.invites')} /></RevealSection>
              <RevealSection><StatItem prefix="$" value={3800} suffix="万+" label={t('stats.volume')} /></RevealSection>
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
              <div className="hidden md:block step-connector" style={{ top: '56px' }} />
              {[
                { step: '01', title: t('how.step1_title'), desc: t('how.step1_desc'), color: '#FF9900' },
                { step: '02', title: t('how.step2_title'), desc: t('how.step2_desc'), color: '#EE4D2D' },
                { step: '03', title: t('how.step3_title'), desc: t('how.step3_desc'), color: '#D4A574' },
              ].map((s, i) => (
                <RevealSection key={i} style={{ transitionDelay: `${i * 0.15}s` }}>
                  <div className="card text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1" style={{ background: s.color }} />
                    <div className="pt-6">
                      <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center text-3xl mb-5 mx-auto">
                        {['📋', '📤', '💰'][i]}
                      </div>
                      <div className="absolute -top-1 -left-1 text-5xl font-extrabold text-accent/10 select-none">
                        {s.step}
                      </div>
                      <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                      <p className="text-text-secondary text-sm leading-relaxed">{s.desc}</p>
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
            <RevealSection className="text-center mb-16">
              <span className="section-label">{t('gifts.label')}</span>
              <h2 className="section-title">{t('gifts.title')}</h2>
              <p className="section-desc mx-auto">{t('gifts.desc')}</p>
            </RevealSection>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {profitItems.map((g, i) => (
                <RevealSection key={i} style={{ transitionDelay: `${i * 0.06}s` }}>
                  <div className="card p-5 hover:border-accent/30 cursor-pointer">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">{g.emoji}</span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                        {g.cat}
                      </span>
                    </div>
                    <h4 className="font-semibold text-sm mb-3 truncate">{g.name}</h4>
                    <div className="flex items-center justify-between text-xs mb-3">
                      <span className="text-text-muted">
                        成本 <span className="text-text font-semibold">{g.cost}</span>
                      </span>
                      <span className="text-text-muted">→</span>
                      <span className="text-text-muted">
                        市场价 <span className="text-text font-semibold">{g.price}</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-border-light">
                      <span className="text-xs text-text-muted">你的利润</span>
                      <span className="text-lg font-extrabold text-green-500">{g.profit}</span>
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
            <RevealSection className="text-center mb-16">
              <span className="section-label">{t('value.label')}</span>
              <h2 className="section-title">{t('value.title')}</h2>
              <p className="section-desc mx-auto">{t('value.desc')}</p>
            </RevealSection>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {valueItems.map((v, i) => {
                const Icon = ICON_MAP[v.icon] || Package
                return (
                  <RevealSection key={i} style={{ transitionDelay: `${i * 0.1}s` }}>
                    <div className="card p-6 flex gap-4">
                      <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                        <Icon size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold mb-1.5">{v.title}</h4>
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
            <RevealSection className="text-center mb-16">
              <span className="section-label">{t('platforms.label')}</span>
              <h2 className="section-title">{t('platforms.title')}</h2>
              <p className="section-desc mx-auto max-w-2xl">{t('platforms.desc')}</p>
            </RevealSection>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {platforms.map((p, i) => (
                <RevealSection key={i} style={{ transitionDelay: `${i * 0.08}s` }}>
                  <div className="card p-5 text-center h-full">
                    <div className="text-2xl font-extrabold mb-2" style={{ color: p.color }}>
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
                        <Star key={j} size={14} className="fill-accent text-accent" />
                      ))}
                    </div>
                    <p className="text-text text-sm leading-relaxed mb-5 italic">
                      "{item.text}"
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
