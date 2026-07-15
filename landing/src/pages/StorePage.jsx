import { useState, useMemo, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, ExternalLink, ShoppingBag, Star, Sparkles } from 'lucide-react'
import SEO from '../components/SEO'
import PRODUCTS from '../data/products.json'

const CAT_KEY_MAP = {
  '全部': 'store.all', '数码': 'store.digital', '家居': 'store.home', '美妆': 'store.beauty',
  '食品': 'store.food', '鞋靴': 'store.shoes', '配饰': 'store.accessories', '潮玩': 'store.toys',
  '男装': 'store.men', '女装': 'store.women',
}
const ALL_CATS = ['全部', ...new Set(PRODUCTS.map(p => p.cat))]

function formatSold(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}
function formatPrice(n) {
  if (n >= 1000) return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  return `$${n.toFixed(2)}`
}

function StarRating({ rating, reviews }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star key={s} size={11} className={s <= Math.round(rating) ? 'fill-accent text-accent' : 'text-border'} />
        ))}
      </div>
      {reviews > 0 && <span className="text-[10px] text-text-muted">({reviews})</span>}
    </div>
  )
}

function useReveal() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.05 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return [ref, visible]
}

export default function StorePage() {
  const { t } = useTranslation()
  const [activeCat, setActiveCat] = useState('全部')
  const [search, setSearch] = useState('')
  const [hoveredCard, setHoveredCard] = useState(null)

  const getCatLabel = (cat) => { const key = CAT_KEY_MAP[cat]; return key ? t(key) : cat }

  const filtered = useMemo(() => {
    let items = activeCat === '全部' ? [...PRODUCTS] : PRODUCTS.filter(p => p.cat === activeCat)
    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(p => p.name.toLowerCase().includes(q) || p.cat.includes(q))
    }
    return items.sort((a, b) => b.sold - a.sold)
  }, [activeCat, search])

  return (
    <>
      <SEO title={t('nav.store')} />
      <div className="page-enter">
        {/* Header with particles and orbs */}
        <section className="bg-primary relative overflow-hidden pt-24 pb-20 text-center">
          {/* Orbs */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="orb absolute -top-20 -left-20 w-[400px] h-[400px] rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #D4A574, transparent 70%)' }} />
            <div className="orb-slow absolute -bottom-20 -right-20 w-[350px] h-[350px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #E8C99B, transparent 70%)' }} />
          </div>
          {/* Particles */}
          <div className="hero-particles">
            {Array.from({ length: 20 }, (_, i) => (
              <div key={i} className="hero-particle" style={{ left: `${5 + Math.random() * 90}%`, animationDelay: `${Math.random() * 5}s`, width: 1 + Math.random() * 2, height: 1 + Math.random() * 2 }} />
            ))}
          </div>
          <div className="container-main relative z-10">
            <div className="animate-fade-in inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-accent-light text-sm font-semibold mb-6 border border-white/10">
              <Sparkles size={14} />
              {t('store.label')}
            </div>
            <h1 className="animate-fade-in-up text-3xl md:text-5xl font-extrabold text-white mb-4">{t('store.title')}</h1>
            <p className="animate-fade-in-up text-white/60 text-lg max-w-xl mx-auto" style={{ animationDelay: '0.1s' }}>{t('store.desc')}</p>
          </div>
        </section>

        <section className="section bg-bg">
          <div className="container-main">
            {/* Search & Categories */}
            <div className="mb-10 space-y-6 reveal-enhanced visible">
              <div className="relative max-w-md">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text" placeholder={t('store.searchPlaceholder')} value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-white dark:bg-surface text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all shadow-sm"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {ALL_CATS.map((cat) => (
                  <button key={cat} onClick={() => setActiveCat(cat)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                      activeCat === cat
                        ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105'
                        : 'bg-white dark:bg-surface text-text-secondary hover:text-text border border-border hover:border-accent/30 hover:scale-105'
                    }`}>
                    {getCatLabel(cat)}
                  </button>
                ))}
              </div>
              <p className="text-text-muted text-sm">
                <span className="font-semibold text-accent">{filtered.length}</span> {t('store.products')}
                {activeCat !== '全部' && ` · ${getCatLabel(activeCat)}`}
                {search && ` · "${search}"`}
              </p>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {filtered.map((p, i) => (
                <div key={i}
                  className="product-card reveal-enhanced visible card p-0 overflow-hidden cursor-pointer border-0 shadow-md"
                  style={{ transitionDelay: `${(i % 12) * 0.04}s` }}
                  onMouseEnter={() => setHoveredCard(i)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <div className="aspect-square overflow-hidden bg-gray-100 dark:bg-surface-alt relative">
                    <img src={p.img} alt={p.name} className="product-img w-full h-full object-cover" loading="lazy"
                      onError={(e) => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect fill="%23f3f4f6" width="200" height="200"/><text x="100" y="100" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="14">No Image</text></svg>' }}
                    />
                    {hoveredCard === i && (
                      <div className="absolute inset-0 bg-black/5 dark:bg-white/5 flex items-center justify-center transition-opacity">
                        <span className="text-xs font-bold text-white bg-accent px-3 py-1.5 rounded-full shadow-lg">View in App</span>
                      </div>
                    )}
                    {p.sold > 10000 && (
                      <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
                        BEST
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-1 mb-1.5">
                      <span className="text-[10px] text-text-muted bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded">{getCatLabel(p.cat)}</span>
                      {p.sold > 5000 && (
                        <span className="text-[10px] text-accent bg-accent/10 px-1.5 py-0.5 rounded font-semibold">{t('store.hot')}</span>
                      )}
                    </div>
                    <h3 className="font-semibold text-[12px] mb-1.5 line-clamp-2 leading-snug min-h-[2.5em]">{p.name}</h3>
                    <StarRating rating={p.rating} reviews={p.reviews} />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-base font-bold text-accent">{formatPrice(p.price)}</span>
                      <span className="text-[10px] text-text-muted">{formatSold(p.sold)} {t('store.sold')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-20">
                <ShoppingBag size={48} className="text-text-muted mx-auto mb-4 opacity-30" />
                <p className="text-text-secondary">{t('store.noResults')}</p>
              </div>
            )}

            {/* Bottom CTA */}
            <div className="text-center mt-16 reveal-enhanced visible">
              <div className="inline-block p-[2px] rounded-2xl bg-gradient-to-r from-accent via-accent-light to-accent animate-borderGlow">
                <a href="https://gift-platform-h6um.onrender.com/" target="_blank" rel="noopener noreferrer"
                  className="btn bg-white dark:bg-surface text-text hover:text-accent no-underline rounded-[14px] border-0 shadow-lg">
                  <ExternalLink size={18} />
                  {t('store.viewApp')}
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
