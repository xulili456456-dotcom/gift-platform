import { useTranslation } from 'react-i18next';
import { ExternalLink, Smartphone, Globe, CheckCircle } from 'lucide-react';

export default function DownloadPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-main max-w-2xl mx-auto px-4">

        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-accent/10 mb-6">
            <Globe size={40} className="text-accent" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3 text-text">{t('download.heroTitle')}</h1>
          <p className="text-text-secondary text-lg max-w-md mx-auto">
            {t('download.heroDesc')}
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-4 mb-10">
          {[
            { step: '1', titleKey: 'download.step1Title', descKey: 'download.step1Desc' },
            { step: '2', titleKey: 'download.step2Title', descKey: 'download.step2Desc' },
            { step: '3', titleKey: 'download.step3Title', descKey: 'download.step3Desc' },
          ].map((s) => (
            <div key={s.step} className="flex items-start gap-4 bg-white dark:bg-surface p-5 rounded-2xl border border-border">
              <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center font-bold text-sm shrink-0">
                {s.step}
              </div>
              <div>
                <h3 className="font-semibold text-text mb-1">{t(s.titleKey)}</h3>
                <p className="text-sm text-text-secondary">{t(s.descKey)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <a
            href="https://amashopstore.com/register"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-accent btn-lg inline-flex items-center gap-2 text-lg no-underline"
          >
            <ExternalLink size={20} />
            {t('download.ctaBtn')}
          </a>
          <p className="text-text-muted text-sm mt-4">{t('download.ctaNote')}</p>
        </div>

      </div>
    </div>
  );
}
