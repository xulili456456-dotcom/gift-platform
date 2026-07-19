import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const tabs = [
  { id: 'terms', icon: '📄', key: 'legal.terms' },
  { id: 'privacy', icon: '🛡️', key: 'legal.privacy' },
  { id: 'liability', icon: '⚖️', key: 'legal.liability' },
  { id: 'about', icon: 'ℹ️', key: 'legal.about' },
];

export default function LegalPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [active, setActive] = useState('terms');

  const renderContent = (key) => {
    const sections = t(`legal.${key}Content`, { returnObjects: true });
    const titleKey = { terms: 'legal.termsTitle', privacy: 'legal.privacyTitle', liability: 'legal.liabilityTitle', about: 'legal.aboutTitle' };

    if (!Array.isArray(sections)) {
      return <p style={{fontSize:13,color:'#999',lineHeight:1.7}}>Content not available in your language. Please switch to English or Chinese.</p>;
    }

    return (
      <div>
        <h3 style={{fontSize:15,fontWeight:700,color:'#0f0f0f',marginBottom:14}}>{t(titleKey[key])}</h3>
        {sections.map((section, i) => (
          <div key={i} style={{marginBottom:14}}>
            <h4 style={{fontSize:13,fontWeight:700,color:'#333',marginBottom:4}}>{section.title}</h4>
            <p style={{fontSize:12,color:'#666',lineHeight:1.7}}>{section.body}</p>
          </div>
        ))}
        {/* Version info */}
        {key !== 'about' ? (
          <div style={{background:'#f8f8f8',borderRadius:12,padding:12,fontSize:11,marginTop:20}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{color:'#999'}}>{t('legal.version')}</span><span style={{fontWeight:600,color:'#333'}}>1.0.0</span></div>
            <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'#999'}}>{t('legal.lastUpdated')}</span><span style={{fontWeight:600,color:'#333'}}>2026-07-10</span></div>
          </div>
        ) : (
          <div style={{background:'#f8f8f8',borderRadius:12,padding:12,fontSize:11,marginTop:20}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{color:'#999'}}>{t('legal.version')}</span><span style={{fontWeight:600,color:'#333'}}>1.0.0</span></div>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{color:'#999'}}>{t('legal.platform')}</span><span style={{fontWeight:600,color:'#333'}}>Web App</span></div>
            <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'#999'}}>{t('legal.contact')}</span><span style={{fontWeight:600,color:'#333'}}>Telegram @Shopping_Operations</span></div>
          </div>
        )}
        <p style={{fontSize:10,color:'#ccc',marginTop:12}}>{t('legal.lastUpdated')}: 2026-07-10</p>
      </div>
    );
  };

  return (
    <div style={{background:'#f2f2f7',minHeight:'100vh',maxWidth:430,margin:'0 auto',paddingBottom:80}}>
      {/* Header */}
      <div style={{background:'#0f0f0f',padding:'8px 16px 12px',display:'flex',alignItems:'center',gap:12,color:'#fff'}}>
        <button onClick={() => navigate('/mine')} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#fff'}}>←</button>
        <span style={{fontSize:14,fontWeight:700}}>{t('legal.title')}</span>
      </div>

      {/* Tabs */}
      <div style={{background:'#fff',borderBottom:'1px solid #f0f0f0',display:'flex',overflowX:'auto',padding:'0 4px'}}>
        {tabs.map(({ id, icon, key }) => (
          <button key={id} onClick={() => setActive(id)} style={{
            display:'flex',alignItems:'center',gap:5,padding:'10px 14px',fontSize:12,whiteSpace:'nowrap',
            border:'none',background:'none',cursor:'pointer',
            color: active === id ? '#FF5000' : '#999',
            fontWeight: active === id ? 700 : 500,
            borderBottom: active === id ? '2px solid #FF5000' : '2px solid transparent',
            transition:'all .2s'
          }}>
            {icon} {t(key)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{padding:16}}>
        {renderContent(active)}
      </div>
    </div>
  );
}
