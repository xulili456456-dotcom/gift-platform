import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Mail, Lock, User, Phone, Gift, Shield } from 'lucide-react';

export default function RegisterPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    email: '', phone: '', password: '', confirmPassword: '', name: '',
    referral_code: searchParams.get('ref') || '',
  });
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();
  const updateField = (f) => (e) => setForm({ ...form, [f]: e.target.value });

  const canNext = step === 1 ? (form.email && form.password && form.confirmPassword && form.password === form.confirmPassword && form.password.length >= 8) : true;

  const handleSubmit = async () => {
    if (!form.email || !form.phone || !form.password) { toast.error(t('auth.fillRequired')); return; }
    if (!form.name.trim()) { toast.error('Please enter your name'); return; }
    setLoading(true);
    try {
      await register({ email: form.email, phone: form.phone, password: form.password, name: form.name, referral_code: form.referral_code || undefined });
      toast.success(t('auth.registerSuccess'));
      navigate('/home', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error || t('common.operationFailed'));
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#FF9900] focus:bg-white transition-colors";

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
        {step === 2 ? (
          <button onClick={() => setStep(1)} className="p-1 -ml-1"><ChevronLeft size={22} className="text-gray-700" /></button>
        ) : <div className="w-8" />}
        <span className="text-sm font-medium text-gray-400">{step}/2</span>
      </div>

      {/* Progress */}
      <div className="px-6 pt-6 pb-2">
        <h1 className="text-[22px] font-bold text-gray-900 mb-1">
          {step === 1 ? 'Create Account' : 'Your Profile'}
        </h1>
        <p className="text-sm text-gray-500">
          {step === 1 ? 'Enter your email and set a password' : 'Tell us about yourself'}
        </p>
        <div className="flex gap-2 mt-4 mb-2">
          <div className="h-1 flex-1 rounded-full bg-[#FF9900]" />
          <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-[#FF9900]' : 'bg-gray-200'}`} />
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 pt-4">
        {step === 1 ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="email" value={form.email} onChange={updateField('email')} placeholder="your@email.com" className={inputClass + " pl-11"} autoFocus />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="password" value={form.password} onChange={updateField('password')} placeholder="At least 8 characters" className={inputClass + " pl-11"} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Confirm Password</label>
              <div className="relative">
                <Shield size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="password" value={form.confirmPassword} onChange={updateField('confirmPassword')} placeholder="Re-enter password" className={inputClass + " pl-11"} />
              </div>
              {form.confirmPassword && form.password !== form.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Name</label>
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={form.name} onChange={updateField('name')} placeholder="Your full name" className={inputClass + " pl-11"} autoFocus />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Phone Number</label>
              <div className="relative">
                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="tel" value={form.phone} onChange={updateField('phone')} placeholder="10-15 digits" className={inputClass + " pl-11"} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Referral Code <span className="text-gray-300">(optional)</span></label>
              <div className="relative">
                <Gift size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={form.referral_code} onChange={updateField('referral_code')} placeholder="Enter referral code" className={inputClass + " pl-11"} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Button */}
      <div className="px-6 py-4 border-t border-gray-100 safe-bottom">
        {step === 1 ? (
          <button onClick={() => setStep(2)} disabled={!canNext}
            className="w-full py-3.5 bg-[#FF9900] text-white rounded-xl text-[16px] font-semibold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-all">
            Continue <ChevronRight size={18} />
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={loading}
            className="w-full py-3.5 bg-[#FF9900] text-white rounded-xl text-[16px] font-semibold disabled:opacity-60 active:scale-[0.98] transition-all">
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        )}
        <p className="text-center text-sm text-gray-500 mt-3">
          Already have an account? <Link to="/login" className="text-[#FF9900] font-medium">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
