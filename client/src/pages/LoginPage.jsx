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
    <div style={{minHeight:'100vh',background:'#fff',display:'flex',flexDirection:'column',maxWidth:430,margin:'0 auto'}}>
      {/* Header */}
      <div style={{background:'#0f0f0f',padding:'50px 28px 36px',textAlign:'center'}}>
        <img src="/logo.jpg" alt={t('app.name')} style={{width:48,height:48,borderRadius:12,objectFit:'cover',marginBottom:10}} />
        <div style={{fontSize:14,fontWeight:700,color:'#fff'}}>{t('app.name')}</div>
      </div>

      {/* Form */}
      <div style={{flex:1,padding:'36px 28px'}}>
        <div style={{fontSize:22,fontWeight:800,color:'#0f0f0f',marginBottom:4}}>{t('auth.loginTitle')}</div>
        <div style={{fontSize:13,color:'#999',marginBottom:32}}>{t('auth.welcomeBack')}</div>

        <form onSubmit={handleSubmit}>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('auth.placeholderEmail')} autoFocus
            style={{width:'100%',padding:'14px 16px',border:'1.5px solid #eee',borderRadius:12,fontSize:14,marginBottom:12,outline:'none'}} />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t('auth.placeholderPass')}
            style={{width:'100%',padding:'14px 16px',border:'1.5px solid #eee',borderRadius:12,fontSize:14,marginBottom:8,outline:'none'}} />
          <div style={{textAlign:'right',marginBottom:28}}>
            <Link to="/reset" style={{color:'#FF5000',fontSize:12,textDecoration:'none'}}>{t('auth.forgotPassword')}</Link>
          </div>
          <button type="submit" disabled={loading}
            style={{width:'100%',padding:15,background:'#FF5000',color:'#fff',border:'none',borderRadius:14,fontSize:15,fontWeight:700,cursor:'pointer',marginBottom:20,opacity:loading?.5:1}}>
            {loading ? t('auth.loggingIn') : t('auth.loginBtn')}
          </button>
        </form>

        <div style={{textAlign:'center',fontSize:13,color:'#bbb'}}>
          {t('auth.noAccount')} <Link to="/register" style={{color:'#FF5000',fontWeight:700,textDecoration:'none'}}>{t('auth.registerLink')}</Link>
        </div>
      </div>
    </div>
  );
}
