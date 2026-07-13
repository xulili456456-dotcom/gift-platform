import { useState, useRef, useCallback } from 'react';

export default function PullToRefresh({ onRefresh, children }) {
  const [pulling, setPulling] = useState(false);
  const [height, setHeight] = useState(0);
  const startY = useRef(0);
  const refreshing = useRef(false);
  const THRESHOLD = 60;

  const onTouchStart = useCallback((e) => {
    if (window.scrollY > 5) return;
    startY.current = e.touches[0].clientY;
    setPulling(true);
  }, []);

  const onTouchMove = useCallback((e) => {
    if (!pulling || refreshing.current) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      setHeight(Math.min(diff * 0.5, 80));
      if (diff > THRESHOLD) e.preventDefault?.();
    }
  }, [pulling]);

  const onTouchEnd = useCallback(async () => {
    if (!pulling) return;
    const shouldRefresh = height > THRESHOLD;
    if (shouldRefresh && !refreshing.current) {
      refreshing.current = true;
      setHeight(40);
      await onRefresh?.();
      refreshing.current = false;
    }
    setHeight(0);
    setPulling(false);
  }, [pulling, height, onRefresh]);

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ minHeight: '100%' }}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden bg-transparent transition-all duration-300"
        style={{ height, opacity: height > 10 ? 1 : 0 }}
      >
        <div className={`flex items-center gap-2 text-[13px] text-text-muted font-medium ${height > THRESHOLD ? 'text-primary' : ''}`}>
          {refreshing.current ? (
            <>
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              刷新中...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                className={`transition-transform ${height > THRESHOLD ? 'rotate-180' : ''}`}
                style={{ transform: `rotate(${Math.min(height * 3, 180)}deg)` }}>
                <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              <span>{height > THRESHOLD ? '松手刷新' : '下拉刷新'}</span>
            </>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
