import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import client from '../../api/client';

const tabs = [
  { path: '/home', key: 'nav.home', icon: (active) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )},
  { path: '/tasks', key: 'nav.tasks', icon: (active) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  )},
  { path: '/store', key: 'nav.store', icon: (active) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  )},
  { path: '/mine', key: 'nav.mine', icon: (active) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  )},
];

export default function BottomTabBar() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const barRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const load = () => { client.get('/notifications').then(({ data }) => setUnread(data.unread || 0)).catch(() => {}); };
    load(); window.addEventListener('notifUpdate', load); return () => window.removeEventListener('notifUpdate', load);
  }, []);

  // Calculate indicator position
  useEffect(() => {
    if (!barRef.current) return;
    const idx = tabs.findIndex(t => location.pathname.startsWith(t.path));
    const buttons = barRef.current.querySelectorAll('button');
    if (buttons[idx]) {
      const btn = buttons[idx];
      const parentLeft = barRef.current.getBoundingClientRect().left;
      const btnRect = btn.getBoundingClientRect();
      setIndicatorStyle({ left: btnRect.left - parentLeft, width: btnRect.width });
    }
  }, [location.pathname]);

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 safe-bottom" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
      <div className="mx-4 mb-2 bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg shadow-black/5 border border-white/50">
        <div className="relative" ref={barRef}>
          {/* Sliding Indicator */}
          <div
            className="absolute top-1 h-7 rounded-xl bg-primary/10 transition-all duration-300 ease-out"
            style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
          />
          <div className="flex items-center justify-around h-14 px-2 relative">
            {tabs.map((tab, idx) => {
              const active = location.pathname.startsWith(tab.path);
              return (
                <button
                  key={tab.path}
                  onClick={() => navigate(tab.path)}
                  className={`relative flex flex-col items-center justify-center gap-0.5 py-1 px-6 rounded-xl transition-all duration-300 ${
                    active ? 'text-primary' : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  <div className={`transition-transform duration-300 ${active ? 'scale-110 -translate-y-0.5' : ''}`}>
                    {tab.icon(active)}
                  </div>
                  {tab.path === '/mine' && unread > 0 && (
                    <span className="absolute -top-1 right-1 min-w-[18px] h-[18px] bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 animate-bounce-pulse">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                  <span className={`text-[10px] font-semibold tracking-tight transition-all duration-300 ${
                    active ? 'opacity-100' : 'opacity-60'
                  }`}>{t(tab.key)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
