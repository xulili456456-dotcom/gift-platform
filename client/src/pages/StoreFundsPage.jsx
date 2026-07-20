import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const COST_RATE = 0.85;
const PROFIT_RATE = 0.15;

export default function StoreFundsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [earnings, setEarnings] = useState({ todayProfit: 0, totalProfit: 0 });
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMsg, setDepositMsg] = useState('');
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

  useEffect(() => { loadStatus(); loadEarnings(); loadHoldings(); client.get('/store/orders-history?period=today').then(({data}) => setOrderHistory(data)).catch(()=>{}); }, []);

  const handleDeposit = async () => {
    const amt = parseFloat(depositAmount);
    if (!amt || amt < 1) { toast.error('Minimum $1'); return; }
    try { await client.post('/store/deposit', { amount: amt }); setDepositMsg(`Deposited $${amt}!`); setDepositAmount(''); loadStatus(); loadEarnings(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };
  const handleWithdrawDeposit = async () => {
    try { await client.post('/store/withdraw-deposit', {}); toast.success('Deposit returned to balance'); loadStatus(); loadEarnings(); }
    catch (err) { toast.error(err.response?.data?.detail || err.response?.data?.error || 'Failed'); }
  };

  if (!status?.hasStore) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-400">No store opened</p></div>;

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
            ${Math.floor(s.balance)}<span style={{fontSize:20,color:'#ccc'}}>.{(s.balance%1).toFixed(2).substring(2)}</span>
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
            <button onClick={handleWithdrawDeposit} style={{width:'100%',padding:10,background:'none',color:'#CC0C39',border:'1px solid #FFCDD2',borderRadius:12,fontSize:12,fontWeight:600,cursor:'pointer'}}>
              Withdraw ${(s.deposit||0).toFixed(0)} to Balance
            </button>
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
            const profit = Math.round((Number(h.cost) / COST_RATE * PROFIT_RATE) * 100) / 100;
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
            const cost = profit > 0 ? Math.round((profit / PROFIT_RATE * COST_RATE) * 100) / 100 : 0;
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
