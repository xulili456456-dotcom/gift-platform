import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import client from '../api/client';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', phone: '', newPassword: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.phone || !form.newPassword) { toast.error(t('auth.fillRequired')); return; }
    if (form.newPassword.length < 8) { toast.error(t('auth.passMinLength')); return; }
    setLoading(true);
    try {
      await client.post('/auth/reset-password', form);
      setDone(true);
      toast.success(t('auth.resetDone'));
    } catch (err) { toast.error(err.response?.data?.error || t('auth.resetFailed')); }
    finally { setLoading(false); }
  };

  if (done) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-warm-bg px-6 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-text mb-2">{t('auth.resetDone')}</h2>
        <p className="text-text-muted text-sm mb-6">{t('auth.resetDoneDesc')}</p>
        <Link to="/login" className="bg-primary text-white px-8 py-3 rounded-xl font-bold">{t('auth.goLogin')}</Link>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-warm-bg">
      <div className="bg-gradient-to-br from-primary via-primary to-primary-dark pt-12 pb-16 px-6 text-center text-white rounded-b-[40px] shadow-lg">
        <div className="text-5xl mb-3">🔑</div>
        <h1 className="text-2xl font-bold tracking-wide mb-1">{t('auth.resetTitle')}</h1>
        <p className="text-white/80 text-sm">{t('auth.resetDesc')}</p>
      </div>
      <div className="flex-1 px-6 -mt-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md p-6 space-y-4 animate-fade-in">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('auth.email')}</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder={t('auth.placeholderEmail')} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-warm-white text-sm focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('auth.phone')}</label>
            <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder={t('auth.placeholderPhone')} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-warm-white text-sm focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('auth.newPassword')}</label>
            <input type="password" value={form.newPassword} onChange={e => setForm({...form, newPassword: e.target.value})} placeholder={t('auth.placeholderNewPass')} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-warm-white text-sm focus:outline-none focus:border-primary" />
          </div>
          <button type="submit" disabled={loading} className="w-full py-3.5 bg-gradient-to-r from-primary to-primary-dark text-white font-semibold rounded-xl shadow-lg active:scale-[0.98] disabled:opacity-60 text-sm">
            {loading ? '...' : t('auth.resetBtn')}
          </button>
          <p className="text-center text-sm text-text-muted">
            <Link to="/login" className="text-primary font-medium hover:underline">{t('auth.goLogin')}</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
