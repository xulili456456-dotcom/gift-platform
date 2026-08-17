import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import toast from 'react-hot-toast';

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const STATUS_STYLES = {
  pending: { background: '#FFF3E0', color: '#E65100' },
  approved: { background: '#E8F5E9', color: '#2E7D32' },
  rejected: { background: '#FFEBEE', color: '#C62828' },
};

const STATUS_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

function maskIdNumber(num) {
  if (!num) return '-';
  const s = String(num);
  if (s.length <= 6) return s.slice(0, 2) + '***' + s.slice(-2);
  return s.slice(0, 3) + '****' + s.slice(-4);
}

export default function AdminKYCPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [actionModal, setActionModal] = useState(null); // { id, status }
  const [images, setImages] = useState({}); // { [id]: { front_image, back_image } }

  useEffect(() => { loadData(); }, [page, filterStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await client.get('/kyc/admin/list', { params: { page, limit: 20 } });
      setRecords(data.kycs || data.records || data || []);
      setTotal(data.total || 0);
    } catch {
      toast.error('Failed to load KYC records');
    } finally {
      setLoading(false);
    }
  };

  const loadImages = async (id) => {
    if (images[id]) return;
    try {
      const { data } = await client.get(`/kyc/admin/${id}/images`);
      setImages((prev) => ({ ...prev, [id]: data }));
    } catch {}
  };

  const handleAction = async () => {
    if (!actionModal) return;
    try {
      await client.put(`/kyc/admin/${actionModal.id}`, {
        status: actionModal.status,
        admin_note: actionModal.note || '',
      });
      toast.success(actionModal.status === 'approved' ? 'KYC Approved' : 'KYC Rejected');
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
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#0f0f0f', margin: 0 }}>KYC Management</h1>
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
            <div key={i} style={{ height: 64, borderRadius: 16, background: '#E5E5EA', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && records.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 16px', color: '#8E8E93', fontSize: '14px' }}>
          No KYC records found
        </div>
      )}

      {/* Table */}
      {!loading && records.length > 0 && (
        <div style={{ background: '#FFFFFF', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #E5E5EA', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#0f0f0f' }}>
                {['User', 'Doc Type', 'Name', 'ID Number', 'Submitted', 'Status', ''].map((h, i) => (
                  <th key={i} style={{ padding: '12px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <>
                  <tr
                    key={r.id}
                    onClick={() => {
                      if (expandedId === r.id) { setExpandedId(null); }
                      else { setExpandedId(r.id); loadImages(r.id); }
                    }}
                    style={{
                      borderBottom: '1px solid #F2F2F7',
                      cursor: 'pointer',
                      background: expandedId === r.id ? '#FFF8F5' : '#FFFFFF',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => { if (expandedId !== r.id) e.currentTarget.style.background = '#FAFAFA'; }}
                    onMouseLeave={(e) => { if (expandedId !== r.id) e.currentTarget.style.background = '#FFFFFF'; }}
                  >
                    <td style={{ padding: '12px 12px' }}>
                      <span style={{ fontWeight: 600, color: '#0f0f0f' }}>{r.user_name || r.user_email || '-'}</span>
                      {r.user_email && <div style={{ fontSize: '11px', color: '#8E8E93', marginTop: 2 }}>{r.user_email}</div>}
                    </td>
                    <td style={{ padding: '12px 12px', color: '#3C3C43', textTransform: 'capitalize' }}>{r.doc_type || '-'}</td>
                    <td style={{ padding: '12px 12px', color: '#0f0f0f', fontWeight: 500 }}>{r.real_name || '-'}</td>
                    <td style={{ padding: '12px 12px', color: '#3C3C43', fontFamily: 'monospace', fontSize: '12px' }}>{maskIdNumber(r.id_number)}</td>
                    <td style={{ padding: '12px 12px', color: '#8E8E93', fontSize: '12px' }}>{(r.submitted_at || '').slice(0, 16).replace('T', ' ')}</td>
                    <td style={{ padding: '12px 12px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: 600,
                        ...(STATUS_STYLES[r.status] || STATUS_STYLES.pending),
                      }}>
                        {STATUS_LABELS[r.status] || r.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 12px', textAlign: 'right' }}>
                      {r.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setActionModal({ id: r.id, status: 'approved', note: '' }); }}
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
                            Approve
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setActionModal({ id: r.id, status: 'rejected', note: '' }); }}
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
                      {r.admin_note && (
                        <div style={{ fontSize: '11px', color: '#8E8E93', marginTop: 4, maxWidth: 160, wordBreak: 'break-word' }}>
                          Note: {r.admin_note}
                        </div>
                      )}
                    </td>
                  </tr>
                  {/* Expanded row: document images */}
                  {expandedId === r.id && (
                    <tr key={`${r.id}-expanded`}>
                      <td colSpan={7} style={{ padding: '16px 12px', background: '#FFF8F5', borderBottom: '1px solid #E5E5EA' }}>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                          {!images[r.id] && (
                            <p style={{ color: '#8E8E93', fontSize: '13px' }}>Loading images...</p>
                          )}
                          {images[r.id]?.front_image && (
                            <div style={{ flex: '1 1 200px', maxWidth: 320 }}>
                              <p style={{ fontSize: '12px', fontWeight: 600, color: '#0f0f0f', marginBottom: 8 }}>Front Side</p>
                              <img
                                src={images[r.id].front_image}
                                alt="Document front"
                                style={{ width: '100%', maxHeight: 280, objectFit: 'contain', borderRadius: 12, border: '1px solid #E5E5EA', background: '#F2F2F7' }}
                              />
                            </div>
                          )}
                          {images[r.id]?.back_image && (
                            <div style={{ flex: '1 1 200px', maxWidth: 320 }}>
                              <p style={{ fontSize: '12px', fontWeight: 600, color: '#0f0f0f', marginBottom: 8 }}>Back Side</p>
                              <img
                                src={images[r.id].back_image}
                                alt="Document back"
                                style={{ width: '100%', maxHeight: 280, objectFit: 'contain', borderRadius: 12, border: '1px solid #E5E5EA', background: '#F2F2F7' }}
                              />
                            </div>
                          )}
                          {images[r.id] && !images[r.id].front_image && !images[r.id].back_image && (
                            <p style={{ color: '#8E8E93', fontSize: '13px' }}>No document images available</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
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
              {actionModal.status === 'approved' ? 'Approve KYC' : 'Reject KYC'}
            </h2>
            <p style={{ fontSize: '13px', color: '#8E8E93', margin: '0 0 16px' }}>
              {actionModal.status === 'approved'
                ? 'This will approve the KYC verification. An optional note can be added below.'
                : 'This will reject the KYC verification. Please provide a reason.'}
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
                  background: actionModal.status === 'approved' ? '#FF5000' : '#C62828',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                {actionModal.status === 'approved' ? 'Confirm Approve' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
