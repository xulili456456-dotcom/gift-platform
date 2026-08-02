import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { giftsApi } from '../api/gifts';
import { referralApi } from '../api/referral';
import { claimsApi } from '../api/claims';
import client from '../api/client';
import toast from 'react-hot-toast';

export default function HomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [gifts, setGifts] = useState([]);
  const [stats, setStats] = useState(null);
  const [claims, setClaims] = useState([]);
  const [balance, setBalance] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [todayEarned, setTodayEarned] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); const t = setInterval(loadBalance, 15000); return () => clearInterval(t); }, []);
  const loadBalance = async () => {
    try {
      const { data } = await client.get('/store/earnings-stats');
      setBalance(data.balance || 0);
      setTotalEarned(data.totalProfit || 0);
      setTodayEarned(data.todayProfit || 0);
    } catch {}
  };
  const loadAll = async () => {
    try {
      const [g, s, c, b] = await Promise.all([
        giftsApi.list(), referralApi.getStats(), claimsApi.list(),
        client.get('/store/earnings-stats').catch(() => ({ data: { balance: 0, totalProfit: 0, todayProfit: 0 } }))
      ]);
      setGifts(g.data); setStats(s.data); setClaims(c.data);
      setBalance(b.data?.balance || 0);
      setTotalEarned(b.data?.totalProfit || 0);
      setTodayEarned(b.data?.todayProfit || 0);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const effective = stats?.effective_invites || 0;
  const totalInvites = stats?.total_invites || 0;
  const referralCode = stats?.referral_code || (user && user.referral_code) || '------';

  const goDeposit = useCallback(() => { navigate('/mine/deposit'); }, [navigate]);
  const copyCode = () => {
    if (!referralCode || referralCode === '------') { toast.error('No invite code'); return; }
    navigator.clipboard.writeText(referralCode).then(() => toast.success('Code copied')).catch(() => toast.error('Failed to copy'));
  };

  if (loading) return (
    <div style={{maxWidth:430,margin:'0 auto',padding:16,background:'#f2f2f7',minHeight:'100vh'}}>
      <div style={{background:'#fff',borderRadius:14,height:60,marginBottom:12}} />
      <div style={{background:'#fff',borderRadius:14,height:80,marginBottom:12}} />
      <div style={{background:'#fff',borderRadius:14,height:200,marginBottom:12}} />
    </div>
  );

  return (
    <div style={{background:'#f2f2f7',minHeight:'100vh',maxWidth:430,margin:'0 auto',paddingBottom:80}}>

      {/* ===== HEADER ===== */}
      <div style={{background:'#0f0f0f',padding:'12px 16px 16px',color:'#fff'}}>
        <div style={{display:'flex',alignItems:'center',marginBottom:12}}>
          <div style={{width:36,height:36,borderRadius:18,background:'#FF5000',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:14,flexShrink:0,marginRight:10}}>
            {(user?.name || user?.email || '?')[0].toUpperCase()}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,color:'#aaa'}}>Total Balance</div>
            <div style={{fontSize:22,fontWeight:800}}>${balance.toFixed(2)}</div>
          </div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <div onClick={() => navigate('/mine/wallet')} style={{flex:1,background:'#1a1a1a',borderRadius:10,padding:8,textAlign:'center',cursor:'pointer'}}>
            <div style={{fontSize:14,fontWeight:700,color:'#FF5000'}}>${totalEarned.toFixed(0)}</div>
            <div style={{fontSize:9,color:'#888'}}>Total Earned</div>
          </div>
          <div onClick={() => navigate('/store/funds')} style={{flex:1,background:'#1a1a1a',borderRadius:10,padding:8,textAlign:'center',cursor:'pointer'}}>
            <div style={{fontSize:14,fontWeight:700,color:'#fff'}}>7</div>
            <div style={{fontSize:9,color:'#888'}}>Active Orders</div>
          </div>
          <div onClick={() => navigate('/mine/team')} style={{flex:1,background:'#1a1a1a',borderRadius:10,padding:8,textAlign:'center',cursor:'pointer'}}>
            <div style={{fontSize:14,fontWeight:700,color:'#FF5000'}}>{totalInvites || 0}</div>
            <div style={{fontSize:9,color:'#888'}}>Team Members</div>
          </div>
        </div>
      </div>

      {/* ===== TODAY OVERVIEW ===== */}
      <div style={{margin:'12px 12px 0',background:'linear-gradient(135deg,#FFF5F0,#FFEBE0)',borderRadius:14,padding:14}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
          <span style={{fontSize:11,color:'#999'}}>Today's Performance</span>
          <span style={{fontSize:10,color:'#bbb'}}>{new Date().toLocaleDateString()}</span>
        </div>
        <div style={{display:'flex',gap:12}}>
          <div style={{flex:1}}>
            <div style={{fontSize:9,color:'#bbb',marginBottom:2}}>Total Earned (all time)</div>
            <div style={{fontSize:20,fontWeight:800,color:'#00A86B'}}>${totalEarned.toFixed(2)}</div>
            <div style={{fontSize:9,color:'#999'}}>all time</div>
          </div>
          <div style={{flex:1,textAlign:'center'}}>
            <div style={{fontSize:9,color:'#bbb',marginBottom:2}}>Effective Invites</div>
            <div style={{fontSize:20,fontWeight:800,color:'#0f0f0f'}}>{effective}</div>
            <div style={{fontSize:9,color:'#999'}}>{totalInvites} total</div>
          </div>
          <div style={{flex:1,textAlign:'right'}}>
            <div style={{fontSize:9,color:'#bbb',marginBottom:2}}>Gifts Available</div>
            <div style={{fontSize:20,fontWeight:800,color:'#FF5000'}}>{gifts.length}</div>
            <div style={{fontSize:9,color:'#999'}}>to claim</div>
          </div>
        </div>
      </div>

      <div style={{padding:'0 16px'}}>
        {/* ===== QUICK ACTIONS ===== */}
        <div style={{display:'flex',gap:8,margin:'16px 0'}}>
          <button onClick={() => navigate('/store')} style={{flex:1,padding:12,background:'#FF5000',color:'#fff',border:'none',borderRadius:14,fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
            <span>🛒</span> Browse Store
          </button>
          <button onClick={() => navigate('/mine/deposit')} style={{flex:1,padding:12,background:'#00A86B',color:'#fff',border:'none',borderRadius:14,fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
            <span>💰</span> Deposit
          </button>
          <button onClick={() => navigate('/mine/withdraw')} style={{flex:1,padding:12,background:'#0f0f0f',color:'#fff',border:'none',borderRadius:14,fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
            <span>💸</span> Withdraw
          </button>
        </div>

        {/* ===== ACTIVE HOLDINGS ===== */}
        <div style={{marginBottom:16}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <div style={{fontSize:13,fontWeight:700,color:'#0f0f0f'}}>📊 Active Holdings</div>
            <span onClick={() => navigate('/store')} style={{fontSize:11,color:'#FF5000',fontWeight:600,cursor:'pointer'}}>Browse Store ›</span>
          </div>
          <div style={{textAlign:'center',padding:24,background:'#fff',borderRadius:14}}>
            <div style={{fontSize:28,marginBottom:8}}>🛒</div>
            <div style={{fontSize:12,color:'#999',marginBottom:8}}>No active holdings yet</div>
            <button onClick={() => navigate('/store')} style={{padding:'8px 20px',background:'#FF5000',color:'#fff',border:'none',borderRadius:10,fontSize:12,fontWeight:600,cursor:'pointer'}}>Start Trading</button>
          </div>
        </div>

        {/* ===== INVITE BANNER ===== */}
        <div style={{background:'linear-gradient(135deg,#FF5000,#E04500)',borderRadius:14,padding:16,marginBottom:12,color:'#fff'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{fontSize:32}}>🎁</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,marginBottom:2}}>Invite Friends & Earn</div>
              <div style={{fontSize:10,opacity:.85}}>Up to 3 levels · 1.0% / 0.5% / 0.25% commission</div>
            </div>
            <button onClick={() => navigate('/mine/team')} style={{padding:'10px 16px',background:'#fff',color:'#FF5000',border:'none',borderRadius:10,fontSize:12,fontWeight:700,cursor:'pointer'}}>Invite ›</button>
          </div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:12,background:'rgba(0,0,0,.15)',borderRadius:10,padding:'10px 12px'}}>
            <div>
              <div style={{fontSize:9,opacity:.6,marginBottom:1}}>Your Invite Code</div>
              <div style={{fontSize:18,fontWeight:800,letterSpacing:2}}>{referralCode}</div>
            </div>
            <button onClick={copyCode} style={{padding:'6px 14px',background:'rgba(255,255,255,.2)',color:'#fff',border:'none',borderRadius:8,fontSize:11,fontWeight:600,cursor:'pointer'}}>Copy Code</button>
          </div>
        </div>

        {/* ===== BOTTOM CARDS ===== */}
        <div style={{display:'flex',gap:8,marginBottom:16}}>
          <div onClick={() => navigate('/mine/team')} style={{flex:1,background:'#fff',borderRadius:14,padding:14,cursor:'pointer'}}>
            <div style={{fontSize:20,marginBottom:6}}>👥</div>
            <div style={{fontSize:12,fontWeight:700,color:'#333'}}>My Team</div>
            <div style={{fontSize:10,color:'#999',marginTop:2}}>{totalInvites} members</div>
            <div style={{fontSize:12,fontWeight:700,color:'#FF5000',marginTop:4}}>+${((totalInvites||0)*5).toFixed(0)} earned</div>
          </div>
          <div onClick={() => navigate('/mine/verify')} style={{flex:1,background:'#fff',borderRadius:14,padding:14,cursor:'pointer'}}>
            <div style={{fontSize:20,marginBottom:6}}>✅</div>
            <div style={{fontSize:12,fontWeight:700,color:'#333'}}>Verifications</div>
            <div style={{fontSize:10,color:'#999',marginTop:2}}>{effective} proofs</div>
            <div style={{fontSize:12,fontWeight:700,color:'#F59E0B',marginTop:4}}>{effective} pending</div>
          </div>
        </div>
      </div>
    </div>
  );
}
