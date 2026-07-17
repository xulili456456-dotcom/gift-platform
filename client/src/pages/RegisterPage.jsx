import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

export default function RegisterPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    email: '', phone: '', password: '', name: '',
    referral_code: searchParams.get('ref') || '',
  });
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();
  const update = (f) => (e) => setForm({ ...form, [f]: e.target.value });

  const pwValid = form.password.length >= 8;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  const canNext = emailValid && pwValid;

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.phone) { toast.error('Please fill in all fields'); return; }
    setLoading(true);
    try {
      await register({ email: form.email, phone: form.phone, password: form.password, name: form.name, referral_code: form.referral_code || undefined });
      toast.success('Account created!');
      navigate('/home', { replace: true });
    } catch (err) { toast.error(err.response?.data?.error || 'Registration failed'); setLoading(false); }
  };

  return (
    <div className="min-h-dvh bg-white flex flex-col" style={{ maxWidth: 430, margin: '0 auto' }}>
      {/* Status Bar */}
      <div className="h-11 bg-black flex items-center justify-between px-6 text-white text-[11px] font-medium">
        <span>9:41</span>
        <span>●●●●○</span>
      </div>

      {/* Nav */}
      <div className="h-12 flex items-center px-2">
        {step === 2 && <button onClick={() => setStep(1)} className="p-2"><ChevronLeft size={22} className="text-gray-800" /></button>}
      </div>

      {/* Brand Hero */}
      <div className="px-6 pt-2 pb-8">
        <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center mb-5">
          <span className="text-white text-xl font-bold">S</span>
        </div>
        <h1 className="text-[26px] font-extrabold text-gray-900 leading-tight mb-2">
          {step === 1 ? 'Create your\naccount' : 'Complete your\nprofile'}
        </h1>
        <p className="text-[15px] text-gray-400">
          {step === 1 ? 'Start earning with e-commerce tasks' : 'Just a few more details'}
        </p>
      </div>

      {/* Form Card */}
      <div className="flex-1 px-6">
        {step === 1 ? (
          <div className="space-y-5">
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Email</div>
              <input type="email" value={form.email} onChange={update('email')} placeholder="name@email.com"
                className="w-full px-0 py-3 text-[17px] text-gray-900 placeholder-gray-300 bg-transparent border-b-2 border-gray-200 focus:border-black outline-none transition-colors" />
              {form.email && !emailValid && <p className="text-red-400 text-xs mt-1">Enter a valid email</p>}
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Password</div>
              <input type="password" value={form.password} onChange={update('password')} placeholder="Min. 8 characters"
                className="w-full px-0 py-3 text-[17px] text-gray-900 placeholder-gray-300 bg-transparent border-b-2 border-gray-200 focus:border-black outline-none transition-colors" />
              <div className="flex gap-2 mt-2">
                <div className={`flex-1 h-1 rounded-full ${form.password.length >= 4 ? 'bg-green-400' : 'bg-gray-200'}`} />
                <div className={`flex-1 h-1 rounded-full ${form.password.length >= 8 ? 'bg-green-400' : 'bg-gray-200'}`} />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Full Name</div>
              <input type="text" value={form.name} onChange={update('name')} placeholder="Your name"
                className="w-full px-0 py-3 text-[17px] text-gray-900 placeholder-gray-300 bg-transparent border-b-2 border-gray-200 focus:border-black outline-none transition-colors" />
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Phone Number</div>
              <input type="tel" value={form.phone} onChange={update('phone')} placeholder="10-15 digits"
                className="w-full px-0 py-3 text-[17px] text-gray-900 placeholder-gray-300 bg-transparent border-b-2 border-gray-200 focus:border-black outline-none transition-colors" />
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Referral Code <span className="font-normal normal-case tracking-normal">(optional)</span></div>
              <input type="text" value={form.referral_code} onChange={update('referral_code')} placeholder="Enter code"
                className="w-full px-0 py-3 text-[17px] text-gray-900 placeholder-gray-300 bg-transparent border-b-2 border-gray-200 focus:border-black outline-none transition-colors" />
            </div>
          </div>
        )}
      </div>

      {/* Bottom */}
      <div className="px-6 py-4 safe-bottom">
        {step === 1 ? (
          <button onClick={() => setStep(2)} disabled={!canNext}
            className="w-full h-14 bg-black text-white rounded-2xl text-[17px] font-semibold flex items-center justify-center gap-2 disabled:opacity-20 active:scale-[0.98] transition-all">
            Continue <ChevronRight size={20} />
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={loading}
            className="w-full h-14 bg-black text-white rounded-2xl text-[17px] font-semibold disabled:opacity-50 active:scale-[0.98] transition-all">
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        )}
        <p className="text-center text-sm text-gray-400 mt-4 mb-2">
          Already have an account? <Link to="/login" className="text-black font-semibold">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
