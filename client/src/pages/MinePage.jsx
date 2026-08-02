import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { claimsApi } from '../api/claims';
import { giftsApi } from '../api/gifts';
import { referralApi } from '../api/referral';
import client from '../api/client';
import useAuthStore from '../store/authStore';
import { Users, CreditCard, Bell, Globe, Lock, Shield, ChevronRight, Info, ArrowUpRight, MessageCircle, Camera, Store, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

const langs = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ms', label: 'Bahasa Melayu', flag: '🇲🇾' },
];

export default function MinePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [claims, setClaims] = useState([]);
  const [eligibleGifts, setEligibleGifts] = useState([]);
  const [effectiveInvites, setEffectiveInvites] = useState(0);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLang, setShowLang] = useState(false);
  const [claimingGift, setClaimingGift] = useState(null);
  const [showClaimConfirm, setShowClaimConfirm] = useState(null);
  const [taskBalance, setTaskBalance] = useState(0);

  useEffect(() => { loadData(); window.addEventListener('taskEarning', loadData); return () => window.removeEventListener('taskEarning', loadData); }, []);
  const loadData = async () => {
    try {
      const [c, g, s, b] = await Promise.all([claimsApi.list(), giftsApi.eligible(), referralApi.getStats(), client.get('/tasks/balance').catch(() => ({ data: { total: 0 } }))]);
      setClaims(c.data); setEligibleGifts(g.data?.eligible || []); setEffectiveInvites(g.data?.effective_invites || 0); setStats(s.data); setTaskBalance(b.data?.available || b.data?.total || 0);
    } catch { toast.error(t('common.loadingFailed')); }
    finally { setLoading(false); }
  };

  const tgName = (name) => { const gd = i18n.getResource(i18n.language, 'translation', 'giftData'); return (gd && gd[name]) ? gd[name].name : name; };
  const handleClaim = async (gift) => { setClaimingGift(gift.id); try { await claimsApi.create(gift.id); toast.success(t('claim.submitOk')); setShowClaimConfirm(null); loadData(); } catch (err) { toast.error(err.response?.data?.error || t('claim.submitFail')); } finally { setClaimingGift(null); } };
  const handleLogout = () => { if (confirm(t('mine.logoutConfirm'))) { logout(); navigate('/login', { replace: true }); } };

  if (loading) return (<div className="p-4 space-y-3"><div className="skeleton h-32 rounded-3xl" /><div className="skeleton h-48 rounded-2xl" /></div>);

  const totalEarned = taskBalance;
  const pendingClaims = claims.filter(c => c.status === 'pending');
  const deliveredClaims = claims.filter(c => c.status === 'delivered');
  const current = langs.find(l => l.code === i18n.language) || langs[0];

  const MenuRow = ({ icon, iconBg, label, desc, right, onClick }) => (
    <div onClick={onClick} style={{display:'flex',alignItems:'center',padding:'13px 16px',gap:11,background:'#fff',borderBottom:'1px solid #f5f5f5',cursor:'pointer'}}>
      <div style={{width:36,height:36,borderRadius:9,background:iconBg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{icon}</div>
      <div style={{flex:1}}><div style={{fontSize:14,fontWeight:500}}>{label}</div>{desc ? <div style={{fontSize:10,color:'#999'}}>{desc}</div> : null}</div>
      {right || <ChevronRight size={16} color="#ccc" />}
    </div>
  );

  return (
    <div style={{background:'#f2f2f7',minHeight:'100vh',paddingBottom:80,maxWidth:430,margin:'0 auto'}}>
      {/* Profile Header */}
      <div style={{padding:'44px 20px 24px',background:'#fff'}}>
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:52,height:52,borderRadius:14,background:'#0f0f0f',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:20,fontWeight:700}}>{(user?.name||user?.email||'?')[0].toUpperCase()}</div>
          <div><div style={{fontSize:16,fontWeight:700,color:'#111'}}>{user?.name||user?.email}</div><div style={{fontSize:11,color:'#999'}}>UID {user?.referral_code||user?.id}</div></div>
        </div>
        <div style={{display:'flex',gap:0,marginTop:14,background:'#f5f5f5',borderRadius:12,overflow:'hidden'}}>
          {[{v:stats?.direct_count||0,l:t('mine.directInvites')},{v:effectiveInvites,l:t('mine.effectiveInvites')},{v:pendingClaims.length,l:t('claim.pending')},{v:deliveredClaims.length,l:t('claim.delivered')}].map((x,i)=><div key={i} style={{flex:1,textAlign:'center',padding:10,borderLeft:i>0?'1px solid #eee':'none'}}><div style={{fontSize:17,fontWeight:700,color:'#111'}}>{x.v}</div><div style={{fontSize:10,color:'#999'}}>{x.l}</div></div>)}
        </div>
      </div>

      <div style={{height:8}}></div>

      {/* Claimable Gifts */}
      {eligibleGifts.length > 0 && (<div style={{margin:'0 16px 8px',background:'#fff',borderRadius:14,overflow:'hidden'}}>
        <div style={{padding:'12px 16px',background:'#f8f8f8',fontSize:13,fontWeight:600,borderBottom:'1px solid #f0f0f0'}}>🎁 {t('claim.available')} <span style={{background:'#FF5000',color:'#fff',borderRadius:10,padding:'1px 8px',fontSize:10,marginLeft:4}}>{eligibleGifts.length}</span></div>
        {eligibleGifts.map(g=><div key={g.id} style={{padding:'12px 16px',display:'flex',alignItems:'center',gap:10,borderBottom:'1px solid #f5f5f5'}}><span style={{fontSize:22}}>🧧</span><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{tgName(g.name)}</div><div style={{fontSize:11,color:'#999'}}>{t('claim.effectiveCount')}: {effectiveInvites}/{g.required_invites}</div></div><button onClick={()=>setShowClaimConfirm(g)} style={{background:'#FF5000',color:'#fff',border:'none',borderRadius:10,padding:'6px 14px',fontSize:11,fontWeight:700}}>${g.value} {t('gifts.claimNow')}</button></div>)}
      </div>)}

      {/* Pending Claims */}
      {pendingClaims.length > 0 && (<div style={{margin:'0 16px 8px',background:'#fff',borderRadius:14,overflow:'hidden'}}>
        <div style={{padding:'12px 16px',background:'#f8f8f8',fontSize:13,fontWeight:600,borderBottom:'1px solid #f0f0f0'}}>⏳ {t('claim.pending')} <span style={{background:'#F59E0B',color:'#fff',borderRadius:10,padding:'1px 8px',fontSize:10,marginLeft:4}}>{pendingClaims.length}</span></div>
        {pendingClaims.map(c=><div key={c.id} style={{padding:'12px 16px',display:'flex',alignItems:'center',gap:10,borderBottom:'1px solid #f5f5f5'}}><span style={{fontSize:22}}>🧧</span><div style={{flex:1}}><div style={{fontSize:13,fontWeight:500}}>{tgName(c.gift_name)}</div><div style={{fontSize:11,color:'#999'}}>{(c.claimed_at||'').slice(0,10)}</div></div><span style={{fontSize:13,fontWeight:700,color:'#FF5000'}}>${c.value}</span></div>)}
      </div>)}

      {/* Finance Group */}
      <div style={{margin:'0 16px 8px',background:'#fff',borderRadius:14,overflow:'hidden'}}>
        <MenuRow icon={<ArrowUpRight size={17} color="#00A86B"/>} iconBg="#E8F5E9" label={t('withdraw.title')} desc={`${t('withdraw.balance')}: $${totalEarned.toFixed(2)}`} onClick={()=>navigate('/mine/withdraw')}/>
        <MenuRow icon={<CreditCard size={17} color="#FF5000"/>} iconBg="#FFF5F0" label="Deposit" desc="Deposit USDT to your account" onClick={()=>navigate('/mine/deposit')}/>
      </div>

      {/* Business Group */}
      <div style={{margin:'0 16px 8px',background:'#fff',borderRadius:14,overflow:'hidden'}}>
        <MenuRow icon={<Users size={17} color="#4C6EF5"/>} iconBg="#EEF2FF" label={t('mine.myTeam')} desc={t('mine.myTeamDesc')} onClick={()=>navigate('/mine/team')}/>
        <MenuRow icon={<Store size={17} color="#FF5000"/>} iconBg="#FFF5F0" label={t('mine.myStore')} desc={t('mine.myStoreDesc')} onClick={()=>navigate('/store')}/>
        <MenuRow icon={<ArrowUpRight size={17} color="#00A86B"/>} iconBg="#E8F5E9" label="Trading History" desc="View your orders & holdings" onClick={()=>navigate('/store/funds')}/>
        <MenuRow icon={<FileText size={17} color="#845EF7"/>} iconBg="#F3F0FF" label="Transaction History" desc="All money in & out" onClick={()=>navigate('/mine/transactions')}/>
      </div>

      {/* Account Group */}
      <div style={{margin:'0 16px 8px',background:'#fff',borderRadius:14,overflow:'hidden'}}>
        <MenuRow icon={<Shield size={17} color="#2196F3"/>} iconBg="#E3F2FD" label={t('kyc.title')} desc={t('kyc.unverifiedDesc')} onClick={()=>navigate('/mine/kyc')}/>
        <MenuRow icon={<Bell size={17} color="#EF4444"/>} iconBg="#FFF0F0" label="Notification Center" desc="View system notifications" onClick={()=>navigate('/mine/notifications')}/>
        <MenuRow icon={<Camera size={17} color="#FF5000"/>} iconBg="#FFF5F0" label={t('verify.title')} desc={t('verify.howTo')} onClick={()=>navigate('/mine/verify')}/>
        <div onClick={()=>setShowLang(!showLang)} style={{display:'flex',alignItems:'center',padding:'13px 16px',gap:11,background:'#fff',borderBottom:'1px solid #f5f5f5',cursor:'pointer'}}>
          <div style={{width:36,height:36,borderRadius:9,background:'#f5f5f5',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Globe size={17} color="#999"/></div>
          <div style={{flex:1}}><div style={{fontSize:14,fontWeight:500}}>{t('common.language')}</div><div style={{fontSize:10,color:'#999'}}>{current.flag} {current.label}</div></div>
          <ChevronRight size={16} color="#ccc" style={{transform:showLang?'rotate(90deg)':'none',transition:'transform .2s'}}/>
        </div>
        {showLang && <div style={{padding:8,display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:6}}>{langs.map(l=><button key={l.code} onClick={()=>{i18n.changeLanguage(l.code);localStorage.setItem('lang',l.code);setShowLang(false)}} style={{padding:'10px 4px',borderRadius:10,border:'none',background:i18n.language===l.code?'#FFF5F0':'#f5f5f5',color:i18n.language===l.code?'#FF5000':'#666',fontSize:11,fontWeight:i18n.language===l.code?600:400,cursor:'pointer'}}><span style={{fontSize:20,display:'block',marginBottom:2}}>{l.flag}</span>{l.label}</button>)}</div>}
        <MenuRow icon={<Lock size={17} color="#999"/>} iconBg="#f5f5f5" label={t('security.title')} desc={t('security.subtitle')} onClick={()=>navigate('/mine/security')}/>
      </div>

      {/* Support Group */}
      <div style={{margin:'0 16px 8px',background:'#fff',borderRadius:14,overflow:'hidden'}}>
        <MenuRow icon={<MessageCircle size={17} color="#00A86B"/>} iconBg="#E8F5E9" label={t('support.title')} desc={t('support.online')} onClick={()=>navigate('/mine/support')} right={<><span style={{fontSize:10,color:'#00A86B',fontWeight:600,marginRight:4}}>ONLINE</span><ChevronRight size={16} color="#ccc"/></>}/>
        <MenuRow icon={<Info size={17} color="#999"/>} iconBg="#f5f5f5" label={t('legal.title')} desc={`${t('legal.terms')} · ${t('legal.privacy')} · ${t('legal.about')}`} onClick={()=>navigate('/mine/legal')}/>
      </div>

      {/* Admin */}
      {user?.is_admin == true && (<div style={{margin:'0 16px 8px',background:'#fff',borderRadius:14,overflow:'hidden'}}><MenuRow icon={<Shield size={17} color="#FF5000"/>} iconBg="#FFF5F0" label={t('mine.adminPanel')} desc={t('mine.adminDesc')} onClick={()=>navigate('/admin')}/></div>)}

      {/* Logout */}
      <div onClick={handleLogout} style={{margin:'0 16px 20px',background:'#fff',borderRadius:14,padding:'13px',textAlign:'center',color:'#CC0C39',fontSize:14,fontWeight:500,cursor:'pointer'}}>Logout</div>

      {/* Claim Confirm Modal */}
      {showClaimConfirm && (<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowClaimConfirm(null)}>
        <div style={{background:'#fff',borderRadius:16,padding:24,width:'100%',maxWidth:320,textAlign:'center'}} onClick={e=>e.stopPropagation()}>
          <div style={{fontSize:40,marginBottom:8}}>🎁</div><div style={{fontSize:16,fontWeight:700,marginBottom:4}}>{tgName(showClaimConfirm.name)}</div><div style={{fontSize:24,fontWeight:800,color:'#FF5000',marginBottom:12}}>${showClaimConfirm.value}</div>
          <button onClick={()=>handleClaim(showClaimConfirm)} disabled={claimingGift===showClaimConfirm.id} style={{width:'100%',padding:12,background:'#FF5000',color:'#fff',border:'none',borderRadius:12,fontSize:15,fontWeight:700,cursor:'pointer'}}>{claimingGift===showClaimConfirm.id?'Claiming...':'Claim Now'}</button>
          <button onClick={()=>setShowClaimConfirm(null)} style={{width:'100%',padding:10,marginTop:8,background:'none',border:'none',color:'#999',fontSize:13,cursor:'pointer'}}>Cancel</button>
        </div>
      </div>)}
    </div>
  );
}
