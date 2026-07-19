import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const PAGE_SIZE = 20;

const styles = {
  page: { padding: '16px', minHeight: '100vh', background: '#f2f2f7' },
  headerRow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' },
  backBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#8e8e93', display: 'flex' },
  title: { fontSize: '20px', fontWeight: 700, color: '#0f0f0f', margin: 0 },
  badge: { fontSize: '11px', color: '#8e8e93', background: '#e5e5ea', padding: '2px 10px', borderRadius: '20px', fontWeight: 600 },
  card: { background: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', border: '1px solid #e5e5ea', overflow: 'hidden' },
  filterRow: { padding: '14px 16px', borderBottom: '1px solid #f2f2f7', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' },
  filterInput: { padding: '8px 12px', borderRadius: '10px', border: '1px solid #e5e5ea', fontSize: '13px', color: '#0f0f0f', background: '#f9f9fb', outline: 'none', flex: '1 1 140px', minWidth: '120px' },
  filterSelect: { padding: '8px 12px', borderRadius: '10px', border: '1px solid #e5e5ea', fontSize: '13px', color: '#0f0f0f', background: '#f9f9fb', outline: 'none', flex: '1 1 110px', minWidth: '100px', appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2710%27 height=%2710%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%238e8e93%27 stroke-width=%272%27%3E%3Cpolyline points=%276 9 12 15 18 9%27/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: '30px' },
  clearBtn: { padding: '8px 14px', borderRadius: '10px', border: '1px solid #e5e5ea', background: '#fff', color: '#8e8e93', fontSize: '12px', fontWeight: 600, cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { textAlign: 'left', padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.5px', background: '#f9f9fb', borderBottom: '1px solid #e5e5ea' },
  td: { padding: '12px 16px', borderBottom: '1px solid #f2f2f7', color: '#3a3a3c', verticalAlign: 'top' },
  trHover: { background: '#fafafa' },
  timeCell: { fontSize: '12px', color: '#8e8e93', whiteSpace: 'nowrap' },
  adminCell: { fontWeight: 600, color: '#0f0f0f' },
  actionBadge: (action) => {
    const colors = {
      create: { bg: 'rgba(52,199,89,0.1)', fg: '#34c759' },
      update: { bg: 'rgba(0,122,255,0.1)', fg: '#007aff' },
      delete: { bg: 'rgba(255,59,48,0.1)', fg: '#ff3b30' },
      freeze: { bg: 'rgba(255,149,0,0.1)', fg: '#ff9500' },
      unfreeze: { bg: 'rgba(52,199,89,0.1)', fg: '#34c759' },
      login_as: { bg: 'rgba(175,82,222,0.1)', fg: '#af52de' },
    };
    const c = colors[action?.toLowerCase()] || { bg: 'rgba(142,142,147,0.1)', fg: '#8e8e93' };
    return {
      fontSize: '10px',
      fontWeight: 700,
      padding: '3px 8px',
      borderRadius: '20px',
      textTransform: 'uppercase',
      color: c.fg,
      background: c.bg,
      whiteSpace: 'nowrap',
    };
  },
  detailsCell: { maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12px', color: '#8e8e93' },
  pagination: { padding: '14px 16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', borderTop: '1px solid #f2f2f7' },
  pageBtn: (disabled) => ({ padding: '8px 16px', borderRadius: '10px', border: '1px solid #e5e5ea', background: disabled ? '#f9f9fb' : '#fff', color: disabled ? '#c7c7cc' : '#3a3a3c', fontSize: '12px', fontWeight: 600, cursor: disabled ? 'default' : 'pointer' }),
  pageInfo: { fontSize: '12px', color: '#8e8e93', fontWeight: 600 },
  emptyState: { textAlign: 'center', padding: '48px 20px', color: '#8e8e93' },
  skeleton: { background: '#e5e5ea', borderRadius: '8px', height: '14px', marginBottom: '4px' },
  skelRow: { padding: '14px 16px', borderBottom: '1px solid #f2f2f7' },
  responsiveWrap: { overflowX: 'auto' },
};

function SkeletonRow() {
  const w = () => `${60 + Math.random() * 40}%`;
  return (
    <div style={styles.skelRow}>
      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{ ...styles.skeleton, width: '80px', animation: 'pulse 1.5s infinite' }} />
        <div style={{ ...styles.skeleton, width: '60px', animation: 'pulse 1.5s infinite' }} />
        <div style={{ ...styles.skeleton, width: '50px', animation: 'pulse 1.5s infinite' }} />
        <div style={{ ...styles.skeleton, width: '100px', animation: 'pulse 1.5s infinite' }} />
        <div style={{ ...styles.skeleton, width: w(), animation: 'pulse 1.5s infinite' }} />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={styles.emptyState}>
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '12px' }}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
      </svg>
      <p style={{ fontSize: '14px', fontWeight: 600, color: '#3a3a3c', marginBottom: '4px' }}>No audit logs found</p>
      <p style={{ fontSize: '12px', margin: 0 }}>Adjust filters or check back later</p>
    </div>
  );
}

export default function AdminAuditLogPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [actionType, setActionType] = useState('');

  useEffect(() => {
    if (!user?.is_admin) { navigate('/gifts', { replace: true }); return; }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [page, actionType]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = { page, limit: PAGE_SIZE };
      if (actionType) params.action = actionType;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const { data } = await adminApi.getAuditLog(params);
      setLogs(Array.isArray(data) ? data : (data.logs || data.data || []));
      setTotal(data.total || data.total_count || 0);
    } catch {
      toast.error('Failed to load audit log');
    } finally {
      setLoading(false);
    }
  };

  const handleDateFilter = () => {
    setPage(1);
    loadLogs();
  };

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setActionType('');
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const formatTime = (ts) => {
    if (!ts) return '-';
    try {
      const d = new Date(ts);
      return d.toLocaleString('en-US', {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      });
    } catch { return ts; }
  };

  const formatDetails = (details) => {
    if (!details) return '-';
    if (typeof details === 'string') {
      return details.length > 60 ? details.slice(0, 60) + '...' : details;
    }
    try {
      const s = JSON.stringify(details);
      return s.length > 60 ? s.slice(0, 60) + '...' : s;
    } catch { return '-'; }
  };

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <button style={styles.backBtn} onClick={() => navigate('/admin')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 style={styles.title}>Audit Log</h1>
        <span style={styles.badge}>{total} entries</span>
      </div>

      <div style={styles.card}>
        {/* Filter row */}
        <div style={styles.filterRow}>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={styles.filterInput}
            placeholder="From date"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={styles.filterInput}
            placeholder="To date"
          />
          <select
            value={actionType}
            onChange={(e) => { setActionType(e.target.value); setPage(1); }}
            style={styles.filterSelect}
          >
            <option value="">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="freeze">Freeze</option>
            <option value="unfreeze">Unfreeze</option>
            <option value="login_as">Login As</option>
          </select>
          <button style={styles.clearBtn} onClick={clearFilters}>Clear</button>
          {(dateFrom || dateTo) && (
            <button
              style={{ ...styles.clearBtn, background: '#FF5000', color: '#fff', borderColor: '#FF5000' }}
              onClick={handleDateFilter}
            >
              Apply
            </button>
          )}
        </div>

        {/* Table */}
        <div style={styles.responsiveWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Timestamp</th>
                <th style={styles.th}>Admin</th>
                <th style={styles.th}>Action</th>
                <th style={styles.th}>Target User</th>
                <th style={styles.th}>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td style={styles.td}><div style={{ ...styles.skeleton, width: '90px', animation: 'pulse 1.5s infinite' }} /></td>
                    <td style={styles.td}><div style={{ ...styles.skeleton, width: '70px', animation: 'pulse 1.5s infinite' }} /></td>
                    <td style={styles.td}><div style={{ ...styles.skeleton, width: '55px', animation: 'pulse 1.5s infinite' }} /></td>
                    <td style={styles.td}><div style={{ ...styles.skeleton, width: '90px', animation: 'pulse 1.5s infinite' }} /></td>
                    <td style={styles.td}><div style={{ ...styles.skeleton, width: `${50 + Math.random() * 50}%`, animation: 'pulse 1.5s infinite' }} /></td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 0 }}>
                    <EmptyState />
                  </td>
                </tr>
              ) : (
                logs.map((log, idx) => (
                  <tr
                    key={log.id || idx}
                    style={idx % 2 === 1 ? { background: '#fafafa' } : {}}
                  >
                    <td style={{ ...styles.td, ...styles.timeCell }}>{formatTime(log.created_at || log.timestamp)}</td>
                    <td style={{ ...styles.td, ...styles.adminCell }}>
                      {log.admin_name || log.admin_email || log.admin_id || '-'}
                    </td>
                    <td style={styles.td}>
                      <span style={styles.actionBadge(log.action)}>{log.action || '-'}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ fontSize: '13px', color: '#0f0f0f' }}>
                        {log.target_user_name || log.target_user_email || log.target_user_id || '-'}
                      </span>
                    </td>
                    <td style={{ ...styles.td, ...styles.detailsCell }} title={typeof log.details === 'string' ? log.details : JSON.stringify(log.details || {})}>
                      {formatDetails(log.details)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={styles.pagination}>
            <button
              style={styles.pageBtn(page <= 1)}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span style={styles.pageInfo}>Page {page} of {totalPages}</span>
            <button
              style={styles.pageBtn(page >= totalPages)}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
