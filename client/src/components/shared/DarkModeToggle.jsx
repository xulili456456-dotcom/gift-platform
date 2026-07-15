import { useState, useEffect } from 'react';

export default function DarkModeToggle() {
  const [dark, setDark] = useState(() => {
    return localStorage.getItem('darkMode') === '1';
  });

  useEffect(() => {
    document.body.classList.toggle('dark', dark);
    localStorage.setItem('darkMode', dark ? '1' : '0');
  }, [dark]);

  return (
    <button
      onClick={() => setDark(!dark)}
      className="w-14 h-7 rounded-full relative transition-colors duration-300 focus:outline-none"
      style={{ background: dark ? '#a07840' : '#E5E5EA' }}
    >
      <div
        className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300 flex items-center justify-center text-xs"
        style={{ left: dark ? 'calc(100% - 26px)' : '2px' }}
      >
        {dark ? '🌙' : '☀️'}
      </div>
    </button>
  );
}
