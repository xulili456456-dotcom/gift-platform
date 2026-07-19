import { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const fmt = (n) => (Number(n) || 0).toLocaleString();
const fmtUSD = (n) => '$' + (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const Skeleton = ({ h = 80, w = '100%' }) => (
  <div style={{
    height: h,
    width: w,
    borderRadius: 14,
    background: 'linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
  }} />
);

function BarChart({ data, labelKey, valueKey, maxValue, color = '#FF5000' }) {
  if (!data || data.length === 0) {
    return <div style={{ textAlign: 'center', padding: '32px 0', color: '#999', fontSize: 13 }}>No data available</div>;
  }
  const max = maxValue || Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 180, paddingTop: 20 }}>
      {data.map((item, i) => {
        const val = Number(item[valueKey]) || 0;
        const pct = Math.max((val / max) * 100, 1);
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 10, color: '#666', marginBottom: 4, fontWeight: 600 }}>{fmtUSD(val)}</span>
            <div
              style={{
                width: '100%',
                height: `${pct}%`,
                borderRadius: '8px 8px 0 0',
                background: color,
                minHeight: 4,
                transition: 'height 0.3s ease',
                position: 'relative',
              }}
              title={`${item[labelKey]}: ${fmtUSD(val)}`}
            />
            <span style={{ fontSize: 10, color: '#999', marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', textAlign: 'center' }}>
              {item[labelKey]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TaskCompletionChart({ data }) {
  if (!data || data.length === 0) {
    return <div style={{ textAlign: 'center', padding: '32px 0', color: '#999', fontSize: 13 }}>No data available</div>;
  }
  const colors = ['#FF5000', '#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#00BCD4', '#F44336', '#607D8B'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {data.map((item, i) => {
        const total = Number(item.total) || 1;
        const completed = Number(item.completed) || 0;
        const pct = Math.round((completed / total) * 100);
        return (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: '#333', fontWeight: 500 }}>{item.name || item.task_type || 'Unknown'}</span>
              <span style={{ fontSize: 11, color: '#999' }}>{completed}/{total} ({pct}%)</span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: '#f0f0f0', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${pct}%`,
                borderRadius: 4,
                background: colors[i % colors.length],
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(7);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user?.is_admin) return;
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data } = await adminApi.getEnhancedStats();
      setStats(data);
    } catch {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ background: '#f2f2f7', minHeight: '100vh' }}>
        <div style={{ background: '#0f0f0f', padding: '20px 20px' }}>
          <h1 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: 0 }}>Analytics</h1>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} h={90} />)}
          </div>
          <Skeleton h={200} />
          <Skeleton h={200} />
          <Skeleton h={180} />
        </div>
      </div>
    );
  }

  const revenueData = (period === 7 ? stats?.daily_revenue_7d : stats?.daily_revenue_30d) || [];
  const topEarners = stats?.top_earners || [];
  const taskCompletion = stats?.task_completion || [];

  const kpiCards = [
    { label: 'Total Users', value: fmt(stats?.total_users), icon: svgUsers, color: '#FF5000' },
    { label: 'Total Revenue', value: fmtUSD(stats?.total_revenue), icon: svgDollar, color: '#4CAF50' },
    { label: 'Active Orders', value: fmt(stats?.active_orders), icon: svgOrders, color: '#2196F3' },
    { label: 'New Users Today', value: fmt(stats?.new_users_today), icon: svgUserPlus, color: '#FF9800' },
  ];

  return (
    <div style={{ background: '#f2f2f7', minHeight: '100vh', paddingBottom: 40 }}>
      {/* Dark header */}
      <div style={{ background: '#0f0f0f', padding: '20px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: 0 }}>Analytics</h1>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Admin</span>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
          {kpiCards.map((card) => (
            <div key={card.label} style={styles.kpiCard}>
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

        {/* Revenue Trend */}
        <div style={styles.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f0f0f' }}>Revenue Trend</h3>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => setPeriod(7)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: period === 7 ? '#FF5000' : '#f0f0f0',
                  color: period === 7 ? '#fff' : '#666',
                  transition: 'all 0.15s',
                }}
              >
                7d
              </button>
              <button
                onClick={() => setPeriod(30)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: period === 30 ? '#FF5000' : '#f0f0f0',
                  color: period === 30 ? '#fff' : '#666',
                  transition: 'all 0.15s',
                }}
              >
                30d
              </button>
            </div>
          </div>
          <BarChart data={revenueData} labelKey="date" valueKey="revenue" color="#FF5000" />
        </div>

        <div style={{ height: 16 }} />

        {/* Top Earners */}
        <div style={styles.card}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: 15, fontWeight: 700, color: '#0f0f0f' }}>Top Earners</h3>
          {topEarners.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#999', fontSize: 13 }}>No data available</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <th style={{ textAlign: 'left', padding: '8px 10px', color: '#999', fontWeight: 500, fontSize: 11 }}>#</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', color: '#999', fontWeight: 500, fontSize: 11 }}>User</th>
                    <th style={{ textAlign: 'right', padding: '8px 10px', color: '#999', fontWeight: 500, fontSize: 11 }}>Earnings</th>
                    <th style={{ textAlign: 'right', padding: '8px 10px', color: '#999', fontWeight: 500, fontSize: 11 }}>Invites</th>
                  </tr>
                </thead>
                <tbody>
                  {topEarners.slice(0, 10).map((u, i) => (
                    <tr key={u.id || i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '10px 10px', color: '#999', fontSize: 12, fontWeight: 600 }}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                      </td>
                      <td style={{ padding: '10px 10px', color: '#333', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {u.email || u.username || `User #${u.id}`}
                      </td>
                      <td style={{ padding: '10px 10px', color: '#4CAF50', fontSize: 12, fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {fmtUSD(u.earnings || u.total_earned)}
                      </td>
                      <td style={{ padding: '10px 10px', color: '#333', fontSize: 12, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {fmt(u.invites || u.total_invites)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ height: 16 }} />

        {/* Task Completion */}
        <div style={styles.card}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: 15, fontWeight: 700, color: '#0f0f0f' }}>Task Completion</h3>
          <TaskCompletionChart data={taskCompletion} />
        </div>
      </div>
    </div>
  );
}

const svgUsers = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const svgDollar = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const svgOrders = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const svgUserPlus = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
  </svg>
);

const styles = {
  kpiCard: {
    background: '#fff',
    borderRadius: 14,
    padding: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  card: {
    background: '#fff',
    borderRadius: 14,
    padding: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
};
