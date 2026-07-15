import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { claimsApi } from '../api/claims';
import client from '../api/client';
import toast from 'react-hot-toast';

const NETWORKS = [
  { id: 'trc20', name: 'TRC20', symbol: 'USDT', chain: 'TRON', icon: '🔵', desc: 'Low fees, recommended' },
  { id: 'erc20', name: 'ERC20', symbol: 'USDT', chain: 'Ethereum', icon: '🟣', desc: 'Ethereum network, higher gas' },
  { id: 'bep20', name: 'BEP20', symbol: 'USDT', chain: 'BSC', icon: '🟡', desc: 'BSC, fast and cheap' },
];

export default function WalletPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState(null);
  const [showBind, setShowBind] = useState(false);
  const [form, setForm] = useState({ address: '', network: 'trc20' });

  useEffect(() => {
    client.get('/wallet').then(({ data }) => data && setWallet(data)).catch(() => toast.error(t('common.loadingFailed')));
  }, []);

  useEffect(() => {
    loadClaims();
    window.addEventListener('taskEarning', loadClaims);
    return () => window.removeEventListener('taskEarning', loadClaims);
  }, []);
  const loadClaims = () => {
    claimsApi.list()
      .then(({ data }) => setClaims(data))
      .catch(() => toast.error(t('common.loadingFailed')))
      .finally(() => setLoading(false));
  };

  const bindWallet = async () => {
    if (!form.address.trim()) { toast.error('Please enter wallet address'); return; }
    try {
      const { data } = await client.put('/wallet', { address: form.address.trim(), network: form.network });
      setWallet({ address: data.address, network: data.network });
      setShowBind(false);
      toast.success(t('wallet.boundSuccess'));
    } catch { toast.error('Failed'); }
  };

  const unbind = () => {
    if (!confirm(t('wallet.unbindConfirm'))) return;
    client.put('/wallet', { address: '', network: 'trc20' }).then(() => {
      setWallet(null);
      toast.success(t('wallet.unbound'));
    }).catch(() => toast.error(t('common.operationFailed')));
  };

  const currentNet = NETWORKS.find(n => n.id === (wallet?.network || 'trc20'));
  const [taskBal, setTaskBal] = useState({ available: 0, total: 0 });
  useEffect(() => {
    client.get('/tasks/balance').then(({ data }) => setTaskBal({ available: data.available || 0, total: data.total || 0 })).catch(() => toast.error(t('common.loadingFailed')));
  }, [claims]);
  const giftEarned = claims.filter(c => c.status !== 'rejected').reduce((s, c) => s + (c.value || 0), 0);
  const giftDelivered = claims.filter(c => c.status === 'delivered').reduce((s, c) => s + (c.value || 0), 0);
  const totalEarned = giftEarned + taskBal.total;
  const totalDelivered = giftDelivered + taskBal.available;

  const statusLabel = (s) => {
    if (s === 'delivered') return t('wallet.deliveredLabel');
    if (s === 'pending') return t('wallet.pendingLabel');
    return t('wallet.rejectedLabel');
  };

  if (loading) return (
    <div className="min-h-screen bg-bg p-4 space-y-4">
      <div className="skeleton h-8 w-32 rounded-lg" />
      <div className="skeleton h-48 rounded-3xl" />
      <div className="skeleton h-56 rounded-2xl" />
    </div>
  );

  return (
    <div className="min-h-screen bg-bg animate-fade-in">
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-separator">
        <button onClick={() => navigate('/mine')} className="flex items-center gap-1 text-primary font-medium text-sm pr-2 py-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
          {t('common.back')}
        </button>
        <h2 className="text-[16px] font-bold text-text">{t('mine.myWallet')}</h2>
      </div>

      <div className="p-4 space-y-5">
        <div className="bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-3xl p-6 text-white shadow-2xl shadow-blue-900/30" style={{ overflow: 'visible' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">💳</span>
              <span className="text-white/60 text-xs font-medium uppercase tracking-wider">{t('mine.myWallet')}</span>
            </div>
            {wallet && (
              <span className="text-[12px] bg-white/15 px-2 py-0.5 rounded-full">{currentNet?.symbol} · {currentNet?.name}</span>
            )}
          </div>
          <p className="text-white/40 text-[12px] font-medium uppercase tracking-[0.15em] mb-1">{t('mine.totalEarned')}</p>
          <p className="text-4xl font-black tracking-tight mb-1 break-text">${totalEarned.toFixed(2)}</p>
          <div className="flex gap-4 mt-5 pt-4 border-t border-white/10">
            <div className="flex-1">
              <p className="text-white/40 text-[12px] uppercase tracking-wider">{t('wallet.deliveredLabel')}</p>
              <p className="text-white font-bold text-lg">${totalDelivered.toFixed(0)}</p>
            </div>
            <div className="flex-1">
              <p className="text-white/40 text-[12px] uppercase tracking-wider">{t('wallet.pendingLabel')}</p>
              <p className="text-white font-bold text-lg">${(totalEarned - totalDelivered).toFixed(0)}</p>
            </div>
          </div>
        </div>

        {wallet ? (
          <div className="bg-white rounded-2xl p-4 border border-separator shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-bold text-text">🔗 {t('wallet.boundLabel')}</p>
              <button onClick={() => setShowBind(!showBind)} className="text-[12px] text-primary font-semibold">
                {showBind ? t('common.cancel') : t('wallet.changeBtn')}
              </button>
            </div>
            <div className="bg-bg rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{currentNet?.icon}</span>
                <span className="text-[13px] font-semibold">{currentNet?.symbol} · {currentNet?.name}</span>
                <span className="text-[12px] bg-success/10 text-success px-2 py-0.5 rounded-full">{t('wallet.bound')}</span>
              </div>
              <p className="text-[11px] font-mono text-text-secondary break-all leading-relaxed">{wallet.address}</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-5 border border-separator shadow-sm text-center">
            <p className="text-3xl mb-2">🔐</p>
            <p className="text-[13px] font-semibold text-text mb-1">{t('wallet.crypto')}</p>
            <p className="text-[12px] text-text-muted mb-3" dangerouslySetInnerHTML={{ __html: t('wallet.cryptoDesc') }} />
            <button onClick={() => setShowBind(true)}
              className="bg-primary text-white px-5 py-2.5 rounded-xl text-[13px] font-bold">
              {t('wallet.bindBtn')}
            </button>
          </div>
        )}

        {showBind && (
          <div className="bg-white rounded-2xl p-5 border border-separator shadow-sm space-y-4">
            <h3 className="text-[14px] font-bold text-text">{wallet ? t('wallet.replaceWallet') : t('wallet.bindBtn')}</h3>
            <div>
              <p className="text-[12px] text-text-muted font-medium mb-2">{t('wallet.selectNetwork')}</p>
              <div className="grid grid-cols-3 gap-2">
                {NETWORKS.map((net) => (
                  <button key={net.id} onClick={() => setForm({ ...form, network: net.id })}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${form.network === net.id ? 'border-primary bg-primary/5' : 'border-separator'}`}>
                    <span className="text-2xl block">{net.icon}</span>
                    <span className="text-[11px] font-semibold text-text">{net.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[12px] text-text-muted font-medium mb-2">{t('wallet.address')}</p>
              <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                placeholder={t('wallet.enterAddress', { chain: NETWORKS.find(n => n.id === form.network)?.chain || '' })}
                className="w-full px-4 py-3 rounded-xl border border-separator bg-bg text-[13px] font-mono focus:outline-none focus:border-primary" />
              <p className="text-[12px] text-text-muted mt-2">⚠️ {t('wallet.warning')}</p>
            </div>
            <div className="flex gap-2">
              {wallet && <button onClick={unbind} className="flex-1 py-3 bg-red-50 text-red-500 rounded-xl text-[13px] font-semibold">{t('wallet.unbind')}</button>}
              <button onClick={bindWallet} className="flex-1 py-3 bg-primary text-white rounded-xl text-[13px] font-bold">{wallet ? t('wallet.saveChange') : t('wallet.bindBtn')}</button>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-[13px] font-bold text-text-secondary uppercase tracking-wider mb-2 ml-1">📋 {t('wallet.transactions')}</h3>
          <div className="bg-white rounded-2xl border border-separator divide-y divide-separator">
            {claims.length > 0 ? claims.slice(0, 15).map((c) => (
              <div key={c.id} className="px-4 py-3 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0 ${
                  c.status === 'delivered' ? 'bg-success/10' :
                  c.status === 'pending' ? 'bg-yellow-100' :
                  c.status === 'rejected' ? 'bg-red-100' : 'bg-bg'
                }`}>
                  {c.status === 'delivered' ? '💰' : c.status === 'pending' ? '⏳' : '❌'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-text">{c.gift_name}</p>
                  <p className="text-[12px] text-text-muted">
                    {statusLabel(c.status)} · {(c.delivered_at || c.claimed_at || '').slice(0, 10)}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-[14px] font-bold ${c.status === 'delivered' ? 'text-success' : c.status === 'rejected' ? 'text-text-muted line-through' : 'text-primary'}`}>
                    {c.status === 'rejected' ? '' : '+'}${c.value}
                  </p>
                  {c.status === 'delivered' && c.delivered_at && (
                    <p className="text-[9px] text-text-muted">≈ {(c.value / 7.2).toFixed(2)} USDT</p>
                  )}
                </div>
              </div>
            )) : (
              <div className="py-12 text-center text-[13px] text-text-muted">
                <p className="text-4xl mb-2">📭</p>
                <p>{t('wallet.noTransactions')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
