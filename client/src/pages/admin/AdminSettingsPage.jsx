import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import toast from 'react-hot-toast';

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

export default function AdminSettingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    platform_name: '',
    share_title: '',
    share_description: '',
    commission_level1: 0,
    commission_level2: 0,
    commission_level3: 0,
    trc20_address: '',
    erc20_address: '',
    bep20_address: '',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await adminApi.getSettings();
      if (data) {
        setForm({
          platform_name: data.platform_name || '',
          share_title: data.share_title || '',
          share_description: data.share_description || '',
          commission_level1: data.commission_level1 ?? 0,
          commission_level2: data.commission_level2 ?? 0,
          commission_level3: data.commission_level3 ?? 0,
          trc20_address: data.trc20_address || '',
          erc20_address: data.erc20_address || '',
          bep20_address: data.bep20_address || '',
        });
      }
    } catch {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field) => (e) => {
    const val = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminApi.updateSettings(form);
      toast.success('Settings saved successfully');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ background: '#f2f2f7', minHeight: '100vh' }}>
        <div style={{ background: '#0f0f0f', padding: '20px 20px' }}>
          <h1 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: 0 }}>Platform Settings</h1>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Skeleton h={48} />
          <Skeleton h={200} />
          <Skeleton h={200} />
          <Skeleton h={200} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#f2f2f7', minHeight: '100vh', paddingBottom: 40 }}>
      {/* Dark header */}
      <div style={{ background: '#0f0f0f', padding: '20px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/admin')}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: 0 }}>Platform Settings</h1>
        </div>
      </div>

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Section: General Settings */}
        <div style={styles.card}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF5000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f0f0f' }}>General Settings</h2>
          </div>
          <div style={styles.fieldGroup}>
            <label style={labelStyle}>Platform Name</label>
            <input
              type="text"
              value={form.platform_name}
              onChange={updateField('platform_name')}
              placeholder="Enter platform name"
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = '#FF5000'; e.target.style.background = '#fff'; }}
              onBlur={(e) => { e.target.style.borderColor = '#e0e0e0'; e.target.style.background = '#fafafa'; }}
            />
          </div>
          <div style={styles.fieldGroup}>
            <label style={labelStyle}>Share Title</label>
            <input
              type="text"
              value={form.share_title}
              onChange={updateField('share_title')}
              placeholder="Title shown when sharing"
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = '#FF5000'; e.target.style.background = '#fff'; }}
              onBlur={(e) => { e.target.style.borderColor = '#e0e0e0'; e.target.style.background = '#fafafa'; }}
            />
          </div>
          <div style={styles.fieldGroup}>
            <label style={labelStyle}>Share Description</label>
            <textarea
              value={form.share_description}
              onChange={updateField('share_description')}
              placeholder="Description shown when sharing"
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              onFocus={(e) => { e.target.style.borderColor = '#FF5000'; e.target.style.background = '#fff'; }}
              onBlur={(e) => { e.target.style.borderColor = '#e0e0e0'; e.target.style.background = '#fafafa'; }}
            />
          </div>
        </div>

        {/* Section: Commission Settings */}
        <div style={styles.card}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF5000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f0f0f' }}>Commission Settings</h2>
          </div>
          <p style={{ fontSize: 12, color: '#999', margin: '0 0 12px 0' }}>Set commission rates for each referral level (percentage %)</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[1, 2, 3].map((level) => (
              <div key={level} style={styles.fieldGroup}>
                <label style={labelStyle}>Level {level} (%)</label>
                <input
                  type="number"
                  value={form[`commission_level${level}`]}
                  onChange={updateField(`commission_level${level}`)}
                  min="0"
                  max="100"
                  step="0.1"
                  style={{ ...inputStyle, textAlign: 'center', fontSize: 18, fontWeight: 700 }}
                  onFocus={(e) => { e.target.style.borderColor = '#FF5000'; e.target.style.background = '#fff'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#e0e0e0'; e.target.style.background = '#fafafa'; }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Section: Wallet Addresses */}
        <div style={styles.card}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF5000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
              </svg>
            </div>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f0f0f' }}>Wallet Addresses</h2>
          </div>
          <p style={{ fontSize: 12, color: '#999', margin: '0 0 12px 0' }}>Deposit addresses displayed to users for each network</p>
          {[
            { key: 'trc20_address', label: 'TRC20 (USDT-TRC20)', network: 'TRON' },
            { key: 'erc20_address', label: 'ERC20 (USDT-ERC20)', network: 'Ethereum' },
            { key: 'bep20_address', label: 'BEP20 (USDT-BEP20)', network: 'BSC' },
          ].map((addr) => (
            <div key={addr.key} style={{ ...styles.fieldGroup, marginBottom: 12 }}>
              <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
                {addr.label}
                <span style={{
                  fontSize: 10,
                  fontWeight: 400,
                  color: '#FF5000',
                  background: '#FFF0E8',
                  padding: '2px 8px',
                  borderRadius: 10,
                  textTransform: 'none',
                  letterSpacing: 0,
                }}>
                  {addr.network}
                </span>
              </label>
              <input
                type="text"
                value={form[addr.key]}
                onChange={updateField(addr.key)}
                placeholder={`Enter ${addr.label} address`}
                style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 13 }}
                onFocus={(e) => { e.target.style.borderColor = '#FF5000'; e.target.style.background = '#fff'; }}
                onBlur={(e) => { e.target.style.borderColor = '#e0e0e0'; e.target.style.background = '#fafafa'; }}
              />
            </div>
          ))}
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 14,
            border: 'none',
            background: saving ? '#ccc' : '#FF5000',
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s',
            boxShadow: '0 2px 8px rgba(255,80,0,0.3)',
            marginTop: 4,
          }}
          onMouseEnter={(e) => { if (!saving) e.currentTarget.style.background = '#e04800'; }}
          onMouseLeave={(e) => { if (!saving) e.currentTarget.style.background = '#FF5000'; }}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: '#fff',
    borderRadius: 14,
    padding: 18,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: '1px solid #f0f0f0',
  },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: '#FFF0E8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
};
