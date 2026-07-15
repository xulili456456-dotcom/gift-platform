import { useState, useMemo } from 'react'
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
        {[1,2,3,4,5].map(s => (
          <Star key={s} size={10} className={s <= Math.round(rating) ? 'fill-accent/50 text-accent/50' : 'text-border'} />
        ))}
      </div>
      {reviews > 0 && <span className="text-[10px] text-text-muted">({reviews})</span>}
    </div>
  )
}

export default function StorePage() {
  const { t } = useTranslation()
  const [activeCat, setActiveCat] = useState('全部')
  const [search, setSearch] = useState('')
  const [hoveredCard, setHoveredCard] = useState(-1)
  const [page, setPage] = useState(1)
  const PER_PAGE = 24

  const getCatLabel = (cat) => {
    const k = CAT_KEY_MAP[cat]
    return k ? t(k) : cat
  }

  const filtered = useMemo(() => {
    let items = activeCat === '全部' ? [...PRODUCTS] : PRODUCTS.filter(p => p.cat === activeCat)
    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(p => p.name.toLowerCase().includes(q) || p.cat.includes(q))
    }
    return items.sort((a, b) => b.sold - a.sold)
  }, [activeCat, search])

  // Reset page when filter changes
  const handleCatChange = (cat) => { setActiveCat(cat); setPage(1) }
  const handleSearch = (e) => { setSearch(e.target.value); setPage(1) }

  const visible = useMemo(() => filtered.slice(0, page * PER_PAGE), [filtered, page])
  const hasMore = visible.length < filtered.length

  return (
    <>
      <SEO title={t('nav.store')} />
      <div className="page-enter">
        <section className="hero-mesh relative overflow-hidden pt-28 pb-24 text-center">
          <div className="grain-overlay" />
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="orb orb-1" style={{ top: '10%', left: '10%', width: '350px', height: '350px', background: 'radial-gradient(circle, rgba(200,160,110,0.1), transparent 70%)' }} />
          </div>
          <div className="hero-particles">
            {Array.from({ length: 15 }, (_, i) => (
              <div key={i} className="hero-particle" style={{ left: `${5 + Math.random() * 90}%`, animationDelay: `${Math.random() * 5}s`, width: 1 + Math.random() * 2, height: 1 + Math.random() * 2 }} />
            ))}
          </div>
          <div className="container-main relative z-10">
            <div className="animate-fade-in inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-text-secondary text-xs font-semibold mb-8 tracking-wider uppercase">
              <Sparkles size={12} />{t('store.label')}
            </div>
            <h1 className="animate-fade-in-up text-3xl md:text-5xl font-extrabold text-white mb-4">{t('store.title')}</h1>
            <p className="animate-fade-in-up text-white/50 text-lg max-w-xl mx-auto" style={{ animationDelay: '0.1s' }}>{t('store.desc')}</p>
          </div>
        </section>

        <section className="section bg-bg">
          <div className="container-main">
            <div className="mb-12 space-y-6">
              <div className="relative max-w-md">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder={t('store.searchPlaceholder')}
                  value={search}
                  onChange={handleSearch}
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-border bg-white dark:bg-surface text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/30 transition-all shadow-sm"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {ALL_CATS.map(cat => (
                  <button
                    key={cat}
                    onClick={() => handleCatChange(cat)}
                    className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                      activeCat === cat
                        ? 'bg-primary text-white shadow-lg shadow-primary/10 scale-105'
                        : 'bg-white dark:bg-surface text-text-secondary hover:text-text border border-border hover:border-accent/20 hover:scale-105'
                    }`}
                  >
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

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {visible.map((p, i) => (
                <div
                  key={i}
                  className="product-card card-accent card p-0 overflow-hidden cursor-pointer border-0 shadow-sm"
                  onMouseEnter={() => setHoveredCard(i)}
                  onMouseLeave={() => setHoveredCard(-1)}
                >
                  <div className="aspect-square overflow-hidden bg-gray-100 dark:bg-surface-alt relative">
                    <img src={p.img} alt={p.name} className="product-img w-full h-full object-cover" loading="lazy" />
                    {hoveredCard === i && (
                      <div className="absolute inset-0 bg-black/5 dark:bg-white/5 flex items-center justify-center">
                        <span className="text-xs font-bold text-white bg-accent/90 px-3 py-1.5 rounded-full shadow-lg">View in App</span>
                      </div>
                    )}
                    {p.sold > 10000 && (
                      <div className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide">
                        BEST
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-1 mb-1.5">
                      <span className="text-[10px] text-text-muted bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded">
                        {getCatLabel(p.cat)}
                      </span>
                      {p.sold > 5000 && (
                        <span className="text-[10px] text-accent bg-accent/5 px-1.5 py-0.5 rounded font-semibold">
                          {t('store.hot')}
                        </span>
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

            {hasMore && (
              <div className="text-center mt-8">
                <button onClick={() => setPage(p => p + 1)} className="btn btn-outline text-sm">
                  Load More ({filtered.length - visible.length} remaining)
                </button>
              </div>
            )}

            {filtered.length === 0 && (
              <div className="text-center py-20">
                <ShoppingBag size={48} className="text-text-muted mx-auto mb-4 opacity-20" />
                <p className="text-text-secondary">{t('store.noResults')}</p>
              </div>
            )}

            <div className="text-center mt-16">
              <a href="https://gift-platform-h6um.onrender.com/" target="_blank" rel="noopener noreferrer" className="btn btn-outline no-underline">
                <ExternalLink size={16} />
                {t('store.viewApp')}
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
