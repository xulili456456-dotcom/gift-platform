import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import AboutPage from './pages/AboutPage'
import DownloadPage from './pages/DownloadPage'
import FaqPage from './pages/FaqPage'
import LegalPage from './pages/LegalPage'

const StorePage = lazy(() => import('./pages/StorePage'))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function AppLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/download" element={<DownloadPage />} />
          <Route path="/store" element={<Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>}><StorePage /></Suspense>} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/legal" element={<LegalPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

export default function App() {
  useEffect(() => {
    // Default to dark mode on first visit; only light if user explicitly chose it
    if (localStorage.getItem('darkMode') !== '0') {
      document.body.classList.add('dark')
    }
  }, [])

  return (
    <BrowserRouter>
      <ScrollToTop />
      <AppLayout />
    </BrowserRouter>
  )
}
