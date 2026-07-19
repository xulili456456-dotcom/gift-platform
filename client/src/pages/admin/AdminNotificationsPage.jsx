import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import client from '../../api/client';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const styles = {
  page: { padding: '16px', minHeight: '100vh', background: '#f2f2f7' },
  headerRow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' },
  backBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#8e8e93', display: 'flex' },
  title: { fontSize: '20px', fontWeight: 700, color: '#0f0f0f', margin: 0 },
  card: { background: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', border: '1px solid #e5e5ea', padding: '20px', marginBottom: '16px' },
  cardTitle: { fontSize: '15px', fontWeight: 700, color: '#0f0f0f', margin: '0 0 16px 0' },
  formGroup: { marginBottom: '14px' },
  formLabel: { display: 'block', fontSize: '12px', fontWeight: 600, color: '#8e8e93', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  select: { width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e5e5ea', fontSize: '14px', color: '#0f0f0f', background: '#f9f9fb', outline: 'none', boxSizing: 'border-box', appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%238e8e93%27 stroke-width=%272%27%3E%3Cpolyline points=%276 9 12 15 18 9%27/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: '36px' },
  input: { width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e5e5ea', fontSize: '14px', color: '#0f0f0f', background: '#f9f9fb', outline: 'none', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e5e5ea', fontSize: '14px', color: '#0f0f0f', background: '#f9f9fb', outline: 'none', boxSizing: 'border-box', resize: 'vertical', minHeight: '100px', fontFamily: 'inherit' },
  sendBtn: { width: '100%', padding: '12px', borderRadius: '14px', border: 'none', background: '#FF5000', color: '#fff', fontSize: '15px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  sendBtnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  historyList: { listStyle: 'none', margin: 0, padding: 0 },
  historyItem: { padding: '14px 0', borderBottom: '1px solid #f2f2f7' },
  historyTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' },
  historyTitle: { fontSize: '14px', fontWeight: 600, color: '#0f0f0f', flex: 1, marginRight: '12px' },
  historyBody: { fontSize: '13px', color: '#3a3a3c', lineHeight: '1.5', marginBottom: '8px' },
  historyMeta: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  typeBadge: (type) => ({
    fontSize: '10px',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: '20px',
    textTransform: 'uppercase',
    color: type === 'success' ? '#34c759' : type === 'warning' ? '#ff9500' : '#007aff',
    background: type === 'success' ? 'rgba(52,199,89,0.1)' : type === 'warning' ? 'rgba(255,149,0,0.1)' : 'rgba(0,122,255,0.1)',
  }),
  metaText: { fontSize: '11px', color: '#8e8e93' },
  emptyState: { textAlign: 'center', padding: '32px 20px', color: '#8e8e93' },
  confirmOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  confirmBox: { background: '#fff', borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '360px', textAlign: 'center' },
  confirmIcon: { width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,80,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' },
  confirmTitle: { fontSize: '16px', fontWeight: 700, color: '#0f0f0f', marginBottom: '6px' },
  confirmDesc: { fontSize: '13px', color: '#8e8e93', marginBottom: '20px', lineHeight: '1.5' },
  confirmActions: { display: 'flex', gap: '10px' },
  confirmCancel: { flex: 1, padding: '12px', borderRadius: '14px', border: '1px solid #e5e5ea', background: '#fff', color: '#3a3a3c', fontSize: '14px', fontWeight: 600, cursor: 'pointer' },
  confirmOk: { flex: 1, padding: '12px', borderRadius: '14px', border: 'none', background: '#FF5000', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer' },
  loadingContainer: { padding: '8px 0' },
  skeleton: { background: '#e5e5ea', borderRadius: '12px', height: '70px', marginBottom: '10px' },
};

export default function AdminNotificationsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [target, setTarget] = useState('all');
  const [targetEmail, setTargetEmail] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('info');
  const [sending, setSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    if (!user?.is_admin) { navigate('/gifts', { replace: true }); return; }
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data } = await adminApi.listNotifications();
      setHistory(Array.isArray(data) ? data : (data.notifications || data.data || []));
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSend = () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    if (!body.trim()) { toast.error('Message body is required'); return; }
    if (target === 'email' && !targetEmail.trim()) { toast.error('Email address is required'); return; }
    setShowConfirm(true);
  };

  const confirmSend = async () => {
    setShowConfirm(false);
    setSending(true);
    try {
      const payload = {
        target,
        target_email: target === 'email' ? targetEmail.trim() : undefined,
        title: title.trim(),
        body: body.trim(),
        type,
      };
      await client.post('/tasks/send-notification', payload);
      toast.success('Notification sent successfully');
      setTitle('');
      setBody('');
      setTargetEmail('');
      setType('info');
      setTarget('all');
      loadHistory();
    } catch {
      toast.error('Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return ts; }
  };

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <button style={styles.backBtn} onClick={() => navigate('/admin')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 style={styles.title}>Send Notifications</h1>
      </div>

      {/* Compose */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Compose Notification</h2>

        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Target</label>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            style={styles.select}
          >
            <option value="all">All Users</option>
            <option value="email">Specific User (by Email)</option>
            <option value="active_orders">Users with Active Orders</option>
          </select>
        </div>

        {target === 'email' && (
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>User Email</label>
            <input
              type="email"
              value={targetEmail}
              onChange={(e) => setTargetEmail(e.target.value)}
              placeholder="user@example.com"
              style={styles.input}
              onFocus={(e) => { e.target.style.borderColor = '#FF5000'; }}
              onBlur={(e) => { e.target.style.borderColor = '#e5e5ea'; }}
            />
          </div>
        )}

        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={styles.select}
          >
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="success">Success</option>
          </select>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Notification title"
            style={styles.input}
            onFocus={(e) => { e.target.style.borderColor = '#FF5000'; }}
            onBlur={(e) => { e.target.style.borderColor = '#e5e5ea'; }}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Message Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message..."
            style={styles.textarea}
            onFocus={(e) => { e.target.style.borderColor = '#FF5000'; }}
            onBlur={(e) => { e.target.style.borderColor = '#e5e5ea'; }}
          />
        </div>

        <button
          style={{ ...styles.sendBtn, ...(sending ? styles.sendBtnDisabled : {}) }}
          onClick={handleSend}
          disabled={sending}
        >
          {sending ? (
            <>
              <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.6s linear infinite' }} />
              Sending...
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              Send Notification
            </>
          )}
        </button>
      </div>

      {/* History */}
      <div style={styles.card}>
        <h2 style={{ ...styles.cardTitle, marginBottom: '0' }}>Recently Sent</h2>
        {loadingHistory ? (
          <div style={styles.loadingContainer}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ ...styles.skeleton, animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={{ fontSize: '13px', margin: 0 }}>No notifications sent yet</p>
          </div>
        ) : (
          <ul style={styles.historyList}>
            {history.map((n) => (
              <li key={n.id} style={styles.historyItem}>
                <div style={styles.historyTop}>
                  <span style={styles.historyTitle}>{n.title}</span>
                  <span style={styles.typeBadge(n.type || 'info')}>{n.type || 'info'}</span>
                </div>
                <p style={styles.historyBody}>{n.body}</p>
                <div style={styles.historyMeta}>
                  <span style={styles.metaText}>
                    Target: {n.target === 'all' ? 'All Users' : n.target === 'email' ? n.target_email : 'Active Orders'}
                  </span>
                  <span style={styles.metaText}>{formatTime(n.created_at || n.sent_at)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div style={styles.confirmOverlay} onClick={() => setShowConfirm(false)}>
          <div style={styles.confirmBox} onClick={(e) => e.stopPropagation()}>
            <div style={styles.confirmIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF5000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3 style={styles.confirmTitle}>Confirm Send</h3>
            <p style={styles.confirmDesc}>
              Send this notification to{' '}
              <strong>{target === 'all' ? 'all users' : target === 'email' ? targetEmail : 'users with active orders'}</strong>?
              This action cannot be undone.
            </p>
            <div style={styles.confirmActions}>
              <button style={styles.confirmCancel} onClick={() => setShowConfirm(false)}>Cancel</button>
              <button style={styles.confirmOk} onClick={confirmSend}>Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
