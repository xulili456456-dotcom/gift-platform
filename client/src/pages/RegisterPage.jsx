import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    email: '', phone: '', password: '', confirmPassword: '', name: '',
    referral_code: searchParams.get('ref') || '',
  });
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();
  const updateField = (f) => (e) => setForm({ ...form, [f]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.phone || !form.password) { toast.error(t('auth.fillRequired')); return; }
    if (form.password !== form.confirmPassword) { toast.error(t('auth.passNotMatch')); return; }
    if (form.password.length < 8) { toast.error(t('auth.passMinLength')); return; }
    setLoading(true);
    try {
      await register({ email: form.email, phone: form.phone, password: form.password, name: form.name, referral_code: form.referral_code || undefined });
      toast.success(t('auth.registerSuccess'));
      navigate('/home', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error || t('common.operationFailed'));
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-dvh bg-warm-bg">
      <div className="bg-gradient-to-br from-primary to-primary-dark pt-10 pb-12 px-6 text-center text-white rounded-b-[40px] shadow-lg">
        <div className="text-4xl mb-2">🎁</div>
        <h1 className="text-xl font-bold tracking-wide mb-1">{t('auth.registerTitle')}</h1>
        <p className="text-white/80 text-sm">{t('auth.joinSlogan')}</p>
        {form.referral_code && (
          <div className="mt-3 inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 text-xs">
            <span>🔗</span> {t('auth.referralCode')}: <strong>{form.referral_code}</strong>
          </div>
        )}
      </div>
      <div className="px-6 -mt-6 pb-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md p-6 space-y-3.5 animate-fade-in">
          <h2 className="text-lg font-semibold text-text-primary text-center mb-1">{t('auth.registerTitle')}</h2>
          <div><label className="block text-sm font-medium text-text-secondary mb-1">{t('auth.email')} <span className="text-primary">*</span></label><input type="email" value={form.email} onChange={updateField('email')} placeholder={t('auth.placeholderEmail')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-warm-white text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" autoComplete="email" /></div>
          <div><label className="block text-sm font-medium text-text-secondary mb-1">{t('auth.phone')} <span className="text-primary">*</span></label><input type="tel" value={form.phone} onChange={updateField('phone')} placeholder={t('auth.placeholderPhone')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-warm-white text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" autoComplete="tel" /></div>
          <div><label className="block text-sm font-medium text-text-secondary mb-1">{t('auth.name')}</label><input type="text" value={form.name} onChange={updateField('name')} placeholder={t('auth.placeholderName')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-warm-white text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" /></div>
          <div><label className="block text-sm font-medium text-text-secondary mb-1">{t('auth.password')} <span className="text-primary">*</span></label><input type="password" value={form.password} onChange={updateField('password')} placeholder={t('auth.placeholderPass')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-warm-white text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" autoComplete="new-password" /></div>
          <div><label className="block text-sm font-medium text-text-secondary mb-1">{t('auth.confirmPassword')} <span className="text-primary">*</span></label><input type="password" value={form.confirmPassword} onChange={updateField('confirmPassword')} placeholder={t('auth.placeholderConfirm')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-warm-white text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" autoComplete="new-password" /></div>
          <div><label className="block text-sm font-medium text-text-secondary mb-1">{t('auth.referralCode')} <span className="text-text-muted font-normal">({t('auth.referralOptional')})</span></label><input type="text" value={form.referral_code} onChange={updateField('referral_code')} placeholder={t('auth.placeholderReferral')} className="w-full px-4 py-2.5 rounded-xl border border-gold/50 bg-gold-light/30 text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all uppercase placeholder:text-text-muted" /></div>
          <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-primary to-primary-dark text-white font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all active:scale-[0.98] disabled:opacity-60 text-sm mt-2">{loading ? t('auth.registering') : t('auth.registerBtn')}</button>
          <p className="text-center text-sm text-text-muted">{t('auth.hasAccount')} <Link to="/login" className="text-primary font-medium hover:underline">{t('auth.goLogin')}</Link></p>
        </form>
      </div>
    </div>
  );
}
