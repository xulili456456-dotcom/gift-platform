import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/shared/LanguageSwitcher';

const slides = [
  { emoji: '👋', titleKey: 'onboard.slide1Title', bodyKey: 'onboard.slide1Body' },
  { emoji: '📨', titleKey: 'onboard.slide2Title', bodyKey: 'onboard.slide2Body' },
  { emoji: '🎁', titleKey: 'onboard.slide3Title', bodyKey: 'onboard.slide3Body' },
  { emoji: '💰', titleKey: 'onboard.slide4Title', bodyKey: 'onboard.slide4Body' },
];

// Confetti particles for last slide
function Confetti() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 1.5,
    duration: 1.5 + Math.random() * 2,
    color: ['#FFB800','#E8225A','#8B2FC9','#FF6B00','#FFD54F'][i % 5],
    size: 6 + Math.random() * 8,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-sm animate-float-up"
          style={{
            left: `${p.left}%`,
            top: '-20px',
            width: p.size,
            height: p.size * 0.6,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            opacity: 0.9,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1); // 1=forward, -1=back
  const touchStart = useRef(0);

  const finish = () => {
    localStorage.setItem('onboarded', '1');
    navigate('/home', { replace: true });
  };

  const next = () => {
    setDirection(1);
    if (step < slides.length - 1) setStep(step + 1);
    else finish();
  };

  const prev = () => {
    if (step > 0) {
      setDirection(-1);
      setStep(step - 1);
    }
  };

  // Touch swipe
  const onTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) next();
      else prev();
    }
  };

  const current = slides[step];
  const isLast = step === slides.length - 1;

  return (
    <div className="min-h-dvh flex flex-col bg-gradient-to-b from-[#E8225A] via-[#D4206A] to-[#8B2FC9] relative overflow-hidden"
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* ═══ Animated Background ═══ */}
      <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-white/5 animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-white/5 animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
      <div className="absolute top-1/3 left-1/4 w-48 h-48 rounded-full bg-white/3 animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />

      {/* ═══ Confetti on last slide ═══ */}
      {isLast && <Confetti />}

      {/* ═══ Header ═══ */}
      <div className="px-4 pt-12 flex justify-end relative z-10">
        <button onClick={finish} className="text-white/60 text-sm font-medium px-3 py-1.5 hover:text-white transition-colors">
          {t('common.skip')}
        </button>
      </div>

      {/* ═══ Slide ═══ */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center relative z-10">
        <div
          className="transition-all duration-500"
          style={{
            opacity: 0,
            transform: `translateX(${direction * 30}px)`,
            animation: 'slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
          key={step}
        >
          {/* Floating emoji */}
          <div className="text-7xl mb-6" style={{ animation: 'float 3s ease-in-out infinite' }}>
            {current.emoji}
          </div>
          <h1 className="text-[22px] font-black text-white mb-3 tracking-tight">{t(current.titleKey)}</h1>
          <p className="text-base text-white/70 leading-relaxed max-w-xs mx-auto">{t(current.bodyKey)}</p>

          {/* Language Switcher */}
          <div className="mt-8 flex flex-col items-center gap-2">
            <span className="text-sm text-white/50 font-medium">{t('common.language')}</span>
            <LanguageSwitcher />
          </div>
        </div>
      </div>

      {/* ═══ Bottom ═══ */}
      <div className="px-6 pb-10 space-y-4 relative z-10">
        {/* Dots */}
        <div className="flex justify-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => { setDirection(i > step ? 1 : -1); setStep(i); }}
              className={`rounded-full transition-all duration-300 ${
                i === step ? 'bg-white w-6 h-2' : 'bg-white/30 w-2 h-2 hover:bg-white/50'
              }`}
            />
          ))}
        </div>

        {/* Button */}
        <button onClick={next}
          className="w-full py-4 bg-white text-[#E8225A] font-bold rounded-2xl text-base active:scale-95 transition-all shadow-lg shadow-black/10 hover:shadow-xl hover:shadow-black/20 hover:-translate-y-0.5">
          {isLast ? t('common.start') : t('common.next')}
        </button>

        {/* Back hint */}
        {step > 0 && (
          <button onClick={prev} className="w-full text-center text-white/30 text-xs py-1 hover:text-white/50 transition-colors">
            {t('common.back')}
          </button>
        )}
      </div>

      {/* ═══ Inline CSS Animations ═══ */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(var(--slide-x, 0)); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes floatUp {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
