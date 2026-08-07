import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { claimsApi } from '../api/claims';
import client from '../api/client';
import toast from 'react-hot-toast';

export default function WithdrawPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [claims, setClaims] = useState([]);
  const [taskBalance, setTaskBalance] = useState({ available: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [withdrawals, setWithdrawals] = useState([]);
  const [amount, setAmount] = useState('');
  const [network, setNetwork] = useState('trc20');
  const [walletAddress, setWalletAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Store data for margin breakdown
  const [storeDeposit, setStoreDeposit] = useState(0);
  const [holdingsLocked, setHoldingsLocked] = useState(0);
  const [holdingsCount, setHoldingsCount] = useState(0);
  const [todayProfit, setTodayProfit] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [earningsBalance, setEarningsBalance] = useState(0);

  const loadData = () => {
    Promise.all([
      claimsApi.list(),
      client.get('/tasks/balance'),
      client.get('/withdrawals').catch(() => ({ data: [] })),
      client.get('/store/earnings-stats').catch(() => ({ data: null })),
      client.get('/store/holdings').catch(() => ({ data: [] })),
    ])
      .then(([c, b, w, earn, hold]) => {
        setClaims(c.data);
        setTaskBalance(b.data);
        setWithdrawals(w.data || []);
        if (earn.data) {
          setStoreDeposit(earn.data.deposit || 0);
          setTodayProfit(earn.data.todayProfit || 0);
          setTotalProfit(earn.data.netProfit || 0);
          setEarningsBalance(earn.data.balance || 0);
        }
        const h = hold.data || [];
        setHoldingsLocked(h.reduce((s, h) => s + (h.cost || 0), 0));
        setHoldingsCount(h.length);
      })
      .catch(() => toast.error(t('common.loadingFailed')))
      .finally(() => setLoading(false));
  };
  useEffect(() => { loadData(); window.addEventListener('taskEarning', loadData); const t = setInterval(loadData, 15000); return () => { window.removeEventListener('taskEarning', loadData); clearInterval(t); }; }, []);

  const availableBalance = taskBalance.available || 0;
  const pendingBalance = claims.filter(c => c.status === 'pending').reduce((s, c) => s + (Number(c.value) || 0), 0);
  const totalWithdrawn = withdrawals.filter(w => w.status === 'completed').reduce((s, w) => s + (Number(w.amount) || 0), 0);
  const storeFree = Math.max(0, storeDeposit - holdingsLocked);
  const totalAssets = availableBalance + storeDeposit;

  const handleWithdraw = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 20) { toast.error(t('withdraw.minAmount')); return; }
    if (amt > availableBalance) { toast.error(t('withdraw.insufficient')); return; }
    if (!walletAddress) { toast.error('Please enter wallet address'); return; }
    setSubmitting(true);
    try {
      await client.post('/withdrawals', { amount: amt, network: network, wallet_address: walletAddress });
      setAmount('');
      toast.success(t('withdraw.success'));
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || t('common.operationFailed'));
    } finally { setSubmitting(false); }
  };

  if (loading) return (
    <div style={{background:'#f2f2f7',minHeight:'100vh',maxWidth:430,margin:'0 auto',paddingBottom:80}}>
      <div style={{background:'#0f0f0f',padding:'8px 16px 12px'}}><div className="skeleton" style={{height:24,width:60}} /></div>
      <div style={{padding:16}}><div className="skeleton" style={{height:180,borderRadius:20,marginBottom:14}} /><div className="skeleton" style={{height:200,borderRadius:20}} /></div>
    </div>
  );

  const fee = parseFloat(amount) > 0 ? Math.round(parseFloat(amount) * 0.01 * 100) / 100 : 0;
  const receive = parseFloat(amount) > 0 ? parseFloat(amount) - fee : 0;

  return (
    <div style={{background:'#f2f2f7',minHeight:'100vh',maxWidth:430,margin:'0 auto',paddingBottom:80}}>
      {/* Header */}
      <div style={{background:'linear-gradient(180deg,#0a0a0f,#1a1a24)',padding:'12px 16px 14px',display:'flex',alignItems:'center',gap:12,color:'#fff'}}>
        <button onClick={() => navigate('/mine')} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#fff'}}>←</button>
        <span style={{fontSize:15,fontWeight:700}}>Withdraw</span>
      </div>

      <div style={{padding:16}}>
        {/* Balance Overview */}
        <div style={{background:'#fff',borderRadius:18,padding:20,marginBottom:14}}>

          <div style={{textAlign:'center',marginBottom:18}}>
            <div style={{fontSize:10,color:'#999',marginBottom:2,fontWeight:600,textTransform:'uppercase'}}>Total Assets</div>
            <div style={{fontSize:34,fontWeight:800,color:'#0f0f0f'}}>${totalAssets.toFixed(2)}</div>
          </div>

          {/* Available */}
          <div style={{background:'#E8F8F0',borderRadius:14,padding:14,marginBottom:10}}>
            <div style={{fontSize:11,color:'#666',marginBottom:2,fontWeight:600}}>Available to withdraw</div>
            <div style={{fontSize:22,fontWeight:800,color:'#00A86B'}}>${availableBalance.toFixed(2)}</div>
          </div>

          {/* Unavailable */}
          <div style={{background:'#FFF5F0',borderRadius:14,padding:14}}>
            <div style={{fontSize:11,color:'#999',marginBottom:8,fontWeight:600}}>Unavailable</div>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
              <span style={{fontSize:12,color:'#666'}}>Store Deposit</span>
              <span style={{fontSize:14,fontWeight:700,color:'#F59E0B'}}>${storeDeposit.toFixed(2)}</span>
            </div>
            {holdingsLocked > 0 && (
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <span style={{fontSize:11,color:'#999'}}>In {holdingsCount} active trades</span>
                <span style={{fontSize:12,fontWeight:600,color:'#666'}}>${holdingsLocked.toFixed(2)}</span>
              </div>
            )}
            <div style={{fontSize:10,color:'#999',marginTop:6}}>Deposit is locked in store. Withdraw from Store Funds to access it.</div>
          </div>

          {/* Profit summary */}
          <div style={{display:'flex',justifyContent:'space-between',marginTop:12,paddingTop:12,borderTop:'1px solid #f0f0f5'}}>
            <span style={{fontSize:11,color:'#999'}}>Today's Profit</span>
            <span style={{fontSize:12,fontWeight:600,color:'#00A86B'}}>+${todayProfit.toFixed(2)}</span>
          </div>
        </div>

        {/* Withdraw Form */}
        <div style={{background:'#fff',borderRadius:20,padding:20,marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:700,color:'#0f0f0f',marginBottom:4}}>Amount</div>
          <div style={{fontSize:10,color:'#999',marginBottom:6}}>Min $20 · Fee 1%</div>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Enter amount" style={{width:'100%',padding:'12px 14px',background:'#f5f5f5',border:'none',borderRadius:12,fontSize:24,fontWeight:700,outline:'none',marginBottom:12}} />
          <div style={{display:'flex',gap:8,marginBottom:14}}>
            {[100,500,1000].map(v=><button key={v} onClick={()=>setAmount(String(v))} style={{flex:1,padding:8,background:'#f5f5f5',border:'none',borderRadius:10,fontSize:12,fontWeight:600,color:'#666',cursor:'pointer'}}>${v}</button>)}
            <button onClick={()=>setAmount(String(Math.floor(availableBalance)))} style={{flex:1,padding:8,background:'#f5f5f5',border:'none',borderRadius:10,fontSize:12,fontWeight:600,color:'#00A86B',cursor:'pointer'}}>Max</button>
          </div>

          {parseFloat(amount) > 0 && (<div style={{background:'#f8f8f8',borderRadius:12,padding:12,marginBottom:12,fontSize:11}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{color:'#999'}}>Network Fee (1%)</span><span style={{fontWeight:600,color:'#111'}}>-${fee.toFixed(2)}</span></div>
            <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'#999'}}>You Receive</span><span style={{fontWeight:700,color:'#00A86B'}}>${receive.toFixed(2)}</span></div>
          </div>)}

          <div style={{fontSize:12,fontWeight:700,color:'#0f0f0f',marginBottom:4}}>Network</div>
          <select value={network} onChange={e=>setNetwork(e.target.value)} style={{width:'100%',padding:'12px 14px',background:'#f5f5f5',border:'none',borderRadius:12,fontSize:14,outline:'none',marginBottom:12}}>
            <option value="trc20">TRC20 (USDT)</option>
            <option value="erc20">ERC20 (USDT)</option>
            <option value="bep20">BEP20 (USDT)</option>
          </select>

          <div style={{fontSize:12,fontWeight:700,color:'#0f0f0f',marginBottom:4}}>Wallet Address</div>
          <input value={walletAddress} onChange={e=>setWalletAddress(e.target.value)} placeholder="Enter your wallet address" style={{width:'100%',padding:'12px 14px',background:'#f5f5f5',border:'none',borderRadius:12,fontSize:13,outline:'none',marginBottom:4}} />
          <div style={{fontSize:10,color:'#999',marginBottom:12}}>Double-check your address. Withdrawals cannot be reversed.</div>

          <button onClick={()=>{if(parseFloat(amount)<20){toast.error(t('withdraw.minAmount'));return};if(parseFloat(amount)>availableBalance){toast.error(t('withdraw.insufficient'));return};setShowConfirm(true)}} disabled={!amount||availableBalance<=0}
            style={{width:'100%',padding:14,background:'#00A86B',color:'#fff',border:'none',borderRadius:14,fontSize:15,fontWeight:700,cursor:'pointer',opacity:(!amount||availableBalance<=0)?0.4:1}}>Submit Withdrawal</button>

          <div style={{background:'#FFF5F0',borderRadius:12,padding:14,marginTop:12,display:'flex',alignItems:'center',gap:12}}>
            <span style={{fontSize:24}}>💬</span>
            <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:'#FF5000'}}>Need faster approval?</div><div style={{fontSize:10,color:'#999'}}>Contact support to expedite your withdrawal</div></div>
            <button onClick={()=>document.dispatchEvent(new CustomEvent('showContactSupport'))} style={{padding:'8px 16px',background:'#E8F5E9',color:'#00A86B',border:'1px solid #00A86B',borderRadius:10,fontSize:11,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>Contact &rarr;</button>
          </div>
        </div>

        {/* History */}
        {withdrawals.length > 0 && (<div style={{background:'#fff',borderRadius:20,padding:16}}>
          <div style={{fontSize:12,fontWeight:700,color:'#0f0f0f',marginBottom:10}}>Recent Withdrawals</div>
          {withdrawals.slice(0,10).map(w=>(<div key={w.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #f5f5f5',fontSize:11}}>
            <div><div style={{fontWeight:600}}>${Number(w.amount||0).toFixed(2)}</div><div style={{color:'#999',fontSize:9}}>{w.network?.toUpperCase()} &middot; {String(w.wallet_address||'').slice(0,10)}...</div></div>
            <div style={{textAlign:'right'}}>
              <span style={{fontSize:10,color:w.status==='completed'?'#00A86B':w.status==='pending'?'#F59E0B':'#EF4444',fontWeight:600}}>{w.status==='completed'?t('withdraw.done'):w.status==='pending'?t('withdraw.pending'):t('withdraw.failed')}</span>
              {w.status==='pending'&&<button onClick={async()=>{if(confirm(t('withdraw.cancelConfirm'))){try{await client.delete('/withdrawals/'+w.id);loadData();toast.success(t('withdraw.cancelled'))}catch{toast.error(t('common.operationFailed'))}}}} style={{display:'block',fontSize:9,color:'#EF4444',background:'none',border:'none',cursor:'pointer',marginTop:2}}>{t('common.cancel')}</button>}
            </div>
          </div>))}
        </div>)}
      </div>

      {/* Confirm Modal */}
      {showConfirm && (<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowConfirm(false)}>
        <div style={{background:'#fff',borderRadius:20,padding:24,width:'100%',maxWidth:340,textAlign:'center'}} onClick={e=>e.stopPropagation()}>
          <div style={{fontSize:12,fontWeight:700,color:'#999',marginBottom:4}}>CONFIRM WITHDRAWAL</div>
          <div style={{fontSize:32,fontWeight:800,color:'#0f0f0f',marginBottom:16}}>${parseFloat(amount||0).toFixed(2)}</div>
          <div style={{background:'#f8f8f8',borderRadius:12,padding:12,marginBottom:16,fontSize:11,textAlign:'left'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{color:'#999'}}>Network</span><span style={{fontWeight:600}}>{network.toUpperCase()}</span></div>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{color:'#999'}}>Fee</span><span style={{fontWeight:600}}>-${fee.toFixed(2)}</span></div>
            <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'#999'}}>You Receive</span><span style={{fontWeight:700,color:'#00A86B'}}>${receive.toFixed(2)}</span></div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>setShowConfirm(false)} style={{flex:1,padding:12,background:'#f5f5f5',border:'none',borderRadius:12,fontSize:14,fontWeight:600,cursor:'pointer'}}>Cancel</button>
            <button onClick={()=>{setShowConfirm(false);handleWithdraw()}} disabled={submitting} style={{flex:1,padding:12,background:'#00A86B',color:'#fff',border:'none',borderRadius:12,fontSize:14,fontWeight:700,cursor:'pointer'}}>{submitting?'...':'Confirm'}</button>
          </div>
        </div>
      </div>)}
    </div>
  );
}
