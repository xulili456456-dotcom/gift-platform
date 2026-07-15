import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Star, TrendingUp, Package, Truck, Headphones, ShoppingCart, ChevronDown, DollarSign, Shield, Zap, Users, X, BadgeCheck, CreditCard, Lock, Wallet } from 'lucide-react'
import SEO from '../components/SEO'

// ══════════════════════════════════════
// Hooks
// ══════════════════════════════════════
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

function useReveal(threshold = 0.1) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, visible]
}

function RevealSection({ children, className = '', style, enhanced = false }) {
  const [ref, visible] = useReveal()
  const cls = enhanced ? 'reveal-enhanced' : 'reveal'
  return <div ref={ref} className={`${cls} ${visible ? 'visible' : ''} ${className}`} style={style}>{children}</div>
}

// ══════════════════════════════════════
// Live Activity Ticker
// ══════════════════════════════════════
const LIVE_EVENTS = [
  { name: 'Maria S.', country: '🇧🇷', action: 'earned', amount: '$47.50', product: 'Sony Headphones', platform: 'Amazon', delay: 0 },
  { name: 'Ahmed K.', country: '🇲🇾', action: 'earned', amount: '$89.00', product: 'Samsung Galaxy', platform: 'Shopee', delay: 4 },
  { name: 'Lisa T.', country: '🇵🇭', action: 'earned', amount: '$23.80', product: 'Nike Shoes', platform: 'Lazada', delay: 8 },
  { name: 'John D.', country: '🇺🇸', action: 'earned', amount: '$156.00', product: 'MacBook Air', platform: 'Amazon', delay: 12 },
  { name: 'Priya R.', country: '🇮🇩', action: 'earned', amount: '$34.20', product: 'SK-II Essence', platform: 'Shopee', delay: 16 },
  { name: 'Carlos M.', country: '🇲🇽', action: 'earned', amount: '$62.00', product: 'iPad Case', platform: 'Amazon', delay: 20 },
  { name: 'Yuki T.', country: '🇯🇵', action: 'earned', amount: '$41.30', product: 'Wireless Earbuds', platform: 'AliExpress', delay: 24 },
  { name: 'Sarah W.', country: '🇹🇭', action: 'earned', amount: '$78.50', product: 'Smart Watch', platform: 'Lazada', delay: 28 },
]

