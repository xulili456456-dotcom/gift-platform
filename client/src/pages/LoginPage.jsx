import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error(t('auth.fillRequired')); return; }
    setLoading(true);
    try {
      await login(email, password);
      navigate('/home', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error || t('common.operationFailed'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-white flex flex-col" style={{ maxWidth: 430, margin: '0 auto' }}>
      {/* Status Bar */}
      <div className="h-11 bg-black flex items-center justify-between px-6 text-white text-[11px] font-medium">
        <span>9:41</span>
        <span>●●●●○</span>
      </div>

      {/* Spacer */}
      <div className="h-12" />

      {/* Brand Hero */}
      <div className="px-6 pt-2 pb-8">
        <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center mb-5">
          <span className="text-white text-xl font-bold">S</span>
        </div>
        <h1 className="text-[26px] font-extrabold text-gray-900 leading-tight mb-2">
          Welcome back
        </h1>
        <p className="text-[15px] text-gray-400">
          Sign in to continue earning
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 px-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Email</div>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@email.com" autoFocus
              className="w-full px-0 py-3 text-[17px] text-gray-900 placeholder-gray-300 bg-transparent border-b-2 border-gray-200 focus:border-black outline-none transition-colors" />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Password</div>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password"
              className="w-full px-0 py-3 text-[17px] text-gray-900 placeholder-gray-300 bg-transparent border-b-2 border-gray-200 focus:border-black outline-none transition-colors" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full h-14 bg-black text-white rounded-2xl text-[17px] font-semibold disabled:opacity-50 active:scale-[0.98] transition-all mt-6">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div className="text-center mt-5">
          <Link to="/reset" className="text-sm text-gray-400">Forgot password?</Link>
        </div>
      </div>

      {/* Bottom */}
      <div className="px-6 py-4 safe-bottom text-center">
        <p className="text-sm text-gray-400">
          Don't have an account? <Link to="/register" className="text-black font-semibold">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}
