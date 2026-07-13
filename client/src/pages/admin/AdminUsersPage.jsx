import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../../api/admin';
import toast from 'react-hot-toast';

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailUser, setDetailUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { loadUsers(); }, [page]);

  const loadUsers = async () => {
    setLoading(true);
    try { const { data } = await adminApi.listUsers({ page, limit: 20, search }); setUsers(data.users); setTotal(data.total); }
    catch { toast.error(t('common.loadingFailed')); }
    finally { setLoading(false); }
  };

  const handleSearch = (e) => { e.preventDefault(); setPage(1); loadUsers(); };

  const viewDetail = async (userId) => {
    try { const { data } = await adminApi.getUserDetail(userId); setDetailUser(data); }
    catch { toast.error(t('common.loadingFailed')); }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin')} className="text-text-muted hover:text-text-primary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <h1 className="text-lg font-bold text-text-primary">{t('admin.userMgmt')}</h1>
        <span className="text-xs text-text-muted bg-gray-100 px-2 py-0.5 rounded-full">{total} {t('common.people')}</span>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('admin.searchPlaceholder')} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-primary transition-colors" />
        <button type="submit" className="bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium active:scale-95 transition-transform">{t('admin.search')}</button>
      </form>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <div className="p-4 space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-14 rounded-xl" />)}</div> : (
          <>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 bg-warm-bg"><th className="text-left px-4 py-3 text-xs font-medium text-text-muted">ID</th><th className="text-left px-4 py-3 text-xs font-medium text-text-muted">{t('auth.email')}</th><th className="text-left px-4 py-3 text-xs font-medium text-text-muted">{t('auth.phone')}</th><th className="text-left px-4 py-3 text-xs font-medium text-text-muted">{t('auth.name')}</th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} onClick={() => viewDetail(u.id)} className="border-b border-gray-50 hover:bg-warm-bg/50 cursor-pointer transition-colors">
                    <td className="px-4 py-3 text-text-muted">{u.id}</td>
                    <td className="px-4 py-3"><p className="font-medium text-text-primary">{u.name || '-'}</p><p className="text-xs text-text-muted">{u.email}</p></td>
                    <td className="px-4 py-3 text-text-secondary">{u.phone}</td>
                    <td className="px-4 py-3 text-xs text-text-muted">{u.created_at?.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 p-4 border-t border-gray-100">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-30 bg-gray-100">{t('admin.prevPage')}</button>
                <span className="px-3 py-1.5 text-xs text-text-muted">{page}/{totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-30 bg-gray-100">{t('admin.nextPage')}</button>
              </div>
            )}
          </>
        )}
      </div>

      {detailUser && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={() => setDetailUser(null)}>
          <div className="bg-white rounded-t-3xl w-full max-w-[480px] p-6 animate-slide-up max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <h2 className="text-lg font-bold text-text-primary mb-4">{detailUser.name || detailUser.email}</h2>
            <div className="bg-warm-bg rounded-xl p-4 space-y-2 text-sm mb-4">
              <div className="flex justify-between"><span className="text-text-muted">ID</span><span className="font-medium">{detailUser.id}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">{t('auth.email')}</span><span className="font-medium">{detailUser.email}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">{t('auth.phone')}</span><span className="font-medium">{detailUser.phone}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">{t('auth.referralCode')}</span><span className="font-medium font-mono">{detailUser.referral_code}</span></div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[1,2,3].map(level => (
                <div key={level} className="bg-primary/5 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-primary">{detailUser.stats?.[`level${level}`] || 0}</p>
                  <p className="text-[11px] text-text-muted">{t(`tasks.level${level}`)}</p>
                </div>
              ))}
            </div>
            <p className="text-sm font-medium text-text-primary mb-2">{t('gifts.effectiveInvites')}: <strong className="text-primary">{detailUser.effective?.effective || 0}</strong></p>
            <button onClick={() => setDetailUser(null)} className="w-full py-3 text-text-muted text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">{t('admin.close')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
