import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, ExternalLink, ShoppingBag, Star } from 'lucide-react'
import SEO from '../components/SEO'
import PRODUCTS from '../data/products.json'

// Internal category (matches product data) -> i18n key
const CAT_KEY_MAP = {
  '全部': 'store.all',
  '数码': 'store.digital',
  '家居': 'store.home',
  '美妆': 'store.beauty',
  '食品': 'store.food',
  '鞋靴': 'store.shoes',
  '配饰': 'store.accessories',
  '潮玩': 'store.toys',
  '男装': 'store.men',
  '女装': 'store.women',
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
          <Star
            key={s}
            size={12}
            className={s <= Math.round(rating) ? 'fill-accent text-accent' : 'text-border'}
          />
        ))}
      </div>
      {reviews > 0 && (
        <span className="text-[11px] text-text-muted">({reviews})</span>
      )}
    </div>
  )
}

export default function StorePage() {
  const { t } = useTranslation()
  const [activeCat, setActiveCat] = useState('全部')
  const [search, setSearch] = useState('')

  const getCatLabel = (cat) => {
    const key = CAT_KEY_MAP[cat]
    return key ? t(key) : cat
  }

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
        <section className="bg-primary pt-20 pb-20 text-center">
          <div className="container-main">
            <span className="section-label text-accent-light">{t('store.label')}</span>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4">{t('store.title')}</h1>
            <p className="text-white/60 text-lg max-w-xl mx-auto">{t('store.desc')}</p>
          </div>
        </section>

        <section className="section bg-bg">
          <div className="container-main">
            <div className="mb-10 space-y-6">
              <div className="relative max-w-md">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder={t('store.searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-white dark:bg-surface text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {ALL_CATS.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCat(cat)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      activeCat === cat
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-white dark:bg-surface text-text-secondary hover:text-text border border-border hover:border-accent/30'
                    }`}
                  >
                    {getCatLabel(cat)}
                  </button>
                ))}
              </div>

              <p className="text-text-muted text-sm">
                {filtered.length} {t('store.products')}
                {activeCat !== '全部' && ` · ${getCatLabel(activeCat)}`}
                {search && ` · "${search}"`}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {filtered.map((p, i) => (
                <div key={i} className="product-card card p-0 overflow-hidden cursor-pointer">
                  <div className="aspect-square overflow-hidden bg-gray-100 dark:bg-surface-alt">
                    <img
                      src={p.img}
                      alt={p.name}
                      className="product-img w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect fill="%23f3f4f6" width="200" height="200"/><text x="100" y="100" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="14">No Image</text></svg>' }}
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-1 mb-1.5">
                      <span className="text-[11px] text-text-muted bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded">
                        {getCatLabel(p.cat)}
                      </span>
                      {p.sold > 5000 && (
                        <span className="text-[11px] text-accent bg-accent/10 px-1.5 py-0.5 rounded font-semibold">
                          {t('store.hot')}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-[13px] mb-1.5 line-clamp-2 leading-snug min-h-[2.5em]">
                      {p.name}
                    </h3>
                    <StarRating rating={p.rating} reviews={p.reviews} />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-lg font-bold text-accent">{formatPrice(p.price)}</span>
                      <span className="text-xs text-text-muted">{formatSold(p.sold)} {t('store.sold')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-20">
                <ShoppingBag size={48} className="text-text-muted mx-auto mb-4" />
                <p className="text-text-secondary">{t('store.noResults')}</p>
              </div>
            )}

            <div className="text-center mt-12">
              <a
                href="https://gift-platform-h6um.onrender.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-accent no-underline"
              >
                <ExternalLink size={18} />
                {t('store.viewApp')}
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
