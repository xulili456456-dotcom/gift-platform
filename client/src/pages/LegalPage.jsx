import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileText, Shield, Scale, Info } from 'lucide-react';

const tabs = [
  { id: 'terms', icon: FileText, key: 'legal.terms' },
  { id: 'privacy', icon: Shield, key: 'legal.privacy' },
  { id: 'liability', icon: Scale, key: 'legal.liability' },
  { id: 'about', icon: Info, key: 'legal.about' },
];

export default function LegalPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [active, setActive] = useState('terms');

  const renderContent = (key) => {
    const sections = t(`legal.${key}Content`, { returnObjects: true });
    const titleKey = { terms: 'legal.termsTitle', privacy: 'legal.privacyTitle', liability: 'legal.liabilityTitle', about: 'legal.aboutTitle' };

    // Fallback if array not available (non-zh locales)
    if (!Array.isArray(sections)) {
      return (
        <div className="space-y-4 text-[13px] leading-relaxed text-text-secondary">
          <p>{t('common.loadingFailed')}</p>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <h3 className="text-[16px] font-bold text-text">{t(titleKey[key])}</h3>
        {sections.map((section, i) => (
          <div key={i}>
            <h4 className="text-[13px] font-bold text-text mb-1.5">{section.title}</h4>
            <p className="text-[13px] text-text-secondary leading-relaxed">{section.body}</p>
          </div>
        ))}
        {key !== 'about' && (
          <div className="bg-bg rounded-xl p-3 text-[12px]">
            <div className="flex justify-between"><span className="text-text-muted">{t('legal.version')}</span><span className="font-semibold">1.0.0</span></div>
            <div className="flex justify-between mt-1"><span className="text-text-muted">{t('legal.lastUpdated')}</span><span className="font-semibold">2026-07-10</span></div>
          </div>
        )}
        {key === 'about' && (
          <div className="bg-bg rounded-xl p-4 space-y-2 text-[12px]">
            <div className="flex justify-between"><span className="text-text-muted">{t('legal.version')}</span><span className="font-semibold">1.0.0</span></div>
            <div className="flex justify-between"><span className="text-text-muted">{t('legal.platform')}</span><span className="font-semibold">Web App</span></div>
            <div className="flex justify-between"><span className="text-text-muted">{t('legal.contact')}</span><span className="font-semibold">WhatsApp +1 (555) 123-4567</span></div>
          </div>
        )}
        <p className="text-[11px] text-text-muted">{t('legal.lastUpdated')}: 2026-07-10</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-bg animate-fade-in">
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-separator">
        <button onClick={() => navigate('/mine')} className="flex items-center gap-1 text-primary font-medium text-sm pr-2 py-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
          {t('common.back')}
        </button>
        <h2 className="text-[16px] font-bold text-text">{t('legal.title')}</h2>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-separator px-2 flex overflow-x-auto scrollbar-none">
        {tabs.map(({ id, icon: Icon, key }) => (
          <button key={id} onClick={() => setActive(id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-[13px] font-semibold whitespace-nowrap border-b-2 transition-colors ${
              active === id ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}>
            <Icon size={16} />
            {t(key)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-5">{renderContent(active)}</div>
    </div>
  );
}
