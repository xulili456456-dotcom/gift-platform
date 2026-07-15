import { useState, useMemo, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Search, HelpCircle, MessageCircle } from 'lucide-react'
import SEO from '../components/SEO'

const CAT_ORDER = ['platform', 'earning', 'withdraw', 'invite', 'tech']

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

export default function FaqPage() {
  const { t } = useTranslation()
  const faqItems = useMemo(() => t('faq.items', { returnObjects: true }) || [], [t])
  const [openIdx, setOpenIdx] = useState(null)
  const [activeCat, setActiveCat] = useState('platform')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    let items = faqItems.filter((f) => f.cat === activeCat)
    if (search) items = items.filter((f) => f.q.includes(search) || f.a.includes(search))
    return items
  }, [faqItems, activeCat, search])

  // Count per category
  const catCounts = useMemo(() => {
    const counts = {}
    CAT_ORDER.forEach(c => { counts[c] = faqItems.filter(f => f.cat === c).length })
    return counts
  }, [faqItems])

  return (
    <>
      <SEO title={t('nav.faq')} />
      <div className="page-enter">
        {/* Header */}
        <section className="bg-primary relative overflow-hidden pt-24 pb-20 text-center">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="orb absolute top-1/3 left-[30%] w-[350px] h-[350px] rounded-full opacity-12" style={{ background: 'radial-gradient(circle, #D4A574, transparent 70%)' }} />
            <div className="orb-slow absolute bottom-0 right-[15%] w-[300px] h-[300px] rounded-full opacity-08" style={{ background: 'radial-gradient(circle, #E8C99B, transparent 70%)' }} />
          </div>
          <div className="hero-particles">
            {Array.from({ length: 15 }, (_, i) => (
              <div key={i} className="hero-particle" style={{ left: `${10 + Math.random() * 80}%`, animationDelay: `${Math.random() * 5}s`, width: 1 + Math.random() * 2, height: 1 + Math.random() * 2 }} />
            ))}
          </div>
          <div className="container-main relative z-10">
            <div className="animate-fade-in inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-accent-light text-sm font-semibold mb-6 border border-white/10">
              <HelpCircle size={14} />
              {t('faq.label')}
            </div>
            <h1 className="animate-fade-in-up text-3xl md:text-5xl font-extrabold text-white mb-4">{t('faq.title')}</h1>
            <p className="animate-fade-in-up text-white/60 text-lg max-w-xl mx-auto" style={{ animationDelay: '0.1s' }}>{t('faq.desc')}</p>
          </div>
        </section>

        <section className="section bg-bg">
          <div className="container-main max-w-3xl">
            {/* Search */}
            <div className="relative mb-8 reveal-enhanced visible">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text" placeholder={t('faq.searchPlaceholder')} value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-xl border border-border bg-white dark:bg-surface text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all shadow-md"
              />
            </div>

            {/* Category tabs with count */}
            <div className="flex flex-wrap gap-3 mb-10 reveal-enhanced visible">
              {CAT_ORDER.map((cat) => (
                <button key={cat} onClick={() => { setActiveCat(cat); setOpenIdx(null) }}
                  className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                    activeCat === cat
                      ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105'
                      : 'bg-white dark:bg-surface text-text-secondary hover:text-text border border-border hover:border-accent/30 hover:scale-105'
                  }`}>
                  {t(`faq.categories.${cat}`)}
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${activeCat === cat ? 'bg-white/20' : 'bg-gray-100 dark:bg-white/5'}`}>
                    {catCounts[cat]}
                  </span>
                </button>
              ))}
            </div>

            {/* FAQ Accordion */}
            {filtered.length > 0 ? (
              <div className="space-y-3">
                {filtered.map((item, i) => {
                  const isOpen = openIdx === i
                  return (
                    <div key={i}
                      className="reveal-enhanced visible card border-0 shadow-md overflow-hidden transition-all duration-300"
                      style={{ transitionDelay: `${(i % 8) * 0.04}s` }}
                    >
                      <button onClick={() => setOpenIdx(isOpen ? null : i)}
                        className={`w-full px-6 py-5 flex items-center justify-between text-left font-semibold text-sm transition-colors ${
                          isOpen ? 'text-accent' : 'text-text hover:text-accent'
                        }`}>
                        <span className="pr-4">{item.q}</span>
                        <ChevronDown size={18} className={`shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-accent' : 'text-text-muted'}`} />
                      </button>
                      <div className={`overflow-hidden transition-all duration-400 ${isOpen ? 'max-h-96 pb-5 px-6' : 'max-h-0'}`}>
                        <p className="text-text-secondary text-sm leading-relaxed">{item.a}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-20">
                <MessageCircle size={48} className="text-text-muted mx-auto mb-4 opacity-30" />
                <p className="text-text-secondary text-lg font-medium">{t('faq.noResults')}</p>
                <p className="text-text-muted text-sm mt-1">{t('faq.noResultsHint')}</p>
              </div>
            )}

            {/* Contact CTA */}
            <div className="text-center mt-16 p-8 rounded-3xl bg-accent/5 border border-accent/10 reveal-enhanced visible">
              <MessageCircle size={28} className="text-accent mx-auto mb-3" />
              <p className="text-text font-semibold mb-1">{t('faq.contactPrompt')}</p>
              <p className="text-text-secondary text-sm mb-4">{t('faq.desc')}</p>
              <a href="mailto:support@gifthaven.com" className="btn btn-accent no-underline text-sm">
                {t('faq.contactButton')}
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
