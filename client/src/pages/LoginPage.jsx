import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/authStore';
import PasswordInput from '../components/shared/PasswordInput';
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
      toast.success(t('auth.loginSuccess'));
      navigate('/home', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error || t('common.operationFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col bg-warm-bg">
      <div className="bg-gradient-to-br from-primary via-primary to-primary-dark pt-12 pb-16 px-6 text-center text-white rounded-b-[40px] shadow-lg">
        <div className="text-5xl mb-3">🧧</div>
        <h1 className="text-2xl font-bold tracking-wide mb-1">{t('app.name')}</h1>
        <p className="text-white/80 text-sm">{t('app.slogan')}</p>
      </div>
      <div className="flex-1 px-6 -mt-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md p-6 space-y-4 animate-fade-in">
          <h2 className="text-lg font-semibold text-text-primary text-center">{t('auth.loginTitle')}</h2>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('auth.email')}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('auth.placeholderEmail')} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-warm-white text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all text-sm" autoComplete="email" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('auth.password')}</label>
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('auth.placeholderPass')} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-warm-white text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all text-sm" autoComplete="current-password" />
          </div>
          <button type="submit" disabled={loading} className="w-full py-3.5 bg-gradient-to-r from-primary to-primary-dark text-white font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all active:scale-[0.98] disabled:opacity-60 text-sm">
            {loading ? t('auth.loggingIn') : t('auth.loginBtn')}
          </button>
          <p className="text-center text-sm text-text-muted">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="text-primary font-medium hover:underline">{t('auth.goRegister')}</Link>
          </p>
          <p className="text-center text-xs text-text-muted mt-2">
            <Link to="/reset" className="text-text-muted hover:text-primary underline">{t('auth.forgotPassword')}</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
