import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, ExternalLink, Star, ShoppingBag } from 'lucide-react'
import SEO from '../components/SEO'

// Import product data from the existing catalog
const PRODUCTS = [
  { cat: '数码', name: '无线降噪蓝牙耳机', price: 29.99, sold: 8947, img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400' },
  { cat: '数码', name: '智能运动手表', price: 59.99, sold: 3401, img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400' },
  { cat: '数码', name: '头戴式电竞耳机', price: 39.99, sold: 2098, img: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400' },
  { cat: '数码', name: '便携蓝牙音箱', price: 49.99, sold: 4521, img: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400' },
  { cat: '数码', name: 'RGB机械键盘', price: 79.99, sold: 3210, img: 'https://images.unsplash.com/photo-1546868871-af0de0ae72be?w=400' },
  { cat: '数码', name: '静音无线鼠标', price: 25.99, sold: 6789, img: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=400' },
  { cat: '数码', name: '轻薄笔记本电脑', price: 699.00, sold: 567, img: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400' },
  { cat: '数码', name: '单反相机镜头', price: 349.00, sold: 432, img: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400' },
  { cat: '数码', name: 'VR虚拟现实眼镜', price: 299.00, sold: 876, img: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400' },
  { cat: '数码', name: '无人机航拍器', price: 459.00, sold: 345, img: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=400' },
  { cat: '数码', name: '手机云台稳定器', price: 89.99, sold: 2345, img: 'https://images.unsplash.com/photo-1572569511254-d8f448fe7f5a?w=400' },
  { cat: '数码', name: '无线充电底座', price: 19.99, sold: 7654, img: 'https://images.unsplash.com/photo-1546435770-ecbc689b7b9e?w=400' },
  { cat: '数码', name: '真无线蓝牙耳塞', price: 39.00, sold: 6543, img: 'https://images.unsplash.com/photo-1598532163257-ae3c8b2b2b2b?w=400' },
  { cat: '数码', name: '便携微型投影仪', price: 159.00, sold: 987, img: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400' },
  { cat: '数码', name: '专业录音麦克风', price: 69.00, sold: 2345, img: 'https://images.unsplash.com/photo-1590602843-2e3e3e3e3e3e?w=400' },
  { cat: '家居', name: '北欧简约台灯', price: 39.99, sold: 5432, img: 'https://images.unsplash.com/photo-1507473888904-eb18d1b5a8b4?w=400' },
  { cat: '家居', name: '记忆棉枕头', price: 45.00, sold: 7654, img: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=400' },
  { cat: '家居', name: '智能扫地机器人', price: 299.00, sold: 2109, img: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400' },
  { cat: '家居', name: '空气炸锅', price: 89.99, sold: 4567, img: 'https://images.unsplash.com/photo-1625937324966-5e633fd24c38?w=400' },
  { cat: '美妆', name: '保湿精华液', price: 35.99, sold: 9876, img: 'https://images.unsplash.com/photo-1570194065650-d99fb4b38b8a?w=400' },
  { cat: '美妆', name: '丝绒口红套装', price: 49.99, sold: 6543, img: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400' },
  { cat: '食品', name: '有机坚果礼盒', price: 29.99, sold: 8765, img: 'https://images.unsplash.com/photo-1601493019263-4e2e442e1f46?w=400' },
  { cat: '食品', name: '精装茶叶礼盒', price: 39.99, sold: 5432, img: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400' },
  { cat: '鞋靴', name: '经典运动跑鞋', price: 79.99, sold: 4321, img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400' },
  { cat: '配饰', name: '真皮手表带', price: 25.99, sold: 3456, img: 'https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=400' },
  { cat: '潮玩', name: '限定版公仔', price: 59.99, sold: 5678, img: 'https://images.unsplash.com/photo-1559715541-5daf8a5a8b4e?w=400' },
]

const CATS = ['store.all', 'store.digital', 'store.home', 'store.beauty', 'store.food', 'store.shoes', 'store.accessories', 'store.toys']
const CAT_MAP = { 'store.all': '全部', 'store.digital': '数码', 'store.home': '家居', 'store.beauty': '美妆', 'store.food': '食品', 'store.shoes': '鞋靴', 'store.accessories': '配饰', 'store.toys': '潮玩' }

function formatSold(n) {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

export default function StorePage() {
  const { t } = useTranslation()
  const [activeCat, setActiveCat] = useState('store.all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    let items = activeCat === 'store.all' ? PRODUCTS : PRODUCTS.filter(p => CAT_MAP[activeCat] === p.cat)
    if (search) items = items.filter(p => p.name.includes(search) || p.cat.includes(search))
    return items.sort((a, b) => b.sold - a.sold)
  }, [activeCat, search])

  return (
    <>
      <SEO title={t('nav.store')} />
      <div className="page-enter">
        {/* Header */}
        <section className="bg-primary pt-20 pb-20 text-center">
          <div className="container-main">
            <span className="section-label text-accent-light">{t('store.label')}</span>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4">{t('store.title')}</h1>
            <p className="text-white/60 text-lg max-w-xl mx-auto">{t('store.desc')}</p>
          </div>
        </section>

        <section className="section bg-bg">
          <div className="container-main">
            {/* Search & Category */}
            <div className="mb-10 space-y-6">
              {/* Search */}
              <div className="relative max-w-md">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="搜索商品..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-white dark:bg-surface text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all"
                />
              </div>

              {/* Category pills */}
              <div className="flex flex-wrap gap-2">
                {CATS.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCat(cat)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      activeCat === cat
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-white dark:bg-surface text-text-secondary hover:text-text border border-border hover:border-accent/30'
                    }`}
                  >
                    {t(cat)}
                  </button>
                ))}
              </div>
            </div>

            {/* Product grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {filtered.map((p, i) => (
                <div
                  key={i}
                  className="product-card card p-0 overflow-hidden cursor-pointer"
                >
                  <div className="aspect-square overflow-hidden bg-gray-100 dark:bg-surface-alt">
                    <img
                      src={p.img}
                      alt={p.name}
                      className="product-img w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-[11px] text-text-muted bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded">{p.cat}</span>
                      {p.sold > 5000 && (
                        <span className="text-[11px] text-accent bg-accent/10 px-1.5 py-0.5 rounded font-semibold">热卖</span>
                      )}
                    </div>
                    <h3 className="font-semibold text-sm mb-2 line-clamp-2 leading-snug">{p.name}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-accent">${p.price}</span>
                      <span className="text-xs text-text-muted">{formatSold(p.sold)} {t('store.sold')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-20">
                <ShoppingBag size={48} className="text-text-muted mx-auto mb-4" />
                <p className="text-text-secondary">暂无匹配的商品</p>
              </div>
            )}

            {/* View all CTA */}
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
