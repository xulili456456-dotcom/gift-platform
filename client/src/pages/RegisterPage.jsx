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
    email: '', phone: '', phone_prefix: '+1', password: '', name: '',
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
    if (!form.name.trim() || !form.phone) { toast.error(t('auth.fillRequired')); return; }
    setLoading(true);
    try {
      await register({ email: form.email, phone: form.phone, phone_prefix: form.phone_prefix, password: form.password, name: form.name, referral_code: form.referral_code || undefined });
      toast.success(t('auth.accountCreated'));
      navigate('/home', { replace: true });
    } catch (err) { toast.error(err.response?.data?.error || t('common.operationFailed')); setLoading(false); }
  };

  return (
    <div style={{minHeight:'100vh',background:'#fff',display:'flex',flexDirection:'column',maxWidth:430,margin:'0 auto'}}>
      {/* Header */}
      <div style={{background:'#0f0f0f',padding:'50px 28px 36px',textAlign:'center',position:'relative'}}>
        {step === 2 && <button onClick={() => setStep(1)} style={{position:'absolute',left:16,top:50,background:'none',border:'none',cursor:'pointer',color:'#fff'}}><ChevronLeft size={22} /></button>}
        <img src="/logo.jpg" alt={t('app.name')} style={{width:48,height:48,borderRadius:12,objectFit:'cover',marginBottom:10}} />
        <div style={{fontSize:14,fontWeight:700,color:'#fff'}}>{t('app.name')}</div>
      </div>

      {/* Form */}
      <div style={{flex:1,padding: step===1?'36px 28px':'30px 28px'}}>
        <div style={{fontSize:22,fontWeight:800,color:'#0f0f0f',marginBottom:4}}>
          {step === 1 ? t('auth.registerTitle') : t('auth.completeProfile')}
        </div>
        <div style={{fontSize:13,color:'#999',marginBottom: step===1?32:24}}>
          {step === 1 ? t('auth.startEarning') : t('auth.justDetails')}
        </div>

        {step === 1 ? (
          <div>
            <input type="email" value={form.email} onChange={update('email')} placeholder={t('auth.placeholderEmail')}
              style={{width:'100%',padding:'14px 16px',border:'1.5px solid #eee',borderRadius:12,fontSize:14,marginBottom:10,outline:'none'}} />
            {form.email && !emailValid && <div style={{fontSize:11,color:'#E04500',marginBottom:8,marginTop:-6}}>{t('auth.validEmail')}</div>}
            <input type="password" value={form.password} onChange={update('password')} placeholder={t('auth.placeholderPassHint')}
              style={{width:'100%',padding:'14px 16px',border:'1.5px solid #eee',borderRadius:12,fontSize:14,marginBottom:12,outline:'none'}} />
            <div style={{display:'flex',gap:4,marginBottom:28}}>
              <div style={{flex:1,height:3,borderRadius:2,background: form.password.length>=4?'#00A86B':'#eee'}} />
              <div style={{flex:1,height:3,borderRadius:2,background: pwValid?'#00A86B':'#eee'}} />
            </div>
            <button onClick={() => { if (canNext) setStep(2); else toast.error(t('auth.validEmailPass')); }}
              style={{width:'100%',padding:15,background:'#FF5000',color:'#fff',border:'none',borderRadius:14,fontSize:15,fontWeight:700,cursor:'pointer',marginBottom:20,opacity: canNext?1:.5}}>
              {t('auth.continueBtn')}
            </button>
          </div>
        ) : (
          <div>
            <input type="text" value={form.name} onChange={update('name')} placeholder={t('auth.placeholderName')}
              style={{width:'100%',padding:'14px 16px',border:'1.5px solid #eee',borderRadius:12,fontSize:14,marginBottom:10,outline:'none'}} />
            <div style={{display:'flex',gap:8,marginBottom:10}}>
              <select value={form.phone_prefix} onChange={update('phone_prefix')}
                style={{width:110,padding:'14px 8px',border:'1.5px solid #eee',borderRadius:12,fontSize:14,outline:'none',background:'#fff'}}>
                {[
                  {c:'+1',n:'US/CA'},{c:'+7',n:'RU'},{c:'+20',n:'EG'},{c:'+27',n:'ZA'},{c:'+30',n:'GR'},{c:'+31',n:'NL'},{c:'+32',n:'BE'},{c:'+33',n:'FR'},
                  {c:'+34',n:'ES'},{c:'+36',n:'HU'},{c:'+39',n:'IT'},{c:'+40',n:'RO'},{c:'+41',n:'CH'},{c:'+43',n:'AT'},{c:'+44',n:'UK'},{c:'+45',n:'DK'},
                  {c:'+46',n:'SE'},{c:'+47',n:'NO'},{c:'+48',n:'PL'},{c:'+49',n:'DE'},{c:'+51',n:'PE'},{c:'+52',n:'MX'},{c:'+53',n:'CU'},{c:'+54',n:'AR'},
                  {c:'+55',n:'BR'},{c:'+56',n:'CL'},{c:'+57',n:'CO'},{c:'+58',n:'VE'},{c:'+60',n:'MY'},{c:'+61',n:'AU'},{c:'+62',n:'ID'},{c:'+63',n:'PH'},
                  {c:'+64',n:'NZ'},{c:'+65',n:'SG'},{c:'+66',n:'TH'},{c:'+81',n:'JP'},{c:'+82',n:'KR'},{c:'+84',n:'VN'},{c:'+86',n:'CN'},{c:'+90',n:'TR'},
                  {c:'+91',n:'IN'},{c:'+92',n:'PK'},{c:'+93',n:'AF'},{c:'+94',n:'LK'},{c:'+95',n:'MM'},{c:'+98',n:'IR'},{c:'+212',n:'MA'},{c:'+213',n:'DZ'},
                  {c:'+216',n:'TN'},{c:'+218',n:'LY'},{c:'+220',n:'GM'},{c:'+221',n:'SN'},{c:'+222',n:'MR'},{c:'+223',n:'ML'},{c:'+224',n:'GN'},
                  {c:'+225',n:'CI'},{c:'+226',n:'BF'},{c:'+227',n:'NE'},{c:'+228',n:'TG'},{c:'+229',n:'BJ'},{c:'+230',n:'MU'},{c:'+231',n:'LR'},
                  {c:'+232',n:'SL'},{c:'+233',n:'GH'},{c:'+234',n:'NG'},{c:'+235',n:'TD'},{c:'+236',n:'CF'},{c:'+237',n:'CM'},{c:'+238',n:'CV'},
                  {c:'+239',n:'ST'},{c:'+240',n:'GQ'},{c:'+241',n:'GA'},{c:'+242',n:'CG'},{c:'+243',n:'CD'},{c:'+244',n:'AO'},{c:'+245',n:'GW'},
                  {c:'+246',n:'IO'},{c:'+247',n:'AC'},{c:'+248',n:'SC'},{c:'+249',n:'SD'},{c:'+250',n:'RW'},{c:'+251',n:'ET'},{c:'+252',n:'SO'},
                  {c:'+253',n:'DJ'},{c:'+254',n:'KE'},{c:'+255',n:'TZ'},{c:'+256',n:'UG'},{c:'+257',n:'BI'},{c:'+258',n:'MZ'},{c:'+260',n:'ZM'},
                  {c:'+261',n:'MG'},{c:'+262',n:'RE'},{c:'+263',n:'ZW'},{c:'+264',n:'NA'},{c:'+265',n:'MW'},{c:'+266',n:'LS'},{c:'+267',n:'BW'},
                  {c:'+268',n:'SZ'},{c:'+269',n:'KM'},{c:'+290',n:'SH'},{c:'+291',n:'ER'},{c:'+297',n:'AW'},{c:'+298',n:'FO'},{c:'+299',n:'GL'},
                  {c:'+350',n:'GI'},{c:'+351',n:'PT'},{c:'+352',n:'LU'},{c:'+353',n:'IE'},{c:'+354',n:'IS'},{c:'+355',n:'AL'},{c:'+356',n:'MT'},
                  {c:'+357',n:'CY'},{c:'+358',n:'FI'},{c:'+359',n:'BG'},{c:'+370',n:'LT'},{c:'+371',n:'LV'},{c:'+372',n:'EE'},{c:'+373',n:'MD'},
                  {c:'+374',n:'AM'},{c:'+375',n:'BY'},{c:'+376',n:'AD'},{c:'+377',n:'MC'},{c:'+378',n:'SM'},{c:'+379',n:'VA'},{c:'+380',n:'UA'},
                  {c:'+381',n:'RS'},{c:'+382',n:'ME'},{c:'+383',n:'XK'},{c:'+385',n:'HR'},{c:'+386',n:'SI'},{c:'+387',n:'BA'},{c:'+389',n:'MK'},
                  {c:'+420',n:'CZ'},{c:'+421',n:'SK'},{c:'+423',n:'LI'},{c:'+500',n:'FK'},{c:'+501',n:'BZ'},{c:'+502',n:'GT'},{c:'+503',n:'SV'},
                  {c:'+504',n:'HN'},{c:'+505',n:'NI'},{c:'+506',n:'CR'},{c:'+507',n:'PA'},{c:'+509',n:'HT'},{c:'+591',n:'BO'},{c:'+592',n:'GY'},
                  {c:'+593',n:'EC'},{c:'+594',n:'GF'},{c:'+595',n:'PY'},{c:'+596',n:'MQ'},{c:'+597',n:'SR'},{c:'+598',n:'UY'},{c:'+599',n:'CW'},
                  {c:'+670',n:'TL'},{c:'+672',n:'AQ'},{c:'+673',n:'BN'},{c:'+674',n:'NR'},{c:'+675',n:'PG'},{c:'+676',n:'TO'},{c:'+677',n:'SB'},
                  {c:'+678',n:'VU'},{c:'+679',n:'FJ'},{c:'+680',n:'PW'},{c:'+681',n:'WF'},{c:'+682',n:'CK'},{c:'+683',n:'NU'},{c:'+685',n:'WS'},
                  {c:'+686',n:'KI'},{c:'+687',n:'NC'},{c:'+688',n:'TV'},{c:'+689',n:'PF'},{c:'+690',n:'TK'},{c:'+691',n:'FM'},{c:'+692',n:'MH'},
                  {c:'+' + 850,n:'KP'},{c:'+852',n:'HK'},{c:'+853',n:'MO'},{c:'+855',n:'KH'},{c:'+856',n:'LA'},{c:'+880',n:'BD'},{c:'+886',n:'TW'},
                  {c:'+960',n:'MV'},{c:'+961',n:'LB'},{c:'+962',n:'JO'},{c:'+963',n:'SY'},{c:'+964',n:'IQ'},{c:'+965',n:'KW'},{c:'+966',n:'SA'},
                  {c:'+967',n:'YE'},{c:'+968',n:'OM'},{c:'+970',n:'PS'},{c:'+971',n:'AE'},{c:'+972',n:'IL'},{c:'+973',n:'BH'},{c:'+974',n:'QA'},
                  {c:'+975',n:'BT'},{c:'+976',n:'MN'},{c:'+977',n:'NP'},{c:'+992',n:'TJ'},{c:'+993',n:'TM'},{c:'+994',n:'AZ'},{c:'+995',n:'GE'},
                  {c:'+996',n:'KG'},{c:'+998',n:'UZ'},
                ].sort((a,b)=>parseInt(a.c.replace('+',''))-parseInt(b.c.replace('+',''))).map(x=><option key={x.c} value={x.c}>{x.c} {x.n}</option>)}
              </select>
              <input type="tel" value={form.phone} onChange={update('phone')} placeholder={t('auth.placeholderPhone')}
                style={{flex:1,padding:'14px 16px',border:'1.5px solid #eee',borderRadius:12,fontSize:14,outline:'none'}} />
            </div>
            <input value={form.referral_code} onChange={update('referral_code')} placeholder={t('auth.placeholderReferral')}
              style={{width:'100%',padding:'14px 16px',border:'1.5px solid #eee',borderRadius:12,fontSize:14,marginBottom:24,outline:'none'}} />
            <button onClick={handleSubmit} disabled={loading}
              style={{width:'100%',padding:15,background:'#FF5000',color:'#fff',border:'none',borderRadius:14,fontSize:15,fontWeight:700,cursor:'pointer',marginBottom:16,opacity:loading?0.5:1}}>
              {loading ? t('auth.registering') : t('auth.registerBtn')}
            </button>
          </div>
        )}

        <div style={{textAlign:'center',fontSize:13,color:'#bbb'}}>
          {t('auth.hasAccount')} <Link to="/login" style={{color:'#FF5000',fontWeight:700,textDecoration:'none'}}>{t('auth.loginLink')}</Link>
        </div>
      </div>
    </div>
  );
}
