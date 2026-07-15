import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { referralApi } from '../api/referral';
import client from '../api/client';
import { Lock, Zap, Shield, Crown } from 'lucide-react';
import toast from 'react-hot-toast';

const PLANS = [
  { id: 'basic', amount: 10, days: 30, bonus: 1.5, color: 'from-blue-500 to-blue-600', icon: Zap,
    giftKeys: ['stake.giftBasic1','stake.giftBasic2','stake.giftBasic3'],
    gifts: [{ invites: 1, value: 15 }, { invites: 3, value: 50 }, { invites: 8, value: 150 }]},
  { id: 'pro', amount: 50, days: 30, bonus: 2.0, color: 'from-purple-500 to-purple-600', icon: Shield,
    giftKeys: ['stake.giftPro1','stake.giftPro2','stake.giftPro3','stake.giftPro4'],
    gifts: [{ invites: 1, value: 35 }, { invites: 3, value: 120 }, { invites: 8, value: 350 }, { invites: 20, value: 800 }]},
  { id: 'max', amount: 200, days: 30, bonus: 3.0, color: 'from-amber-500 to-amber-600', icon: Crown,
    giftKeys: ['stake.giftMax1','stake.giftMax2','stake.giftMax3','stake.giftMax4','stake.giftMax5'],
    gifts: [{ invites: 1, value: 100 }, { invites: 3, value: 350 }, { invites: 8, value: 1000 }, { invites: 20, value: 2500 }, { invites: 50, value: 6000 }]},
];

