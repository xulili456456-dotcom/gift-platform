import { useNavigate, useLocation } from 'react-router-dom';

const navItems = [
  { label: 'Dashboard', icon: '📊', path: '/admin/dashboard' },
  { label: 'Orders', icon: '📦', path: '/admin/orders' },
  { label: 'Deposits', icon: '💵', path: '/admin/deposits' },
  { label: 'KYC', icon: '🛡️', path: '/admin/kyc' },
  { label: 'Users', icon: '👥', path: '/admin/users' },
  { label: 'Gifts', icon: '🎁', path: '/admin/gifts' },
  { label: 'Tasks', icon: '📋', path: '/admin/tasks' },
  { label: 'Notify', icon: '🔔', path: '/admin/notifications' },
  { label: 'Analytics', icon: '📈', path: '/admin/analytics' },
  { label: 'Settings', icon: '⚙️', path: '/admin/settings' },
  { label: 'Audit Log', icon: '📜', path: '/admin/audit' },
];

export default function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      width: 200,
      background: '#0f0f0f',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 50,
      overflowY: 'auto',
    }}>
      {/* Logo area */}
      <div style={{
        padding: '20px 16px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: '#FF5000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          fontWeight: 700,
          color: '#fff',
        }}>
          A
        </div>
        <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>Admin Panel</span>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '12px 0' }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '10px 16px',
                border: 'none',
                background: isActive ? '#FFF5F0' : 'transparent',
                color: isActive ? '#FF5000' : 'rgba(255,255,255,0.75)',
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
                borderLeft: isActive ? '3px solid #FF5000' : '3px solid transparent',
                borderRadius: 0,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.color = '#fff';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.75)';
                }
              }}
            >
              <span style={{ fontSize: 16, width: 24, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
              <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom branding */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        fontSize: 10,
        color: 'rgba(255,255,255,0.3)',
        textAlign: 'center',
      }}>
        Gift Platform Admin v1.0
      </div>
    </div>
  );
}
