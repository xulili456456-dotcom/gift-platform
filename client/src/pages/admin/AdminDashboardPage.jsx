import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const fmt = (n) => (Number(n) || 0).toLocaleString();

const statusBadge = (status) => {
  const map = {
    completed: { bg: '#e6f9e8', color: '#1a7d2e', label: 'Completed' },
    active: { bg: '#e6f9e8', color: '#1a7d2e', label: 'Active' },
    pending: { bg: '#fff8e1', color: '#b76e00', label: 'Pending' },
    rejected: { bg: '#fdecea', color: '#b71c1c', label: 'Rejected' },
    holding: { bg: '#e3f2fd', color: '#0d47a1', label: 'Holding' },
    cancelled: { bg: '#f3e5f5', color: '#6a1b9a', label: 'Cancelled' },
  };
  const s = map[status?.toLowerCase()] || { bg: '#f0f0f0', color: '#666', label: status || 'Unknown' };
  return { ...s };
};

const Skeleton = ({ h = 80, style }) => (
  <div style={{
    height: h,
    borderRadius: 14,
    background: 'linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    ...style,
  }} />
);

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.is_admin) { navigate('/gifts', { replace: true }); return; }
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data } = await adminApi.getEnhancedStats();
      setStats(data);
    } catch {
      toast.error('Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  // --- Loading state ---
  if (loading) {
    return (
      <div style={{ background: '#f2f2f7', minHeight: '100vh' }}>
        <div style={{ background: '#0f0f0f', padding: '20px 20px' }}>
          <h1 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: 0 }}>Dashboard</h1>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {[1, 2, 3, 4, 5, 6, 7].map((i) => <Skeleton key={i} h={90} />)}
          </div>
          <Skeleton h={48} />
          <Skeleton h={360} />
        </div>
      </div>
    );
  }

  // --- Stat cards ---
  const statCards = [
    { label: 'Total Users', value: fmt(stats?.total_users), icon: svgUsers, color: '#FF5000' },
    { label: 'Active Stores', value: fmt(stats?.active_stores), icon: svgStore, color: '#2196F3' },
    { label: 'Total Orders', value: fmt(stats?.total_orders), icon: svgOrders, color: '#4CAF50' },
    { label: 'Total Volume ($)', value: fmt(stats?.total_volume), icon: svgDollar, color: '#FF9800' },
    { label: 'Pending KYC', value: fmt(stats?.pending_kyc), icon: svgKyc, color: '#9C27B0' },
    { label: 'Pending Deposits', value: fmt(stats?.pending_deposits), icon: svgDeposit, color: '#00BCD4' },
    { label: 'Pending Withdrawals', value: fmt(stats?.pending_withdrawals), icon: svgWithdraw, color: '#F44336' },
  ];

  const orders = stats?.recent_orders || [];

  // --- Quick action buttons ---
  const quickActions = [
    { label: 'Review Deposits', to: '/admin/deposits', icon: svgDeposit },
    { label: 'Review KYC', to: '/admin/kyc', icon: svgKyc },
    { label: 'Review Withdrawals', to: '/admin/withdrawals', icon: svgWithdraw },
    { label: 'Manage Tasks', to: '/admin/tasks', icon: svgTasks },
  ];

  return (
    <div style={{ background: '#f2f2f7', minHeight: '100vh', paddingBottom: 40 }}>
      {/* Dark header */}
      <div style={{ background: '#0f0f0f', padding: '20px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: 0 }}>Dashboard</h1>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Admin</span>
      </div>

      {/* Stat cards grid */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {statCards.map((card) => (
            <div key={card.label} style={styles.statCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: card.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.color }}>
                  {card.icon}
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#0f0f0f', lineHeight: 1.1 }}>{card.value}</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{card.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto' }}>
          {quickActions.map((act) => (
            <button
              key={act.label}
              onClick={() => navigate(act.to)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 18px',
                borderRadius: 14,
                border: 'none',
                background: '#fff',
                color: '#0f0f0f',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#FF5000'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#0f0f0f'; }}
            >
              <span style={{ display: 'flex', alignItems: 'center' }}>{act.icon}</span>
              {act.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Orders */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={styles.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f0f0f' }}>Recent Orders</h3>
            <button
              onClick={() => navigate('/admin/orders')}
              style={{
                background: 'none',
                border: 'none',
                color: '#FF5000',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              View All
            </button>
          </div>

          {orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#999', fontSize: 13 }}>No orders yet</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    {['User', 'Product', 'Amount', 'Status', 'Time'].map((h) => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: '#999', fontWeight: 500, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 10).map((o, i) => {
                    const st = statusBadge(o.status);
                    return (
                      <tr key={o.id || i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ padding: '10px 10px', color: '#333', fontSize: 12, whiteSpace: 'nowrap' }}>{o.user_email || o.user_name || '-'}</td>
                        <td style={{ padding: '10px 10px', color: '#333', fontSize: 12, whiteSpace: 'nowrap', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.product_name || o.gift_name || '-'}</td>
                        <td style={{ padding: '10px 10px', color: '#333', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>${fmt(o.amount || o.value)}</td>
                        <td style={{ padding: '10px 10px', whiteSpace: 'nowrap' }}>
                          <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: st.bg, color: st.color }}>{st.label}</span>
                        </td>
                        <td style={{ padding: '10px 10px', color: '#999', fontSize: 11, whiteSpace: 'nowrap' }}>{(o.created_at || '').slice(0, 16).replace('T', ' ')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Inline SVG icons ---
const svgUsers = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const svgStore = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const svgOrders = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const svgDollar = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const svgKyc = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const svgDeposit = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
  </svg>
);

const svgWithdraw = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" />
  </svg>
);

const svgTasks = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);

const styles = {
  card: {
    background: '#fff',
    borderRadius: 14,
    padding: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  statCard: {
    background: '#fff',
    borderRadius: 14,
    padding: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
};
