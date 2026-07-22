import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect, lazy, Suspense, useState, Component } from 'react';
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
import StoreFundsPage from './pages/StoreFundsPage';
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

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return (
      <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12,background:'#f2f2f7'}}>
        <div style={{fontSize:40}}>😵</div>
        <div style={{fontSize:14,fontWeight:600,color:'#333'}}>Something went wrong</div>
        <button onClick={() => { this.setState({ hasError: false }); window.location.reload(); }} style={{padding:'10px 20px',background:'#FF5000',color:'#fff',border:'none',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer'}}>Retry</button>
      </div>
    );
    return this.props.children;
  }
}

const Lazy = ({ Comp }) => (
  <ErrorBoundary>
    <Suspense fallback={<PageLoader />}>
      <Comp />
    </Suspense>
  </ErrorBoundary>
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
        <div style={{position:'fixed',inset:0,zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.6)',backdropFilter:'blur(2px)',padding:16}} onClick={() => setShowContact(false)}>
          <div onClick={e => e.stopPropagation()} style={{background:'#fff',borderRadius:24,width:'100%',maxWidth:330,padding:'32px 24px 24px',boxShadow:'0 20px 60px rgba(0,0,0,.2)',textAlign:'center',animation:'scaleIn .25s ease-out'}}>
            <div style={{position:'relative',display:'inline-block',marginBottom:16}}>
              <div style={{width:64,height:64,borderRadius:32,background:'linear-gradient(135deg,#0088CC,#00B2FF)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:30}}>✈️</div>
              <div style={{position:'absolute',bottom:2,right:2,width:16,height:16,borderRadius:8,background:'#00A86B',border:'2px solid #fff'}}></div>
            </div>
            <div style={{fontSize:18,fontWeight:800,color:'#0f0f0f',marginBottom:2}}>Contact Support</div>
            <div style={{fontSize:12,color:'#00A86B',fontWeight:500,marginBottom:8}}>● Online — respond within minutes</div>
            <div style={{fontSize:12,color:'#999',marginBottom:20}}>Reach us on Telegram for any questions</div>
            <a href="https://t.me/Shopping_Operations" target="_blank" rel="noopener noreferrer" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:14,background:'linear-gradient(135deg,#0088CC,#00B2FF)',borderRadius:14,textDecoration:'none',marginBottom:10,color:'#fff',fontSize:14,fontWeight:700}}>✈️ Open Telegram</a>
            <div style={{fontSize:12,color:'#0088CC',marginBottom:18}}>@Shopping_Operations</div>
            <button onClick={() => setShowContact(false)} style={{width:'100%',padding:12,background:'#f5f5f5',color:'#666',border:'none',borderRadius:12,fontSize:13,fontWeight:600,cursor:'pointer'}}>Close</button>
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
          <Route path="/store/funds" element={<StoreFundsPage />} />
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
          <Route path="/gifts" element={<Navigate to="/home" replace />} />
          <Route path="/invite" element={<Navigate to="/tasks" replace />} />
          <Route path="/rewards" element={<Navigate to="/mine" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
