import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';
import { ChevronLeft } from 'lucide-react';

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
    <div style={{minHeight:'100vh',background:'#fff',display:'flex',flexDirection:'column',maxWidth:430,margin:'0 auto'}}>
      {/* Header */}
      <div style={{background:'#0f0f0f',padding:'50px 28px 36px',textAlign:'center',position:'relative'}}>
        {step === 2 && <button onClick={() => setStep(1)} style={{position:'absolute',left:16,top:50,background:'none',border:'none',cursor:'pointer',color:'#fff'}}><ChevronLeft size={22} /></button>}
        <img src="/logo.jpg" alt="Logo" style={{width:48,height:48,borderRadius:12,objectFit:'cover',marginBottom:10}} />
        <div style={{fontSize:14,fontWeight:700,color:'#fff'}}>Shopee Shopping Operations</div>
      </div>

      {/* Form */}
      <div style={{flex:1,padding: step===1?'36px 28px':'30px 28px'}}>
        <div style={{fontSize:22,fontWeight:800,color:'#0f0f0f',marginBottom:4}}>
          {step === 1 ? 'Create Account' : 'Complete Profile'}
        </div>
        <div style={{fontSize:13,color:'#999',marginBottom: step===1?32:24}}>
          {step === 1 ? 'Start earning today' : 'Just a few more details'}
        </div>

        {step === 1 ? (
          <div>
            <input type="email" value={form.email} onChange={update('email')} placeholder="Email"
              style={{width:'100%',padding:'14px 16px',border:'1.5px solid #eee',borderRadius:12,fontSize:14,marginBottom:10,outline:'none'}} />
            {form.email && !emailValid && <div style={{fontSize:11,color:'#E04500',marginBottom:8,marginTop:-6}}>Enter a valid email</div>}
            <input type="password" value={form.password} onChange={update('password')} placeholder="Password (8+ characters)"
              style={{width:'100%',padding:'14px 16px',border:'1.5px solid #eee',borderRadius:12,fontSize:14,marginBottom:12,outline:'none'}} />
            <div style={{display:'flex',gap:4,marginBottom:28}}>
              <div style={{flex:1,height:3,borderRadius:2,background: form.password.length>=4?'#00A86B':'#eee'}} />
              <div style={{flex:1,height:3,borderRadius:2,background: pwValid?'#00A86B':'#eee'}} />
            </div>
            <button onClick={() => { if (canNext) setStep(2); else toast.error('Please fill in valid email and password'); }}
              style={{width:'100%',padding:15,background:'#FF5000',color:'#fff',border:'none',borderRadius:14,fontSize:15,fontWeight:700,cursor:'pointer',marginBottom:20,opacity: canNext?1:.5}}>
              Continue
            </button>
          </div>
        ) : (
          <div>
            <input type="text" value={form.name} onChange={update('name')} placeholder="Full Name"
              style={{width:'100%',padding:'14px 16px',border:'1.5px solid #eee',borderRadius:12,fontSize:14,marginBottom:10,outline:'none'}} />
            <input type="tel" value={form.phone} onChange={update('phone')} placeholder="Phone"
              style={{width:'100%',padding:'14px 16px',border:'1.5px solid #eee',borderRadius:12,fontSize:14,marginBottom:10,outline:'none'}} />
            <input value={form.referral_code} onChange={update('referral_code')} placeholder="Referral Code (optional)"
              style={{width:'100%',padding:'14px 16px',border:'1.5px solid #eee',borderRadius:12,fontSize:14,marginBottom:24,outline:'none'}} />
            <button onClick={handleSubmit} disabled={loading}
              style={{width:'100%',padding:15,background:'#FF5000',color:'#fff',border:'none',borderRadius:14,fontSize:15,fontWeight:700,cursor:'pointer',marginBottom:16,opacity:loading?.5:1}}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>
        )}

        <div style={{textAlign:'center',fontSize:13,color:'#bbb'}}>
          Already have an account? <Link to="/login" style={{color:'#FF5000',fontWeight:700,textDecoration:'none'}}>Sign In →</Link>
        </div>
      </div>
    </div>
  );
}
