import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const GUIDE_KEYS = [
  { icon: '1️⃣', titleKey: 'messages.step1Title', bodyKey: 'messages.step1Body' },
  { icon: '2️⃣', titleKey: 'messages.step2Title', bodyKey: 'messages.step2Body' },
  { icon: '3️⃣', titleKey: 'messages.step3Title', bodyKey: 'messages.step3Body' },
  { icon: '4️⃣', titleKey: 'messages.step4Title', bodyKey: 'messages.step4Body' },
  { icon: '5️⃣', titleKey: 'messages.step5Title', bodyKey: 'messages.step5Body' },
  { icon: '6️⃣', titleKey: 'messages.step6Title', bodyKey: 'messages.step6Body' },
];

const FAQ_KEYS = [
  { qKey: 'messages.faq1q', aKey: 'messages.faq1a' },
  { qKey: 'messages.faq2q', aKey: 'messages.faq2a' },
  { qKey: 'messages.faq3q', aKey: 'messages.faq3a' },
  { qKey: 'messages.faq4q', aKey: 'messages.faq4a' },
  { qKey: 'messages.faq5q', aKey: 'messages.faq5a' },
];

export default function MessagesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="min-h-screen bg-bg animate-fade-in">
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-separator">
        <button onClick={() => navigate('/mine')} className="flex items-center gap-1 text-primary font-medium text-sm pr-2 py-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
          {t('common.back')}
        </button>
        <h2 className="text-[16px] font-bold text-text">{t('mine.messages')}</h2>
      </div>

      <div className="p-4 space-y-5">
        {/* Welcome */}
        <div className="bg-gradient-to-br from-primary to-accent rounded-2xl p-5 text-white shadow-lg shadow-purple-500/20">
          <p className="text-2xl mb-2">👋</p>
          <p className="text-lg font-bold mb-1">{t('messages.welcome', { name: t('app.name') })}</p>
          <p className="text-white/70 text-[13px] leading-relaxed">{t('messages.welcomeBody')}</p>
        </div>

        {/* Guide */}
        <div>
          <h3 className="text-[14px] font-bold text-text mb-3">📖 {t('messages.guide')}</h3>
          <div className="bg-white rounded-2xl border border-separator divide-y divide-separator">
            {GUIDE_KEYS.map((step, i) => (
              <div key={i} className="px-4 py-3.5 flex gap-3">
                <span className="text-lg shrink-0 mt-0.5">{step.icon}</span>
                <div>
                  <p className="text-[13px] font-semibold text-text">{t(step.titleKey)}</p>
                  <p className="text-[12px] text-text-secondary mt-0.5 leading-relaxed">{t(step.bodyKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h3 className="text-[14px] font-bold text-text mb-3">❓ {t('messages.faq')}</h3>
          <div className="bg-white rounded-2xl border border-separator divide-y divide-separator">
            {FAQ_KEYS.map((item, i) => (
              <div key={i}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-4 py-3.5 flex items-center justify-between text-left"
                >
                  <span className="text-[13px] font-medium text-text pr-4">{t(item.qKey)}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    className={`text-text-muted shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4 animate-fade-in">
                    <p className="text-[12px] text-text-secondary leading-relaxed bg-bg rounded-xl p-3.5">{t(item.aKey)}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="text-center py-4">
          <p className="text-[12px] text-text-muted">{t('messages.contact')}</p>
        </div>
      </div>
    </div>
  );
}
