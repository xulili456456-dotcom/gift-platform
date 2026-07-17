import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';
import { Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { toast.error(t('auth.fillRequired')); return; }
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success(t('auth.loginSuccess'));
      navigate('/home', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error || t('common.operationFailed'));
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#FF9900] focus:bg-white transition-colors";

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#FFF3E6] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl font-bold text-[#FF9900]">S</span>
          </div>
          <h1 className="text-[22px] font-bold text-gray-900 mb-1">Welcome Back</h1>
          <p className="text-sm text-gray-500">Sign in to your account</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="your@email.com" className={inputClass + " pl-11"} autoFocus />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Enter password" className={inputClass + " pl-11"} />
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3.5 bg-[#FF9900] text-white rounded-xl text-[16px] font-semibold disabled:opacity-60 active:scale-[0.98] transition-all mt-2">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div className="text-center mt-6">
          <Link to="/reset-password" className="text-sm text-gray-400">Forgot password?</Link>
        </div>
      </div>
      <div className="px-6 py-4 border-t border-gray-100 safe-bottom text-center">
        <p className="text-sm text-gray-500">
          Don't have an account? <Link to="/register" className="text-[#FF9900] font-medium">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}
