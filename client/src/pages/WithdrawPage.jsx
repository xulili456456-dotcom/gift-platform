import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { claimsApi } from '../api/claims';
import client from '../api/client';
import { Wallet, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const NETWORKS = [
  { id: 'trc20', name: 'TRC20', symbol: 'USDT', chain: 'TRON', icon: '🔵' },
  { id: 'erc20', name: 'ERC20', symbol: 'USDT', chain: 'Ethereum', icon: '🟣' },
  { id: 'bep20', name: 'BEP20', symbol: 'USDT', chain: 'BSC', icon: '🟡' },
];

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

  const loadData = () => {
    Promise.all([claimsApi.list(), client.get('/tasks/balance'), client.get('/withdrawals').catch(() => ({ data: [] }))])
      .then(([c, b, w]) => { setClaims(c.data); setTaskBalance(b.data); setWithdrawals(w.data || []); })
      .catch(() => toast.error(t('common.loadingFailed')))
      .finally(() => setLoading(false));
  };
  useEffect(() => { loadData(); window.addEventListener('taskEarning', loadData); return () => window.removeEventListener('taskEarning', loadData); }, []);

  const claimBalance = claims.filter(c => c.status === 'delivered').reduce((s, c) => s + (Number(c.value) || 0), 0);
  const availableBalance = taskBalance.available || 0; // Only task_earnings is withdrawable
  const pendingBalance = claims.filter(c => c.status === 'pending').reduce((s, c) => s + (Number(c.value) || 0), 0);

  const handleWithdraw = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 1) { toast.error(t('withdraw.minAmount')); return; }
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

  if (loading) return <div className="min-h-screen bg-gray-50 p-4"><div className="skeleton h-40 rounded-2xl" /></div>;

  const fee = parseFloat(amount) > 0 ? Math.round(parseFloat(amount) * 0.01 * 100) / 100 : 0;
  const receive = parseFloat(amount) > 0 ? parseFloat(amount) - fee : 0;
  const totalWithdrawn = withdrawals.filter(w => w.status === 'completed').reduce((s, w) => s + (Number(w.amount) || 0), 0);

  return (
    <div style={{background:'#f2f2f7',minHeight:'100vh',maxWidth:430,margin:'0 auto',paddingBottom:80}}>
      {/* Header */}
      <div style={{background:'#0f0f0f',padding:'8px 16px 12px',display:'flex',alignItems:'center',gap:12,color:'#fff'}}>
        <button onClick={() => navigate('/mine')} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#fff'}}>←</button>
        <span style={{fontSize:14,fontWeight:700}}>{t('withdraw.title')}</span>
      </div>

      <div style={{padding:16}}>
        {/* Available Balance */}
        <div style={{background:'#fff',borderRadius:20,padding:20,textAlign:'center',marginBottom:14}}>
          <div style={{fontSize:11,color:'#999',marginBottom:4}}>Available Balance</div>
          <div style={{fontSize:36,fontWeight:800,color:'#0f0f0f'}}>${availableBalance.toFixed(2)}</div>
          {pendingBalance > 0 && <div style={{fontSize:11,color:'#999',marginTop:4}}>Pending: ${pendingBalance.toFixed(2)} · Withdrawn: ${totalWithdrawn.toFixed(2)}</div>}
        </div>

        <div style={{background:'#fff',borderRadius:20,padding:20,marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:700,color:'#0f0f0f',marginBottom:4}}>Amount</div>
            <div style={{fontSize:10,color:'#999',marginBottom:6}}>Min $10 · Fee 1%</div>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Enter amount" style={{width:'100%',padding:'12px 14px',background:'#f5f5f5',border:'none',borderRadius:12,fontSize:24,fontWeight:700,outline:'none',marginBottom:12}} />
            <div style={{display:'flex',gap:8,marginBottom:14}}>
              {[100,500,1000].map(v=><button key={v} onClick={()=>setAmount(String(v))} style={{flex:1,padding:8,background:'#f5f5f5',border:'none',borderRadius:10,fontSize:12,fontWeight:600,color:'#666',cursor:'pointer'}}>${v}</button>)}
              <button onClick={()=>setAmount(String(Math.floor(availableBalance)))} style={{flex:1,padding:8,background:'#f5f5f5',border:'none',borderRadius:10,fontSize:12,fontWeight:600,color:'#00A86B',cursor:'pointer'}}>Max</button>
            </div>

            {/* Fee Info */}
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

            <button onClick={()=>{if(parseFloat(amount)<1){toast.error(t('withdraw.minAmount'));return};if(parseFloat(amount)>availableBalance){toast.error(t('withdraw.insufficient'));return};setShowConfirm(true)}} disabled={!amount||availableBalance<=0}
              style={{width:'100%',padding:14,background:'#00A86B',color:'#fff',border:'none',borderRadius:14,fontSize:15,fontWeight:700,cursor:'pointer',opacity:!amount||availableBalance<=0?.4:1}}>Submit Withdrawal</button>

            {/* Contact Support */}
            <div style={{background:'#FFF5F0',borderRadius:12,padding:14,marginTop:12,display:'flex',alignItems:'center',gap:12}}>
              <span style={{fontSize:24}}>💬</span>
              <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:'#FF5000'}}>Need faster approval?</div><div style={{fontSize:10,color:'#999'}}>Contact support to expedite your withdrawal</div></div>
              <button onClick={()=>document.dispatchEvent(new CustomEvent('showContactSupport'))} style={{padding:'8px 16px',background:'#E8F5E9',color:'#00A86B',border:'1px solid #00A86B',borderRadius:10,fontSize:11,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>Contact →</button>
            </div>
          </div>

        {/* History */}
        {withdrawals.length > 0 && (<div style={{background:'#fff',borderRadius:20,padding:16}}>
          <div style={{fontSize:12,fontWeight:700,color:'#0f0f0f',marginBottom:10}}>Recent Withdrawals</div>
          {withdrawals.slice(0,10).map(w=>(<div key={w.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #f5f5f5',fontSize:11}}>
            <div><div style={{fontWeight:600}}>${Number(w.amount||0).toFixed(2)}</div><div style={{color:'#999',fontSize:9}}>{w.network?.toUpperCase()} · {String(w.wallet_address||'').slice(0,10)}...</div></div>
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
