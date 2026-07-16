import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/authStore';
import client from '../api/client';
import toast from 'react-hot-toast';

export default function SecurityPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState(false);
  const [ctForm, setCtForm] = useState({ email: user?.email || '', phone: user?.phone || '', password: '' });
  const [showCt, setShowCt] = useState(false);

  const changePassword = async (e) => {
    e.preventDefault();
    if (!pwForm.oldPassword || !pwForm.newPassword) { toast.error(t('sec.fillAll')); return; }
    if (pwForm.newPassword.length < 8) { toast.error(t('sec.passLength')); return; }
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast.error(t('sec.passMismatch')); return; }
    setLoading(true);
    try {
      await client.put('/users/me/password', { oldPassword: pwForm.oldPassword, newPassword: pwForm.newPassword });
      toast.success(t('sec.passChanged'));
      setPwForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setShowPw(false);
    } catch (err) {
      toast.error(err.response?.data?.error || t('common.operationFailed'));
    } finally { setLoading(false); }
  };

  const updateContact = async (e) => {
    e.preventDefault();
    if (!ctForm.password) { toast.error(t('sec.enterPass')); return; }
    setLoading(true);
    try {
      await client.put('/users/me/contact', { email: ctForm.email, phone: ctForm.phone, password: ctForm.password });
      toast.success(t('sec.contactUpdated'));
      setShowCt(false);
    } catch (err) {
      toast.error(err.response?.data?.error || t('common.operationFailed'));
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-bg animate-fade-in">
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-separator">
        <button onClick={() => navigate('/mine')} className="flex items-center gap-1 text-primary font-medium text-sm pr-2 py-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
          {t('common.back')}
        </button>
        <h2 className="text-[16px] font-bold text-text">{t('security.title')}</h2>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 border border-separator shadow-sm">
          <p className="text-[12px] text-text-muted font-medium mb-1">{t('security.currentInfo')}</p>
          <div className="flex justify-between py-2"><span className="text-[13px] text-text-secondary">{t('auth.email')}</span><span className="text-[13px] font-medium text-text">{user?.email}</span></div>
          <div className="flex justify-between py-2 border-t border-separator"><span className="text-[13px] text-text-secondary">{t('auth.phone')}</span><span className="text-[13px] font-medium text-text">{user?.phone}</span></div>
        </div>

        <div className="bg-white rounded-2xl border border-separator shadow-sm">
          <button onClick={() => setShowPw(!showPw)} className="w-full px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">🔒</span>
              <div className="text-left">
                <p className="text-[14px] font-bold text-text">{t('security.changePassword')}</p>
                <p className="text-[12px] text-text-muted">{t('security.changePasswordHint')}</p>
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2.5" className={`transition-transform ${showPw ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          {showPw && (
            <form onSubmit={changePassword} className="px-4 pb-4 space-y-3 border-t border-separator pt-3">
              <input type="password" value={pwForm.oldPassword} onChange={e => setPwForm({ ...pwForm, oldPassword: e.target.value })} placeholder={t('security.oldPassword')} className="w-full px-4 py-2.5 rounded-xl border border-separator text-sm bg-bg focus:outline-none focus:border-primary" autoComplete="current-password" />
              <input type="password" value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} placeholder={t('security.newPassword')} className="w-full px-4 py-2.5 rounded-xl border border-separator text-sm bg-bg focus:outline-none focus:border-primary" autoComplete="new-password" />
              <input type="password" value={pwForm.confirmPassword} onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })} placeholder={t('security.confirmNewPassword')} className="w-full px-4 py-2.5 rounded-xl border border-separator text-sm bg-bg focus:outline-none focus:border-primary" autoComplete="new-password" />
              <button type="submit" disabled={loading} className="w-full py-2.5 bg-primary text-white rounded-xl text-[13px] font-bold active:scale-[0.98] transition-transform">
                {loading ? '...' : t('common.save')}
              </button>
            </form>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-separator shadow-sm">
          <button onClick={() => setShowCt(!showCt)} className="w-full px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">📧</span>
              <div className="text-left">
                <p className="text-[14px] font-bold text-text">{t('security.changeContact')}</p>
                <p className="text-[12px] text-text-muted">{t('security.changeContactHint')}</p>
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2.5" className={`transition-transform ${showCt ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          {showCt && (
            <form onSubmit={updateContact} className="px-4 pb-4 space-y-3 border-t border-separator pt-3">
              <div><label className="text-[12px] text-text-muted mb-1 block">{t('auth.email')}</label><input type="email" value={ctForm.email} onChange={e => setCtForm({ ...ctForm, email: e.target.value })} placeholder={user?.email} className="w-full px-4 py-2.5 rounded-xl border border-separator text-sm bg-bg focus:outline-none focus:border-primary" /></div>
              <div><label className="text-[12px] text-text-muted mb-1 block">{t('auth.phone')}</label><input type="tel" value={ctForm.phone} onChange={e => setCtForm({ ...ctForm, phone: e.target.value })} placeholder={user?.phone} className="w-full px-4 py-2.5 rounded-xl border border-separator text-sm bg-bg focus:outline-none focus:border-primary" /></div>
              <div><label className="text-[12px] text-text-muted mb-1 block">{t('security.verifyPassword')}</label><input type="password" value={ctForm.password} onChange={e => setCtForm({ ...ctForm, password: e.target.value })} placeholder={t('security.enterCurrentPassword')} className="w-full px-4 py-2.5 rounded-xl border border-separator text-sm bg-bg focus:outline-none focus:border-primary" /></div>
              <button type="submit" disabled={loading} className="w-full py-2.5 bg-primary text-white rounded-xl text-[13px] font-bold active:scale-[0.98] transition-transform">
                {loading ? '...' : t('common.save')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
