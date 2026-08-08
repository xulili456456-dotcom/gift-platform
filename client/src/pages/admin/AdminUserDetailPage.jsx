import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import toast from 'react-hot-toast';

const fmt = (n) => (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const Skeleton = ({ h = 40, style }) => (
  <div style={{
    height: h,
    borderRadius: 12,
    background: 'linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    ...style,
  }} />
);

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid #e0e0e0',
  fontSize: 14,
  color: '#0f0f0f',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
  background: '#fafafa',
};

const labelStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: '#666',
  marginBottom: 6,
  display: 'block',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const statusBadge = (status) => {
  const isActive = status === 'active' || status === 1;
  return {
    background: isActive ? '#e6f9e8' : '#fdecea',
    color: isActive ? '#1a7d2e' : '#b71c1c',
    label: isActive ? 'Active' : 'Frozen',
  };
};

const orderStatusBadge = (status) => {
  const map = {
    completed: { bg: '#e6f9e8', color: '#1a7d2e', label: 'Completed' },
    active: { bg: '#e6f9e8', color: '#1a7d2e', label: 'Active' },
    pending: { bg: '#fff8e1', color: '#b76e00', label: 'Pending' },
    rejected: { bg: '#fdecea', color: '#b71c1c', label: 'Rejected' },
    holding: { bg: '#e3f2fd', color: '#0d47a1', label: 'Holding' },
    cancelled: { bg: '#f3e5f5', color: '#6a1b9a', label: 'Cancelled' },
  };
  return map[status?.toLowerCase()] || { bg: '#f0f0f0', color: '#666', label: status || 'Unknown' };
};

const tabStyle = (active) => ({
  flex: 1,
  padding: '10px 0',
  border: 'none',
  background: 'none',
  fontSize: 13,
  fontWeight: active ? 700 : 500,
  color: active ? '#FF5000' : '#999',
  cursor: 'pointer',
  borderBottom: active ? '2px solid #FF5000' : '2px solid transparent',
  transition: 'all 0.15s',
});

