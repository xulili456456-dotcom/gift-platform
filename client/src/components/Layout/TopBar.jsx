export default function TopBar({ title, transparent = false, fixed = true }) {
  const positionClass = fixed
    ? 'fixed top-0 left-1/2 -translate-x-1/2'
    : '';

  return (
    <header className={`${positionClass} w-full max-w-[430px] z-50 safe-top ${transparent ? 'bg-transparent' : 'bg-[#141420]/90 backdrop-blur-xl border-b border-[#262636]'}`}>
      <div className="flex items-center justify-center h-11 px-4" style={{ paddingTop: 'max(0px, env(safe-area-inset-top) - 8px)' }}>
        <h1 className={`text-[15px] font-semibold tracking-tight ${transparent ? 'text-white' : 'text-text'}`}>
          {title}
        </h1>
      </div>
    </header>
  );
}
