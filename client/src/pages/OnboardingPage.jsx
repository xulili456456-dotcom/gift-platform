import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const slides = [
  { label:'YOUR SIDE HUSTLE', title:'Buy.\nHold.\nProfit.', desc:'Purchase products on partner platforms, hold briefly, earn a guaranteed spread on every single trade.', stat:true },
  { label:'PASSIVE INCOME', title:'Invite.\nEarn.\nRepeat.', desc:'Share your code. Collect 3 levels of commissions as your network trades.', stat:false },
  { label:'MILESTONES', title:'Level up,\ncash out', desc:'Every milestone unlocks a bigger prize. From $5 to $888.', stat:false },
  { label:'READY', title:'Start earning.', desc:'Browse products, place orders, track profits. Simple.', stat:false },
];

export default function OnboardingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const touchStart = useRef(0);
  const total = slides.length;

  const finish = () => {
    localStorage.setItem('onboarded', '1');
    navigate('/home', { replace: true });
  };

  const next = () => {
    if (step < total - 1) setStep(step + 1);
    else finish();
  };

  const prev = () => { if (step > 0) setStep(step - 1); };

  const onTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { if (diff > 0) next(); else prev(); }
  };

  const s = slides[step];
  const isLast = step === total - 1;

  const Anim = ({ delay, children }) => (
    <div style={{animation:`fadeUp .6s cubic-bezier(.16,1,.3,1) ${delay}s forwards`,opacity:0}}>{children}</div>
  );

  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',background:'linear-gradient(180deg,#f5f3ef 0%,#f8f6f3 100%)',maxWidth:430,margin:'0 auto'}}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>

      {/* Progress bar */}
      <div style={{padding:'12px 32px 0'}}>
        <div style={{height:4,background:'#eee',borderRadius:2,overflow:'hidden'}}>
          <div style={{height:'100%',width:`${((step+1)/total)*100}%`,background:'linear-gradient(90deg,#FF5000,#FF8A50)',borderRadius:2,transition:'width .5s cubic-bezier(.16,1,.3,1)'}} />
        </div>
      </div>

      {/* Logo */}
      <Anim delay={0}>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'32px 32px 0'}}>
          <div style={{width:32,height:32,borderRadius:9,background:'#0f0f0f',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,color:'#fff',fontWeight:900}}>S</div>
          <span style={{fontSize:14,fontWeight:600,color:'#0f0f0f',letterSpacing:'.5px'}}>SHOPEE OPS</span>
        </div>
      </Anim>

      {/* Content */}
      <div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center',padding:'0 32px'}}>
        <Anim delay={0}>
          <div style={{fontSize:13,color:'#999',textTransform:'uppercase',letterSpacing:2,marginBottom:16}}>{s.label}</div>
        </Anim>

        {s.title.split('\n').map((line, i) => (
          <Anim key={i} delay={0.15 + i * 0.05}>
            <h1 style={{fontSize:42,fontWeight:900,color:'#0f0f0f',lineHeight:1.05,letterSpacing:-2,marginBottom:8}}>{line}</h1>
          </Anim>
        ))}

        <Anim delay={0.3}>
          <p style={{fontSize:16,color:'#888',lineHeight:1.7,maxWidth:300,marginTop:16}}>{s.desc}</p>
        </Anim>

        {/* Stats card (slide 1 only) */}
        {s.stat && (
          <Anim delay={0.45}>
            <div style={{background:'#fff',borderRadius:20,padding:'20px 24px',boxShadow:'0 1px 3px rgba(0,0,0,.04),0 4px 16px rgba(0,0,0,.04)',marginTop:32,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div><div style={{fontSize:10,color:'#bbb',textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>Avg Return</div><div style={{fontSize:40,fontWeight:900,color:'#FF5000',letterSpacing:-1}}>8-22%</div></div>
              <div style={{width:1,height:50,background:'#f0f0f0'}} />
              <div style={{textAlign:'right'}}><div style={{fontSize:10,color:'#bbb',textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>Per Trade</div><div style={{fontSize:40,fontWeight:900,color:'#0f0f0f',letterSpacing:-1}}>$2-50</div></div>
            </div>
          </Anim>
        )}
      </div>

      {/* Bottom */}
      <div style={{padding: step===3?'40px 32px 60px':'20px 32px 40px'}}>
        <Anim delay={0.45}>
          {isLast ? (
            <button onClick={finish} style={{width:'100%',padding:18,background:'linear-gradient(135deg,#FF5000,#E04500)',color:'#fff',border:'none',borderRadius:14,fontSize:17,fontWeight:800,cursor:'pointer',boxShadow:'0 2px 20px rgba(255,80,0,.2)'}}>Start Trading</button>
          ) : (
            <div style={{display:'flex',gap:12}}>
              <button onClick={step===0?finish:prev} style={{flex:1,padding:18,background:'transparent',color:'#999',border:'1px solid #e0e0e0',borderRadius:14,fontSize:16,fontWeight:600,cursor:'pointer'}}>{step===0?'Skip':'Back'}</button>
              <button onClick={next} style={{flex:1,padding:18,background:'#0f0f0f',color:'#fff',border:'none',borderRadius:14,fontSize:16,fontWeight:700,cursor:'pointer'}}>Continue</button>
            </div>
          )}
        </Anim>
      </div>

      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
