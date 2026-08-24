import { useState, useEffect, useRef } from 'react';
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
  const [expandedW, setExpandedW] = useState(new Set());
  const [showDetail, setShowDetail] = useState(null);
  const [contactAgreed, setContactAgreed] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyVideo, setVerifyVideo] = useState('');
  const [gettingCode, setGettingCode] = useState(false);
  const videoRef = useRef(null);

  // Store data for margin breakdown
  const [storeDeposit, setStoreDeposit] = useState(0);
  const [holdings, setHoldings] = useState([]);
  const [holdingsLocked, setHoldingsLocked] = useState(0);
  const [holdingsCount, setHoldingsCount] = useState(0);
  const [todayProfit, setTodayProfit] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [earningsBalance, setEarningsBalance] = useState(0);

  const loadData = () => {
    Promise.all([
      claimsApi.list().catch(() => ({ data: [] })),
      client.get('/tasks/balance').catch(() => ({ data: { available: 0, total: 0 } })),
      client.get('/withdrawals').catch(() => ({ data: [] })),
      client.get('/store/earnings-stats').catch(() => ({ data: null })),
      client.get('/store/holdings').catch(() => ({ data: [] })),
    ])
      .then(([c, b, w, earn, hold]) => {
        setClaims(c.data || []);
        setTaskBalance(b.data || { available: 0, total: 0 });
        setWithdrawals(w.data || []);
        if (earn.data) {
          setStoreDeposit(earn.data.deposit || 0);
          setTodayProfit(earn.data.todayProfit || 0);
          setTotalProfit(earn.data.netProfit || 0);
          setEarningsBalance(earn.data.balance || 0);
        }
        const h = hold.data || [];
        setHoldings(h);
        setHoldingsLocked(h.reduce((s, h) => s + (h.cost || 0), 0));
        setHoldingsCount(h.length);
      })
      .catch((e) => { console.error('WithdrawPage loadData failed', e); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { loadData(); window.addEventListener('taskEarning', loadData); const t = setInterval(loadData, 180000); return () => { window.removeEventListener('taskEarning', loadData); clearInterval(t); }; }, []);

  const availableBalance = taskBalance.available || 0;
  const pendingBalance = claims.filter(c => c.status === 'pending').reduce((s, c) => s + (Number(c.value) || 0), 0);
  const totalWithdrawn = withdrawals.filter(w => w.status === 'completed').reduce((s, w) => s + (Number(w.amount) || 0), 0);
  const totalAssets = availableBalance + storeDeposit + holdingsLocked;

  const handleGetCode = async () => {
    setGettingCode(true);
    try {
      const { data } = await client.post('/withdrawals/verify-code');
      setVerifyCode(data.code);
      setVerifyVideo('');
      toast.success('Verification code generated. Record a video reading it.');
    } catch (err) { toast.error(err.response?.data?.error || t('common.operationFailed')); }
    finally { setGettingCode(false); }
  };
  const handleVideo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Video too large (max 10MB)'); return; }
    const reader = new FileReader();
    reader.onload = () => setVerifyVideo(reader.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };
  const handleWithdraw = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 50) { toast.error(t('withdraw.minAmount')); return; }
    if (amt > availableBalance) { toast.error(t('withdraw.insufficient')); return; }
    if (!walletAddress) { toast.error('Please enter wallet address'); return; }
    if (!verifyCode || !verifyVideo) { toast.error('Please complete video verification first'); return; }
    setSubmitting(true);
    try {
      await client.post('/withdrawals', { amount: amt, network, wallet_address: walletAddress, verify_code: verifyCode, verify_video: verifyVideo });
      setAmount('');
      setVerifyCode('');
      setVerifyVideo('');
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
            <div style={{fontSize:10,color:'#999',marginTop:2}}>Available ${availableBalance.toFixed(2)} + Deposit ${storeDeposit.toFixed(2)}{holdingsLocked > 0 ? ` + Trading $${holdingsLocked.toFixed(2)}` : ''}</div>
          </div>

          {/* Available */}
          <div onClick={() => setShowDetail(showDetail==='available'?null:'available')} style={{background:'#E8F8F0',borderRadius:14,padding:14,marginBottom:10,cursor:'pointer'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:11,color:'#666',marginBottom:2,fontWeight:600}}>Available Balance</div>
                <div style={{fontSize:22,fontWeight:800,color:'#00A86B'}}>${availableBalance.toFixed(2)}</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" style={{transform:showDetail==='available'?'rotate(180deg)':'rotate(0)',transition:'transform .2s'}}><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            {showDetail==='available' && (
              <div style={{marginTop:10,paddingTop:10,borderTop:'1px solid rgba(0,0,0,.06)'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:3,fontSize:11}}><span style={{color:'#999'}}>Task Earnings</span><span style={{fontWeight:600}}>${availableBalance.toFixed(2)}</span></div>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:3,fontSize:11}}><span style={{color:'#999'}}>Today's Profit</span><span style={{fontWeight:600,color:'#00A86B'}}>+${todayProfit.toFixed(2)}</span></div>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:3,fontSize:11}}><span style={{color:'#999'}}>Total Net Profit</span><span style={{fontWeight:600,color:'#00A86B'}}>+${totalProfit.toFixed(2)}</span></div>
                <div style={{fontSize:10,color:'#999',marginTop:6}}>Available balance can be withdrawn or used for trading. Profits from completed orders accumulate here.</div>
              </div>
            )}
          </div>

          {/* Deposit */}
          <div onClick={() => setShowDetail(showDetail==='deposit'?null:'deposit')} style={{background:'#FFF8E1',borderRadius:14,padding:14,marginBottom:10,cursor:'pointer'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:11,color:'#999',marginBottom:2,fontWeight:600}}>Deposit (Margin)</div>
                <div style={{fontSize:22,fontWeight:800,color:'#F59E0B'}}>${storeDeposit.toFixed(2)}</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" style={{transform:showDetail==='deposit'?'rotate(180deg)':'rotate(0)',transition:'transform .2s'}}><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            {showDetail==='deposit' && (
              <div style={{marginTop:10,paddingTop:10,borderTop:'1px solid rgba(0,0,0,.06)'}}>
                <div style={{fontSize:11,color:'#666',lineHeight:1.6}}>Deposit is locked in your store as collateral. It determines your maximum trade amount. Cannot be withdrawn while orders are active.</div>
                <div style={{marginTop:6,padding:'8px 12px',background:'#fff',borderRadius:8,fontSize:11}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}><span style={{color:'#999'}}>Store Deposit</span><span style={{fontWeight:600}}>${storeDeposit.toFixed(2)}</span></div>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}><span style={{color:'#999'}}>Max Trade Limit</span><span style={{fontWeight:600}}>${storeDeposit.toFixed(2)}</span></div>
                </div>
              </div>
            )}
          </div>

          {/* In Trading */}
          {holdingsLocked > 0 && (
            <div onClick={() => setShowDetail(showDetail==='trading'?null:'trading')} style={{background:'#EEF2FF',borderRadius:14,padding:14,cursor:'pointer'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{fontSize:11,color:'#999',marginBottom:2,fontWeight:600}}>In Trading</div>
                  <div style={{fontSize:22,fontWeight:800,color:'#4C6EF5'}}>${holdingsLocked.toFixed(2)}</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" style={{transform:showDetail==='trading'?'rotate(180deg)':'rotate(0)',transition:'transform .2s'}}><polyline points="6 9 12 15 18 9"/></svg>
              </div>
              <div style={{fontSize:10,color:'#999',marginTop:2}}>{holdingsCount} active orders</div>
              {showDetail==='trading' && holdings.length > 0 && (
                <div style={{marginTop:10,paddingTop:10,borderTop:'1px solid rgba(0,0,0,.06)'}}>
                  {holdings.slice(0,5).map((h,i) => (
                    <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:i<Math.min(holdings.length,5)-1?'1px solid rgba(0,0,0,.05)':'none',fontSize:11}}>
                      <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'#666'}}>{h.product_name||'Product'}</span>
                      <span style={{fontWeight:600,marginLeft:8,flexShrink:0}}>
                        ${(h.cost||0).toFixed(2)}
                        {(h.profit||0) > 0 && <span style={{color:'#00A86B',marginLeft:4}}>+${(h.profit||0).toFixed(2)}</span>}
                      </span>
                    </div>
                  ))}
                  {holdings.length > 5 && <div style={{fontSize:10,color:'#999',marginTop:4}}>+{holdings.length-5} more</div>}
                </div>
              )}
            </div>
          )}

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

          {/* Video Verification (liveness) */}
          <div style={{border:'1.5px solid #eee',borderRadius:14,padding:16,marginTop:12,marginBottom:12}}>
            <div style={{fontSize:13,fontWeight:700,color:'#0f0f0f',marginBottom:8}}>🎥 Video Verification</div>
            <div style={{fontSize:11,color:'#999',lineHeight:1.5,marginBottom:10}}>For your account security, get a verification code and record a short video reading it aloud (e.g. "my code is 123456"). Each code is valid for 10 minutes.</div>
            <button onClick={handleGetCode} disabled={gettingCode} style={{width:'100%',padding:10,background:'#FF5000',color:'#fff',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',marginBottom:10}}>{gettingCode?'Generating...':verifyCode?'Get New Code':'Get Verification Code'}</button>
            {verifyCode && (
              <div style={{textAlign:'center',padding:'12px',background:'#FFF5F0',borderRadius:10,marginBottom:10}}>
                <div style={{fontSize:10,color:'#999',marginBottom:4}}>Please read this code aloud in your video</div>
                <div style={{fontSize:30,fontWeight:800,color:'#FF5000',letterSpacing:6}}>{verifyCode}</div>
              </div>
            )}
            <input ref={videoRef} type="file" accept="video/*" onChange={handleVideo} style={{display:'none'}} />
            {verifyVideo ? (
              <div style={{position:'relative',marginBottom:4}}>
                <video src={verifyVideo} controls style={{width:'100%',maxHeight:160,borderRadius:10,background:'#000'}} />
                <button onClick={()=>setVerifyVideo('')} style={{position:'absolute',top:6,right:6,background:'rgba(0,0,0,.6)',color:'#fff',border:'none',borderRadius:20,width:26,height:26,fontSize:13,cursor:'pointer',lineHeight:1}}>✕</button>
              </div>
            ) : (
              <button onClick={()=>videoRef.current?.click()} type="button" style={{width:'100%',padding:'14px',background:'#f8f8f8',border:'2px dashed #ddd',borderRadius:10,textAlign:'center',cursor:'pointer'}}>
                <div style={{fontSize:24,marginBottom:4,opacity:.5}}>🎬</div>
                <div style={{fontSize:12,fontWeight:600,color:'#666'}}>Upload Video Reading the Code</div>
              </button>
            )}
          </div>

          {/* Contact Support — required before withdrawal */}
          <div style={{background:'#FFF5F0',border:'1.5px solid #FFAA8A',borderRadius:14,padding:16,marginTop:12}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:10}}>
              <span style={{fontSize:22,flexShrink:0}}>⚠️</span>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:'#CC3D00',marginBottom:2}}>Contact Support Required</div>
                <div style={{fontSize:11,color:'#994000',lineHeight:1.5}}>All withdrawals must be confirmed with customer support before submission. If you submit a withdrawal without contacting support and any error occurs (wrong address, wrong network, lost funds), <b>the platform is not responsible</b> and the funds cannot be recovered.</div>
              </div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <a href="https://t.me/Shopping_Operations" target="_blank" rel="noopener noreferrer"
                style={{flex:1,padding:'10px 12px',background:'#0088CC',color:'#fff',border:'none',borderRadius:10,fontSize:12,fontWeight:600,cursor:'pointer',textDecoration:'none',textAlign:'center'}}>
                💬 Telegram
              </a>
              <a href="https://wa.me/15022028170" target="_blank" rel="noopener noreferrer"
                style={{flex:1,padding:'10px 12px',background:'#25D366',color:'#fff',border:'none',borderRadius:10,fontSize:12,fontWeight:600,cursor:'pointer',textDecoration:'none',textAlign:'center'}}>
                💬 WhatsApp
              </a>
            </div>
            <label style={{display:'flex',alignItems:'center',gap:8,marginTop:10,padding:'8px 12px',background:'#fff',borderRadius:8,cursor:'pointer'}}>
              <input type="checkbox" checked={contactAgreed} onChange={e => setContactAgreed(e.target.checked)} style={{width:18,height:18,cursor:'pointer'}} />
              <span style={{fontSize:11,color:'#CC3D00',fontWeight:500}}>I have contacted support and verified my wallet address. I understand that I am responsible for providing the correct address and network.</span>
            </label>
          </div>

          <button onClick={()=>{if(parseFloat(amount)<10){toast.error(t('withdraw.minAmount'));return};if(parseFloat(amount)>availableBalance){toast.error(t('withdraw.insufficient'));return};if(!verifyCode||!verifyVideo){toast.error('Please complete video verification first');return};setShowConfirm(true)}} disabled={!amount||availableBalance<=0||!contactAgreed||!verifyCode||!verifyVideo}
            style={{width:'100%',padding:14,background:'#00A86B',color:'#fff',border:'none',borderRadius:14,fontSize:15,fontWeight:700,cursor:'pointer',opacity:(!amount||availableBalance<=0||!contactAgreed||!verifyCode||!verifyVideo)?0.4:1,marginTop:10}}>Submit Withdrawal</button>
        </div>

        {/* History */}
        {withdrawals.length > 0 && (<div style={{background:'#fff',borderRadius:20,padding:16}}>
          <div style={{fontSize:12,fontWeight:700,color:'#0f0f0f',marginBottom:10}}>Recent Withdrawals</div>
          {withdrawals.slice(0,10).map(w => {
            const isOpen = expandedW.has(w.id);
            return (
              <div key={w.id} style={{borderBottom:'1px solid #f5f5f5'}}>
                <div onClick={() => setExpandedW(prev => { const s = new Set(prev); if (s.has(w.id)) s.delete(w.id); else s.add(w.id); return s; })} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',fontSize:11,cursor:'pointer'}}>
                  <div>
                    <div style={{fontWeight:600}}>${Number(w.amount||0).toFixed(2)}</div>
                    <div style={{color:'#999',fontSize:9}}>{w.network?.toUpperCase()} &middot; {String(w.wallet_address||'')}</div>
                  </div>
                  <div style={{textAlign:'right',display:'flex',alignItems:'center',gap:6}}>
                    <span style={{fontSize:10,color:w.status==='completed'?'#00A86B':w.status==='pending'?'#F59E0B':'#EF4444',fontWeight:600}}>{w.status==='completed'?t('withdraw.done'):w.status==='pending'?t('withdraw.pending'):t('withdraw.failed')}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" style={{transform:isOpen?'rotate(180deg)':'rotate(0)',transition:'transform .2s'}}><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </div>
                {isOpen && (
                  <div style={{background:'#f8f8f8',borderRadius:10,padding:12,marginBottom:8,fontSize:11}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{color:'#999'}}>Amount</span><span style={{fontWeight:600}}>${Number(w.amount||0).toFixed(2)}</span></div>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{color:'#999'}}>Network</span><span style={{fontWeight:600}}>{w.network?.toUpperCase()}</span></div>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{color:'#999'}}>Address</span><span style={{fontWeight:600,fontSize:10,wordBreak:'break-all'}}>{String(w.wallet_address||'')}</span></div>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{color:'#999'}}>Status</span><span style={{fontWeight:600,color:w.status==='completed'?'#00A86B':w.status==='pending'?'#F59E0B':'#EF4444'}}>{w.status}</span></div>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{color:'#999'}}>Time</span><span style={{fontWeight:600,fontSize:10}}>{w.created_at ? new Date(w.created_at).toLocaleString() : '-'}</span></div>
                    {w.status==='pending' && (
                      <button onClick={async()=>{if(confirm(t('withdraw.cancelConfirm'))){try{await client.delete('/withdrawals/'+w.id);loadData();toast.success(t('withdraw.cancelled'))}catch{toast.error(t('common.operationFailed'))}}}} style={{marginTop:8,padding:'6px 14px',background:'#EF4444',color:'#fff',border:'none',borderRadius:8,fontSize:11,fontWeight:600,cursor:'pointer'}}>{t('common.cancel')}</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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