function LiveTicker() {
  const [visible, setVisible] = useState(null)
  const [dismissed, setDismissed] = useState(new Set())
  const idxRef = useRef(0)

  const showNext = useCallback(() => {
    const event = LIVE_EVENTS[idxRef.current % LIVE_EVENTS.length]
    idxRef.current++
    if (!dismissed.has(idxRef.current)) {
      setVisible({ ...event, id: idxRef.current })
      setTimeout(() => setVisible(null), 5000)
    }
  }, [dismissed])

  useEffect(() => {
    showNext()
    const interval = setInterval(showNext, 4000)
    return () => clearInterval(interval)
  }, [showNext])

  if (!visible) return null

  return (
    <div className="fixed bottom-6 left-4 md:left-6 z-50 animate-slide-up max-w-[340px]">
      <div className="bg-white dark:bg-[#1E1E32] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl p-4 flex items-center gap-3 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
        <button onClick={() => { setDismissed(prev => new Set([...prev, visible.id])); setVisible(null) }}
          className="absolute top-2 right-2 text-text-muted hover:text-text transition-colors">
          <X size={14} />
        </button>
        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-500/10 flex items-center justify-center text-lg shrink-0">
          {visible.country}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text truncate">{visible.name}</p>
          <p className="text-xs text-text-muted">
            earned <span className="text-green-500 font-bold">{visible.amount}</span> from {visible.product}
          </p>
          <p className="text-[10px] text-text-muted mt-0.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            via {visible.platform} · Just now
          </p>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════
// Main Component
// ══════════════════════════════════════
function StatItem({ value, label, suffix = '', prefix = '', start }) {
  const count = useCountUp(value, 2000, start)
  return (
    <div className="text-center stat-glow">
      <div className="text-3xl md:text-5xl font-extrabold tracking-tight mb-1" style={{ color: '#D4A574' }}>{prefix}{count}{suffix}</div>
      <div className="text-text-secondary text-sm font-medium">{label}</div>
    </div>
  )
}

const GLOW_CLASSES = ['platform-glow-amazon', 'platform-glow-shopee', 'platform-glow-lazada', 'platform-glow-aliexpress', 'platform-glow-tiktok', 'platform-glow-ebay']
const ICON_MAP = { Package, Truck, Headphones, TrendingUp }

const PARTICLES = Array.from({ length: 30 }, (_, i) => ({
  id: i, x: `${5 + Math.random() * 90}%`, delay: `${Math.random() * 6}s`, dur: `${4 + Math.random() * 6}s`, size: 1 + Math.random() * 2,
}))

export default function HomePage() {
  const { t } = useTranslation()
  const [startCount, setStartCount] = useState(false)
  const [calcTasks, setCalcTasks] = useState(10)
  const [calcProfit, setCalcProfit] = useState(5)

  useEffect(() => { const timer = setTimeout(() => setStartCount(true), 300); return () => clearTimeout(timer) }, [])

  const calcMonthly = useMemo(() => calcTasks * calcProfit * 30, [calcTasks, calcProfit])

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

  const comparisons = [
    { aspect: 'Inventory', traditional: 'Buy & store stock', haven: 'Zero inventory', icon: Package },
    { aspect: 'Shipping', traditional: 'Pack & ship yourself', haven: 'Platform handles it', icon: Truck },
    { aspect: 'Support', traditional: 'Handle returns & complaints', haven: 'Brand support team', icon: Headphones },
    { aspect: 'Upfront Cost', traditional: '$1,000s to start', haven: '$0 to start', icon: DollarSign },
    { aspect: 'Risk', traditional: 'Unsold stock = loss', haven: 'Only profit, no loss', icon: Shield },
    { aspect: 'Scale', traditional: 'Limited by capital', haven: 'Unlimited tasks', icon: TrendingUp },
  ]

  return (
    <>
      <SEO />
      <div className="page-enter">
        {/* ═══════ HERO ═══════ */}
        <section className="hero-gradient grid-pattern relative overflow-hidden min-h-[90vh] flex items-center">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="orb absolute -top-20 -left-20 w-[500px] h-[500px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #FF9900, transparent 70%)' }} />
            <div className="orb-slow absolute top-1/3 -right-32 w-[400px] h-[400px] rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #EE4D2D, transparent 70%)' }} />
            <div className="orb-reverse absolute -bottom-20 left-1/3 w-[350px] h-[350px] rounded-full opacity-12" style={{ background: 'radial-gradient(circle, #0F1470, transparent 70%)' }} />
            <div className="orb absolute top-1/2 left-1/2 w-[300px] h-[300px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #D4A574, transparent 70%)', animationDelay: '-4s' }} />
          </div>
          <div className="hero-particles">
            {PARTICLES.map((p) => (
              <div key={p.id} className="hero-particle" style={{ left: p.x, animationDelay: p.delay, '--dur': p.dur, '--delay': p.delay, width: p.size, height: p.size }} />
            ))}
          </div>

          <div className="container-main relative z-10 py-20 md:py-28">
            <div className="max-w-4xl mx-auto text-center">
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
                <a href="https://gift-platform-h6um.onrender.com/register" target="_blank" rel="noopener noreferrer"
                  className="btn btn-accent btn-lg no-underline text-base glow-pulse">
                  {t('app.cta_register')}
                  <ArrowRight size={20} />
                </a>
                <Link to="/store" className="btn btn-outline btn-lg no-underline text-base">
                  <ShoppingCart size={20} />{t('nav.store')}
                </Link>
              </div>

              <div className="animate-fade-in-up mt-14 flex flex-wrap items-center justify-center gap-6 opacity-70" style={{ animationDelay: '0.4s' }}>
                {platforms.map((p, i) => (
                  <span key={i} className="text-sm md:text-base font-extrabold tracking-wide hover:opacity-100 transition-all duration-300 cursor-default hover:scale-110" style={{ color: p.color, opacity: 0.65 }}>{p.name}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-text-muted">
            <span className="text-[11px] uppercase tracking-widest font-semibold opacity-50">Scroll</span>
            <ChevronDown size={20} className="scroll-indicator" />
          </div>
        </section>

        {/* ═══════ TRUST BAR ═══════ */}
        <section className="border-b border-border-light bg-white dark:bg-surface">
          <div className="container-main py-5 flex flex-wrap items-center justify-center gap-6 md:gap-12">
            {[
              { icon: BadgeCheck, text: 'Verified Platform', color: '#22c55e' },
              { icon: Lock, text: '256-bit SSL Encrypted', color: '#3b82f6' },
              { icon: CreditCard, text: 'Secure Payments', color: '#8b5cf6' },
              { icon: Shield, text: 'Buyer Protection', color: '#f59e0b' },
              { icon: Wallet, text: 'Instant Withdrawals', color: '#D4A574' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs md:text-sm text-text-secondary font-medium">
                <item.icon size={16} style={{ color: item.color }} />
                <span>{item.text}</span>
              </div>
            ))}
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
                <RevealSection key={i} enhanced><StatItem value={s.value} prefix={s.prefix || ''} label={s.label} suffix={s.suffix} start={startCount} /></RevealSection>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ VS COMPARISON ═══════ */}
        <section className="section bg-surface-alt">
          <div className="container-main">
            <RevealSection enhanced className="text-center mb-16">
              <span className="section-label">Why Gift Haven</span>
              <h2 className="section-title">Traditional E-Commerce vs Gift Haven</h2>
              <p className="section-desc mx-auto">See why thousands are switching to task-based earning.</p>
            </RevealSection>

            <div className="max-w-4xl mx-auto">
              {/* Header row */}
              <div className="hidden md:grid grid-cols-[1fr,1fr,1fr] gap-4 mb-4 px-4">
                <div />
                <div className="text-center text-sm font-semibold text-red-400 bg-red-50 dark:bg-red-500/5 rounded-xl py-3">❌ Traditional E-Commerce</div>
                <div className="text-center text-sm font-semibold text-green-500 bg-green-50 dark:bg-green-500/5 rounded-xl py-3">✅ Gift Haven</div>
              </div>

              {comparisons.map((row, i) => (
                <RevealSection key={i} enhanced style={{ transitionDelay: `${i * 0.08}s` }}>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr,1fr,1fr] gap-2 md:gap-4 items-center py-3 md:py-4 px-4 rounded-xl hover:bg-white dark:hover:bg-white/3 transition-colors">
                    <div className="flex items-center gap-3 font-semibold text-sm text-text">
                      <div className="w-9 h-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                        <row.icon size={18} />
                      </div>
                      {row.aspect}
                    </div>
                    <div className="text-sm text-red-500/80 dark:text-red-400/80 pl-12 md:pl-0 md:text-center font-medium">
                      <span className="md:hidden text-[10px] uppercase text-text-muted mr-2">Traditional: </span>
                      {row.traditional}
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400 font-semibold pl-12 md:pl-0 md:text-center">
                      <span className="md:hidden text-[10px] uppercase text-text-muted mr-2">Gift Haven: </span>
                      {row.haven}
                    </div>
                  </div>
                </RevealSection>
              ))}

              <RevealSection enhanced className="text-center mt-8">
                <a href="https://gift-platform-h6um.onrender.com/register" target="_blank" rel="noopener noreferrer"
                  className="btn btn-accent no-underline">
                  Start Earning — $0 Risk <ArrowRight size={16} />
                </a>
              </RevealSection>
            </div>
          </div>
        </section>

        {/* ═══════ EARNINGS CALCULATOR ═══════ */}
        <section className="section bg-white dark:bg-surface">
          <div className="container-main max-w-3xl">
            <RevealSection enhanced className="text-center mb-12">
              <span className="section-label">Earnings Calculator</span>
              <h2 className="section-title">How much can you earn?</h2>
              <p className="section-desc mx-auto">Drag the sliders to see your potential monthly income.</p>
            </RevealSection>

            <RevealSection enhanced>
              <div className="card border-0 shadow-xl p-8 md:p-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div>
                    <label className="block text-sm font-semibold text-text mb-2">
                      Tasks per day: <span className="text-accent text-lg">{calcTasks}</span>
                    </label>
                    <input type="range" min="1" max="40" value={calcTasks} onChange={(e) => setCalcTasks(Number(e.target.value))}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer"
                      style={{ accentColor: '#D4A574', background: 'linear-gradient(to right, #D4A574 0%, #D4A574 ' + (calcTasks/40*100) + '%, #E5E7EB ' + (calcTasks/40*100) + '%, #E5E7EB 100%)' }} />
                    <div className="flex justify-between text-xs text-text-muted mt-1"><span>1</span><span>40</span></div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-text mb-2">
                      Avg. profit per task: <span className="text-accent text-lg">${calcProfit}</span>
                    </label>
                    <input type="range" min="1" max="50" value={calcProfit} onChange={(e) => setCalcProfit(Number(e.target.value))}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer"
                      style={{ accentColor: '#D4A574', background: 'linear-gradient(to right, #D4A574 0%, #D4A574 ' + (calcProfit/50*100) + '%, #E5E7EB ' + (calcProfit/50*100) + '%, #E5E7EB 100%)' }} />
                    <div className="flex justify-between text-xs text-text-muted mt-1"><span>$1</span><span>$50</span></div>
                  </div>
                </div>

                <div className="bg-accent/5 rounded-2xl p-6 text-center">
                  <p className="text-text-muted text-sm mb-1">Estimated Monthly Earnings</p>
                  <div className="text-5xl md:text-6xl font-extrabold tracking-tight mb-2" style={{ color: '#22c55e' }}>
                    ${calcMonthly.toLocaleString()}
                  </div>
                  <p className="text-text-muted text-sm">
                    {calcTasks} tasks/day × ${calcProfit}/task × 30 days
                  </p>
                </div>

                <div className="text-center mt-6">
                  <a href="https://gift-platform-h6um.onrender.com/register" target="_blank" rel="noopener noreferrer"
                    className="btn btn-accent btn-lg no-underline">
                    Start Earning ${calcMonthly.toLocaleString()}/mo <ArrowRight size={18} />
                  </a>
                </div>
              </div>
            </RevealSection>
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
                      <div className="absolute -top-2 left-0 text-6xl font-extrabold opacity-[0.04] select-none" style={{ color: s.color }}>{s.step}</div>
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
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: `${g.color}18`, color: g.color }}>{g.cat}</span>
                    </div>
                    <h4 className="font-semibold text-sm mb-3 truncate">{g.name}</h4>
                    <div className="flex items-center justify-between text-xs mb-3 bg-gray-50 dark:bg-white/5 rounded-xl p-3">
                      <div className="text-center"><div className="text-text-muted mb-0.5">Cost</div><div className="text-text font-bold">{g.cost}</div></div>
                      <span className="text-text-muted text-lg">→</span>
                      <div className="text-center"><div className="text-text-muted mb-0.5">Market</div><div className="text-text font-bold">{g.price}</div></div>
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
                        <div className="absolute inset-0 bg-accent/5" /><Icon size={26} className="relative z-10" />
                      </div>
                      <div><h4 className="font-bold mb-1.5 text-base">{v.title}</h4><p className="text-text-secondary text-sm leading-relaxed">{v.desc}</p></div>
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
                    <div className="text-3xl font-extrabold mb-3 tracking-tight" style={{ color: p.color }}>{p.name}</div>
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
                    <div className="absolute top-4 right-6 text-6xl font-serif text-accent/10 select-none leading-none">"</div>
                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(5)].map((_, j) => (<Star key={j} size={14} className="fill-accent text-accent" />))}
                    </div>
                    <p className="text-text text-sm leading-relaxed mb-5 relative z-10">{item.text}</p>
                    <div className="flex items-center justify-between">
                      <div><p className="font-semibold text-sm">{item.name}</p><p className="text-text-muted text-[12px]">{item.role}</p></div>
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
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="orb absolute -top-20 right-[20%] w-[400px] h-[400px] rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #D4A574, transparent 70%)' }} />
            <div className="orb-slow absolute bottom-0 left-[10%] w-[350px] h-[350px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #E8C99B, transparent 70%)' }} />
          </div>
          <div className="absolute inset-0 grid-pattern opacity-5" />
          <div className="container-main relative z-10 text-center py-8">
            <RevealSection enhanced>
              <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">{t('cta.title')}</h2>
              <p className="text-white/60 text-lg mb-10 max-w-xl mx-auto">{t('cta.subtitle')}</p>
              <a href="https://gift-platform-h6um.onrender.com/register" target="_blank" rel="noopener noreferrer"
                className="btn btn-accent btn-lg no-underline text-lg glow-pulse">
                {t('cta.button')}<ArrowRight size={22} />
              </a>
            </RevealSection>
          </div>
        </section>

        {/* ═══════ LIVE TICKER ═══════ */}
        <LiveTicker />
      </div>
    </>
  )
}
