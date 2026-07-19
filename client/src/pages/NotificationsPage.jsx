import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import client from '../api/client';
import toast from 'react-hot-toast';

const PREF_KEY = 'notif_preferences';
const DEFAULT_PREFS = { deposit: true, kyc: true, promotion: true, team: true };

export default function NotificationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState({ notifications: [], unread: 0 });
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selected, setSelected] = useState(null);
  const [prefs, setPrefs] = useState(() => {
    try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREF_KEY)) }; } catch { return { ...DEFAULT_PREFS }; }
  });

  const loadData = () => {
    client.get('/notifications').then(({ data }) => setData(data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { loadData(); }, []);

  const savePref = (key, val) => {
    const next = { ...prefs, [key]: val };
    setPrefs(next);
    localStorage.setItem(PREF_KEY, JSON.stringify(next));
  };

  const markAllRead = () => {
    client.put('/notifications/read-all').then(() => {
      setData(prev => ({ ...prev, unread: 0, notifications: prev.notifications.map(n => ({ ...n, is_read: true })) }));
      toast.success(t('notifications.markAllRead'));
      window.dispatchEvent(new Event('notifUpdate'));
    });
  };

  const markRead = (n) => {
    if (n.is_read) return;
    setData(prev => ({
      ...prev,
      notifications: prev.notifications.map(x => x.id === n.id ? { ...x, is_read: true } : x),
      unread: Math.max(0, prev.unread - 1),
    }));
    client.put('/notifications/' + n.id + '/read').catch(() => {});
    window.dispatchEvent(new Event('notifUpdate'));
  };

  const groupByTime = (list) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 86400000);
    const groups = { Today: [], Yesterday: [], Earlier: [] };
    list.forEach(n => {
      const d = n.created_at ? new Date(n.created_at) : new Date(0);
      if (d >= todayStart) groups.Today.push(n);
      else if (d >= yesterdayStart) groups.Yesterday.push(n);
      else groups.Earlier.push(n);
    });
    return Object.entries(groups).filter(([, items]) => items.length > 0);
  };

  const getIcon = (type) => {
    if (type === 'success') return { emoji: '✅', bg: '#E8F5E9' };
    if (type === 'warning') return { emoji: '⚠️', bg: '#FFF8E1' };
    return { emoji: '🔔', bg: '#f0f0f0' };
  };

  if (loading) return (
    <div style={{background:'#f2f2f7',minHeight:'100vh',maxWidth:430,margin:'0 auto'}}>
      <div style={{background:'#0f0f0f',padding:'8px 16px 12px',display:'flex',alignItems:'center',gap:12,color:'#fff'}}>
        <span style={{fontSize:20}}>←</span><span style={{fontSize:14,fontWeight:700}}>{t('notifications.title')}</span>
      </div>
      <div style={{padding:16}}>
        <div style={{background:'#fff',borderRadius:16,height:80,marginBottom:8}} />
        <div style={{background:'#fff',borderRadius:16,height:80,marginBottom:8}} />
      </div>
    </div>
  );

  const filtered = unreadOnly ? data.notifications.filter(n => !n.is_read) : data.notifications;
  const groups = groupByTime(filtered);

  return (
    <div style={{background:'#f2f2f7',minHeight:'100vh',maxWidth:430,margin:'0 auto',paddingBottom:80}}>
      {/* Header */}
      <div style={{background:'#0f0f0f',padding:'8px 16px 12px',color:'#fff'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <button onClick={() => navigate('/mine')} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#fff'}}>←</button>
            <span style={{fontSize:14,fontWeight:700}}>{t('notifications.title')}</span>
            {data.unread > 0 && <span style={{background:'#FF5000',color:'#fff',fontSize:10,padding:'2px 8px',borderRadius:10,fontWeight:700}}>{data.unread}</span>}
          </div>
          {data.unread > 0 && (
            <span onClick={markAllRead} style={{fontSize:12,color:'#FF5000',cursor:'pointer',fontWeight:500}}>{t('notifications.markAllRead')}</span>
          )}
        </div>
        {/* Unread filter toggle */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:6,marginTop:8}}>
          <span style={{fontSize:10,color:'#999'}}>Unread only</span>
          <div onClick={() => setUnreadOnly(!unreadOnly)} style={{
            width:36,height:20,borderRadius:10,position:'relative',cursor:'pointer',flexShrink:0,
            background: unreadOnly ? '#FF5000' : '#555', transition:'background .2s'
          }}>
            <div style={{
              width:16,height:16,background:'#fff',borderRadius:'50%',position:'absolute',top:2,
              left: unreadOnly ? 18 : 2, transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,.2)'
            }} />
          </div>
        </div>
      </div>

      <div style={{padding:16}}>
        {filtered.length > 0 ? groups.map(([label, items]) => (
          <div key={label}>
            <div style={{fontSize:10,fontWeight:700,color:'#bbb',marginBottom:8,marginTop: label === 'Today' ? 0 : 14,paddingLeft:4,textTransform:'uppercase',letterSpacing:'.5px'}}>{label}</div>
            {items.map(n => {
              const icon = getIcon(n.type);
              return (
                <div key={n.id} onClick={() => { setSelected(n); markRead(n); }} style={{
                  background:'#fff',borderRadius:16,padding:14,marginBottom:8,cursor:'pointer',
                  borderLeft: n.is_read ? '3px solid transparent' : '3px solid #FF5000',
                  opacity: n.is_read ? .55 : 1, transition:'opacity .2s'
                }}>
                  <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                    <div style={{width:36,height:36,borderRadius:18,background:icon.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:16}}>{icon.emoji}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <span style={{fontSize:13,fontWeight:n.is_read?600:700,color:n.is_read?'#999':'#0f0f0f'}}>{n.title}</span>
                        {!n.is_read && <span style={{width:7,height:7,borderRadius:'50%',background:'#FF5000',flexShrink:0}} />}
                      </div>
                      {n.body && <div style={{fontSize:11,color:n.is_read?'#bbb':'#999',marginTop:2,lineHeight:1.4,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{n.body}</div>}
                      <div style={{fontSize:10,color:n.is_read?'#ddd':'#ccc',marginTop:4}}>{n.created_at ? new Date(n.created_at).toLocaleString() : ''}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )) : (
          <div style={{textAlign:'center',padding:'60px 20px'}}>
            <div style={{width:72,height:72,borderRadius:36,background:'#f0f0f0',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:32,opacity:.4}}>🔔</div>
            <div style={{fontSize:14,fontWeight:700,color:'#999',marginBottom:4}}>{t('notifications.empty')}</div>
            <div style={{fontSize:12,color:'#ccc'}}>We'll notify you when something important happens</div>
          </div>
        )}

        {/* Notification Preferences */}
        <details style={{background:'#fff',borderRadius:16,padding:16,marginTop:12,cursor:'pointer'}}>
          <summary style={{fontSize:12,fontWeight:700,color:'#0f0f0f',listStyle:'none',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            Notification Preferences
            <span style={{fontSize:10,color:'#bbb'}}>▼ Expand</span>
          </summary>
          <div style={{marginTop:12,paddingTop:12,borderTop:'1px solid #f0f0f0',display:'flex',flexDirection:'column',gap:10}}>
            {[
              { key: 'deposit', label: 'Deposit & Withdrawal', desc: 'Payment confirmations and status updates' },
              { key: 'kyc', label: 'KYC & Verification', desc: 'Identity verification status updates' },
              { key: 'promotion', label: 'Promotions & Updates', desc: 'New features, events, and special offers' },
              { key: 'team', label: 'Team & Referral', desc: 'Commission earnings and team activity' },
            ].map(({ key, label, desc }) => (
              <div key={key} style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:'#333'}}>{label}</div>
                  <div style={{fontSize:10,color:'#bbb'}}>{desc}</div>
                </div>
                <div onClick={() => savePref(key, !prefs[key])} style={{
                  width:44,height:26,borderRadius:13,position:'relative',cursor:'pointer',flexShrink:0,
                  background: prefs[key] ? '#FF5000' : '#e0e0e0', transition:'background .2s'
                }}>
                  <div style={{width:22,height:22,background:'#fff',borderRadius:'50%',position:'absolute',top:2,left: prefs[key]?20:2,transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,.15)'}} />
                </div>
              </div>
            ))}
          </div>
        </details>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,.4)',backdropFilter:'blur(2px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div onClick={e => e.stopPropagation()} style={{background:'#fff',borderRadius:20,padding:24,width:'100%',maxWidth:340,boxShadow:'0 20px 60px rgba(0,0,0,.25)',animation:'.25s ease-out'}}>
            <div style={{width:48,height:48,borderRadius:24,background:getIcon(selected.type).bg,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:14,fontSize:24}}>{getIcon(selected.type).emoji}</div>
            <h3 style={{fontSize:15,fontWeight:700,color:'#0f0f0f',marginBottom:6}}>{selected.title}</h3>
            <p style={{fontSize:12,color:'#999',lineHeight:1.6,marginBottom:12}}>{selected.body}</p>
            <div style={{fontSize:10,color:'#bbb',marginBottom:16}}>{selected.created_at ? new Date(selected.created_at).toLocaleString() : ''}</div>
            <button onClick={() => setSelected(null)} style={{width:'100%',padding:12,background:'#f5f5f5',color:'#333',border:'none',borderRadius:12,fontSize:13,fontWeight:600,cursor:'pointer'}}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