export default function AdminUserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [finance, setFinance] = useState(null);
  const [orders, setOrders] = useState([]);
  const [team, setTeam] = useState([]);
  const [activeTab, setActiveTab] = useState('finance');

  // Action states
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceNote, setBalanceNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [loginToken, setLoginToken] = useState('');
  const [ipHistory, setIpHistory] = useState(null);
  const [ipFixDate, setIpFixDate] = useState(null);

  useEffect(() => {
    loadAll();
  }, [id]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [userRes, financeRes, ordersRes, teamRes, ipRes] = await Promise.all([
        adminApi.getUserDetail(id),
        adminApi.getUserFinance(id),
        adminApi.listOrders({ userId: id }),
        adminApi.getUserTree(id),
        adminApi.getUserIps({ user_id: id }),
      ]);
      setUser(userRes.data);
      setFinance(financeRes.data);
      setOrders(ordersRes.data?.orders || ordersRes.data || []);
      setTeam(teamRes.data?.tree || teamRes.data || []);
      const ipData = ipRes.data;
      const userIpRow = (ipData.users || ipData)[0] || null;
      setIpHistory(userIpRow || null);
      if (ipData.ip_fix_deployed_at) setIpFixDate(ipData.ip_fix_deployed_at);
    } catch {
      toast.error('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleFreeze = async () => {
    if (!confirm(user?.status === 'active' || user?.is_frozen === 0 ? 'Freeze this user?' : 'Unfreeze this user?')) return;
    setActionLoading(true);
    try {
      await adminApi.freezeUser(id);
      toast.success(user?.status === 'active' || user?.is_frozen === 0 ? 'User frozen' : 'User unfrozen');
      loadAll();
    } catch {
      toast.error('Operation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBalanceAdjust = async () => {
    const amount = parseFloat(balanceAmount);
    if (isNaN(amount) || amount === 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (!balanceNote.trim()) {
      toast.error('Enter a note');
      return;
    }
    setActionLoading(true);
    try {
      await adminApi.updateUserBalance(id, { amount, note: balanceNote.trim() });
      toast.success('Balance adjusted');
      setBalanceAmount('');
      setBalanceNote('');
      loadAll();
    } catch {
      toast.error('Operation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!confirm('Reset this user\'s password?')) return;
    setActionLoading(true);
    try {
      await adminApi.resetUserPassword(id);
      toast.success('Password reset successfully');
    } catch {
      toast.error('Operation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLoginAs = async () => {
    if (!confirm('Login as this user? You will receive a token.')) return;
    setActionLoading(true);
    try {
      const { data } = await adminApi.loginAsUser(id);
      setLoginToken(data.token || data.access_token || JSON.stringify(data));
      toast.success('Login token generated');
    } catch {
      toast.error('Operation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const copyToken = () => {
    navigator.clipboard.writeText(loginToken);
    toast.success('Token copied to clipboard');
  };

  // --- Loading state ---
  if (loading) {
    return (
      <div style={{ background: '#f2f2f7', minHeight: '100vh' }}>
        <div style={{ background: '#0f0f0f', padding: '20px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => navigate('/admin/users')}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <h1 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: 0 }}>User Detail</h1>
          </div>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Skeleton h={120} />
          <Skeleton h={44} />
          <Skeleton h={200} />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ background: '#f2f2f7', minHeight: '100vh' }}>
        <div style={{ background: '#0f0f0f', padding: '20px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => navigate('/admin/users')}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <h1 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: 0 }}>User Not Found</h1>
          </div>
        </div>
        <div style={{ padding: 40, textAlign: 'center', color: '#999', fontSize: 14 }}>This user does not exist or has been deleted.</div>
      </div>
    );
  }

  const userStatus = user.status || (user.is_frozen ? 'frozen' : 'active');
  const sb = statusBadge(userStatus);
  const isFrozen = userStatus === 'frozen' || user.is_frozen === 1;

  return (
    <div style={{ background: '#f2f2f7', minHeight: '100vh', paddingBottom: 40 }}>
      {/* Dark header */}
      <div style={{ background: '#0f0f0f', padding: '20px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/admin/users')}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: 0 }}>User Detail</h1>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>ID: {user.id}</span>
      </div>

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* User info card */}
        <div style={styles.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                background: 'linear-gradient(135deg, #FF5000, #FF8C42)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 20,
                fontWeight: 700,
              }}>
                {(user.name || user.email || 'U')[0].toUpperCase()}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f0f0f' }}>{user.name || 'Unnamed User'}</h2>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#999' }}>{user.email}</p>
              </div>
            </div>
            <span style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 700,
              background: sb.background,
              color: sb.color,
            }}>
              {sb.label}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 0' }}>
            <InfoRow label="Phone" value={user.phone || '-'} />
            <InfoRow label="Referral Code" value={user.referral_code || '-'} mono />
            <InfoRow label="User ID" value={user.id} mono />
            <InfoRow label="Joined" value={user.created_at ? user.created_at.slice(0, 10) : '-'} />
            <InfoRow label="Registration IP" value={ipHistory?.reg_ip || user.ip_address || '-'} mono />
            {ipHistory?.login_ips && ipHistory.login_ips.filter(Boolean).length > 0 && (
              <InfoRow
                label={`Login IPs (${ipHistory.login_ips.filter(Boolean).length})`}
                value={ipHistory.login_ips.filter(Boolean).slice(0, 8).join(', ')}
                mono
              />
            )}
            {ipFixDate && (
              <div style={{ marginTop: 4, fontSize: 10, color: '#999', textAlign: 'right' }}>
                Fix deployed: {new Date(ipFixDate).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={styles.card} style={{ ...styles.card, padding: '0 18px' }}>
          <div style={{ display: 'flex' }}>
            {['finance', 'orders', 'team', 'ip', 'actions'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={tabStyle(activeTab === tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div style={{ ...styles.card, minHeight: 200 }}>
          {activeTab === 'finance' && (
            <FinanceTab finance={finance} />
          )}

          {activeTab === 'orders' && (
            <OrdersTab orders={orders} />
          )}

          {activeTab === 'team' && (
            <TeamTab team={team} />
          )}

          {activeTab === 'ip' && (
            <IpTab ipHistory={ipHistory} ipFixDate={ipFixDate} userCreatedAt={user?.created_at} />
          )}

          {activeTab === 'actions' && (
            <ActionsTab
              isFrozen={isFrozen}
              actionLoading={actionLoading}
              balanceAmount={balanceAmount}
              balanceNote={balanceNote}
              loginToken={loginToken}
              setBalanceAmount={setBalanceAmount}
              setBalanceNote={setBalanceNote}
              onFreeze={handleFreeze}
              onBalanceAdjust={handleBalanceAdjust}
              onResetPassword={handleResetPassword}
              onLoginAs={handleLoginAs}
              onCopyToken={copyToken}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// --- Sub-components ---

function InfoRow({ label, value, mono }) {
  return (
    <div style={{ padding: '6px 0' }}>
      <span style={{ fontSize: 11, color: '#999', display: 'block' }}>{label}</span>
      <span style={{
        fontSize: 13,
        fontWeight: 500,
        color: '#0f0f0f',
        fontFamily: mono ? 'monospace' : 'inherit',
        wordBreak: 'break-all',
      }}>
        {value}
      </span>
    </div>
  );
}

function FinanceTab({ finance }) {
  if (!finance) return <Empty label="No finance data" />;

  const items = [
    { label: 'Total Earnings', value: fmt(finance.total_earnings || finance.earnings), color: '#4CAF50' },
    { label: 'Total Deposits', value: fmt(finance.total_deposits || finance.deposits), color: '#2196F3' },
    { label: 'Total Withdrawals', value: fmt(finance.total_withdrawals || finance.withdrawals), color: '#F44336' },
    { label: 'Current Balance', value: fmt(finance.balance || finance.current_balance), color: '#FF5000' },
    { label: 'Commission Earned', value: fmt(finance.commission || finance.commission_earned), color: '#9C27B0' },
  ];

  return (
    <div>
      <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#0f0f0f' }}>Financial Overview</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((item) => (
          <div key={item.label} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 14px',
            borderRadius: 12,
            background: item.color + '0D',
            border: `1px solid ${item.color}20`,
          }}>
            <span style={{ fontSize: 13, color: '#666', fontWeight: 500 }}>{item.label}</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: item.color }}>${item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrdersTab({ orders }) {
  if (!orders || orders.length === 0) return <Empty label="No orders yet" />;

  return (
    <div>
      <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#0f0f0f' }}>Order History</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #eee' }}>
              {['Product', 'Amount', 'Status', 'Time'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: '#999', fontWeight: 500, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((o, i) => {
              const st = orderStatusBadge(o.status);
              return (
                <tr key={o.id || i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '10px 10px', color: '#333', fontSize: 12, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {o.product_name || o.gift_name || o.name || '-'}
                  </td>
                  <td style={{ padding: '10px 10px', color: '#333', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    ${fmt(o.profit || o.amount || o.value)}
                  </td>
                  <td style={{ padding: '10px 10px', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                  </td>
                  <td style={{ padding: '10px 10px', color: '#999', fontSize: 11, whiteSpace: 'nowrap' }}>
                    {(o.created_at || '').slice(0, 16).replace('T', ' ')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TeamTab({ team }) {
  if (!team || team.length === 0) return <Empty label="No team members" />;

  const renderNode = (node, depth = 0) => (
    <div key={node.id || node.user_id} style={{ marginBottom: 4 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 14px',
        borderRadius: 10,
        background: depth === 0 ? '#FFF0E8' : depth === 1 ? '#f8f8f8' : '#fff',
        border: '1px solid #f0f0f0',
        marginLeft: depth * 20,
      }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          background: depth === 0 ? '#FF5000' : '#ccc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 13,
          fontWeight: 700,
          flexShrink: 0,
        }}>
          {(node.name || node.email || '?')[0].toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0f0f0f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {node.name || node.email || `User #${node.id || node.user_id}`}
          </p>
          <p style={{ margin: '1px 0 0', fontSize: 11, color: '#999' }}>
            Lv.{depth + 1} {node.email && node.email !== (node.name || '') ? `· ${node.email}` : ''}
          </p>
        </div>
        <span style={{ fontSize: 11, color: '#999', whiteSpace: 'nowrap' }}>
          ID: {node.id || node.user_id}
        </span>
      </div>
      {node.children && node.children.map((child) => renderNode(child, depth + 1))}
    </div>
  );

  return (
    <div>
      <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#0f0f0f' }}>
        Referral Tree ({team.length} direct)
      </h3>
      {team.map((node) => renderNode(node, 0))}
    </div>
  );
}

function IpTab({ ipHistory, ipFixDate, userCreatedAt }) {
  if (!ipHistory) return <Empty label="No IP data available" />;

  const regIp = ipHistory.reg_ip || '';
  const loginIps = (ipHistory.login_ips || []).filter(Boolean);
  const regTrusted = regIp && userCreatedAt && ipFixDate && new Date(userCreatedAt) >= new Date(ipFixDate);
  // Login IPs after cleanup are all post-fix (bogus ones were deleted)
  const loginTrusted = loginIps.length > 0;

  return (
    <div>
      <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#0f0f0f' }}>IP Address History</h3>
      {ipFixDate && (
        <div style={{
          margin: '-8px 0 16px',
          fontSize: 11,
          color: '#666',
          background: '#f0f0f0',
          padding: '6px 10px',
          borderRadius: 6,
          display: 'inline-block',
        }}>
          Trust-proxy fix deployed: {new Date(ipFixDate).toLocaleString()}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Registration IP */}
        <div style={{
          padding: '14px',
          borderRadius: 12,
          background: regTrusted ? '#f0fdf4' : '#f5f5f5',
          border: regTrusted ? '1px solid #bbf7d0' : '1px solid #e0e0e0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Registration IP</span>
            {regIp && (
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                background: regTrusted ? '#dcfce7' : '#fef3c7',
                color: regTrusted ? '#16a34a' : '#b45309',
              }}>
                {regTrusted ? '✓ TRUSTED' : '? LEGACY'}
              </span>
            )}
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: regIp ? '#0f0f0f' : '#ccc' }}>
            {regIp || 'Not Available'}
          </p>
          {!regTrusted && regIp && (
            <p style={{ margin: '4px 0 0', fontSize: 10, color: '#b45309' }}>
              Captured before trust-proxy fix — may be Render proxy IP, not real client IP
            </p>
          )}
        </div>

        {/* Login IPs */}
        <div style={{
          padding: '14px',
          borderRadius: 12,
          background: loginTrusted ? '#f0fdf4' : '#fff',
          border: loginTrusted ? '1px solid #bbf7d0' : '1px solid #e0e0e0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Login IPs ({loginIps.length} unique)
            </span>
            {loginTrusted && (
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                background: '#dcfce7', color: '#16a34a',
              }}>
                ✓ TRUSTED
              </span>
            )}
          </div>
          {loginIps.length === 0 ? (
            <div>
              <p style={{ margin: '8px 0 0', fontSize: 13, color: '#ccc' }}>No login records yet</p>
              <p style={{ margin: '4px 0 0', fontSize: 10, color: '#999' }}>
                All pre-fix bogus records were deleted. Users need to log in again to populate.
              </p>
            </div>
          ) : (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {loginIps.slice(0, 20).map((ip, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: ip === regIp ? '#FFF8E1' : '#f0fdf4',
                  border: ip === regIp ? '1px solid #FFE082' : '1px solid #bbf7d0',
                }}>
                  <code style={{
                    fontSize: 12,
                    fontFamily: 'monospace',
                    color: ip === regIp ? '#B76E00' : '#166534',
                    fontWeight: ip === regIp ? 600 : 400,
                  }}>
                    {ip}
                  </code>
                  {ip === regIp && (
                    <span style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: '#B76E00',
                      background: '#FFF3CD',
                      padding: '2px 6px',
                      borderRadius: 4,
                    }}>
                      MATCHES REG
                    </span>
                  )}
                </div>
              ))}
              {loginIps.length > 20 && (
                <p style={{ fontSize: 11, color: '#999', textAlign: 'center', marginTop: 4 }}>
                  +{loginIps.length - 20} more
                </p>
              )}
            </div>
          )}
        </div>

        {/* Risk Assessment */}
        <div style={{
          padding: '14px',
          borderRadius: 12,
          background: '#fafafa',
          border: '1px solid #e0e0e0',
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quick Assessment</span>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: '#666' }}>Registration IP quality</span>
              <span style={{ fontWeight: 600, color: regTrusted ? '#16a34a' : !regIp ? '#F44336' : '#b45309' }}>
                {regTrusted ? '✓ Verified' : !regIp ? '✗ Missing' : '? Legacy'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: '#666' }}>Login IP quality</span>
              <span style={{ fontWeight: 600, color: loginTrusted ? '#16a34a' : '#999' }}>
                {loginTrusted ? '✓ Verified (post-fix)' : 'No data yet'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: '#666' }}>Unique login IPs</span>
              <span style={{ fontWeight: 600, color: loginIps.length > 3 ? '#FF9800' : '#16a34a' }}>{loginIps.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: '#666' }}>User registered</span>
              <span style={{ fontWeight: 600, color: '#333' }}>
                {userCreatedAt ? new Date(userCreatedAt).toLocaleDateString() : 'Unknown'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionsTab({
  isFrozen,
  actionLoading,
  balanceAmount,
  balanceNote,
  loginToken,
  setBalanceAmount,
  setBalanceNote,
  onFreeze,
  onBalanceAdjust,
  onResetPassword,
  onLoginAs,
  onCopyToken,
}) {
  return (
    <div>
      <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#0f0f0f' }}>Admin Actions</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Freeze / Unfreeze */}
        <div style={actionStyles.row}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0f0f0f' }}>
              {isFrozen ? 'Unfreeze User' : 'Freeze User'}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#999' }}>
              {isFrozen ? 'Restore account access' : 'Temporarily disable account'}
            </p>
          </div>
          <button
            onClick={onFreeze}
            disabled={actionLoading}
            style={{
              ...actionStyles.btn,
              background: isFrozen ? '#4CAF50' : '#F44336',
            }}
          >
            {isFrozen ? 'Unfreeze' : 'Freeze'}
          </button>
        </div>

        {/* Adjust Balance */}
        <div style={actionStyles.section}>
          <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600, color: '#0f0f0f' }}>Adjust Balance</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              type="number"
              value={balanceAmount}
              onChange={(e) => setBalanceAmount(e.target.value)}
              placeholder="Amount (+/-)"
              step="0.01"
              style={{ ...inputStyle, flex: 1 }}
              onFocus={(e) => { e.target.style.borderColor = '#FF5000'; e.target.style.background = '#fff'; }}
              onBlur={(e) => { e.target.style.borderColor = '#e0e0e0'; e.target.style.background = '#fafafa'; }}
            />
          </div>
          <input
            type="text"
            value={balanceNote}
            onChange={(e) => setBalanceNote(e.target.value)}
            placeholder="Reason for adjustment"
            style={{ ...inputStyle, marginBottom: 10 }}
            onFocus={(e) => { e.target.style.borderColor = '#FF5000'; e.target.style.background = '#fff'; }}
            onBlur={(e) => { e.target.style.borderColor = '#e0e0e0'; e.target.style.background = '#fafafa'; }}
          />
          <button
            onClick={onBalanceAdjust}
            disabled={actionLoading}
            style={{ ...actionStyles.btn, background: '#FF5000', width: '100%' }}
          >
            Apply Adjustment
          </button>
        </div>

        {/* Reset Password */}
        <div style={actionStyles.row}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0f0f0f' }}>Reset Password</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#999' }}>Send a password reset link</p>
          </div>
          <button
            onClick={onResetPassword}
            disabled={actionLoading}
            style={{ ...actionStyles.btn, background: '#FF9800' }}
          >
            Reset
          </button>
        </div>

        {/* Login As User */}
        <div style={actionStyles.section}>
          <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: '#0f0f0f' }}>Login as User</p>
          <p style={{ margin: '0 0 10px', fontSize: 11, color: '#999' }}>Generate a token to impersonate this user</p>
          <button
            onClick={onLoginAs}
            disabled={actionLoading}
            style={{ ...actionStyles.btn, background: '#9C27B0', width: '100%' }}
          >
            Login as User
          </button>
          {loginToken && (
            <div style={{
              marginTop: 10,
              padding: 12,
              borderRadius: 10,
              background: '#f5f5f5',
              border: '1px solid #e0e0e0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Token</span>
                <button
                  onClick={onCopyToken}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#FF5000',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Copy
                </button>
              </div>
              <p style={{
                margin: 0,
                fontSize: 11,
                fontFamily: 'monospace',
                color: '#0f0f0f',
                wordBreak: 'break-all',
                background: '#fff',
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid #e8e8e8',
              }}>
                {loginToken}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Empty({ label }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      </div>
      <p style={{ fontSize: 13, color: '#999', margin: 0 }}>{label}</p>
    </div>
  );
}

// --- Styles ---
const styles = {
  card: {
    background: '#fff',
    borderRadius: 14,
    padding: 18,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
};

const actionStyles = {
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '14px',
    borderRadius: 12,
    background: '#fafafa',
    border: '1px solid #f0f0f0',
  },
  section: {
    padding: '14px',
    borderRadius: 12,
    background: '#fafafa',
    border: '1px solid #f0f0f0',
  },
  btn: {
    padding: '8px 18px',
    borderRadius: 10,
    border: 'none',
    color: '#fff',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'opacity 0.15s',
  },
};
