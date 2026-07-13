import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../../api/admin';
import toast from 'react-hot-toast';

export default function AdminClaimsPage() {
  const { t, i18n } = useTranslation();
  const tgName = (name) => {
    const gd = i18n.getResource(i18n.language, 'translation', 'giftData');
    if (gd && gd[name]) return gd[name].name;
    return name;
  };
  const [claims, setClaims] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { loadClaims(); }, [page, filterStatus]);

  const loadClaims = async () => {
    setLoading(true);
    try { const { data } = await adminApi.listClaims({ page, limit: 20, status: filterStatus }); setClaims(data.claims); setTotal(data.total); }
    catch { toast.error(t('common.loadingFailed')); }
    finally { setLoading(false); }
  };

  const handleUpdate = async (id, status) => {
    try { await adminApi.updateClaim(id, { status }); toast.success(status === 'delivered' ? '✅ Delivered' : '❌ Rejected'); loadClaims(); }
    catch { toast.error(t('common.operationFailed')); }
  };

  const statusColors = { pending: 'bg-yellow-100 text-yellow-700', claimed: 'bg-blue-100 text-blue-700', delivered: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-600' };
  const statusLabels = { pending: t('rewards.status.pending'), claimed: t('rewards.status.claimed'), delivered: t('rewards.status.delivered'), rejected: t('rewards.status.rejected') };

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin')} className="text-text-muted hover:text-text-primary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <h1 className="text-lg font-bold text-text-primary">{t('admin.claimMgmt')}</h1>
        <span className="text-xs text-text-muted bg-gray-100 px-2 py-0.5 rounded-full">{total}</span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {[{ value: '', label: t('admin.all') }, { value: 'pending', label: '⏳ '+t('rewards.status.pending') }, { value: 'delivered', label: '✅ '+t('rewards.status.delivered') }, { value: 'rejected', label: '❌ '+t('rewards.status.rejected') }].map((f) => (
          <button key={f.value} onClick={() => { setFilterStatus(f.value); setPage(1); }} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterStatus === f.value ? 'bg-primary text-white' : 'bg-gray-100 text-text-secondary hover:bg-gray-200'}`}>{f.label}</button>
        ))}
      </div>

      {loading ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-28 rounded-2xl" />)}</div> : claims.length === 0 ? <div className="text-center py-12 text-text-muted text-sm">{t('admin.noData')}</div> : (
        <div className="space-y-3">
          {claims.map((claim) => (
            <div key={claim.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl">{claim.gift_type === 'cash' ? '🧧' : '🎁'}</div>
                  <div>
                    <p className="font-semibold text-sm text-text-primary">{tgName(claim.gift_name)} · ${claim.value}</p>
                    <p className="text-xs text-text-muted">{claim.user_name || claim.user_email}</p>
                  </div>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${statusColors[claim.status]}`}>{statusLabels[claim.status]}</span>
              </div>
              <div className="text-xs text-text-muted mb-3">
                <p>{claim.user_email} · {claim.user_phone}</p>
                <p>{(claim.claimed_at||'').slice(0, 16).replace('T', ' ')}</p>
              </div>
              {claim.status === 'pending' && (
                <div className="flex gap-2">
                  <button onClick={() => handleUpdate(claim.id, 'delivered')} className="flex-1 py-2.5 bg-success text-white rounded-xl text-sm font-medium active:scale-95 transition-transform">✅ {t('admin.approve')}</button>
                  <button onClick={() => handleUpdate(claim.id, 'rejected')} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium active:scale-95 transition-transform">❌ {t('admin.reject')}</button>
                </div>
              )}
              {claim.admin_note && <p className="text-xs text-text-muted mt-2 bg-warm-bg rounded-xl p-2.5">{claim.admin_note}</p>}
            </div>
          ))}
        </div>
      )}

      {total > 20 && (
        <div className="flex justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-30 bg-gray-100">{t('admin.prevPage')}</button>
          <span className="px-3 py-1.5 text-xs text-text-muted">{page}/{Math.ceil(total / 20)}</span>
          <button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-30 bg-gray-100">{t('admin.nextPage')}</button>
        </div>
      )}
    </div>
  );
}
