import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/shared/LanguageSwitcher';

const slides = [
  { emoji:'🛒', bg:'linear-gradient(135deg,#FF5000,#E04500)', titleKey:'onboard.slide1Title', bodyKey:'onboard.slide1Body' },
  { emoji:'👥', bg:'#FFF5F0', titleKey:'onboard.slide2Title', bodyKey:'onboard.slide2Body' },
  { emoji:'🎁', bg:'#FFF5F0', titleKey:'onboard.slide3Title', bodyKey:'onboard.slide3Body' },
  { emoji:'🚀', bg:'#E8F5E9', titleKey:'onboard.slide4Title', bodyKey:'onboard.slide4Body' },
];

export default function OnboardingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const touchStart = useRef(0);

  const finish = () => {
    localStorage.setItem('onboarded', '1');
    navigate('/home', { replace: true });
  };

  const next = () => {
    if (step < slides.length - 1) setStep(step + 1);
    else finish();
  };

  const prev = () => { if (step > 0) setStep(step - 1); };

  const onTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { if (diff > 0) next(); else prev(); }
  };

  const current = slides[step];
  const isLast = step === slides.length - 1;

  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',background:'#fff',maxWidth:430,margin:'0 auto'}}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>

      <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',padding:'40px 28px'}}>
        <div style={{width:72,height:72,borderRadius:20,background:current.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,marginBottom:28}}>{current.emoji}</div>
        <div style={{fontSize:24,fontWeight:800,color:'#0f0f0f',marginBottom:8}}>{t(current.titleKey)}</div>
        <div style={{fontSize:14,color:'#999',lineHeight:1.6,maxWidth:260}}>{t(current.bodyKey)}</div>
        <div style={{marginTop:24}}><LanguageSwitcher /></div>
      </div>

      <div style={{padding:'0 28px 40px'}}>
        <div style={{display:'flex',justifyContent:'center',gap:6,marginBottom:20}}>
          {slides.map((_, i) => (
            <button key={i} onClick={() => setStep(i)} style={{
              width: i===step?28:5, height:5, border:'none', borderRadius:3,
              background: i===step?(isLast?'#00A86B':'#FF5000':'#e0e0e0'),
              cursor:'pointer', padding:0, transition:'all .2s'
            }} />
          ))}
        </div>
        {isLast ? (
          <button onClick={finish} style={{width:'100%',padding:16,background:'#FF5000',color:'#fff',border:'none',borderRadius:16,fontSize:16,fontWeight:700,cursor:'pointer',boxShadow:'0 4px 16px rgba(255,80,0,.3)'}}>Get Started</button>
        ) : (
          <div style={{display:'flex',gap:12}}>
            <button onClick={step===0?finish:prev} style={{flex:1,padding:14,background:'#f5f5f5',color:'#999',border:'none',borderRadius:14,fontSize:14,fontWeight:600,cursor:'pointer'}}>{step===0?'Skip':'Back'}</button>
            <button onClick={next} style={{flex:1,padding:14,background:'#FF5000',color:'#fff',border:'none',borderRadius:14,fontSize:14,fontWeight:700,cursor:'pointer'}}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
