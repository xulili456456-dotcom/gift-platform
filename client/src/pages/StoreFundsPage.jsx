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
  const [expandedHolding, setExpandedHolding] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [orderHistory, setOrderHistory] = useState(null);
  const [orderPeriod, setOrderPeriod] = useState('today');

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

  if (!status?.hasStore) return <div className="min-h-screen bg-white flex items-center justify-center"><p className="text-gray-400">No store opened</p></div>;

  const s = status.store;

  return (
    <div className="min-h-screen bg-white" style={{maxWidth:430,margin:'0 auto'}}>
      <div style={{background:'#0f0f0f',padding:'6px 16px 10px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={() => navigate('/store')} style={{background:'none',border:'none',cursor:'pointer',padding:4}}>
          <ChevronLeft size={22} color="#fff" />
        </button>
        <span style={{fontSize:14,fontWeight:700,color:'#fff'}}>Funds</span>
      </div>
      <div className="p-3 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-[10px] text-gray-400 mb-1">Available Balance</p>
            <p className="text-2xl font-bold">${s.balance.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-[10px] text-gray-400 mb-1">Security Deposit</p>
            <p className="text-2xl font-bold">${(s.deposit||0).toFixed(2)}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
            <p className="text-[9px] text-gray-400">Max Trade</p>
            <p className="text-sm font-bold">${(s.maxTrade||0).toFixed(0)}</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
            <p className="text-[9px] text-gray-400">Free Orders</p>
            <p className="text-sm font-bold">{s.freeRemaining||0}/5</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
            <p className="text-[9px] text-gray-400">Today Earned</p>
            <p className="text-sm font-bold text-green-600">+${earnings.todayProfit.toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <h3 className="text-sm font-bold mb-3">Manage Security Deposit</h3>
          <p className="text-[10px] text-gray-400 mb-2">Security deposit is locked collateral. 1:1 ratio.</p>
          <div className="flex items-center gap-2 mb-3">
            <input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder="Amount" className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none" />
            <button onClick={handleDeposit} className="px-4 py-2.5 rounded-xl text-sm font-bold bg-[#FF5000] text-white">Add Security</button>
          </div>
          {depositMsg && <p className="text-xs text-green-600 font-bold mb-2">{depositMsg}</p>}
          {(s.deposit||0) > 0 && (
            <button onClick={handleWithdrawDeposit} className="w-full py-2.5 rounded-xl text-sm font-bold bg-red-50 text-red-500 border border-red-200">
              Withdraw ${(s.deposit||0).toFixed(0)} to Balance
            </button>
          )}
        </div>
        {/* Holdings */}
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <h3 className="text-sm font-bold mb-2">Active Holdings ({holdings.length})</h3>
          {holdings.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No active holdings</p>}
          {holdings.map(h => {
            const profit = Math.round((Number(h.cost) / COST_RATE * PROFIT_RATE) * 100) / 100;
            const isOpen = expandedHolding === h.id;
            return (
            <div key={h.id} className="border-b border-gray-100 last:border-0">
              <div className="py-2 cursor-pointer" onClick={() => setExpandedHolding(isOpen ? null : h.id)}>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium truncate max-w-[70%]">{h.product_name || `Order #${h.id}`}</span>
                  <span className="text-green-600 font-bold">+${profit.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-[9px] text-gray-400 mt-0.5">
                  <span>Cost ${Number(h.cost).toFixed(2)} · Sell by {new Date(h.sell_by).toLocaleDateString()}</span>
                  <span>{h.progress}%</span>
                </div>
                <div className="w-full h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-[#FF5000] rounded-full" style={{width:`${h.progress}%`}} />
                </div>
              </div>
            </div>
          )})}
        </div>
        {/* Today's Orders */}
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <h3 className="text-sm font-bold mb-2">Today's Orders</h3>
          {(!orderHistory?.orders || orderHistory.orders.length === 0) && <p className="text-xs text-gray-400 text-center py-4">No orders today</p>}
          {orderHistory?.orders?.slice(0,20).map(o => {
            const profit = Number(o.profit) || 0;
            const isOpen = expandedOrder === o.id;
            return (
            <div key={o.id} className="border-b border-gray-100 last:border-0">
              <div className="flex items-center justify-between py-2 cursor-pointer" onClick={() => setExpandedOrder(isOpen ? null : o.id)}>
                <div className="flex-1 min-w-0 mr-2">
                  <p className="text-[11px] font-medium truncate">{o.product_name || `Order #${o.id}`}</p>
                  <p className="text-[9px] text-gray-400">{new Date(o.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</p>
                </div>
                <span className="text-[11px] font-bold text-green-600">+${profit.toFixed(2)}</span>
              </div>
            </div>
          )})}
        </div>
        <div className="h-4" />
      </div>
    </div>
  );
}
