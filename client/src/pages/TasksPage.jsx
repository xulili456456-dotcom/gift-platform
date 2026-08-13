import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/authStore';
import client from '../api/client';
import PullToRefresh from '../components/shared/PullToRefresh';
import toast from 'react-hot-toast';

const TABS = ['All','Trading','Deposit','Referral','Achievement'];

export default function TasksPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const authUser = useAuthStore(s => s.user);
  const [data, setData] = useState(null);
  const [balance, setBalance] = useState({ total: 0, streak: 0, checkedToday: false, nextCheckinReward: 0.1 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('All');
  const [submitting, setSubmitting] = useState(false);

  const loadAll = async () => {
    try {
      const [tRes, bRes] = await Promise.all([
        client.get('/tasks'),
        client.get('/tasks/balance'),
      ]);
      setData(tRes.data);
      setBalance(bRes.data);
    } catch { setData({ tasks: [], rewards: [], summary: { completed: 0, total: 0 } }); toast.error('Failed to load tasks'); } finally { setLoading(false); }
  };
  useEffect(() => { loadAll(); const t = setInterval(loadAll, 30000); return () => clearInterval(t); }, []);

  const tasks = data?.tasks || [];
  const rewards = data?.rewards || [];
  const summary = data?.summary || { completed: 0, total: 0 };

  const doCheckin = async () => {
    setSubmitting(true);
    try {
      const { data: d } = await client.post('/tasks/checkin');
      toast.success(`+$${d.amount} Check-in! Day ${d.streak}`);
      loadAll();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const claimReward = async (taskType) => {
    setSubmitting(true);
    try {
      const { data: d } = await client.post(`/tasks/${taskType}/claim`);
      toast.success(`+$${d.amount} Claimed!`);
      loadAll();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const copyCode = () => {
    const code = authUser?.referral_code || '';
    if (!code) { toast.error('No invite code'); return; }
    navigator.clipboard.writeText(code);
    toast.success('Code copied');
  };

  if (loading) return (
    <div style={{maxWidth:430,margin:'0 auto',background:'#f2f2f7',minHeight:'100vh'}}>
      <div style={{background:'#0f0f0f',height:100}} />
      <div style={{padding:16}}><div style={{background:'#fff',borderRadius:14,height:200}} /></div>
    </div>
  );

  const filtered = tab === 'All' ? tasks : tasks.filter(t => t.category === tab.toLowerCase());

  const tradingTasks = filtered.filter(t => t.category === 'trading' && t.reset_period !== 'one_time');
  const oneTimeTasks = filtered.filter(t => t.category === 'trading' && t.reset_period === 'one_time');
  const depositTasks = filtered.filter(t => t.category === 'deposit');
  const referralTasks = filtered.filter(t => t.category === 'referral');
  const achievementTasks = filtered.filter(t => t.category === 'trading' && t.reset_period === 'one_time');

  return (
    <PullToRefresh onRefresh={loadAll}>
    <div style={{background:'#f2f2f7',minHeight:'100vh',maxWidth:430,margin:'0 auto',paddingBottom:80}}>

      {/* ===== HEADER ===== */}
      <div style={{background:'#0f0f0f',padding:'12px 16px 16px',color:'#fff'}}>
        <div style={{fontSize:11,color:'#aaa',marginBottom:2}}>Total Earned from Tasks</div>
        <div style={{fontSize:28,fontWeight:800}}>${balance.total.toFixed(2)}</div>
        <div style={{display:'flex',gap:16,marginTop:8,fontSize:10,color:'#aaa'}}>
          <span>🔥 {balance.streak}-day streak</span>
          <span>📋 {summary.completed}/{summary.total} tasks done</span>
        </div>
      </div>

      {/* ===== TABS ===== */}
      <div style={{background:'#fff',display:'flex',overflowX:'auto',padding:4,borderBottom:'1px solid #f0f0f0',gap:2}}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:'8px 14px',borderRadius:10,border:'none',cursor:'pointer',fontSize:11,fontWeight:tab===t?700:500,whiteSpace:'nowrap',
            background: tab===t ? '#FF5000' : 'transparent', color: tab===t ? '#fff' : '#999'
          }}>{t}</button>
        ))}
      </div>

      <div style={{padding:16}}>

        {/* ===== CHECK-IN ===== */}
        <div style={{background:'#fff',borderRadius:16,padding:16,marginBottom:12}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
            <span style={{fontSize:18}}>🔥</span>
            <span style={{fontSize:14,fontWeight:700,color:'#0f0f0f'}}>Daily Check-in</span>
            <span style={{marginLeft:'auto',fontSize:11,color:'#F59E0B',fontWeight:600}}>Day {balance.streak} streak</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4,marginBottom:12}}>
            {[1,2,3,4,5,6,7].map(day => {
              const done = day <= balance.streak;
              const today = day === balance.streak + 1 && !balance.checkedToday;
              const isToday = day === balance.streak + 1;
              return (
                <div key={day} style={{textAlign:'center',padding:'6px 2px',borderRadius:8,fontSize:9,
                  background: done ? '#FFF8E1' : today ? '#FFF5F0' : '#f5f5f5',
                  border: today ? '2px solid #FF5000' : 'none'
                }}>
                  <div style={{fontWeight:600,color:done?'#B45309':today?'#FF5000':'#ccc'}}>D{day}</div>
                  <div style={{fontWeight:700,color:done?'#F59E0B':today?'#FF5000':'#ddd'}}>${(0.1*day).toFixed(1)}</div>
                  <div>{done?'✅':today?'●':'—'}</div>
                </div>
              );
            })}
          </div>
          <button onClick={doCheckin} disabled={balance.checkedToday || submitting} style={{
            width:'100%',padding:10,border:'none',borderRadius:10,fontSize:12,fontWeight:700,cursor: balance.checkedToday?'default':'pointer',
            background: balance.checkedToday ? '#f5f5f5' : '#FF5000',
            color: balance.checkedToday ? '#999' : '#fff'
          }}>
            {balance.checkedToday ? '✅ Checked In Today' : `🔥 Check In +$${balance.nextCheckinReward.toFixed(2)}`}
          </button>
        </div>

        {/* ===== TASKS BY CATEGORY ===== */}
        {tradingTasks.length > 0 && (tab === 'All' || tab === 'Trading') && (
          <>
            <SectionLabel>📦 Trading Tasks</SectionLabel>
            {tradingTasks.map(t => <TaskCard key={t.id} t={t} navigate={navigate} onClaim={claimReward} />)}
          </>
        )}

        {oneTimeTasks.length > 0 && (tab === 'All' || tab === 'Trading' || tab === 'Achievement') && (
          <>
            <SectionLabel>✅ One-Time Tasks</SectionLabel>
            {oneTimeTasks.map(t => <TaskCard key={t.id} t={t} navigate={navigate} onClaim={claimReward} />)}
          </>
        )}

        {depositTasks.length > 0 && (tab === 'All' || tab === 'Deposit') && (
          <>
            <SectionLabel>💰 Deposit & Withdraw</SectionLabel>
            {depositTasks.map(t => <TaskCard key={t.id} t={t} navigate={navigate} onClaim={claimReward} />)}
          </>
        )}

        {referralTasks.length > 0 && (tab === 'All' || tab === 'Referral') && (
          <>
            <SectionLabel>👥 Referral Tasks</SectionLabel>
            {referralTasks.map(t => <TaskCard key={t.id} t={t} navigate={navigate} onClaim={claimReward} />)}
            <div style={{background:'#f8f8f8',borderRadius:10,padding:'10px 14px',marginBottom:12,display:'flex',alignItems:'center',gap:10}}>
              <div style={{flex:1,fontSize:12,fontWeight:700,color:'#333',letterSpacing:2}}>{authUser?.referral_code||'------'}</div>
              <button onClick={copyCode} style={{padding:'8px 14px',background:'#FF5000',color:'#fff',border:'none',borderRadius:8,fontSize:11,fontWeight:600,cursor:'pointer'}}>Copy Code</button>
            </div>
          </>
        )}

        {/* ===== RECENT REWARDS ===== */}
        {rewards.length > 0 && (
          <>
            <SectionLabel>🕐 Recent Rewards</SectionLabel>
            <div style={{background:'#fff',borderRadius:14,overflow:'hidden',marginBottom:12}}>
              {rewards.map((r, i) => (
                <div key={r.id||i} style={{padding:'12px 14px',display:'flex',alignItems:'center',gap:10,borderBottom:i<rewards.length-1?'1px solid #f5f5f5':'none'}}>
                  <span style={{fontSize:16}}>💰</span>
                  <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:'#333'}}>{r.task_title}</div><div style={{fontSize:10,color:'#bbb'}}>{r.created_at ? new Date(r.created_at).toLocaleString() : ''}</div></div>
                  <span style={{fontSize:13,fontWeight:700,color:'#00A86B'}}>+${r.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {filtered.length === 0 && (
          <div style={{textAlign:'center',padding:40,color:'#ccc',fontSize:13}}>No tasks in this category yet</div>
        )}
      </div>
    </div>
    </PullToRefresh>
  );
}

function SectionLabel({ children }) {
  return <div style={{fontSize:11,fontWeight:700,color:'#bbb',marginBottom:8,marginTop:12,textTransform:'uppercase',letterSpacing:'.5px'}}>{children}</div>;
}

function TaskCard({ t, navigate, onClaim }) {
  const linkMap = { daily_order_5:'/store', high_value_order:'/store', speed_trade:'/store', category_explorer:'/store',
    product_review:'/store', social_share:'/store', first_deposit:'/mine/deposit', deposit_500:'/mine/deposit',
    first_withdrawal:'/mine/withdraw', invite_3_weekly:'/mine/team', kyc_complete:'/mine/kyc', first_order:'/store',
    profit_streak:'/store', bargain_hunter:'/store', weekend_warrior:'/store', referral_trade:'/mine/team' };
  const link = linkMap[t.task_type];

  return (
    <div onClick={() => link && navigate(link)} style={{background:'#fff',borderRadius:14,padding:14,marginBottom:8,display:'flex',alignItems:'center',gap:12,cursor: link?'pointer':'default'}}>
      <div style={{width:44,height:44,borderRadius:12,background:t.icon_bg||'#f5f5f5',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:20}}>{t.icon||'📦'}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:12,fontWeight:700,color:'#0f0f0f'}}>{t.title}</div>
        <div style={{fontSize:10,color:'#999',marginTop:2}}>{t.description}</div>
        {(t.target_count > 0 || t.target_value > 0) && !t.claimed && (
          <>
            <div style={{marginTop:6,background:'#f0f0f0',borderRadius:4,height:5,overflow:'hidden'}}>
              <div style={{width:t.pct+'%',height:'100%',background:t.reward_color||'#FF5000',borderRadius:4}} />
            </div>
            <div style={{fontSize:9,color:'#bbb',marginTop:2}}>
              {t.target_count > 0 ? `${t.current_count}/${t.target_count}` : `${t.current_value}/${t.target_value}`}
            </div>
          </>
        )}
      </div>
      <div style={{textAlign:'right',flexShrink:0}}>
        <div style={{fontSize:16,fontWeight:800,color: t.claimed ? '#00A86B' : (t.reward_color||'#FF5000')}}>
          {t.claimed ? 'Done ✓' : `+$${t.reward.toFixed(2)}`}
        </div>
        {t.completed && !t.claimed && (
          <button onClick={e=>{e.stopPropagation();onClaim(t.task_type)}} style={{marginTop:4,padding:'6px 12px',background:'#00A86B',color:'#fff',border:'none',borderRadius:8,fontSize:10,fontWeight:600,cursor:'pointer'}}>Claim</button>
        )}
        {link && !t.completed && (
          <button onClick={e=>{e.stopPropagation();navigate(link)}} style={{marginTop:4,padding:'6px 12px',background:t.reward_color||'#FF5000',color:'#fff',border:'none',borderRadius:8,fontSize:10,fontWeight:600,cursor:'pointer'}}>Go</button>
        )}
      </div>
    </div>
  );
}
