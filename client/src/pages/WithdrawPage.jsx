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
  const [wallet, setWallet] = useState(null);
  useEffect(() => { client.get('/wallet').then(({ data }) => data && setWallet(data)).catch(() => toast.error(t('common.loadingFailed'))); }, []);
  const [withdrawals, setWithdrawals] = useState([]);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    if (!wallet) { toast.error(t('withdraw.noWallet')); return; }
    setSubmitting(true);
    try {
      await client.post('/withdrawals', { amount: amt, network: wallet.network, wallet_address: wallet.address });
      setAmount('');
      toast.success(t('withdraw.success'));
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || t('common.operationFailed'));
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="min-h-screen bg-bg p-4"><div className="skeleton h-40 rounded-2xl" /></div>;

  return (
    <div className="min-h-screen bg-bg animate-fade-in">
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-separator">
        <button onClick={() => navigate('/mine')} className="flex items-center gap-1 text-primary font-medium text-sm pr-2 py-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
          {t('common.back')}
        </button>
        <h2 className="text-[16px] font-bold text-text">{t('withdraw.title')}</h2>
      </div>
      <div className="p-4 space-y-5">
        <div className="bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-2xl p-5 text-white shadow-xl">
          <div className="flex items-center gap-2 mb-3"><Wallet size={18} className="text-white/60" /><span className="text-white/60 text-[11px] uppercase">{t('withdraw.balance')}</span></div>
          <p className="text-3xl font-black">${availableBalance.toFixed(2)}</p>
          <div className="flex gap-4 mt-4 pt-4 border-t border-white/10 text-[12px]">
            <div><p className="text-white/40">{t('withdraw.pending')}</p><p className="font-bold">${pendingBalance.toFixed(2)}</p></div>
            <div><p className="text-white/40">{t('withdraw.totalWithdrawn')}</p><p className="font-bold">${withdrawals.filter(w => w.status === 'completed').reduce((s, w) => s + (w.amount || 0), 0).toFixed(2)}</p></div>
          </div>
        </div>

        {wallet ? (
          <div className="bg-white rounded-2xl p-5 border border-separator shadow-sm space-y-4">
            <h3 className="text-[14px] font-bold text-text">{t('withdraw.withdrawNow')}</h3>
            <div className="bg-bg rounded-xl p-3 flex items-center gap-2 text-[12px]">
              <span className="text-text-muted">{t('withdraw.to')}:</span>
              <span className="font-mono font-semibold text-[11px] break-all">{wallet.address}</span>
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{wallet.network.toUpperCase()}</span>
            </div>
            <div>
              <label className="text-[11px] text-text-muted font-medium mb-1.5 block">{t('withdraw.amount')}</label>
              <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-bold">$</span>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder={t('withdraw.minPlaceholder')} min="20" step="1"
                  className="w-full pl-8 pr-4 py-3 rounded-xl border border-separator bg-bg text-lg font-bold focus:outline-none focus:border-primary" />
              </div>
              <p className="text-[10px] text-text-muted mt-1.5">{t('withdraw.available')}: ${availableBalance.toFixed(2)}</p>
            </div>
            <button onClick={handleWithdraw} disabled={submitting || !amount || availableBalance <= 0}
              className="w-full py-3.5 bg-primary text-white rounded-xl text-[14px] font-bold active:scale-[0.98] disabled:opacity-40">
              {submitting ? t('withdraw.submitting') : t('withdraw.submit')}
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-6 border border-separator shadow-sm text-center">
            <p className="text-3xl mb-2">🔐</p>
            <p className="text-[13px] font-semibold text-text mb-1">{t('withdraw.bindFirst')}</p>
            <button onClick={() => navigate('/mine/wallet')} className="bg-primary text-white px-5 py-2.5 rounded-xl text-[13px] font-bold">{t('wallet.bindBtn')}</button>
          </div>
        )}

        {withdrawals.length > 0 && (
          <div>
            <h3 className="text-[13px] font-bold text-text-secondary uppercase tracking-wider mb-2 ml-1">{t('withdraw.history')}</h3>
            <div className="bg-white rounded-2xl border border-separator divide-y divide-separator">
              {withdrawals.slice(0, 10).map(w => (
                <div key={w.id} className="px-4 py-3 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${w.status === 'completed' ? 'bg-success/10' : w.status === 'pending' ? 'bg-yellow-100' : 'bg-red-100'}`}>
                    {w.status === 'completed' ? <CheckCircle size={16} className="text-success" /> : w.status === 'pending' ? <Clock size={16} className="text-yellow-600" /> : <AlertCircle size={16} className="text-red-500" />}
                  </div>
                  <div className="flex-1"><p className="text-[13px] font-medium">${w.amount} → {w.network?.toUpperCase()}</p><p className="text-[10px] text-text-muted break-all font-mono">{w.wallet_address || ''}</p><p className="text-[10px] text-text-muted">{w.created_at?.slice(0, 10)}</p></div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${w.status === 'completed' ? 'bg-success/10 text-success' : w.status === 'pending' ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-500'}`}>
                      {w.status === 'completed' ? t('withdraw.done') : w.status === 'pending' ? t('withdraw.pending') : t('withdraw.failed')}
                    </span>
                    {w.status === 'pending' && (
                      <button onClick={async () => { if (confirm(t('withdraw.cancelConfirm'))) { try { await client.delete('/withdrawals/' + w.id); loadData(); toast.success(t('withdraw.cancelled')); } catch { toast.error(t('common.operationFailed')); } } }}
                        className="text-[10px] text-red-400 underline font-medium">{t('common.cancel')}</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
