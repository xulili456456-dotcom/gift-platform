import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import toast from 'react-hot-toast';

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'rejected', label: 'Rejected' },
];

const STATUS_STYLES = {
  pending: { background: '#FFF3E0', color: '#E65100' },
  confirmed: { background: '#E8F5E9', color: '#2E7D32' },
  rejected: { background: '#FFEBEE', color: '#C62828' },
};

const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  rejected: 'Rejected',
};

function truncateHash(hash) {
  if (!hash) return '-';
  if (hash.length <= 16) return hash;
  return hash.slice(0, 8) + '...' + hash.slice(-6);
}

export default function AdminDepositsPage() {
  const navigate = useNavigate();
  const [deposits, setDeposits] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState(null); // { id, status, note }

  useEffect(() => { loadData(); }, [page, filterStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await client.get('/deposits/all', { params: { page: currentPage, limit: 20 } });
      setDeposits(data.deposits || data.records || []);
      setTotal(data.total || 0);
    } catch {
      toast.error('Failed to load deposits');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!actionModal) return;
    const { id, status, note } = actionModal;
    try {
      if (status === 'confirmed') {
        await client.put(`/admin/deposits/${id}/confirm`, { note: note || '' });
        toast.success('Deposit confirmed');
      } else {
        await client.put(`/admin/deposits/${id}/reject`, { note: note || '' });
        toast.success('Deposit rejected');
      }
      setActionModal(null);
      loadData();
    } catch {
      toast.error('Operation failed');
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div style={{ padding: '16px', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <button
          onClick={() => navigate('/admin')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8E8E93', padding: 0, lineHeight: 0 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#0f0f0f', margin: 0 }}>Deposit Management</h1>
        <span style={{ fontSize: '12px', color: '#8E8E93', background: '#E5E5EA', padding: '2px 8px', borderRadius: '999px' }}>{total}</span>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setFilterStatus(f.value); setPage(1); }}
            style={{
              padding: '6px 14px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: filterStatus === f.value ? '#FF5000' : '#E5E5EA',
              color: filterStatus === f.value ? '#FFFFFF' : '#3C3C43',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: 64, borderRadius: 16, background: '#E5E5EA' }} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && deposits.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 16px', color: '#8E8E93', fontSize: '14px' }}>
          No deposit records found
        </div>
      )}

      {/* Table */}
      {!loading && deposits.length > 0 && (
        <div style={{ background: '#FFFFFF', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #E5E5EA', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#0f0f0f' }}>
                {['User', 'Network', 'Amount', 'TX Hash', 'Submitted', 'Status', ''].map((h, i) => (
                  <th key={i} style={{ padding: '12px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deposits.map((d) => (
                <tr
                  key={d.id}
                  style={{ borderBottom: '1px solid #F2F2F7', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#FAFAFA'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; }}
                >
                  <td style={{ padding: '12px 12px' }}>
                    <span style={{ fontWeight: 600, color: '#0f0f0f' }}>{d.user_name || d.user_email || '-'}</span>
                    {d.user_email && <div style={{ fontSize: '11px', color: '#8E8E93', marginTop: 2 }}>{d.user_email}</div>}
                  </td>
                  <td style={{ padding: '12px 12px', color: '#3C3C43', textTransform: 'uppercase', fontSize: '12px', fontWeight: 500 }}>{d.network || '-'}</td>
                  <td style={{ padding: '12px 12px', color: '#FF5000', fontWeight: 700, fontSize: '14px' }}>${Number(d.amount || 0).toFixed(2)}</td>
                  <td style={{ padding: '12px 12px', color: '#3C3C43', fontFamily: 'monospace', fontSize: '12px' }}>
                    <span title={d.tx_hash || ''}>{truncateHash(d.tx_hash)}</span>
                  </td>
                  <td style={{ padding: '12px 12px', color: '#8E8E93', fontSize: '12px' }}>{(d.created_at || '').slice(0, 16).replace('T', ' ')}</td>
                  <td style={{ padding: '12px 12px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 10px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: 600,
                      ...(STATUS_STYLES[d.status] || STATUS_STYLES.pending),
                    }}>
                      {STATUS_LABELS[d.status] || d.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 12px', textAlign: 'right' }}>
                    {d.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setActionModal({ id: d.id, status: 'confirmed', note: '' })}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '10px',
                            border: 'none',
                            cursor: 'pointer',
                            background: '#FF5000',
                            color: '#FFFFFF',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setActionModal({ id: d.id, status: 'rejected', note: '' })}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '10px',
                            border: 'none',
                            cursor: 'pointer',
                            background: '#FFEBEE',
                            color: '#C62828',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {d.admin_note && (
                      <div style={{ fontSize: '11px', color: '#8E8E93', marginTop: 4, maxWidth: 160, wordBreak: 'break-word' }}>
                        Note: {d.admin_note}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '16px', borderTop: '1px solid #E5E5EA' }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 500,
                  border: 'none',
                  cursor: page <= 1 ? 'default' : 'pointer',
                  background: '#E5E5EA',
                  color: page <= 1 ? '#C7C7CC' : '#3C3C43',
                }}
              >
                Prev
              </button>
              <span style={{ fontSize: '12px', color: '#8E8E93' }}>{page} / {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 500,
                  border: 'none',
                  cursor: page >= totalPages ? 'default' : 'pointer',
                  background: '#E5E5EA',
                  color: page >= totalPages ? '#C7C7CC' : '#3C3C43',
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Action Modal */}
      {actionModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
          }}
          onClick={() => setActionModal(null)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '24px 24px 0 0',
              width: '100%',
              maxWidth: 440,
              padding: '24px',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: 40, height: 4, background: '#E5E5EA', borderRadius: 2, margin: '0 auto 20px' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f0f0f', margin: '0 0 4px' }}>
              {actionModal.status === 'confirmed' ? 'Confirm Deposit' : 'Reject Deposit'}
            </h2>
            <p style={{ fontSize: '13px', color: '#8E8E93', margin: '0 0 16px' }}>
              {actionModal.status === 'confirmed'
                ? 'This will mark the deposit as confirmed. An optional note can be added.'
                : 'This will reject the deposit. Please provide a reason.'}
            </p>
            <textarea
              value={actionModal.note}
              onChange={(e) => setActionModal({ ...actionModal, note: e.target.value })}
              placeholder={actionModal.status === 'rejected' ? 'Reason for rejection...' : 'Optional note...'}
              rows={3}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid #E5E5EA',
                fontSize: '13px',
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
                background: '#F2F2F7',
              }}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button
                onClick={() => setActionModal(null)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '14px',
                  border: 'none',
                  cursor: 'pointer',
                  background: '#E5E5EA',
                  color: '#3C3C43',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '14px',
                  border: 'none',
                  cursor: 'pointer',
                  background: actionModal.status === 'confirmed' ? '#FF5000' : '#C62828',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                {actionModal.status === 'confirmed' ? 'Confirm' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
