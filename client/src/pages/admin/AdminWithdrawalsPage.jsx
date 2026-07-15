import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../../api/admin';
import toast from 'react-hot-toast';

export default function AdminWithdrawalsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [withdrawals, setWithdrawals] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [page, filterStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.listWithdrawals({ page, limit: 20, status: filterStatus });
      setWithdrawals(data.withdrawals || []);
      setTotal(data.total || 0);
    } catch { toast.error(t('common.loadingFailed')); }
    finally { setLoading(false); }
  };

  const handleUpdate = async (id, status) => {
    try {
      await adminApi.updateWithdrawal(id, { status });
      toast.success(status === 'completed' ? 'Approved' : 'Rejected');
      loadData();
    } catch { toast.error(t('common.operationFailed')); }
  };

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin')} className="text-text-muted hover:text-text-primary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <h1 className="text-lg font-bold text-text-primary">Withdrawal Management</h1>
        <span className="text-xs text-text-muted bg-gray-100 px-2 py-0.5 rounded-full">{total}</span>
      </div>

      <div className="flex gap-2">
        {[{ v: '', l: 'All' }, { v: 'pending', l: 'Pending' }, { v: 'completed', l: 'Completed' }, { v: 'rejected', l: 'Rejected' }].map(f => (
          <button key={f.v} onClick={() => { setFilterStatus(f.v); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold ${filterStatus === f.v ? 'bg-primary text-white' : 'bg-gray-100'}`}>
            {f.l}
          </button>
        ))}
      </div>

      {loading ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div> : withdrawals.length === 0 ? (
        <div className="text-center py-12 text-text-muted">No withdrawal records</div>
      ) : (
        <div className="space-y-3">
          {withdrawals.map(w => (
            <div key={w.id} className="bg-white rounded-2xl p-4 shadow-sm border">
              <div className="flex justify-between mb-2">
                <div>
                  <p className="font-semibold text-sm">{w.user_name || w.user_email}</p>
                  <p className="text-xs text-text-muted">{w.user_email} · {w.user_phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-primary">${w.amount}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    w.status === 'completed' ? 'bg-green-100 text-green-600' : w.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'
                  }`}>{w.status === 'pending' ? 'Pending' : w.status === 'completed' ? 'Completed' : 'Rejected'}</span>
                </div>
              </div>
              <div className="text-xs text-text-muted mb-3">
                <p>Network: {w.network?.toUpperCase()} · Address: {w.wallet_address?.slice(0, 10)}...{w.wallet_address?.slice(-6)}</p>
                <p>Requested: {w.created_at?.slice(0, 16)}</p>
              </div>
              {w.status === 'pending' && (
                <div className="flex gap-2">
                  <button onClick={() => handleUpdate(w.id, 'completed')} className="flex-1 py-2 bg-green-500 text-white rounded-xl text-sm font-semibold">{t('admin.approve')}</button>
                  <button onClick={() => handleUpdate(w.id, 'rejected')} className="flex-1 py-2 bg-red-500 text-white rounded-xl text-sm font-semibold">{t('admin.reject')}</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
