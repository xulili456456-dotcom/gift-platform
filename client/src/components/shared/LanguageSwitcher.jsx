import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

const langs = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ms', label: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const current = langs.find(l => l.code === i18n.language) || langs[0];

  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      if (btnRef.current && btnRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const toggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setOpen(!open);
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-bg hover:bg-separator/50 transition-colors text-sm"
      >
        <span>{current.flag}</span>
        <span className="text-[13px] font-medium text-text-secondary">{current.label}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className={`text-text-muted transition-transform ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          className="fixed bg-white rounded-xl shadow-2xl border border-separator py-1 z-[9999] min-w-[150px] animate-scale-in origin-top-right"
          style={{ top: pos.top, right: pos.right }}
        >
          {langs.map((l) => (
            <button
              key={l.code}
              onClick={() => { i18n.changeLanguage(l.code); localStorage.setItem('lang', l.code); setOpen(false); }}
              className={`flex items-center gap-3 w-full px-4 py-2.5 text-[13px] font-medium transition-colors hover:bg-bg ${
                i18n.language === l.code ? 'text-primary font-semibold' : 'text-text-secondary'
              }`}
            >
              <span className="text-base">{l.flag}</span>
              <span>{l.label}</span>
              {i18n.language === l.code && (
                <svg className="ml-auto" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
              )}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
