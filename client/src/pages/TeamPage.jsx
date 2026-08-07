import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { referralApi } from '../api/referral';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

export default function TeamPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const authUser = useAuthStore(s => s.user);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    referralApi.getStats().then(({ data }) => setStats(data)).catch(() => toast.error('Failed to load team stats')).finally(() => setLoading(false));
    referralApi.getCode().then(({ data }) => setShareLink(data?.share_link || '')).catch(() => {});
  }, []);

  if (loading) return <div className="min-h-screen bg-gray-50 p-4"><div className="skeleton h-40 rounded-2xl" /></div>;

  const breakdown = stats?.breakdown || { level1: 0, level2: 0, level3: 0 };
  const effective = stats?.effective_invites || 0;
  const allInvitees = stats?.recent_invitees || [];
  const totalInvites = stats?.total_invites || 0;
  const directCount = stats?.direct_count || 0;
  const totalCommission = (directCount * 1.0 + breakdown.level2 * 0.5 + breakdown.level3 * 0.25) * 10; // estimate

  const PER_PAGE = 20;
  const filtered = allInvitees.filter(inv => {
    if (filterLevel > 0 && inv.level !== filterLevel) return false;
    if (searchTerm && !(inv.name || inv.email || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const referralCode = stats?.referral_code || (authUser && authUser.referral_code) || '';

  const copyCode = () => {
    if (!referralCode) {
      toast.error('No invite code available. Please try again later.');
      return;
    }
    navigator.clipboard.writeText(referralCode).then(() => toast.success('Code copied')).catch(() => toast.error('Failed to copy'));
  };

  return (
    <div style={{background:'#f2f2f7',minHeight:'100vh',maxWidth:430,margin:'0 auto',paddingBottom:80}}>
      <div style={{background:'#0f0f0f',padding:'8px 16px 12px',display:'flex',alignItems:'center',gap:12,color:'#fff'}}>
        <button onClick={() => navigate('/mine')} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#fff'}}>←</button>
        <span style={{fontSize:14,fontWeight:700}}>{t('mine.myTeam')}</span>
      </div>
      <div style={{padding:16}}>
        {/* Stats */}
        <div style={{background:'#fff',borderRadius:20,padding:18,marginBottom:12}}>
          <div style={{display:'flex',justifyContent:'space-around',textAlign:'center'}}>
            <div><div style={{fontSize:28,fontWeight:800,color:'#0f0f0f'}}>{directCount}</div><div style={{fontSize:10,color:'#999',marginTop:2}}>Direct</div></div>
            <div style={{borderLeft:'1px solid #f0f0f0'}}></div>
            <div><div style={{fontSize:28,fontWeight:800,color:'#FF5000'}}>{effective}</div><div style={{fontSize:10,color:'#999',marginTop:2}}>Effective</div></div>
            <div style={{borderLeft:'1px solid #f0f0f0'}}></div>
            <div><div style={{fontSize:28,fontWeight:800,color:'#00A86B'}}>${totalCommission.toFixed(0)}</div><div style={{fontSize:10,color:'#999',marginTop:2}}>Commission</div></div>
          </div>
        </div>

        {/* How it works */}
        <div style={{background:'#FFF5F0',borderRadius:14,padding:14,marginBottom:12,fontSize:11,color:'#FF5000',lineHeight:1.6}}>
          <div style={{fontWeight:700,marginBottom:4}}>How You Earn</div>
          When someone registers with your invite code, they become your Level 1 referral. You earn a percentage of their trading activity. Their referrals become your Level 2 and Level 3.
        </div>

        {/* Commission Tiers */}
        <div style={{background:'#fff',borderRadius:20,padding:18,marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:700,color:'#0f0f0f',marginBottom:10}}>Commission Rates</div>
          <div style={{display:'flex',gap:8}}>
            {[{l:'Level 1',r:'1.0%',c:'#FF5000',d:'Direct',v:breakdown.level1},{l:'Level 2',r:'0.5%',c:'#F59E0B',d:'Sub-team',v:breakdown.level2},{l:'Level 3',r:'0.25%',c:'#8B5CF6',d:'Sub-sub',v:breakdown.level3}].map(x=>(
              <div key={x.l} style={{flex:1,background:'#f8f8f8',borderRadius:12,padding:12,textAlign:'center'}}>
                <div style={{fontSize:10,color:'#999',marginBottom:4}}>{x.l}</div>
                <div style={{fontSize:22,fontWeight:800,color:x.c}}>{x.r}</div>
                <div style={{fontSize:9,color:'#999'}}>{x.v} members</div>
              </div>
            ))}
          </div>
        </div>

        {/* Example */}
        <div style={{background:'#fff',borderRadius:20,padding:18,marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:700,color:'#0f0f0f',marginBottom:8}}>Example</div>
          <div style={{fontSize:11,color:'#999',lineHeight:1.6}}>
            <div style={{marginBottom:4}}>You → John trades $10K → <span style={{color:'#00A86B',fontWeight:700}}>You earn $100</span> (1%)</div>
            <div style={{marginBottom:4}}>You → John → Maria trades $5K → <span style={{color:'#00A86B',fontWeight:700}}>You earn $25</span> (0.5%)</div>
            <div>You → John → Maria → Alex trades $2K → <span style={{color:'#00A86B',fontWeight:700}}>You earn $5</span> (0.25%)</div>
          </div>
        </div>

        {/* Members */}
        <div style={{background:'#fff',borderRadius:20,overflow:'hidden',marginBottom:12}}>
          <div style={{padding:'14px 16px',borderBottom:'1px solid #f5f5f5'}}>
            <div style={{fontSize:12,fontWeight:700,color:'#0f0f0f',marginBottom:10}}>Team Members <span style={{fontSize:10,color:'#999',fontWeight:400}}>{totalInvites} members</span></div>
            <input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Search members..." style={{width:'100%',padding:'8px 12px',background:'#f5f5f5',border:'none',borderRadius:10,fontSize:12,outline:'none',marginBottom:8}} />
            <div style={{display:'flex',gap:6}}>
              {[0,1,2,3].map(v=><span key={v} onClick={()=>setFilterLevel(v)} style={{padding:'4px 12px',borderRadius:10,fontSize:10,fontWeight:filterLevel===v?600:500,background:filterLevel===v?'#0f0f0f':'#f5f5f5',color:filterLevel===v?'#fff':'#999',cursor:'pointer'}}>{v===0?'All':`Lv.${v}`}</span>)}
            </div>
          </div>
          {filtered.length > 0 ? (
            filtered.slice((page-1)*PER_PAGE, page*PER_PAGE).map(inv => {
              const colors = {1:{bg:'#0f0f0f',color:'#fff'},2:{bg:'#4C6EF5',color:'#fff'},3:{bg:'#F59E0B',color:'#fff'}};
              const c = colors[inv.level] || colors[1];
              return (
                <div key={inv.id} style={{padding:'12px 16px',display:'flex',alignItems:'center',gap:12,borderBottom:'1px solid #f5f5f5'}}>
                  <div style={{width:36,height:36,borderRadius:18,background:c.bg,display:'flex',alignItems:'center',justifyContent:'center',color:c.color,fontSize:14,fontWeight:700}}>{(inv.name||inv.email||'?')[0].toUpperCase()}</div>
                  <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{inv.name||inv.email}</div><div style={{fontSize:10,color:'#999'}}>Lv.{inv.level} · Joined {String(inv.invited_at||'').slice(0,10)}</div></div>
                  <span style={{color:'#00A86B',fontSize:12,fontWeight:600}}>+{inv.level===1?'1.0':inv.level===2?'0.5':'0.25'}%</span>
                </div>
              );
            })
          ) : (
            <div style={{textAlign:'center',padding:40,color:'#999',fontSize:13}}>No members found</div>
          )}
        </div>

        {/* Notice */}
        <div style={{background:'#f8f8f8',borderRadius:14,padding:12,marginBottom:12,fontSize:10,color:'#999',lineHeight:1.5}}>
          <div style={{fontWeight:600,color:'#666',marginBottom:2}}>Important</div>
          Commission is calculated based on your team's actual trading activity. Rates and rules may be adjusted by the platform. Any fraudulent behavior will result in account suspension.
        </div>

        {/* Invite Code */}
        <div style={{background:'#fff',borderRadius:20,padding:18,textAlign:'center'}}>
          <div style={{fontSize:12,fontWeight:700,color:'#0f0f0f',marginBottom:4}}>Your Invite Code</div>
          <div style={{fontSize:28,fontWeight:800,color:'#FF5000',letterSpacing:2,marginBottom:8}}>{referralCode||'------'}</div>
          <button onClick={copyCode} style={{width:'100%',padding:10,background:'#FF5000',color:'#fff',border:'none',borderRadius:12,fontSize:13,fontWeight:600,cursor:'pointer'}}>Copy Invite Code</button>
          <button onClick={() => { navigator.clipboard.writeText(shareLink); toast.success('Link copied!'); }} style={{width:'100%',padding:10,marginTop:8,background:'#fff',color:'#FF5000',border:'1px solid #FF5000',borderRadius:12,fontSize:13,fontWeight:600,cursor:'pointer'}}>📎 Copy Share Link</button>
        </div>
      </div>
    </div>
  );
}