export default function StakingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stake, setStake] = useState(null);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [showConfirm, setShowConfirm] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const loadData = () => {
    Promise.all([referralApi.getStats(), client.get('/staking').catch(()=>({data:null})), client.get('/tasks/balance').catch(()=>({data:{total:0}}))])
      .then(([s, st, b]) => { setBalance(b.data?.total||0); setStake(st.data); })
      .catch(() => toast.error(t('common.loadingFailed')))
      .finally(()=>setLoading(false));
  };
  useEffect(() => { loadData(); }, []);

  const handleStake = async (plan) => {
    if (plan.amount > balance) { toast.error('Insufficient balance'); setShowConfirm(null); return; }
    setSubmitting(true);
    try {
      const { data } = await client.post('/staking', { plan_id: plan.id, amount: plan.amount });
      setStake(data); setShowConfirm(null); toast.success(t('stake.success'));
    } catch (err) { toast.error(err.response?.data?.error||'Failed'); }
    finally { setSubmitting(false); }
  };

  const handleUnstake = async () => {
    const d = stake ? Math.max(0, Math.ceil((new Date(stake.unlock_at) - Date.now()) / 86400000)) : 0;
    const penalty = d > 0 ? Number((stake.amount * 0.2).toFixed(0)) : 0;
    if (!confirm(d > 0 ? t('stake.forceUnstakeConfirm',{amount:stake.amount,penalty}) : t('stake.unstakeConfirm'))) return;
    try {
      const { data } = await client.post('/staking/unlock');
      toast.success(d > 0 ? t('stake.unstakedPenalty',{penalty}) : t('stake.unstaked'));
      setStake(null);
    } catch { toast.error('Failed'); }
  };

  if (loading) return <div className="min-h-screen bg-bg p-4"><div className="skeleton h-48 rounded-2xl" /><div className="skeleton h-64 rounded-2xl" /></div>;

  const daysLeft = stake ? Math.max(0, Math.ceil((new Date(stake.unlock_at) - Date.now()) / 86400000)) : 0;
  const currentPlan = stake ? (PLANS.find(p => p.id === stake.plan_id) || { id: 'custom', amount: stake.amount, bonus: stake.bonus, color: 'from-gray-500 to-gray-600', icon: Zap, gifts: [] }) : null;
  const CurIcon = currentPlan?.icon || Zap;

  return (
    <div className="min-h-screen bg-bg animate-fade-in">
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-separator">
        <button onClick={() => navigate('/mine')} className="flex items-center gap-1 text-primary font-medium text-sm pr-2 py-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
          {t('common.back')}
        </button>
        <h2 className="text-[16px] font-bold text-text">{t('stake.title')}</h2>
      </div>
      <div className="p-4 space-y-5">
        {stake && currentPlan && (
          <div className={`bg-gradient-to-br ${currentPlan.color} rounded-2xl p-5 text-white shadow-xl`}>
            <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><CurIcon size={22} /><span className="font-bold text-lg">{t('stake.active')}</span></div><span className="bg-white/20 px-2 py-0.5 rounded-full text-[11px] font-semibold">x{currentPlan.bonus} {t('stake.multiplier')}</span></div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div><p className="text-white/50 text-[10px]">{t('stake.lockedAmount')}</p><p className="text-xl font-black">${stake.amount}</p></div>
              <div><p className="text-white/50 text-[10px]">{t('stake.daysLeft')}</p><p className="text-xl font-black">{daysLeft}D</p></div>
              <div><p className="text-white/50 text-[10px]">{t('stake.multiplier')}</p><p className="text-xl font-black">{currentPlan.bonus}x</p></div>
            </div>
            <div className="w-full h-2 bg-white/15 rounded-full overflow-hidden"><div className="h-full bg-white rounded-full transition-all" style={{width:Math.min(100,((30-daysLeft)/30)*100)+'%'}} /></div>
            <p className="text-white/50 text-[10px] mt-2">{daysLeft>0?t('stake.unlocksIn',{days:daysLeft}):t('stake.readyToUnlock')}</p>
            <button onClick={handleUnstake} className="mt-3 w-full py-2 text-[11px] text-white/60 bg-white/10 rounded-xl active:bg-white/20">{daysLeft>0?t('stake.forceUnstake'):t('stake.unstake')}</button>
          </div>
        )}
        {!stake && (
          <div>
            <div className="flex items-center justify-between mb-3"><h3 className="text-[14px] font-bold text-text">{t('stake.choosePlan')}</h3><span className="text-[11px] text-text-muted">{t('stake.availableBalance')}: <strong className="text-text">${balance.toFixed(0)}</strong></span></div>
            <div className="space-y-3">
              {PLANS.map((plan) => { const Icon=plan.icon; return (
                <div key={plan.id} className={`bg-white rounded-2xl border-2 p-5 transition-all ${showConfirm?.id===plan.id?'border-primary shadow-lg shadow-primary/10':'border-separator shadow-sm'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center`}><Icon size={20} className="text-white" /></div><div><p className="font-bold text-text text-[14px]">{t('stake.plan'+plan.id)}</p><p className="text-[11px] text-text-muted">{plan.days}{t('stake.days')} · x{plan.bonus} {t('stake.multiplier')}</p></div></div>
                    <div className="text-right"><p className="text-xl font-black text-text">${plan.amount}</p><p className="text-[10px] text-success font-semibold">+30% {t('stake.profit')}</p></div>
                  </div>
                  <div className="bg-bg rounded-xl p-3 mb-3"><p className="text-[10px] text-text-muted font-medium mb-2 uppercase tracking-wider">{t('stake.premiumGifts')}</p><div className="space-y-1.5">{plan.gifts.map((g,i)=>(<div key={i} className="flex justify-between text-[11px]"><span className="text-text-secondary">{t(plan.giftKeys[i])}</span><span className="font-semibold text-text">{g.invites}{t('common.people')} -{'>'} ${g.value}</span></div>))}</div></div>
                  <div className="flex justify-between text-[11px] mb-3"><span className="text-text-muted">{t('stake.boostInfo',{bonus:plan.bonus})}</span><span className="text-success font-bold">+${(plan.amount*0.3).toFixed(0)}</span></div>
                  <button onClick={()=>setShowConfirm(plan)} className="w-full py-3 bg-primary text-white rounded-xl text-[13px] font-bold active:scale-[0.98]">{t('stake.stakeNow')} ${plan.amount}</button>
                </div>
              )})}
            </div>
          </div>
        )}
        {!stake && (
          <div className="bg-white rounded-2xl border-2 border-dashed border-separator p-5 shadow-sm">
            <button onClick={()=>setShowCustom(!showCustom)} className="w-full flex items-center justify-between">
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-bg flex items-center justify-center"><Zap size={20} className="text-text-muted" /></div><div className="text-left"><p className="text-[14px] font-bold text-text">{t('stake.customTitle')}</p><p className="text-[11px] text-text-muted">{t('stake.customDesc')}</p></div></div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2.5" className={`transition-transform ${showCustom?'rotate-180':''}`}><polyline points="6 9 12 15 18 9" /></svg>
            </button>
            {showCustom && (
              <div className="mt-4 pt-4 border-t border-separator space-y-3">
                <div><label className="text-[11px] text-text-muted font-medium mb-1.5 block">{t('stake.customAmount')}</label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-bold">$</span><input type="number" value={customAmount} onChange={e=>setCustomAmount(e.target.value)} placeholder={t('stake.customPlaceholder')} min="10" className="w-full pl-8 pr-16 py-3 rounded-xl border border-separator bg-bg text-lg font-bold focus:outline-none focus:border-primary" /><span className="absolute right-4 top-1/2 -translate-y-1/2 text-success text-[12px] font-bold">+30%</span></div>{customAmount>=10&&<p className="text-[11px] text-success font-semibold mt-1.5">{t('stake.estimatedProfit')}: ${(customAmount*0.3).toFixed(0)}</p>}</div>
                <button onClick={()=>{const p={id:'custom',amount:Number(customAmount),days:30,bonus:1.5,color:'from-gray-500 to-gray-600',icon:Zap,gifts:[]};setShowConfirm(p);}} disabled={!customAmount||customAmount<10} className="w-full py-3 bg-primary text-white rounded-xl text-[13px] font-bold active:scale-[0.98] disabled:opacity-40">{t('stake.stakeNow')} ${customAmount||0}</button>
              </div>
            )}
          </div>
        )}
        <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-2xl p-4 border border-primary/10">
          <div className="flex items-center gap-2 mb-3"><Shield size={18} className="text-primary" /><span className="text-[13px] font-bold text-text">{t('stake.howItWorks')}</span></div>
          <div className="space-y-2 text-[12px] text-text-secondary leading-relaxed">
            <div className="flex gap-2"><span className="text-primary font-bold">1.</span><span>{t('stake.step1')}</span></div>
            <div className="flex gap-2"><span className="text-primary font-bold">2.</span><span>{t('stake.step2')}</span></div>
            <div className="flex gap-2"><span className="text-primary font-bold">3.</span><span>{t('stake.step3')}</span></div>
            <div className="flex gap-2"><span className="text-primary font-bold">4.</span><span>{t('stake.step4')}</span></div>
          </div>
        </div>
      </div>
      {showConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={()=>setShowConfirm(null)}>
          <div className="bg-white rounded-3xl w-[90%] max-w-[340px] p-6 text-center animate-scale-in" onClick={e=>e.stopPropagation()}>
            <Lock size={40} className="mx-auto text-primary mb-3" />
            <h3 className="text-lg font-bold text-text mb-1">{t('stake.confirmTitle')}</h3>
            <p className="text-3xl font-black text-primary">${showConfirm.amount}</p>
            <p className="text-[12px] text-text-muted mt-2 mb-5">{t('stake.confirmDesc',{amount:showConfirm.amount,days:30,bonus:showConfirm.bonus||1.5,profit:(showConfirm.amount*0.3).toFixed(0)})}</p>
            <div className="flex gap-2">
              <button onClick={()=>setShowConfirm(null)} className="flex-1 py-3 bg-bg rounded-xl text-[13px] font-semibold">{t('common.cancel')}</button>
              <button onClick={()=>handleStake(showConfirm)} disabled={submitting} className="flex-1 py-3 bg-primary text-white rounded-xl text-[13px] font-bold">{submitting?'...':t('stake.confirm')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}