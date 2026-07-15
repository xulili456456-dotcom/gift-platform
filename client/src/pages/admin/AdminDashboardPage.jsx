import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../../api/admin';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

export default function AdminDashboardPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.is_admin) { navigate('/gifts', { replace: true }); return; }
    loadStats();
  }, []);

  const loadStats = async () => {
    try { const { data } = await adminApi.getStats(); setStats(data); }
    catch { toast.error(t('common.loadingFailed')); }
    finally { setLoading(false); }
  };

  if (loading) return (
    <div className="p-4 pt-12 space-y-3">
      <div className="skeleton h-24 rounded-2xl" /><div className="skeleton h-48 rounded-2xl" />
    </div>
  );

  const statCards = [
    { label: t('admin.totalUsers'), value: stats?.total_users || 0, icon: '👥', color: 'from-blue-500 to-blue-600' },
    { label: t('admin.totalInvites'), value: stats?.total_invites || 0, icon: '🔗', color: 'from-green-500 to-green-600' },
    { label: t('admin.pendingReview'), value: stats?.pending_claims || 0, icon: '⏳', color: 'from-yellow-500 to-yellow-600' },
    { label: t('admin.activeGifts'), value: stats?.active_gifts || 0, icon: '🎁', color: 'from-purple-500 to-purple-600' },
  ];

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate('/gifts')} className="text-text-muted hover:text-text-primary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <h1 className="text-lg font-bold text-text-primary">{t('admin.title')}</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {statCards.map((card) => (
          <div key={card.label} className={`bg-gradient-to-br ${card.color} rounded-2xl p-4 text-white shadow-lg`}>
            <p className="text-2xl mb-1">{card.icon}</p>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-xs text-white/70">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { to: '/admin/users', icon: '👥', title: t('admin.userMgmt'), desc: t('admin.userMgmt') },
          { to: '/admin/gifts', icon: '🎁', title: t('admin.giftMgmt'), desc: t('admin.giftMgmt') },
          { to: '/admin/claims', icon: '📋', title: t('admin.claimMgmt'), desc: t('admin.claimMgmt') },
          { to: '/admin/withdrawals', icon: '💸', title: 'Withdrawal Management', desc: 'Review withdrawal requests' },
          { to: '/gifts', icon: '🏠', title: t('admin.backToHome'), desc: t('admin.backToHome') },
        ].map((item) => (
          <button key={item.to} onClick={() => navigate(item.to)} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left hover:border-primary/30 transition-colors">
            <p className="text-2xl mb-1">{item.icon}</p>
            <p className="font-semibold text-sm text-text-primary">{item.title}</p>
            <p className="text-xs text-text-muted mt-0.5">{item.desc}</p>
          </button>
        ))}
      </div>

      {stats?.top_inviters?.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-text-primary text-sm mb-3">🏆 {t('admin.topInviters')}</h3>
          <div className="space-y-2">
            {stats.top_inviters.slice(0, 10).map((inv, i) => (
              <div key={inv.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold w-6 ${i < 3 ? 'text-gold' : 'text-text-muted'}`}>{i < 3 ? ['🥇','🥈','🥉'][i] : `${i+1}`}</span>
                  <span className="text-sm text-text-primary">{inv.name || inv.email}</span>
                </div>
                <span className="text-sm font-semibold text-primary">{inv.invite_count} {t('common.people')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
