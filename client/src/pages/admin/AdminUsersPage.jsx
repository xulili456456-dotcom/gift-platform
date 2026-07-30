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
  const [dupCount, setDupCount] = useState(0);
  const [dupIPs, setDupIPs] = useState(new Set());
  const navigate = useNavigate();

  useEffect(() => { loadUsers(); loadIpDuplicates(); }, [page]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.listUsersEnhanced({ page, limit: 20, search });
      setUsers(data.users);
      setTotal(data.total);
    } catch {
      toast.error(t('common.loadingFailed'));
    } finally {
      setLoading(false);
    }
  };

  const loadIpDuplicates = async () => {
    try {
      const { data } = await adminApi.getIpDuplicates();
      setDupCount(data.length);
      const ips = new Set();
      for (const d of data) {
        if (d.ids) d.ids.forEach(id => ips.add(String(id)));
      }
      setDupIPs(ips);
    } catch { /* silent */ }
  };

  const handleSearch = (e) => { e.preventDefault(); setPage(1); loadUsers(); };

  const viewDetail = async (userId) => {
    try {
      const [detailRes, ipRes] = await Promise.all([
        adminApi.getUserDetail(userId),
        adminApi.getUserIps({ user_id: userId }),
      ]);
      const detail = detailRes.data;
      const ipRow = (ipRes.data || [])[0] || null;
      setDetailUser({
        ...detail,
        reg_ip: ipRow?.reg_ip || detail.ip_address || '',
        login_ips: ipRow?.login_ips || [],
      });
    } catch {
      toast.error(t('common.loadingFailed'));
    }
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
        {dupCount > 0 && (
          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            {dupCount} IP dup{dupCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('admin.searchPlaceholder')} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-primary transition-colors" />
        <button type="submit" className="bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium active:scale-95 transition-transform">{t('admin.search')}</button>
      </form>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <div className="p-4 space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-14 rounded-xl" />)}</div> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100 bg-warm-bg">
                  <th className="text-left px-3 py-3 text-xs font-medium text-text-muted">ID</th>
                  <th className="text-left px-3 py-3 text-xs font-medium text-text-muted">{t('auth.email')}/{t('auth.name')}</th>
                  <th className="text-left px-3 py-3 text-xs font-medium text-text-muted">{t('auth.phone')}</th>
                  <th className="text-left px-3 py-3 text-xs font-medium text-text-muted">IP</th>
                  <th className="text-left px-3 py-3 text-xs font-medium text-text-muted">{t('admin.createdAt') || 'Joined'}</th>
                </tr></thead>
                <tbody>
                  {users.map((u) => {
                    const hasDupIP = u.ip_address && dupIPs.has(String(u.id));
                    return (
                      <tr key={u.id} onClick={() => viewDetail(u.id)} className="border-b border-gray-50 hover:bg-warm-bg/50 cursor-pointer transition-colors">
                        <td className="px-3 py-3 text-text-muted text-xs">{u.id}</td>
                        <td className="px-3 py-3">
                          <p className="font-medium text-text-primary text-sm">{u.name || '-'}</p>
                          <p className="text-xs text-text-muted">{u.email}</p>
                        </td>
                        <td className="px-3 py-3 text-text-secondary text-xs">{u.phone}</td>
                        <td className="px-3 py-3">
                          {u.ip_address ? (
                            <div className="flex items-center gap-1.5">
                              <code className={`text-xs font-mono ${hasDupIP ? 'text-amber-600 bg-amber-50 border border-amber-200' : 'text-text-muted bg-gray-100'} px-1.5 py-0.5 rounded`}>
                                {u.ip_address}
                              </code>
                              {hasDupIP && (
                                <span className="text-[10px] text-amber-600" title="This IP is shared with other users">⚠️</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-text-muted italic">N/A</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs text-text-muted">{u.created_at?.slice(0, 10)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
              <div className="flex justify-between items-center">
                <span className="text-text-muted">Registration IP</span>
                <code className="text-xs font-mono font-medium bg-white px-2 py-0.5 rounded border border-gray-200">{detailUser.reg_ip || detailUser.ip_address || 'N/A'}</code>
              </div>
              {detailUser.login_ips && detailUser.login_ips.length > 0 && (
                <div className="flex justify-between items-start">
                  <span className="text-text-muted">Login IPs</span>
                  <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
                    {detailUser.login_ips.filter(Boolean).slice(0, 5).map((ip, i) => (
                      <code key={i} className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200 text-text-secondary">{ip}</code>
                    ))}
                    {detailUser.login_ips.filter(Boolean).length > 5 && (
                      <span className="text-[10px] text-text-muted">+{detailUser.login_ips.filter(Boolean).length - 5} more</span>
                    )}
                  </div>
                </div>
              )}
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
