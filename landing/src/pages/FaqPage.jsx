import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Search, HelpCircle } from 'lucide-react'
import SEO from '../components/SEO'

const CAT_ORDER = ['platform', 'earning', 'withdraw', 'invite', 'tech']

export default function FaqPage() {
  const { t } = useTranslation()
  const faqItems = useMemo(() => t('faq.items', { returnObjects: true }), [t])
  const [openIdx, setOpenIdx] = useState(null)
  const [activeCat, setActiveCat] = useState('platform')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    let items = faqItems.filter((f) => f.cat === activeCat)
    if (search) items = items.filter((f) => f.q.includes(search) || f.a.includes(search))
    return items
  }, [faqItems, activeCat, search])

  const toggle = (i) => setOpenIdx(openIdx === i ? null : i)

  return (
    <>
      <SEO title={t('nav.faq')} />
      <div className="page-enter">
        {/* Header */}
        <section className="bg-primary pt-20 pb-16 text-center">
          <div className="container-main">
            <span className="section-label text-accent-light">{t('faq.label')}</span>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4">{t('faq.title')}</h1>
            <p className="text-white/60 text-lg max-w-xl mx-auto">{t('faq.desc')}</p>
          </div>
        </section>

        <section className="section bg-bg">
          <div className="container-main max-w-3xl">
            {/* Search */}
            <div className="relative mb-8">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="搜索问题..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-border bg-white dark:bg-surface text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all"
              />
            </div>

            {/* Category tabs */}
            <div className="flex flex-wrap gap-2 mb-8">
              {CAT_ORDER.map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setActiveCat(cat); setOpenIdx(null) }}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    activeCat === cat
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-white dark:bg-surface text-text-secondary hover:text-text border border-border'
                  }`}
                >
                  {t(`faq.categories.${cat}`)}
                </button>
              ))}
            </div>

            {/* FAQ List */}
            {filtered.length > 0 ? (
              <div className="bg-white dark:bg-surface rounded-2xl border border-border overflow-hidden divide-y divide-border-light">
                {filtered.map((item, i) => (
                  <div key={i} className="faq-item">
                    <button
                      onClick={() => toggle(i)}
                      className="faq-question px-6"
                    >
                      <span>{item.q}</span>
                      <ChevronDown
                        size={18}
                        className={`shrink-0 transition-transform duration-300 ${openIdx === i ? 'rotate-180' : ''}`}
                      />
                    </button>
                    <div className={`faq-answer ${openIdx === i ? 'open' : ''}`}>
                      <div className="px-6">
                        <p>{item.a}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <HelpCircle size={48} className="text-text-muted mx-auto mb-4" />
                <p className="text-text-secondary">没有找到匹配的问题</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  )
}
