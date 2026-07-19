import { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const fmtUSD = (n) => '$' + (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = (n) => Number(n) || 0;

const emptyForm = { name: '', description: '', gift_type: 'cash', value: 0, required_invites: 1, stock: -1, sort_order: 0 };

const Skeleton = ({ h = 60 }) => (
  <div style={{
    height: h,
    borderRadius: 14,
    background: 'linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    marginBottom: 8,
  }} />
);

export default function AdminGiftsPage() {
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGift, setEditingGift] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user?.is_admin) return;
    loadGifts();
  }, []);

  const loadGifts = async () => {
    try {
      const { data } = await adminApi.listGifts();
      setGifts(Array.isArray(data) ? data : data?.gifts || []);
    } catch {
      toast.error('Failed to load gifts');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingGift(null);
    setForm({ ...emptyForm });
    setShowForm(true);
  };

  const openEdit = (gift) => {
    setEditingGift(gift);
    setForm({
      name: gift.name || '',
      description: gift.description || '',
      gift_type: gift.gift_type || 'cash',
      value: fmt(gift.value),
      required_invites: fmt(gift.required_invites),
      stock: fmt(gift.stock),
      sort_order: fmt(gift.sort_order),
    });
    setShowForm(true);
  };

  const updateField = (field) => (e) => {
    const val = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSubmitting(true);
    try {
      if (editingGift) {
        await adminApi.updateGift(editingGift.id, form);
        toast.success('Gift updated');
      } else {
        await adminApi.createGift(form);
        toast.success('Gift created');
      }
      setShowForm(false);
      loadGifts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (gift) => {
    const newStatus = !gift.is_active;
    const action = newStatus ? 'activate' : 'deactivate';
    if (!confirm(`Are you sure you want to ${action} this gift?`)) return;
    try {
      await adminApi.updateGift(gift.id, { is_active: newStatus });
      toast.success(`Gift ${action}d`);
      loadGifts();
    } catch {
      toast.error('Operation failed');
    }
  };

  // --- Loading state ---
  if (loading) {
    return (
      <div style={{ background: '#f2f2f7', minHeight: '100vh' }}>
        <div style={{ background: '#0f0f0f', padding: '20px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: 0 }}>Gift Management</h1>
        </div>
        <div style={{ padding: 16 }}>
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} h={60} />)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#f2f2f7', minHeight: '100vh', paddingBottom: 40 }}>
      {/* Dark header */}
      <div style={{ background: '#0f0f0f', padding: '20px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h1 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: 0 }}>Gift Management</h1>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>({gifts.length} gifts)</span>
        </div>
        <button
          onClick={openCreate}
          style={{
            background: '#FF5000',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            padding: '8px 18px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.15s',
          }}
        >
          + Add Gift
        </button>
      </div>

      {/* Gifts table */}
      <div style={{ padding: '16px' }}>
        {gifts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 20px', color: '#999', fontSize: 13 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎁</div>
            <p style={{ margin: 0, fontWeight: 600, color: '#666' }}>No gifts found</p>
            <p style={{ margin: '4px 0 0', fontSize: 12 }}>Click "Add Gift" to create your first gift.</p>
          </div>
        ) : (
          <div style={styles.card}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    {['Name', 'Value', 'Req. Invites', 'Stock', 'Status', 'Actions'].map((h) => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 12px', color: '#999', fontWeight: 500, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gifts.map((gift, i) => (
                    <tr key={gift.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '12px 12px', color: '#333', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 20 }}>{gift.gift_type === 'cash' ? '💰' : '🎁'}</span>
                          <span>{gift.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 12px', color: '#4CAF50', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {fmtUSD(gift.value)}
                      </td>
                      <td style={{ padding: '12px 12px', color: '#333', fontSize: 13, whiteSpace: 'nowrap' }}>
                        {fmt(gift.required_invites)}
                      </td>
                      <td style={{ padding: '12px 12px', color: '#333', fontSize: 13, whiteSpace: 'nowrap' }}>
                        {gift.stock === -1 ? (
                          <span style={{ color: '#4CAF50', fontWeight: 500 }}>Unlimited</span>
                        ) : fmt(gift.stock) <= 0 ? (
                          <span style={{ color: '#F44336', fontWeight: 500 }}>Out of stock</span>
                        ) : (
                          <span>{fmt(gift.stock)}</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 12px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: 10,
                          fontSize: 11,
                          fontWeight: 600,
                          background: gift.is_active ? '#e6f9e8' : '#fdecea',
                          color: gift.is_active ? '#1a7d2e' : '#b71c1c',
                        }}>
                          {gift.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 12px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => openEdit(gift)}
                            style={{
                              border: '1px solid #e5e5ea',
                              borderRadius: 10,
                              padding: '4px 10px',
                              fontSize: 12,
                              color: '#FF5000',
                              background: '#fff',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleActive(gift)}
                            style={{
                              border: '1px solid #e5e5ea',
                              borderRadius: 10,
                              padding: '4px 10px',
                              fontSize: 12,
                              color: gift.is_active ? '#b71c1c' : '#1a7d2e',
                              background: '#fff',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            {gift.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal form */}
      {showForm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
          onClick={() => setShowForm(false)}
        >
          <form
            onSubmit={handleSubmit}
            style={{
              background: '#fff',
              borderRadius: '20px 20px 0 0',
              width: '100%',
              maxWidth: '480px',
              padding: '24px',
              maxHeight: '85vh',
              overflowY: 'auto',
              animation: 'slideUp 0.25s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: 36, height: 4, background: '#e5e5ea', borderRadius: 2, margin: '0 auto 20px' }} />
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0f0f0f', marginBottom: 16 }}>
              {editingGift ? 'Edit Gift' : 'Add Gift'}
            </h2>

            {/* Name */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8e8e93', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Name *</label>
              <input
                value={form.name}
                onChange={updateField('name')}
                placeholder="Gift name"
                style={styles.input}
                required
              />
            </div>

            {/* Description */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8e8e93', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</label>
              <input
                value={form.description}
                onChange={updateField('description')}
                placeholder="Optional description"
                style={styles.input}
              />
            </div>

            {/* Gift type + Value */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8e8e93', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Type</label>
                <select value={form.gift_type} onChange={updateField('gift_type')} style={styles.input}>
                  <option value="cash">Cash</option>
                  <option value="physical">Physical</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8e8e93', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Value ($)</label>
                <input type="number" value={form.value} onChange={updateField('value')} min="0" step="0.01" style={styles.input} />
              </div>
            </div>

            {/* Required invites + Stock */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8e8e93', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Req. Invites</label>
                <input type="number" value={form.required_invites} onChange={updateField('required_invites')} min="1" style={styles.input} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8e8e93', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Stock</label>
                <input type="number" value={form.stock} onChange={updateField('stock')} min="-1" style={styles.input} />
                <span style={{ fontSize: 10, color: '#999', marginTop: 2, display: 'block' }}>-1 = Unlimited</span>
              </div>
            </div>

            {/* Sort order */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8e8e93', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sort Order</label>
              <input type="number" value={form.sort_order} onChange={updateField('sort_order')} min="0" style={styles.input} />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: 14,
                  border: 'none',
                  background: '#FF5000',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? 'Saving...' : editingGift ? 'Save Changes' : 'Create Gift'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: 14,
                  border: '1px solid #e5e5ea',
                  background: '#fff',
                  color: '#3a3a3c',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    background: '#fff',
    borderRadius: 14,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 12,
    border: '1px solid #e5e5ea',
    fontSize: 14,
    color: '#0f0f0f',
    background: '#f9f9fb',
    outline: 'none',
    boxSizing: 'border-box',
  },
};
