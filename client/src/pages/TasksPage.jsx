import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { referralApi } from '../api/referral';
import useAuthStore from '../store/authStore';
import PullToRefresh from '../components/shared/PullToRefresh';
import toast from 'react-hot-toast';

const ACHIEVEMENTS = [
  { icon:'📊', title:'Volume $1K', sub:'$234 / $1,000', pct:23, color:'#FF5000', reward:'+$10', status:'progress' },
  { icon:'💎', title:'Volume $5K', sub:'$234 / $5,000', pct:4, color:'#E04500', reward:'+$50', status:'locked' },
  { icon:'🏆', title:'50 Orders', sub:'23 / 50', pct:46, color:'#F59E0B', reward:'+$15', status:'progress' },
  { icon:'🎯', title:'Profit $100', sub:'$19 / $100', pct:19, color:'#00A86B', reward:'+$20', status:'progress' },
  { icon:'⚡', title:'Speed Demon', sub:'5 orders < 2h', pct:40, color:'#2196F3', reward:'+$8', status:'progress' },
  { icon:'🌈', title:'All Categories', sub:'3/5 done', pct:60, color:'#8B5CF6', reward:'+$6', status:'progress' },
  { icon:'🔄', title:'Repeat Buyer', sub:'Same cat. 5 days', pct:20, color:'#FF9800', reward:'+$5', status:'locked' },
  { icon:'🔥', title:'Profit $10 Daily', sub:'7 days streak', pct:28, color:'#00A86B', reward:'+$12', status:'locked' },
];

const TRADING_TASKS = [
  { icon:'📦', bg:'#FFF5F0', title:'Complete 5 Orders Today', desc:'Finish any 5 product purchases before midnight', progress:'3/5', pct:60, color:'#FF5000', reward:'+$2.50', btn:'Go Trade', link:'/store' },
  { icon:'💎', bg:'#FCE4EC', title:'Place a High-Value Order', desc:'Complete a single order worth $100 or more', progress:'0/1', pct:0, color:'#E04500', reward:'+$5.00', btn:'Go Big', link:'/store' },
  { icon:'⚡', bg:'#FFF8E1', title:'Speed Trade Challenge', desc:'Complete an order within 2 hours of purchase', progress:'0/1', pct:0, color:'#F59E0B', reward:'+$3.00', btn:'Race', link:'/store' },
  { icon:'🌈', bg:'#E3F2FD', title:'Try All Categories', desc:'Trade at least 1 product from each category', cats:'Digital✓ Home✓ Beauty✓ Auto✗ Food✗', pct:60, color:'#2196F3', reward:'+$4.00' },
  { icon:'📈', bg:'#E8F5E9', title:'Profit Streak', desc:'5 consecutive orders all with positive profit', progress:'3/5', pct:60, color:'#00A86B', reward:'+$4.00' },
  { icon:'🔍', bg:'#FFF0F0', title:'Bargain Hunter', desc:'Complete an order under $20 with 15%+ profit margin', progress:'0/1', pct:0, color:'#E04500', reward:'+$2.00' },
  { icon:'🎯', bg:'#FFF8E1', title:'Weekend Warrior', desc:'Complete 5 orders on Saturday or Sunday', tag:'Upcoming', tagBg:'#FFF8E1', tagColor:'#B45309', extra:'Starts in 3 days', color:'#F59E0B', reward:'+$6.00' },
  { icon:'✍️', bg:'#E8F5E9', title:'Write Product Reviews', desc:'Review 3 products you have purchased', limit:'3/day', done:'1/3', pct:33, color:'#FF5000', reward:'+$0.80' },
  { icon:'🔄', bg:'#F3E5F5', title:'Share Your Best Deal', desc:'Share a completed order profit on social media', limit:'2/day', done:'1/2', pct:50, color:'#FF5000', reward:'+$0.30' },
];

