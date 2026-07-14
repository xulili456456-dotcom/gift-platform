import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import client from '../api/client';
import { Bell, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function NotificationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState({ notifications: [], unread: 0 });
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    client.get('/notifications').then(({ data }) => setData(data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { loadData(); }, []);

  const markAllRead = () => {
    client.put('/notifications/read-all').then(() => {
      setData(prev => ({ ...prev, unread: 0, notifications: prev.notifications.map(n => ({ ...n, is_read: 1 })) }));
      toast.success('All marked read');
      window.dispatchEvent(new Event('notifUpdate'));
    });
  };

  if (loading) return <div className="min-h-screen bg-bg p-4"><div className="skeleton h-8 w-32" /><div className="skeleton h-64 rounded-2xl" /></div>;

  return (
    <div className="min-h-screen bg-bg animate-fade-in">
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-separator">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/mine')} className="flex items-center gap-1 text-primary font-medium text-sm pr-2 py-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
            {t('common.back')}
          </button>
          <h2 className="text-[16px] font-bold text-text">通知中心</h2>
          {data.unread > 0 && <span className="bg-primary text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{data.unread}</span>}
        </div>
        {data.unread > 0 && (
          <button onClick={markAllRead} className="text-xs text-primary font-medium">全部已读</button>
        )}
      </div>
      <div className="p-4">
        {data.notifications.length > 0 ? (
          <div className="space-y-2">
            {data.notifications.map((n, idx) => (
              <div key={n.id} onClick={() => { client.put('/notifications/' + n.id + '/read').then(() => loadData()).catch(() => {}); }} className={`bg-white rounded-2xl p-4 border shadow-sm stagger-item cursor-pointer active:scale-[0.98] transition-transform ${n.is_read ? 'border-separator' : 'border-primary/20 bg-primary/[0.02]'}`} style={{ animationDelay: idx * 0.05 + 's' }}>
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    n.type === 'success' ? 'bg-success/10' : n.type === 'warning' ? 'bg-yellow-100' : 'bg-bg'
                  }`}>
                    <Bell size={16} className={n.type === 'success' ? 'text-success' : n.type === 'warning' ? 'text-yellow-600' : 'text-text-muted'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-[13px] font-semibold ${n.is_read ? 'text-text-secondary' : 'text-text'}`}>{n.title}</p>
                      {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    {n.body && <p className="text-[12px] text-text-muted mt-0.5">{n.body}</p>}
                    <p className="text-[10px] text-text-muted mt-1">{n.created_at?.slice(0, 16)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Bell size={48} className="text-text-muted mx-auto mb-4 opacity-30" />
            <p className="text-[14px] font-semibold text-text-muted">暂无通知</p>
          </div>
        )}
      </div>
    </div>
  );
}
