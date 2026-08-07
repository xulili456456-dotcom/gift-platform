import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { referralApi } from '../api/referral';
import toast from 'react-hot-toast';

export default function InvitePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [inviteData, setInviteData] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    try {
      const [codeRes, statsRes] = await Promise.all([referralApi.getCode(), referralApi.getStats()]);
      setInviteData(codeRes.data); setStats(statsRes.data);
    } catch { toast.error(t('common.loadingFailed')); }
    finally { setLoading(false); }
  };

  const copyToClipboard = async (text, label) => {
    try { await navigator.clipboard.writeText(text); toast.success(label); }
    catch { toast.error(t('common.operationFailed')); }
  };

  const shareLink = inviteData?.share_link || '';
  const referralCode = inviteData?.referral_code || '';

  if (loading) return (
    <div style={{maxWidth:430,margin:'0 auto',minHeight:'100vh',background:'#f2f2f7'}}>
      <div style={{background:'#0f0f0f',height:60}} />
      <div style={{padding:16}}>
        <div className="skeleton h-32 rounded-2xl mb-3" />
        <div className="skeleton h-40 rounded-2xl" />
      </div>
    </div>
  );

  return (
    <div style={{background:'#f2f2f7',minHeight:'100vh',maxWidth:430,margin:'0 auto',paddingBottom:80}}>
      {/* Header */}
      <div style={{background:'#0f0f0f',padding:'8px 16px 12px',display:'flex',alignItems:'center',gap:12,color:'#fff'}}>
        <button onClick={() => navigate('/mine/team')} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#fff'}}>←</button>
        <span style={{fontSize:14,fontWeight:700}}>Share Invite</span>
      </div>

      <div style={{padding:16,display:'flex',flexDirection:'column',gap:14}}>
        {/* Stats */}
        <div style={{background:'linear-gradient(135deg,#FF5000,#E04500)',borderRadius:16,padding:20,color:'#fff',textAlign:'center'}}>
          <div style={{fontSize:11,opacity:.7}}>Invited Friends</div>
          <div style={{fontSize:40,fontWeight:800}}>{stats?.direct_count || 0}</div>
          <div style={{fontSize:10,opacity:.6,marginTop:4}}>Effective: {stats?.effective_invites || 0} · Total: {stats?.total_invites || 0}</div>
        </div>

        {/* Share Link */}
        <div style={{background:'#fff',borderRadius:16,padding:16,border:'1px solid #e8e8ed'}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>🔗 Share Link</div>
          <div style={{background:'#f5f5f7',borderRadius:10,padding:12,fontSize:11,color:'#6e6e73',wordBreak:'break-all',marginBottom:10}}>{shareLink}</div>
          <button onClick={() => copyToClipboard(shareLink, 'Link copied')}
            style={{width:'100%',padding:12,background:'#FF5000',color:'#fff',border:'none',borderRadius:12,fontSize:13,fontWeight:600,cursor:'pointer'}}>
            📋 Copy Share Link
          </button>
        </div>

        {/* Invite Code */}
        <div style={{background:'#fff',borderRadius:16,padding:16,border:'1px solid #e8e8ed'}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>🔑 Your Invite Code</div>
          <div style={{display:'flex',gap:8}}>
            <div style={{flex:1,background:'#f5f5f7',borderRadius:10,padding:12,textAlign:'center',fontSize:20,fontWeight:800,color:'#FF5000',letterSpacing:2}}>{referralCode}</div>
            <button onClick={() => copyToClipboard(referralCode, 'Code copied')}
              style={{padding:'10px 16px',background:'#FF5000',color:'#fff',border:'none',borderRadius:10,fontSize:12,fontWeight:600,cursor:'pointer'}}>Copy</button>
          </div>
        </div>

        {/* Tips */}
        <div style={{background:'#FFF5F0',borderRadius:14,padding:14,fontSize:11,color:'#FF5000',lineHeight:1.6}}>
          <div style={{fontWeight:700,marginBottom:4}}>💡 How to earn</div>
          <div>1. Share your link or code to friends</div>
          <div>2. They register and start trading</div>
          <div>3. You earn up to 3 levels of commission (1% / 0.5% / 0.25%)</div>
        </div>
      </div>
    </div>
  );
}
