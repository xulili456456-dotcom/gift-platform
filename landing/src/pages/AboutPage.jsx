import { useTranslation } from 'react-i18next'
import { Target, Eye, Heart } from 'lucide-react'
import SEO from '../components/SEO'

export default function AboutPage() {
  const { t } = useTranslation()
  const values = t('about.values', { returnObjects: true })

  const valueIcons = [Heart, Target, Eye]

  return (
    <>
      <SEO title={t('nav.about')} />
      <div className="page-enter">
        {/* Header */}
        <section className="bg-primary pt-20 pb-16 text-center">
          <div className="container-main">
            <span className="section-label text-accent-light">{t('about.label')}</span>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4">{t('about.title')}</h1>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">{t('about.desc')}</p>
          </div>
        </section>

        <section className="section bg-bg">
          <div className="container-main max-w-4xl">
            {/* Mission & Vision */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
              <div className="card p-8">
                <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-5">
                  <Target size={24} />
                </div>
                <h3 className="text-lg font-bold mb-3">{t('about.mission_title')}</h3>
                <p className="text-text-secondary leading-relaxed">{t('about.mission')}</p>
              </div>
              <div className="card p-8">
                <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-5">
                  <Eye size={24} />
                </div>
                <h3 className="text-lg font-bold mb-3">{t('about.vision_title')}</h3>
                <p className="text-text-secondary leading-relaxed">{t('about.vision')}</p>
              </div>
            </div>

            {/* Values */}
            <div>
              <h3 className="text-2xl font-bold mb-8 text-center">{t('about.values_title')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {values.map((v, i) => {
                  const Icon = valueIcons[i] || Heart
                  return (
                    <div key={i} className="card p-6 text-center">
                      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-accent/10 text-accent flex items-center justify-center">
                        <Icon size={28} />
                      </div>
                      <h4 className="font-bold mb-2">{v.title}</h4>
                      <p className="text-text-secondary text-sm leading-relaxed">{v.desc}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