const DEPOSIT_TASKS = [
  { icon:'🎉', bg:'#E8F5E9', title:'First Deposit Bonus', desc:'Make your first deposit of $50+', reward:'+$5.00', done:true },
  { icon:'🏦', bg:'#FFF5F0', title:'Deposit Milestone: $500', desc:'Reach $500 total deposits', progress:'$300 / $500', pct:60, color:'#FF5000', reward:'+$3.00' },
  { icon:'💸', bg:'#FFF0F0', title:'First Withdrawal', desc:'Complete KYC and make your first withdrawal', reward:'+$2.00', locked:true },
];

const REFERRAL_TASKS = [
  { icon:'👥', bg:'#FFF5F0', title:'Invite 3 Friends This Week', desc:'Get 3 new people to register with your code', progress:'2/3', pct:66, color:'#FF5000', reward:'+$3.00', btn:'Invite', link:'/mine/team' },
  { icon:'💰', bg:'#E8F5E9', title:'Referral Makes First Trade', desc:'Have a referred friend complete their first order', progress:'1/5 active', pct:20, color:'#00A86B', reward:'+$2.00 each' },
];

export default function TasksPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const authUser = useAuthStore(s => s.user);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState('All');

  useEffect(() => {
    referralApi.getStats().then(({ data }) => setStats(data)).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  const totalEarned = 234.50; // placeholder — would come from tasks API
  const effective = stats?.effective_invites || 0;
  const referralCode = stats?.referral_code || (authUser?.referral_code) || '------';

  const copyCode = () => {
    if (!referralCode || referralCode === '------') { toast.error('No invite code'); return; }
    navigator.clipboard.writeText(referralCode);
    toast.success('Code copied');
  };

  if (loading) return (
    <div style={{maxWidth:430,margin:'0 auto',background:'#f2f2f7',minHeight:'100vh'}}>
      <div style={{background:'#0f0f0f',height:100}} />
      <div style={{padding:16}}><div style={{background:'#fff',borderRadius:14,height:200}} /></div>
    </div>
  );

  return (
    <PullToRefresh onRefresh={() => window.location.reload()}>
    <div style={{background:'#f2f2f7',minHeight:'100vh',maxWidth:430,margin:'0 auto',paddingBottom:80}}>

      {/* ===== HEADER ===== */}
      <div style={{background:'#0f0f0f',padding:'12px 16px 16px',color:'#fff'}}>
        <div style={{fontSize:11,color:'#aaa',marginBottom:2}}>Total Earned</div>
        <div style={{fontSize:28,fontWeight:800}}>${totalEarned.toFixed(2)}</div>
        <div style={{display:'flex',gap:16,marginTop:8,fontSize:10,color:'#aaa'}}>
          <span>📊 $5,328 volume</span>
          <span>📋 3 tasks today</span>
          <span>🏅 5/8 completed</span>
        </div>
      </div>

      {/* ===== TABS ===== */}
      <div style={{background:'#fff',display:'flex',overflowX:'auto',padding:4,borderBottom:'1px solid #f0f0f0',gap:2}}>
        {['All','Trading','Deposit','Referral','Achievement'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:'8px 14px',borderRadius:10,border:'none',cursor:'pointer',fontSize:11,fontWeight:tab===t?700:500,whiteSpace:'nowrap',
            background: tab===t ? '#FF5000' : 'transparent', color: tab===t ? '#fff' : '#999'
          }}>{t}</button>
        ))}
      </div>

      <div style={{padding:16}}>

        {/* ===== TRADING TASKS ===== */}
        {(tab === 'All' || tab === 'Trading') && (
          <>
            <div style={{fontSize:11,fontWeight:700,color:'#bbb',marginBottom:8,textTransform:'uppercase',letterSpacing:'.5px'}}>📦 Trading Tasks</div>
            {TRADING_TASKS.map((t, i) => (
              <div key={i} onClick={() => t.link && navigate(t.link)} style={{background:'#fff',borderRadius:14,padding:14,marginBottom:8,display:'flex',alignItems:'center',gap:12,cursor: t.link?'pointer':'default'}}>
                <div style={{width:44,height:44,borderRadius:12,background:t.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:20}}>{t.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:700,color:'#0f0f0f'}}>{t.title}</div>
                  <div style={{fontSize:10,color:'#999',marginTop:2}}>{t.desc}</div>
                  {t.progress && (
                    <>
                      <div style={{marginTop:6,background:'#f0f0f0',borderRadius:4,height:5,overflow:'hidden'}}><div style={{width:t.pct+'%',height:'100%',background:t.color,borderRadius:4}} /></div>
                      <div style={{fontSize:9,color:'#bbb',marginTop:2}}>{t.progress}</div>
                    </>
                  )}
                  {t.cats && <div style={{display:'flex',gap:4,marginTop:4,fontSize:8}}>{t.cats.split(' ').map((c,i)=><span key={i} style={{padding:'1px 6px',borderRadius:4,background:c.includes('✓')?'#E8F5E9':'#f5f5f5',color:c.includes('✓')?'#00A86B':'#ccc'}}>{c}</span>)}</div>}
                  {t.limit && <div style={{display:'flex',alignItems:'center',gap:6,marginTop:4}}><span style={{fontSize:10,color:'#bbb'}}>Limit: {t.limit}</span><span style={{fontSize:9,background:t.done?.includes('/') && t.done[0]!=='0'?'#E8F5E9':'#f5f5f5',padding:'2px 6px',borderRadius:4,color:t.done?.includes('/') && t.done[0]!=='0'?'#00A86B':'#999'}}>{t.done}</span></div>}
                  {t.tag && <div style={{display:'flex',gap:6,marginTop:4}}><span style={{fontSize:9,background:t.tagBg,color:t.tagColor,padding:'2px 6px',borderRadius:4,fontWeight:600}}>{t.tag}</span><span style={{fontSize:9,color:'#bbb'}}>{t.extra}</span></div>}
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontSize:16,fontWeight:800,color:t.color}}>{t.reward}</div>
                  {t.btn && <button onClick={e=>{e.stopPropagation();t.link&&navigate(t.link)}} style={{marginTop:4,padding:'6px 12px',background:t.color,color:'#fff',border:'none',borderRadius:8,fontSize:10,fontWeight:600,cursor:'pointer'}}>{t.btn}</button>}
                </div>
              </div>
            ))}
          </>
        )}

        {/* ===== DEPOSIT TASKS ===== */}
        {(tab === 'All' || tab === 'Deposit') && (
          <>
            <div style={{fontSize:11,fontWeight:700,color:'#bbb',marginBottom:8,marginTop:12,textTransform:'uppercase',letterSpacing:'.5px'}}>💰 Deposit & Withdraw</div>
            {DEPOSIT_TASKS.map((t, i) => (
              <div key={i} onClick={() => navigate('/mine/deposit')} style={{background:'#fff',borderRadius:14,padding:14,marginBottom:8,display:'flex',alignItems:'center',gap:12,cursor:'pointer'}}>
                <div style={{width:44,height:44,borderRadius:12,background:t.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:20}}>{t.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:700,color:'#0f0f0f'}}>{t.title}</div>
                  <div style={{fontSize:10,color:'#999',marginTop:2}}>{t.desc}</div>
                  {t.progress && <><div style={{marginTop:6,background:'#f0f0f0',borderRadius:4,height:5,overflow:'hidden'}}><div style={{width:t.pct+'%',height:'100%',background:t.color,borderRadius:4}} /></div><div style={{fontSize:9,color:'#bbb',marginTop:2}}>{t.progress}</div></>}
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontSize:16,fontWeight:800,color:t.done?'#00A86B':t.locked?'#ccc':t.color}}>{t.reward}</div>
                  <div style={{fontSize:9,color:t.done?'#00A86B':'#bbb'}}>{t.done?'Done ✓':t.locked?'Locked':''}</div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ===== REFERRAL TASKS ===== */}
        {(tab === 'All' || tab === 'Referral') && (
          <>
            <div style={{fontSize:11,fontWeight:700,color:'#bbb',marginBottom:8,marginTop:12,textTransform:'uppercase',letterSpacing:'.5px'}}>👥 Referral Tasks</div>
            {REFERRAL_TASKS.map((t, i) => (
              <div key={i} onClick={() => t.link && navigate(t.link)} style={{background:'#fff',borderRadius:14,padding:14,marginBottom:8,display:'flex',alignItems:'center',gap:12,cursor:'pointer'}}>
                <div style={{width:44,height:44,borderRadius:12,background:t.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:20}}>{t.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:700,color:'#0f0f0f'}}>{t.title}</div>
                  <div style={{fontSize:10,color:'#999',marginTop:2}}>{t.desc}</div>
                  {t.progress && <><div style={{marginTop:6,background:'#f0f0f0',borderRadius:4,height:5,overflow:'hidden'}}><div style={{width:t.pct+'%',height:'100%',background:t.color,borderRadius:4}} /></div><div style={{fontSize:9,color:'#bbb',marginTop:2}}>{t.progress}</div></>}
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontSize:16,fontWeight:800,color:t.color}}>{t.reward}</div>
                  {t.btn && <button onClick={e=>{e.stopPropagation();t.link&&navigate(t.link)}} style={{marginTop:4,padding:'6px 12px',background:t.color,color:'#fff',border:'none',borderRadius:8,fontSize:10,fontWeight:600,cursor:'pointer'}}>{t.btn}</button>}
                </div>
              </div>
            ))}
            {/* Invite Code */}
            <div style={{background:'#f8f8f8',borderRadius:10,padding:'10px 14px',marginBottom:12,display:'flex',alignItems:'center',gap:10}}>
              <div style={{flex:1,fontSize:12,fontWeight:700,color:'#333',letterSpacing:2}}>{referralCode}</div>
              <button onClick={copyCode} style={{padding:'8px 14px',background:'#FF5000',color:'#fff',border:'none',borderRadius:8,fontSize:11,fontWeight:600,cursor:'pointer'}}>Copy Invite Code</button>
            </div>
          </>
        )}

        {/* ===== ACHIEVEMENTS ===== */}
        {(tab === 'All' || tab === 'Achievement') && (
          <>
            <div style={{fontSize:11,fontWeight:700,color:'#bbb',marginBottom:8,marginTop:12,textTransform:'uppercase',letterSpacing:'.5px'}}>🏅 Trading Achievements</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
              {ACHIEVEMENTS.map((a, i) => (
                <div key={i} style={{background:'#fff',borderRadius:14,padding:12,textAlign:'center'}}>
                  <div style={{fontSize:28,marginBottom:4}}>{a.icon}</div>
                  <div style={{fontSize:11,fontWeight:700,color:'#333'}}>{a.title}</div>
                  <div style={{fontSize:9,color:'#bbb'}}>{a.sub}</div>
                  <div style={{marginTop:4,background:'#eee',borderRadius:2,height:4}}><div style={{width:a.pct+'%',height:'100%',background:a.color,borderRadius:2}} /></div>
                  <div style={{fontSize:10,fontWeight:700,color:a.color,marginTop:4}}>{a.reward}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ===== RECENT REWARDS ===== */}
        <div style={{fontSize:11,fontWeight:700,color:'#bbb',marginBottom:8,marginTop:12,textTransform:'uppercase',letterSpacing:'.5px'}}>🕐 Recent Rewards</div>
        <div style={{background:'#fff',borderRadius:14,overflow:'hidden',marginBottom:12}}>
          {[
            { icon:'📦', title:'Daily Order Milestone', time:'Jul 19, 3:45 PM', amount:'+$2.50' },
            { icon:'✍️', title:'Product Review', time:'Jul 19, 1:30 PM', amount:'+$0.80' },
            { icon:'🔄', title:'Share Best Deal', time:'Jul 19, 10:15 AM', amount:'+$0.30' },
            { icon:'🎉', title:'First Deposit Bonus', time:'Jul 18, 11:00 AM', amount:'+$5.00' },
          ].map((r, i) => (
            <div key={i} style={{padding:'12px 14px',display:'flex',alignItems:'center',gap:10,borderBottom:i<3?'1px solid #f5f5f5':'none'}}>
              <span style={{fontSize:16}}>{r.icon}</span>
              <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:'#333'}}>{r.title}</div><div style={{fontSize:10,color:'#bbb'}}>{r.time}</div></div>
              <span style={{fontSize:13,fontWeight:700,color:'#00A86B'}}>{r.amount}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
    </PullToRefresh>
  );
}
