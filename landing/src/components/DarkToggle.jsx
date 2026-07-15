import { useState, useEffect } from 'react'
import { Moon, Sun } from 'lucide-react'

export default function DarkToggle() {
  const [dark, setDark] = useState(() => localStorage.getItem('darkMode') === '1')

  useEffect(() => {
    if (dark) {
      document.body.classList.add('dark')
      localStorage.setItem('darkMode', '1')
    } else {
      document.body.classList.remove('dark')
      localStorage.setItem('darkMode', '0')
    }
  }, [dark])

  return (
    <button
      onClick={() => setDark(!dark)}
      className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-700 dark:text-gray-300"
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
