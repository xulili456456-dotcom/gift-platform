import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';

function getRates(price){
  var today = new Date().toISOString().slice(0,10);
  var daySeed = today.split('-').reduce(function(s,x){return s+parseInt(x)},0);
  var shift = ((daySeed * 7 + 13) % 100 - 50) / 500;
  var rng = (function(s){var x=Math.sin(s*9301+49297)*49297;return x-Math.floor(x)})(price*31+daySeed);
  var base;
  if (price < 20) base = 0.05 + 0.04 * rng;
  else if (price < 100) base = 0.06 + 0.09 * rng;
  else if (price < 500) base = 0.08 + 0.10 * rng;
  else base = 0.13 + 0.12 * rng;
  var pr = Math.max(0.05, Math.min(0.25, base + shift));
  return { profitRate: pr, costRate: 1 - pr };
}

export default function StoreFundsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [earnings, setEarnings] = useState({ todayProfit: 0, totalProfit: 0 });
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [depositMsg, setDepositMsg] = useState('');
  const [withdrawError, setWithdrawError] = useState(null);
  const [orderHistory, setOrderHistory] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [expandedHolding, setExpandedHolding] = useState(null);

  const loadStatus = useCallback(async () => {
    try { const { data } = await client.get('/store/status'); setStatus(data); } catch {}
  }, []);
  const loadEarnings = useCallback(async () => {
    try { const { data } = await client.get('/store/earnings-stats'); setEarnings(data); } catch {}
  }, []);
  const loadHoldings = useCallback(async () => {
    try { const { data } = await client.get('/store/holdings'); setHoldings(data); } catch {}
  }, []);

  useEffect(() => { loadStatus(); loadEarnings(); loadHoldings(); client.get('/store/orders-history?period=all').then(({data}) => setOrderHistory(data)).catch(()=>{}); }, []);

  const handleDeposit = async () => {
    const amt = parseFloat(depositAmount);
    if (!amt || amt < 1) { toast.error('Minimum $1'); return; }
    try { await client.post('/store/deposit', { amount: amt }); setDepositMsg(`Deposited $${amt}!`); setDepositAmount(''); loadStatus(); loadEarnings(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };
  const handleWithdrawDeposit = async () => {
    setWithdrawError(null);
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt < 1) { toast.error('Minimum $1'); return; }
    if (amt > (s.deposit || 0)) { toast.error('Insufficient deposit'); return; }
    try { await client.post('/store/withdraw-deposit', { amount: amt }); toast.success(`$${amt} returned to balance`); setWithdrawAmount(''); loadStatus(); loadEarnings(); }
    catch (err) { setWithdrawError(err.response?.data || { error: 'Failed' }); }
  };

  if (!status) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!status.hasStore && (!orderHistory?.orders || orderHistory.orders.length === 0)) return <div className="min-h-screen bg-gray-50 flex items-center justify-center flex-col gap-3"><p className="text-gray-400">No store opened</p><button onClick={() => navigate('/store')} style={{padding:'10px 24px',background:'#FF5000',color:'#fff',border:'none',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer'}}>Open Store</button></div>;

  const s = status.store;

  return (
    <div className="min-h-screen bg-gray-50" style={{maxWidth:430,margin:'0 auto',paddingBottom:80}}>
      {/* Header */}
      <div style={{background:'#0f0f0f',padding:'8px 16px 12px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={() => navigate('/store')} style={{background:'none',border:'none',cursor:'pointer',padding:0,fontSize:20,color:'#fff'}}>←</button>
        <span style={{color:'#fff',fontSize:14,fontWeight:700}}>Funds</span>
      </div>

      <div style={{padding:16}}>
        {/* Available Balance Card */}
        <div style={{background:'#fff',borderRadius:20,padding:20,textAlign:'center',marginBottom:14}}>
          <div style={{fontSize:11,color:'#999',marginBottom:4}}>Available Balance</div>
          <div style={{fontSize:42,fontWeight:800,color:'#0f0f0f',lineHeight:1}}>
            ${Math.floor(s.balance||0)}<span style={{fontSize:20,color:'#ccc'}}>.{((s.balance||0)%1).toFixed(2).substring(2)}</span>
          </div>
          <div style={{display:'flex',justifyContent:'center',gap:24,marginTop:10}}>
            <div><span style={{fontSize:10,color:'#999'}}>Security </span><span style={{fontSize:14,fontWeight:700}}>${(s.deposit||0).toFixed(0)}</span></div>
            <div><span style={{fontSize:10,color:'#999'}}>Free </span><span style={{fontSize:14,fontWeight:700,color:'#FF5000'}}>{s.freeRemaining||0}/5</span></div>
            <div><span style={{fontSize:10,color:'#999'}}>Total Profit </span><span style={{fontSize:14,fontWeight:700,color:'#00A86B'}}>+${(earnings.totalProfit || 0).toFixed(0)}</span></div>
          </div>
        </div>

        {/* Security Deposit Card */}
        <div style={{background:'#fff',borderRadius:20,padding:16,marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:700,color:'#0f0f0f',marginBottom:10}}>Security Deposit</div>
          <div style={{display:'flex',gap:8,marginBottom:8}}>
            <input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder="Amount" style={{flex:1,padding:'10px 14px',background:'#f5f5f5',border:'none',borderRadius:12,fontSize:14,outline:'none'}} />
            <button onClick={handleDeposit} style={{padding:'10px 20px',background:'#00A86B',color:'#fff',border:'none',borderRadius:12,fontSize:13,fontWeight:700,cursor:'pointer'}}>Add Security</button>
          </div>
          {depositMsg && <p style={{fontSize:11,color:'#00A86B',fontWeight:600,marginBottom:8}}>{depositMsg}</p>}
          {(s.deposit||0) > 0 && (
            <div style={{marginBottom:8}}>
              <div style={{fontSize:11,color:'#999',marginBottom:4}}>Withdraw amount (max ${(s.deposit||0).toFixed(0)})</div>
              <div style={{display:'flex',gap:8}}>
                <input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} placeholder="Amount" style={{flex:1,padding:'10px 14px',background:'#f5f5f5',border:'none',borderRadius:12,fontSize:14,outline:'none'}} />
                <button onClick={() => setWithdrawAmount(String(s.deposit||0))} style={{padding:'10px 12px',background:'#f5f5f5',border:'none',borderRadius:12,fontSize:11,fontWeight:600,color:'#666',cursor:'pointer'}}>Max</button>
                <button onClick={handleWithdrawDeposit} style={{padding:'10px 18px',background:'#FF5000',color:'#fff',border:'none',borderRadius:12,fontSize:12,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>Withdraw</button>
              </div>
            </div>
          )}
          {withdrawError && (
            <div style={{background:'#FFF5F5',border:'1px solid #FFCDD2',borderRadius:14,padding:16,marginTop:12}}>
              <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                <div style={{width:32,height:32,borderRadius:16,background:'#FFCDD2',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CC0C39" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:'#CC0C39',marginBottom:4}}>Cannot withdraw right now</div>
                  <div style={{fontSize:12,color:'#666',lineHeight:1.5}}>{withdrawError.detail || withdrawError.error}</div>
                  {withdrawError.maxHoldingCost && (
                    <div style={{display:'flex',gap:16,marginTop:10,paddingTop:10,borderTop:'1px solid #FFCDD2'}}>
                      <div><div style={{fontSize:9,color:'#999'}}>Max Order</div><div style={{fontSize:14,fontWeight:700,color:'#0f0f0f'}}>${withdrawError.maxHoldingCost.toFixed(2)}</div></div>
                      <div><div style={{fontSize:9,color:'#999'}}>Your Deposit</div><div style={{fontSize:14,fontWeight:700,color:'#F59E0B'}}>${(withdrawError.currentDeposit||0).toFixed(2)}</div></div>
                      <div><div style={{fontSize:9,color:'#999'}}>After Withdraw</div><div style={{fontSize:14,fontWeight:700,color:'#EF4444'}}>${(withdrawError.newDeposit||0).toFixed(2)}</div></div>
                    </div>
                  )}
                  <button onClick={() => setWithdrawError(null)} style={{marginTop:10,padding:'6px 14px',background:'#fff',color:'#666',border:'1px solid #ddd',borderRadius:8,fontSize:11,fontWeight:600,cursor:'pointer'}}>Dismiss</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Active Holdings */}
        <div style={{background:'#fff',borderRadius:20,padding:16,marginBottom:14}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <span style={{fontSize:12,fontWeight:700,color:'#0f0f0f'}}>Active Holdings</span>
            <span style={{fontSize:10,color:'#999'}}>{holdings.length} orders</span>
          </div>
          {holdings.length === 0 && <p style={{fontSize:11,color:'#999',textAlign:'center',padding:20}}>No active holdings</p>}
          {holdings.map(h => {
            const profit = Number(h.profit) || (Number(h.cost) / 0.86 * 0.14);
            const isOpen = expandedHolding === h.id;
            const totalReturn = Number(h.cost) + profit;
            return (
            <div key={h.id} style={{borderBottom:'1px solid #f5f5f5',paddingBottom:10,marginBottom:10}}>
              <div onClick={() => setExpandedHolding(isOpen ? null : h.id)} style={{display:'flex',justifyContent:'space-between',cursor:'pointer'}}>
                <div style={{flex:1,minWidth:0,paddingRight:8}}>
                  <div style={{fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{h.product_name || `Order #${h.id}`}</div>
                  <div style={{fontSize:10,color:'#999',marginTop:2}}>Cost ${Number(h.cost).toFixed(2)} · Sell by {new Date(h.sell_by).toLocaleDateString()}</div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontSize:15,fontWeight:700,color:'#00A86B'}}>+${profit.toFixed(2)}</div>
                  <div style={{fontSize:10,color:'#999'}}>{h.progress}%</div>
                </div>
              </div>
              <div style={{width:'100%',height:3,background:'#f0f0f0',borderRadius:2,marginTop:6}}>
                <div style={{width:`${h.progress}%`,height:'100%',background:h.progress>60?'#00A86B':'#FF5000',borderRadius:2}}></div>
              </div>
              {isOpen && (
                <div style={{marginTop:8,padding:8,background:'#f8f8f8',borderRadius:8,fontSize:10,color:'#666'}}>
                  <div style={{display:'flex',justifyContent:'space-between'}}><span>Product</span><span style={{color:'#333',fontWeight:500,textAlign:'right',flex:1,marginLeft:8}}>{h.product_name || '-'}</span></div>
                  <div style={{display:'flex',justifyContent:'space-between',marginTop:3}}><span>Created</span><span style={{color:'#333'}}>{new Date(h.created_at).toLocaleString()}</span></div>
                  <div style={{display:'flex',justifyContent:'space-between',marginTop:3}}><span>Sell By</span><span style={{color:'#333'}}>{new Date(h.sell_by).toLocaleString()}</span></div>
                  <div style={{display:'flex',justifyContent:'space-between',marginTop:3,fontWeight:600}}><span>Total Return</span><span style={{color:'#00A86B'}}>${totalReturn.toFixed(2)}</span></div>
                </div>
              )}
            </div>
          )})}
        </div>

        {/* Today's Orders */}
        <div style={{background:'#fff',borderRadius:20,padding:16}}>
          <div style={{fontSize:12,fontWeight:700,color:'#0f0f0f',marginBottom:10}}>Today's Orders</div>
          {(!orderHistory?.orders || orderHistory.orders.length === 0) && <p style={{fontSize:11,color:'#999',textAlign:'center',padding:20}}>No orders today</p>}
          {orderHistory?.orders?.slice(0,20).map(o => {
            const profit = Number(o.profit) || 0;
            const cost = profit > 0 ? Math.round(profit / 0.14 * 0.86 * 100) / 100 : 0;
            const isOpen = expandedOrder === o.id;
            return (
            <div key={o.id} style={{borderBottom:'1px solid #f5f5f5'}}>
              <div onClick={() => setExpandedOrder(isOpen ? null : o.id)} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',fontSize:11,cursor:'pointer'}}>
                <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,marginRight:8}}>#{o.id} {o.product_name||''}</span>
                <span style={{color:'#00A86B',flexShrink:0}}>+${profit.toFixed(2)}</span>
                <span style={{color:'#999',marginLeft:8,flexShrink:0}}>{new Date(o.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
              </div>
              {isOpen && (
                <div style={{padding:'0 0 8px 0',fontSize:10,color:'#666',display:'flex',justifyContent:'space-between'}}>
                  <span>Cost ${cost.toFixed(2)}</span>
                  <span style={{color:'#00A86B'}}>+${profit.toFixed(2)}</span>
                  <span>Return ${(cost+profit).toFixed(2)}</span>
                </div>
              )}
            </div>
          )})}
        </div>
      </div>
    </div>
  );
}
