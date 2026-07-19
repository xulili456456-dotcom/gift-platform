import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../api/admin';
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
    processing: { bg: '#e8f5e9', color: '#2e7d32', label: 'Processing' },
  };
  const s = map[status?.toLowerCase()] || { bg: '#f0f0f0', color: '#666', label: status || 'Unknown' };
  return s;
};

const SkeletonRow = () => (
  <div style={{ display: 'flex', gap: 10, padding: '14px 0', borderBottom: '1px solid #f0f0f0' }}>
    {[120, 100, 70, 70, 80, 70, 100, 60].map((w, i) => (
      <div key={i} style={{
        width: w,
        height: 14,
        borderRadius: 7,
        background: 'linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        flexShrink: 0,
      }} />
    ))}
  </div>
);

const FILTER_TABS = [
  { key: '', label: 'All' },
  { key: 'holding', label: 'Holding' },
  { key: 'completed', label: 'Completed' },
];

export default function AdminOrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const limit = 20;

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (filterStatus) params.status = filterStatus;
      const { data } = await adminApi.listOrders(params);
      setOrders(data.orders || []);
      setTotal(data.total || 0);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const totalPages = Math.ceil(total / limit);

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div style={{ background: '#f2f2f7', minHeight: '100vh', paddingBottom: 40 }}>
      {/* Dark header */}
      <div style={{ background: '#0f0f0f', padding: '20px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/admin')}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: 8,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
              padding: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: 0 }}>Orders</h1>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{total} total</span>
      </div>

      {/* Filter tabs */}
      <div style={{ padding: '16px 16px 0', display: 'flex', gap: 8 }}>
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setFilterStatus(tab.key); setPage(1); }}
            style={{
              padding: '8px 18px',
              borderRadius: 20,
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
              background: filterStatus === tab.key ? '#FF5000' : '#fff',
              color: filterStatus === tab.key ? '#fff' : '#555',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders table */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={styles.card}>
          {loading ? (
            <div>
              <div style={{ display: 'flex', gap: 10, padding: '12px 0', borderBottom: '2px solid #eee' }}>
                {['User', 'Product', 'Cost', 'Profit', 'Mode', 'Status', 'Created'].map((h) => (
                  <span key={h} style={{ fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', flexShrink: 0, minWidth: 0 }}>{h}</span>
                ))}
              </div>
              {[1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} />)}
            </div>
          ) : orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#999', fontSize: 13 }}>
              No orders found
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 800 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #eee' }}>
                      {['User', 'Product', 'Cost', 'Profit', 'Mode', 'Status', 'Created'].map((h) => (
                        <th key={h} style={{ textAlign: 'left', padding: '10px 8px', color: '#999', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                      <th style={{ textAlign: 'right', padding: '10px 8px', width: 40 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o, i) => {
                      const st = statusBadge(o.status);
                      const isExpanded = expandedId === o.id;
                      const modeLabel = o.mode === 'share' ? 'Share' : 'Holding';
                      const modeColor = o.mode === 'share' ? '#2196F3' : '#FF9800';
                      return (
                        <React.Fragment key={o.id}>
                          <tr
                            onClick={() => toggleExpand(o.id)}
                            style={{
                              background: i % 2 === 0 ? '#fff' : '#fafafa',
                              cursor: 'pointer',
                              transition: 'background 0.1s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f5f5'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafafa'; }}
                          >
                            <td style={{ padding: '10px 8px', color: '#333', fontSize: 12, whiteSpace: 'nowrap' }}>
                              <div style={{ fontWeight: 600 }}>{o.user_name || '-'}</div>
                              <div style={{ fontSize: 10, color: '#999' }}>{o.user_email || ''}</div>
                            </td>
                            <td style={{ padding: '10px 8px', color: '#333', fontSize: 12, whiteSpace: 'nowrap', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {o.product_name || o.gift_name || '-'}
                            </td>
                            <td style={{ padding: '10px 8px', color: '#333', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                              ${fmt(o.cost)}
                            </td>
                            <td style={{ padding: '10px 8px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', color: (o.profit || 0) >= 0 ? '#1a7d2e' : '#b71c1c' }}>
                              ${fmt(o.profit)}
                            </td>
                            <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                              <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: modeColor + '18', color: modeColor }}>
                                {modeLabel}
                              </span>
                            </td>
                            <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                              <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: st.bg, color: st.color }}>
                                {st.label}
                              </span>
                            </td>
                            <td style={{ padding: '10px 8px', color: '#999', fontSize: 11, whiteSpace: 'nowrap' }}>
                              {(o.created_at || '').slice(0, 16).replace('T', ' ')}
                            </td>
                            <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                              <svg
                                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999"
                                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                              >
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </td>
                          </tr>

                          {/* Expanded detail row */}
                          {isExpanded && (
                            <tr key={`${o.id}-detail`}>
                              <td colSpan={8} style={{ padding: '0 8px 14px', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                <div style={{
                                  background: '#f8f9fa',
                                  borderRadius: 12,
                                  padding: 16,
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                                  gap: 10,
                                  border: '1px solid #eee',
                                }}>
                                  <DetailItem label="Order ID" value={o.id} mono />
                                  <DetailItem label="User" value={o.user_name || o.user_email || '-'} />
                                  <DetailItem label="Email" value={o.user_email || '-'} />
                                  <DetailItem label="Product" value={o.product_name || o.gift_name || '-'} />
                                  <DetailItem label="Cost" value={`$${fmt(o.cost)}`} />
                                  <DetailItem label="Profit" value={`$${fmt(o.profit)}`} />
                                  <DetailItem label="Mode" value={modeLabel} />
                                  <DetailItem
                                    label="Status"
                                    value={<span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: st.bg, color: st.color }}>{st.label}</span>}
                                  />
                                  <DetailItem label="Created" value={(o.created_at || '').slice(0, 19).replace('T', ' ')} />
                                  {o.updated_at && <DetailItem label="Updated" value={o.updated_at.slice(0, 19).replace('T', ' ')} />}
                                  {o.notes && <DetailItem label="Notes" value={o.notes} />}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '16px 0 0', borderTop: '1px solid #f0f0f0', marginTop: 4 }}>
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 10,
                      border: 'none',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: page <= 1 ? 'default' : 'pointer',
                      background: page <= 1 ? '#f0f0f0' : '#fff',
                      color: page <= 1 ? '#bbb' : '#333',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    }}
                  >
                    Prev
                  </button>
                  <span style={{ fontSize: 12, color: '#999', fontWeight: 500 }}>
                    {page} / {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 10,
                      border: 'none',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: page >= totalPages ? 'default' : 'pointer',
                      background: page >= totalPages ? '#f0f0f0' : '#FF5000',
                      color: page >= totalPages ? '#bbb' : '#fff',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#999', marginBottom: 2, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.3px' }}>{label}</div>
      <div style={{ fontSize: 13, color: '#222', fontWeight: 500, fontFamily: mono ? 'monospace' : undefined, wordBreak: 'break-word' }}>{value}</div>
    </div>
  );
}

const styles = {
  card: {
    background: '#fff',
    borderRadius: 14,
    padding: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
};
