import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/authStore';
import client from '../api/client';
import toast from 'react-hot-toast';

export default function SecurityPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [loading, setLoading] = useState(false);

  // Password
  const [showPw, setShowPw] = useState(false);
  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [pwStrength, setPwStrength] = useState(0); // 0=none, 2=weak, 3=medium, 5=strong

  const calcStrength = (pw) => {
    if (!pw) return 0;
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[a-z]/.test(pw)) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^a-zA-Z0-9]/.test(pw)) s++;
    return s;
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (!pwForm.oldPassword || !pwForm.newPassword) { toast.error('Please fill in all password fields'); return; }
    if (pwForm.newPassword.length < 8) { toast.error('New password must be at least 8 characters'); return; }
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await client.put('/users/me/password', { oldPassword: pwForm.oldPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed successfully');
      setPwForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setShowPw(false);
      setPwStrength(0);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Operation failed');
    } finally { setLoading(false); }
  };

  // Transaction PIN
  const [showTx, setShowTx] = useState(false);
  const [txMode, setTxMode] = useState('set'); // 'set' or 'change'
  const [txForm, setTxForm] = useState({ oldPin: '', newPin: '' });
  const txRefs = useRef([]);
  const hasTxPin = user?.has_tx_pin;

  const handlePinInput = (e, idx) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) return;
    const pin = txMode === 'set' ? 'newPin' : (idx < 6 ? 'oldPin' : 'newPin');
    const arr = pin === 'oldPin' ? txForm.oldPin.split('') : txForm.newPin.split('');
    const pos = pin === 'oldPin' ? idx : idx - 6;
    arr[pos] = val[0];
    setTxForm({ ...txForm, [pin]: arr.join('') });
    // Auto-advance
    const allRefs = txRefs.current;
    if (allRefs[idx] && idx < allRefs.length - 1) allRefs[idx + 1].focus();
  };

  const handlePinKeyDown = (e, idx) => {
    if (e.key === 'Backspace') {
      const pin = txMode === 'set' ? 'newPin' : (idx < 6 ? 'oldPin' : 'newPin');
      const arr = pin === 'oldPin' ? txForm.oldPin.split('') : txForm.newPin.split('');
      const pos = pin === 'oldPin' ? idx : idx - 6;
      arr[pos] = '';
      setTxForm({ ...txForm, [pin]: arr.join('') });
      const allRefs = txRefs.current;
      if (idx > 0 && !e.target.value) allRefs[idx - 1].focus();
    }
  };

  const submitTxPin = async () => {
    const pin = txMode === 'set' ? txForm.newPin : txForm.oldPin;
    const newPin = txForm.newPin;
    if (txMode === 'set') {
      if (newPin.length !== 6) { toast.error('Please enter a 6-digit PIN'); return; }
      setLoading(true);
      try {
        await client.post('/users/me/tx-pin', { pin: newPin });
        toast.success('Transaction PIN set');
        // Update auth store
        useAuthStore.setState(s => ({ user: { ...s.user, has_tx_pin: true } }));
        setTxForm({ oldPin: '', newPin: '' });
        setShowTx(false);
      } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
      finally { setLoading(false); }
    } else {
      if (txForm.oldPin.length !== 6 || newPin.length !== 6) { toast.error('Please enter both PINs'); return; }
      setLoading(true);
      try {
        await client.put('/users/me/tx-pin', { old_pin: txForm.oldPin, new_pin: newPin });
        toast.success('Transaction PIN changed');
        setTxForm({ oldPin: '', newPin: '' });
        setShowTx(false);
      } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
      finally { setLoading(false); }
    }
  };

  // Contact
  const [showCt, setShowCt] = useState(false);
  const [ctForm, setCtForm] = useState({ email: user?.email || '', phone: user?.phone || '', password: '' });

  const updateContact = async (e) => {
    e.preventDefault();
    if (!ctForm.password) { toast.error('Please enter your current password'); return; }
    setLoading(true);
    try {
      await client.put('/users/me/contact', { email: ctForm.email, phone: ctForm.phone, password: ctForm.password });
      toast.success('Contact updated');
      setShowCt(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Operation failed');
    } finally { setLoading(false); }
  };

  // Strength config
  const strengthCfg = pwStrength <= 2 ? { w: '33%', color: '#E04500', label: 'Weak' }
    : pwStrength <= 3 ? { w: '66%', color: '#F59E0B', label: 'Medium' }
    : pwStrength === 0 ? { w: '0', color: '#eee', label: '—' }
    : { w: '100%', color: '#00A86B', label: 'Strong ✓' };

  const SectionHeader = ({ icon, iconBg, title, desc, expanded, onClick, extra }) => (
    <div onClick={onClick} style={{padding:14,display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer'}}>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <div style={{width:36,height:36,borderRadius:9,background:iconBg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>{icon}</div>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:'#0f0f0f'}}>{title}</div>
          <div style={{fontSize:11,color:'#bbb'}}>{desc}</div>
        </div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:6}}>
        {extra}
        <span style={{color:'#ccc',fontSize:14,transform:expanded?'rotate(180deg)':'none',transition:'transform .2s'}}>▼</span>
      </div>
    </div>
  );

  return (
    <div style={{background:'#f2f2f7',minHeight:'100vh',maxWidth:430,margin:'0 auto',paddingBottom:80}}>
      {/* Header */}
      <div style={{background:'#0f0f0f',padding:'8px 16px 12px',display:'flex',alignItems:'center',gap:12,color:'#fff'}}>
        <button onClick={() => navigate('/mine')} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#fff'}}>←</button>
        <span style={{fontSize:14,fontWeight:700}}>{t('security.title')}</span>
      </div>

      <div style={{padding:16}}>
        {/* Current Info */}
        <div style={{background:'#fff',borderRadius:14,padding:14,marginBottom:12}}>
          <div style={{fontSize:11,color:'#bbb',marginBottom:8,fontWeight:500}}>Current Information</div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'4px 0'}}>
            <span style={{color:'#999'}}>{t('auth.email')}</span>
            <span style={{fontWeight:600,color:'#333'}}>{user?.email ? user.email.replace(/(.{3}).*(@.*)/, '$1***$2') : '---'}</span>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginTop:6,paddingTop:6,borderTop:'1px solid #f5f5f5'}}>
            <span style={{color:'#999'}}>{t('auth.phone')}</span>
            <span style={{fontWeight:600,color:'#333'}}>{user?.phone ? user.phone.replace(/(.{6}).{4}(.{2})/, '$1****$2') : '---'}</span>
          </div>
        </div>

        {/* Change Password */}
        <div style={{background:'#fff',borderRadius:14,overflow:'hidden',marginBottom:12}}>
          <SectionHeader icon="🔒" iconBg={showPw?'#FFF5F0':'#f5f5f5'} title="Change Password" desc="Set a new login password" expanded={showPw} onClick={() => setShowPw(!showPw)} />
          {showPw && (
            <form onSubmit={changePassword} style={{padding:'0 14px 14px',borderTop:'1px solid #f5f5f5',margin:'0 14px'}}>
              <input type="password" value={pwForm.oldPassword} onChange={e => setPwForm({...pwForm, oldPassword: e.target.value})}
                placeholder="Current password" autoComplete="current-password"
                style={{width:'100%',padding:12,background:'#f5f5f5',border:'none',borderRadius:12,fontSize:13,outline:'none',marginTop:14}} />
              <input type="password" value={pwForm.newPassword} onChange={e => { setPwForm({...pwForm, newPassword: e.target.value}); setPwStrength(calcStrength(e.target.value)); }}
                placeholder="New password (min 8 characters)" autoComplete="new-password"
                style={{width:'100%',padding:12,background:'#f5f5f5',border:'none',borderRadius:12,fontSize:13,outline:'none',marginTop:10}} />
              {/* Strength bar */}
              {pwForm.newPassword.length > 0 && (
                <div style={{marginTop:8,display:'flex',alignItems:'center',gap:8}}>
                  <div style={{flex:1,height:4,borderRadius:2,background:'#eee',overflow:'hidden'}}>
                    <div style={{height:'100%',width:strengthCfg.w,background:strengthCfg.color,borderRadius:2,transition:'all .3s'}} />
                  </div>
                  <span style={{fontSize:10,color:strengthCfg.color,fontWeight:500,minWidth:70,textAlign:'right'}}>{strengthCfg.label}</span>
                </div>
              )}
              <input type="password" value={pwForm.confirmPassword} onChange={e => setPwForm({...pwForm, confirmPassword: e.target.value})}
                placeholder="Confirm new password" autoComplete="new-password"
                style={{width:'100%',padding:12,background:'#f5f5f5',border:'none',borderRadius:12,fontSize:13,outline:'none',marginTop:10}} />
              <button type="submit" disabled={loading} style={{width:'100%',padding:12,background:'#FF5000',color:'#fff',border:'none',borderRadius:12,fontSize:13,fontWeight:700,marginTop:12,cursor:'pointer'}}>Save</button>
            </form>
          )}
        </div>

        {/* Transaction PIN */}
        <div style={{background:'#fff',borderRadius:14,overflow:'hidden',marginBottom:12}}>
          <SectionHeader icon="💳" iconBg={showTx?'#FFF5F0':'#f5f5f5'} title="Transaction Password" desc="6-digit PIN for withdrawals & payments"
            expanded={showTx} onClick={() => { setShowTx(!showTx); if (!showTx) { setTxMode(hasTxPin ? 'change' : 'set'); setTxForm({ oldPin: '', newPin: '' }); } }}
            extra={hasTxPin ? <span style={{fontSize:10,color:'#00A86B',fontWeight:600}}>Set ✓</span> : <span style={{fontSize:10,color:'#bbb'}}>Not set</span>} />
          {showTx && (
            <div style={{padding:'0 14px 14px',borderTop:'1px solid #f5f5f5',margin:'0 14px'}}>
              <div style={{fontSize:10,color:'#999',marginTop:14,marginBottom:2,lineHeight:1.5}}>
                This PIN is required for all withdrawals and sensitive operations. Keep it different from your login password.
              </div>

              {!hasTxPin && (
                <div style={{display:'flex',gap:8,marginTop:14,justifyContent:'center'}}>
                  {[0,1,2,3,4,5].map(i => (
                    <input key={i} ref={el => txRefs.current[i] = el} type="password" maxLength={1} inputMode="numeric"
                      value={txForm.newPin[i] || ''} onChange={e => handlePinInput(e, i)} onKeyDown={e => handlePinKeyDown(e, i)}
                      style={{width:42,height:52,textAlign:'center',fontSize:22,fontWeight:800,background:'#f5f5f5',border:'none',borderRadius:12,outline:'none'}} />
                  ))}
                </div>
              )}

              {hasTxPin && (
                <>
                  <div style={{fontSize:10,color:'#999',marginTop:14,marginBottom:4,fontWeight:500}}>Current PIN</div>
                  <div style={{display:'flex',gap:8,justifyContent:'center'}}>
                    {[0,1,2,3,4,5].map(i => (
                      <input key={i} ref={el => txRefs.current[i] = el} type="password" maxLength={1} inputMode="numeric"
                        value={txForm.oldPin[i] || ''} onChange={e => handlePinInput(e, i)} onKeyDown={e => handlePinKeyDown(e, i)}
                        style={{width:42,height:52,textAlign:'center',fontSize:22,fontWeight:800,background:'#f5f5f5',border:'none',borderRadius:12,outline:'none'}} />
                    ))}
                  </div>
                  <div style={{fontSize:10,color:'#999',marginTop:12,marginBottom:4,fontWeight:500}}>New PIN</div>
                  <div style={{display:'flex',gap:8,justifyContent:'center'}}>
                    {[6,7,8,9,10,11].map(i => (
                      <input key={i} ref={el => txRefs.current[i] = el} type="password" maxLength={1} inputMode="numeric"
                        value={txForm.newPin[i-6] || ''} onChange={e => handlePinInput(e, i)} onKeyDown={e => handlePinKeyDown(e, i)}
                        style={{width:42,height:52,textAlign:'center',fontSize:22,fontWeight:800,background:'#f5f5f5',border:'none',borderRadius:12,outline:'none'}} />
                    ))}
                  </div>
                </>
              )}

              <div style={{fontSize:10,color:'#bbb',marginTop:8,textAlign:'center'}}>Enter 6-digit numeric PIN</div>
              <button onClick={submitTxPin} disabled={loading} style={{width:'100%',padding:12,background:'#FF5000',color:'#fff',border:'none',borderRadius:12,fontSize:13,fontWeight:700,marginTop:14,cursor:'pointer'}}>
                {hasTxPin ? 'Change Transaction PIN' : 'Set Transaction PIN'}
              </button>
            </div>
          )}
        </div>

        {/* Change Contact */}
        <div style={{background:'#fff',borderRadius:14,overflow:'hidden',marginBottom:12}}>
          <SectionHeader icon="📧" iconBg={showCt?'#FFF5F0':'#f5f5f5'} title="Change Contact" desc="Update email or phone number" expanded={showCt} onClick={() => setShowCt(!showCt)} />
          {showCt && (
            <form onSubmit={updateContact} style={{padding:'0 14px 14px',borderTop:'1px solid #f5f5f5',margin:'0 14px'}}>
              <div style={{marginTop:14}}>
                <div style={{fontSize:10,color:'#999',marginBottom:4}}>{t('auth.email')}</div>
                <input type="email" value={ctForm.email} onChange={e => setCtForm({...ctForm, email: e.target.value})} placeholder={user?.email}
                  style={{width:'100%',padding:12,background:'#f5f5f5',border:'none',borderRadius:12,fontSize:13,outline:'none'}} />
              </div>
              <div style={{marginTop:10}}>
                <div style={{fontSize:10,color:'#999',marginBottom:4}}>{t('auth.phone')}</div>
                <input type="tel" value={ctForm.phone} onChange={e => setCtForm({...ctForm, phone: e.target.value})} placeholder={user?.phone}
                  style={{width:'100%',padding:12,background:'#f5f5f5',border:'none',borderRadius:12,fontSize:13,outline:'none'}} />
              </div>
              <div style={{marginTop:10}}>
                <div style={{fontSize:10,color:'#999',marginBottom:4}}>Verify Password</div>
                <input type="password" value={ctForm.password} onChange={e => setCtForm({...ctForm, password: e.target.value})}
                  placeholder="Enter current password to confirm"
                  style={{width:'100%',padding:12,background:'#f5f5f5',border:'none',borderRadius:12,fontSize:13,outline:'none'}} />
              </div>
              <button type="submit" disabled={loading} style={{width:'100%',padding:12,background:'#FF5000',color:'#fff',border:'none',borderRadius:12,fontSize:13,fontWeight:700,marginTop:12,cursor:'pointer'}}>Save</button>
            </form>
          )}
        </div>

        {/* Logout */}
        <div onClick={() => { logout(); navigate('/login'); }} style={{background:'#fff',borderRadius:14,padding:14,display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:36,height:36,borderRadius:9,background:'#FFF0F0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🚪</div>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:'#E04500'}}>Logout</div>
              <div style={{fontSize:11,color:'#bbb'}}>Sign out of your account</div>
            </div>
          </div>
          <span style={{color:'#ccc',fontSize:16}}>›</span>
        </div>
      </div>
    </div>
  );
}
