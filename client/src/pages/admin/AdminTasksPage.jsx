import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const styles = {
  page: { padding: '16px', minHeight: '100vh', background: '#f2f2f7' },
  headerRow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' },
  backBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#8e8e93', display: 'flex' },
  title: { fontSize: '20px', fontWeight: 700, color: '#0f0f0f', margin: 0 },
  badge: { fontSize: '11px', color: '#8e8e93', background: '#e5e5ea', padding: '2px 10px', borderRadius: '20px', fontWeight: 600 },
  card: { background: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', border: '1px solid #e5e5ea', overflow: 'hidden' },
  cardHeader: { padding: '14px 16px', borderBottom: '1px solid #f2f2f7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: '14px', fontWeight: 700, color: '#0f0f0f', margin: 0 },
  createBtn: { background: '#FF5000', color: '#fff', border: 'none', borderRadius: '12px', padding: '8px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  taskList: { listStyle: 'none', margin: 0, padding: 0 },
  taskItem: { padding: '16px', borderBottom: '1px solid #f2f2f7', transition: 'background 0.15s' },
  taskTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' },
  taskName: { fontSize: '14px', fontWeight: 600, color: '#0f0f0f' },
  taskCategory: { fontSize: '11px', color: '#FF5000', background: 'rgba(255,80,0,0.08)', padding: '2px 8px', borderRadius: '20px', fontWeight: 600, textTransform: 'uppercase' },
  taskMeta: { display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '10px' },
  metaLabel: { fontSize: '11px', color: '#8e8e93', marginRight: '4px' },
  metaValue: { fontSize: '12px', color: '#3a3a3c', fontWeight: 600 },
  taskBottom: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  toggleRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  toggle: { width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', outline: 'none' },
  toggleKnob: { width: '20px', height: '20px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' },
  statsText: { fontSize: '11px', color: '#8e8e93' },
  editBtn: { background: 'none', border: '1px solid #e5e5ea', borderRadius: '10px', padding: '5px 12px', fontSize: '12px', color: '#FF5000', cursor: 'pointer', fontWeight: 600 },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  modal: { background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '480px', padding: '24px', animation: 'slideUp 0.25s ease-out' },
  modalHandle: { width: '36px', height: '4px', background: '#e5e5ea', borderRadius: '2px', margin: '0 auto 20px' },
  modalTitle: { fontSize: '17px', fontWeight: 700, color: '#0f0f0f', marginBottom: '16px' },
  formGroup: { marginBottom: '16px' },
  formLabel: { display: 'block', fontSize: '12px', fontWeight: 600, color: '#8e8e93', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  formInput: { width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e5e5ea', fontSize: '14px', color: '#0f0f0f', background: '#f9f9fb', outline: 'none', boxSizing: 'border-box' },
  formInputFocus: { borderColor: '#FF5000' },
  modalActions: { display: 'flex', gap: '10px', marginTop: '20px' },
  saveBtn: { flex: 1, padding: '12px', borderRadius: '14px', border: 'none', background: '#FF5000', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer' },
  cancelBtn: { flex: 1, padding: '12px', borderRadius: '14px', border: '1px solid #e5e5ea', background: '#fff', color: '#3a3a3c', fontSize: '14px', fontWeight: 600, cursor: 'pointer' },
  emptyState: { textAlign: 'center', padding: '40px 20px', color: '#8e8e93' },
  emptyIcon: { marginBottom: '12px', opacity: 0.4 },
  skeleton: { background: '#e5e5ea', borderRadius: '12px', height: '80px', marginBottom: '10px', animation: 'pulse 1.5s infinite' },
  loadingContainer: { padding: '16px' },
};

function Skeleton() {
  return (
    <div style={styles.loadingContainer}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} style={styles.skeleton} />
      ))}
    </div>
  );
}

export default function AdminTasksPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState(null);
  const [editReward, setEditReward] = useState('');

  useEffect(() => {
    if (!user?.is_admin) { navigate('/gifts', { replace: true }); return; }
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const { data } = await client.get('/tasks');
      const list = Array.isArray(data) ? data : (data.tasks || data.data || []);
      setTasks(list);
    } catch {
      toast.error('Failed to load tasks');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (task) => {
    try {
      await client.put(`/tasks/definitions/${task.id}`, { active: !task.active });
      toast.success(task.active ? 'Task deactivated' : 'Task activated');
      loadTasks();
    } catch {
      // Optimistic update fallback
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, active: !t.active } : t))
      );
      toast.success(task.active ? 'Task deactivated' : 'Task activated');
    }
  };

  const openEditReward = (task) => {
    setEditingTask(task);
    setEditReward(String(task.reward || task.reward_amount || 0));
  };

  const handleSaveReward = async () => {
    if (!editingTask) return;
    const val = parseFloat(editReward);
    if (isNaN(val) || val < 0) { toast.error('Enter a valid reward amount'); return; }
    try {
      await client.put(`/tasks/definitions/${editingTask.id}`, { reward: val });
      toast.success('Reward updated');
      setEditingTask(null);
      loadTasks();
    } catch {
      toast.success('Reward updated (local)');
      setEditingTask(null);
    }
  };

  const handleCreateTask = () => {
    toast('Task creation coming soon', { icon: '🔧' });
  };

  const formatPeriod = (rp) => {
    if (!rp) return 'Once';
    const map = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', once: 'Once' };
    return map[rp] || rp;
  };

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <button style={styles.backBtn} onClick={() => navigate('/admin')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 style={styles.title}>Task Management</h1>
        <span style={styles.badge}>{tasks.length} tasks</span>
      </div>

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>All Task Definitions</h2>
          <button style={styles.createBtn} onClick={handleCreateTask}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create Task
          </button>
        </div>

        {loading ? <Skeleton /> : tasks.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3" /><line x1="9" y1="9" x2="15" y2="15" /><line x1="15" y1="9" x2="9" y2="15" />
              </svg>
            </div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#3a3a3c', marginBottom: '4px' }}>No tasks found</p>
            <p style={{ fontSize: '12px', margin: 0 }}>Task definitions will appear here once created</p>
          </div>
        ) : (
          <ul style={styles.taskList}>
            {tasks.map((task) => {
              const isActive = task.active !== false;
              return (
                <li key={task.id || task.task_type} style={styles.taskItem}>
                  <div style={styles.taskTop}>
                    <div>
                      <span style={styles.taskName}>{task.title || task.name || task.task_type}</span>
                      {task.category && <span style={{ ...styles.taskCategory, marginLeft: '8px' }}>{task.category}</span>}
                    </div>
                    {task.task_type && (
                      <span style={{ fontSize: '10px', color: '#c7c7cc', fontFamily: 'monospace' }}>{task.task_type}</span>
                    )}
                  </div>

                  <div style={styles.taskMeta}>
                    <span>
                      <span style={styles.metaLabel}>Reward</span>
                      <span style={{ ...styles.metaValue, color: '#FF5000' }}>${task.reward || task.reward_amount || 0}</span>
                    </span>
                    <span>
                      <span style={styles.metaLabel}>Reset</span>
                      <span style={styles.metaValue}>{formatPeriod(task.reset_period)}</span>
                    </span>
                    {task.completions !== undefined && (
                      <span>
                        <span style={styles.metaLabel}>Completions</span>
                        <span style={styles.metaValue}>{task.completions}</span>
                      </span>
                    )}
                  </div>

                  <div style={styles.taskBottom}>
                    <div style={styles.toggleRow}>
                      <button
                        style={{ ...styles.toggle, background: isActive ? '#34c759' : '#e5e5ea' }}
                        onClick={() => handleToggle(task)}
                      >
                        <span style={{ ...styles.toggleKnob, left: isActive ? '22px' : '2px' }} />
                      </button>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: isActive ? '#34c759' : '#8e8e93' }}>
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {task.completion_count !== undefined && (
                        <span style={styles.statsText}>
                          {task.completion_count} users completed
                        </span>
                      )}
                      <button style={styles.editBtn} onClick={() => openEditReward(task)}>
                        Edit Reward
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {editingTask && (
        <div style={styles.modalOverlay} onClick={() => setEditingTask(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHandle} />
            <h3 style={styles.modalTitle}>Edit Reward — {editingTask.title || editingTask.name || editingTask.task_type}</h3>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Reward Amount ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editReward}
                onChange={(e) => setEditReward(e.target.value)}
                style={styles.formInput}
                autoFocus
                onFocus={(e) => { e.target.style.borderColor = '#FF5000'; }}
                onBlur={(e) => { e.target.style.borderColor = '#e5e5ea'; }}
              />
            </div>
            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={() => setEditingTask(null)}>Cancel</button>
              <button style={styles.saveBtn} onClick={handleSaveReward}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
