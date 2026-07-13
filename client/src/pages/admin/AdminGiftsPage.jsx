import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../../api/admin';
import toast from 'react-hot-toast';

export default function AdminGiftsPage() {
  const { t, i18n } = useTranslation();
  const tgName = (name) => {
    const gd = i18n.getResource(i18n.language, 'translation', 'giftData');
    if (gd && gd[name]) return gd[name].name;
    return name;
  };
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGift, setEditingGift] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', gift_type: 'cash', required_invites: 1, value: 0, stock: -1, sort_order: 0 });
  const navigate = useNavigate();

  useEffect(() => { loadGifts(); }, []);

  const loadGifts = async () => {
    try { const { data } = await adminApi.listGifts(); setGifts(data); }
    catch { toast.error(t('common.loadingFailed')); }
    finally { setLoading(false); }
  };

  const openCreate = () => { setEditingGift(null); setForm({ name: '', description: '', gift_type: 'cash', required_invites: 1, value: 0, stock: -1, sort_order: 0 }); setShowForm(true); };
  const openEdit = (gift) => { setEditingGift(gift); setForm({ name: gift.name, description: gift.description || '', gift_type: gift.gift_type, required_invites: gift.required_invites, value: gift.value, stock: gift.stock, sort_order: gift.sort_order }); setShowForm(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingGift) { await adminApi.updateGift(editingGift.id, form); toast.success('✅ Updated'); }
      else { await adminApi.createGift(form); toast.success('✅ Created'); }
      setShowForm(false); loadGifts();
    } catch (err) { toast.error(err.response?.data?.error || t('common.operationFailed')); }
  };

  const handleDeactivate = async (gift) => {
    if (!confirm(t('admin.confirmDeactivate'))) return;
    try { await adminApi.deleteGift(gift.id); toast.success('Deactivated'); loadGifts(); }
    catch { toast.error(t('common.operationFailed')); }
  };

  const updateField = (f) => (e) => setForm({ ...form, [f]: e.target.type === 'number' ? Number(e.target.value) : e.target.value });

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin')} className="text-text-muted hover:text-text-primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <h1 className="text-lg font-bold text-text-primary">{t('admin.giftMgmt')}</h1>
        </div>
        <button onClick={openCreate} className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium active:scale-95 transition-transform">{t('admin.addGift')}</button>
      </div>

      {loading ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div> : (
        <div className="space-y-3">
          {gifts.map((gift) => (
            <div key={gift.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">{gift.gift_type === 'cash' ? '🧧' : '🎁'}</div>
                  <div>
                    <h3 className="font-semibold text-sm text-text-primary">{tgName(gift.name)}{!gift.is_active && <span className="text-xs text-text-muted ml-1">(inactive)</span>}</h3>
                    <p className="text-xs text-text-muted">{gift.required_invites}{t('common.people')} · ${gift.value}</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => openEdit(gift)} className="text-xs bg-gray-100 px-3 py-1.5 rounded-lg font-medium hover:bg-gray-200">{t('admin.edit')}</button>
                  {gift.is_active === 1 && <button onClick={() => handleDeactivate(gift)} className="text-xs bg-red-50 text-red-500 px-3 py-1.5 rounded-lg font-medium hover:bg-red-100">{t('admin.deactivate')}</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="bg-white rounded-t-3xl w-full max-w-[480px] p-6 animate-slide-up max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <h2 className="text-lg font-bold text-text-primary mb-4">{editingGift ? t('admin.editGift') : t('admin.addGift')}</h2>
            <div className="space-y-3">
              <div><label className="text-xs text-text-secondary mb-1 block">{t('admin.giftForm.name')}</label><input value={form.name} onChange={updateField('name')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary" required /></div>
              <div><label className="text-xs text-text-secondary mb-1 block">{t('admin.giftForm.desc')}</label><input value={form.description} onChange={updateField('description')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-text-secondary mb-1 block">{t('admin.giftForm.type')}</label><select value={form.gift_type} onChange={updateField('gift_type')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary"><option value="cash">{t('gifts.cash')}</option><option value="physical">{t('gifts.physical')}</option><option value="virtual">{t('gifts.virtual')}</option></select></div>
                <div><label className="text-xs text-text-secondary mb-1 block">{t('admin.giftForm.value')}</label><input type="number" value={form.value} onChange={updateField('value')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary" min="0" step="0.01" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-text-secondary mb-1 block">{t('admin.giftForm.requiredInvites')}</label><input type="number" value={form.required_invites} onChange={updateField('required_invites')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary" min="1" required /></div>
                <div><label className="text-xs text-text-secondary mb-1 block">{t('admin.giftForm.stock')}</label><input type="number" value={form.stock} onChange={updateField('stock')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary" min="-1" /></div>
              </div>
              <div><label className="text-xs text-text-secondary mb-1 block">{t('admin.giftForm.sort')}</label><input type="number" value={form.sort_order} onChange={updateField('sort_order')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary" min="0" /></div>
            </div>
            <button type="submit" className="w-full py-3 bg-gradient-to-r from-primary to-primary-dark text-white font-semibold rounded-xl mt-4 shadow-lg shadow-primary/20 active:scale-[0.98] transition-all text-sm">{editingGift ? t('admin.save') : t('admin.create')}</button>
            <button type="button" onClick={() => setShowForm(false)} className="w-full py-3 mt-2 text-text-muted text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">{t('admin.cancel')}</button>
          </form>
        </div>
      )}
    </div>
  );
}
