import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect, lazy, Suspense, useState } from 'react';
import useAuthStore from './store/authStore';
import AppLayout from './components/Layout/AppLayout';
import ProtectedRoute from './components/shared/ProtectedRoute';

// Eager: critical pages loaded immediately
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import TasksPage from './pages/TasksPage';
import MinePage from './pages/MinePage';
import StorePage from './pages/StorePage';
import OnboardingPage from './pages/OnboardingPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import BuyPage from './pages/BuyPage';
import AdminRedirect from './pages/AdminRedirect';

// Lazy: sub-pages loaded on demand
const TeamPage = lazy(() => import('./pages/TeamPage'));
const WalletPage = lazy(() => import('./pages/WalletPage'));
const MessagesPage = lazy(() => import('./pages/MessagesPage'));
const SecurityPage = lazy(() => import('./pages/SecurityPage'));
const KycPage = lazy(() => import('./pages/KycPage'));
const LegalPage = lazy(() => import('./pages/LegalPage'));
const VipPage = lazy(() => import('./pages/VipPage'));
const WithdrawPage = lazy(() => import('./pages/WithdrawPage'));
const StakingPage = lazy(() => import('./pages/StakingPage'));
const VerifyPage = lazy(() => import('./pages/VerifyPage'));
const SupportPage = lazy(() => import('./pages/SupportPage'));
const DepositPage = lazy(() => import('./pages/DepositPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const GiftDetailPage = lazy(() => import('./pages/GiftDetailPage'));

const PageLoader = () => (
  <div className="min-h-screen bg-bg flex items-center justify-center">
    <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const Lazy = ({ Comp }) => (
  <Suspense fallback={<PageLoader />}>
    <Comp />
  </Suspense>
);

export default function App() {
  const loadUser = useAuthStore((s) => s.loadUser);
  const [showContact, setShowContact] = useState(false);
  useEffect(() => {
    loadUser();
    const handler = () => setShowContact(true);
    document.addEventListener('showContactSupport', handler);
    return () => document.removeEventListener('showContactSupport', handler);
  }, []);

  return (
    <BrowserRouter>
      <Toaster position="top-center" toastOptions={{
        duration: 2500,
        style: { background: '#2D2D2D', color: '#FFF', borderRadius: '12px', fontSize: '14px', padding: '10px 16px' },
      }} />

      {/* Contact Support Modal */}
      {showContact && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={() => setShowContact(false)}>
          <div className="bg-white rounded-2xl p-6 shadow-2xl w-full max-w-sm animate-scale-in border border-[#e7e7e7]" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="w-16 h-16 rounded-full bg-[#FF9900]/20 flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">💬</span>
              </div>
              <h3 className="text-lg font-bold text-[#0F1111]">Contact Support</h3>
              <p className="text-xs text-[#565959] mt-1">Reach our team for deposit assistance</p>
            </div>
            <div className="space-y-3 mb-5">
              <a href="https://t.me/Shopping_Operations" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl bg-[#f0f2f2] border border-[#e7e7e7] hover:border-[#FF9900] transition-colors">
                <span className="text-2xl">📱</span>
                <div><p className="text-[13px] font-bold text-[#0F1111]">Telegram</p><p className="text-[10px] text-[#999]">@Shopping_Operations</p></div>
              </a>
              <a href="mailto:support@shopee-ops.com" className="flex items-center gap-3 p-3 rounded-xl bg-[#f0f2f2] border border-[#e7e7e7] hover:border-[#FF9900] transition-colors">
                <span className="text-2xl">📧</span>
                <div><p className="text-[13px] font-bold text-[#0F1111]">Email</p><p className="text-[10px] text-[#999]">support@shopee-ops.com</p></div>
              </a>
            </div>
            <button onClick={() => setShowContact(false)} className="w-full py-3 bg-[#f0f2f2] text-[#0F1111] font-medium rounded-xl text-sm">Close</button>
          </div>
        </div>
      )}

      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
        <Route path="/reset" element={<ResetPasswordPage />} />
        <Route path="/buy" element={<BuyPage />} />

        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/store/funds" element={<StorePage tab="funds" />} />
          <Route path="/store" element={<StorePage />} />
          <Route path="/mine" element={<MinePage />} />
          <Route path="/mine/team" element={<Lazy Comp={TeamPage} />} />
          <Route path="/mine/wallet" element={<Lazy Comp={WalletPage} />} />
          <Route path="/mine/messages" element={<Lazy Comp={MessagesPage} />} />
          <Route path="/mine/security" element={<Lazy Comp={SecurityPage} />} />
          <Route path="/mine/kyc" element={<Lazy Comp={KycPage} />} />
          <Route path="/mine/legal" element={<Lazy Comp={LegalPage} />} />
          <Route path="/mine/vip" element={<Lazy Comp={VipPage} />} />
          <Route path="/mine/withdraw" element={<Lazy Comp={WithdrawPage} />} />
          <Route path="/mine/staking" element={<Lazy Comp={StakingPage} />} />
          <Route path="/mine/deposit" element={<Lazy Comp={DepositPage} />} />
          <Route path="/mine/verify" element={<Lazy Comp={VerifyPage} />} />
          <Route path="/mine/support" element={<Lazy Comp={SupportPage} />} />
          <Route path="/mine/notifications" element={<Lazy Comp={NotificationsPage} />} />

          <Route path="/gift/:id" element={<Lazy Comp={GiftDetailPage} />} />
          <Route path="/admin" element={<AdminRedirect />} />

          <Route path="/gifts" element={<Navigate to="/home" replace />} />
          <Route path="/invite" element={<Navigate to="/tasks" replace />} />
          <Route path="/rewards" element={<Navigate to="/mine" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
