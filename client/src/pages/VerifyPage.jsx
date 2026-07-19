import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import client from '../api/client';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

export default function VerifyPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const authUser = useAuthStore(s => s.user);
  const [proofs, setProofs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    client.get('/proofs').then(({ data }) => setProofs(data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const uploadFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      setSubmitting(true);
      try {
        const { data } = await client.post('/proofs', { image: reader.result });
        setProofs(prev => [{ id: data.id, image: reader.result, status: 'pending', submitted_at: new Date().toISOString() }, ...prev]);
        toast.success(t('verify.uploaded'));
      } catch (err) { toast.error(err.response?.data?.error || t('common.operationFailed')); }
      finally { setSubmitting(false); }
    };
    reader.readAsDataURL(file);
  };

  const handleFile = (e) => {
    uploadFile(e.target.files[0]);
    e.target.value = '';
  };

  const removeProof = (id) => {
    setProofs(prev => prev.filter(p => p.id !== id));
  };

  const copyCode = () => {
    const code = authUser?.referral_code || '';
    if (!code) { toast.error('No invite code available'); return; }
    navigator.clipboard.writeText(code);
    toast.success('Code copied');
  };

  const approvedCount = proofs.filter(p => p.status === 'approved').length;
  const referralCode = authUser?.referral_code || '------';

  if (loading) return (
    <div style={{background:'#f2f2f7',minHeight:'100vh',maxWidth:430,margin:'0 auto'}}>
      <div style={{background:'#0f0f0f',padding:'8px 16px 12px',display:'flex',alignItems:'center',gap:12,color:'#fff'}}>
        <span style={{fontSize:20}}>←</span><span style={{fontSize:14,fontWeight:700}}>{t('verify.title')}</span>
      </div>
      <div style={{padding:16}}>
        <div style={{background:'#fff',borderRadius:16,height:60,marginBottom:12}} />
        <div style={{background:'#fff',borderRadius:16,height:60,marginBottom:12}} />
        <div style={{background:'#fff',borderRadius:16,height:60,marginBottom:12}} />
      </div>
    </div>
  );

  return (
    <div style={{background:'#f2f2f7',minHeight:'100vh',maxWidth:430,margin:'0 auto',paddingBottom:80}}>
      {/* Header */}
      <div style={{background:'#0f0f0f',padding:'8px 16px 12px',display:'flex',alignItems:'center',gap:12,color:'#fff'}}>
        <button onClick={() => navigate('/mine')} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#fff'}}>←</button>
        <span style={{fontSize:14,fontWeight:700}}>{t('verify.title')}</span>
      </div>

      <div style={{padding:16}}>
        {/* Verified Count Bar */}
        <div style={{background:'#fff',borderRadius:14,padding:14,marginBottom:12,display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:40,height:40,borderRadius:20,background: approvedCount > 0 ? '#E8F5E9' : '#f5f5f5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🎯</div>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:700,color:'#0f0f0f'}}>{approvedCount} Verified Invitation{approvedCount !== 1 ? 's' : ''}</div>
            <div style={{fontSize:10,color: approvedCount > 0 ? '#00A86B' : '#bbb',fontWeight: approvedCount > 0 ? 600 : 400,marginTop:1}}>
              {approvedCount > 0 ? `+$${(approvedCount * 5).toFixed(2)} earned in commissions` : 'Start inviting to earn commissions'}
            </div>
          </div>
          <span onClick={() => navigate('/mine/team')} style={{fontSize:11,color:'#FF5000',fontWeight:600,cursor:'pointer'}}>
            {approvedCount > 0 ? 'View Team ›' : 'Invite Now ›'}
          </span>
        </div>

        {/* Invite Code */}
        <div style={{background:'#fff',borderRadius:14,padding:14,marginBottom:12,display:'flex',alignItems:'center',gap:10}}>
          <div style={{fontSize:22,flexShrink:0}}>🔗</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:10,color:'#999',marginBottom:2}}>Your Invite Code</div>
            <div style={{fontSize:20,fontWeight:800,color:'#FF5000',letterSpacing:2}}>{referralCode}</div>
          </div>
          <button onClick={copyCode} style={{padding:'8px 14px',background:'#FF5000',color:'#fff',border:'none',borderRadius:10,fontSize:11,fontWeight:700,cursor:'pointer'}}>Copy</button>
        </div>

        {/* Instructions */}
        <div style={{background:'linear-gradient(135deg,#FF5000,#E04500)',borderRadius:16,padding:16,marginBottom:12,position:'relative',overflow:'hidden'}}>
          <div style={{position:'relative',zIndex:1}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
              <span style={{fontSize:18}}>✨</span>
              <span style={{fontSize:13,fontWeight:700,color:'#fff'}}>How It Works</span>
            </div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.85)',lineHeight:1.8}}>
              <div>1. Share your invite code with a friend</div>
              <div>2. They register and complete their first task</div>
              <div>3. Screenshot the proof and upload here</div>
            </div>
          </div>
        </div>

        {/* Screenshot Requirements */}
        <div style={{background:'#fff',borderRadius:14,padding:14,marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:700,color:'#0f0f0f',marginBottom:8}}>📸 Your Screenshot Must Show</div>
          <div style={{display:'flex',flexDirection:'column',gap:6,fontSize:11,color:'#666',lineHeight:1.5}}>
            <div style={{display:'flex',alignItems:'center',gap:8,padding:8,background:'#f8f8f8',borderRadius:10}}>
              <span style={{color:'#FF5000',fontWeight:700,flexShrink:0}}>01</span>
              <span>The friend's <b>registered username</b> visible</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8,padding:8,background:'#f8f8f8',borderRadius:10}}>
              <span style={{color:'#FF5000',fontWeight:700,flexShrink:0}}>02</span>
              <span>Proof of <b>completed registration</b> (confirmation page)</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8,padding:8,background:'#f8f8f8',borderRadius:10}}>
              <span style={{color:'#FF5000',fontWeight:700,flexShrink:0}}>03</span>
              <span>Proof of <b>first task or purchase</b> completed</span>
            </div>
          </div>
        </div>

        {/* Upload Area */}
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{display:'none'}} />
        <button onClick={() => fileRef.current?.click()} disabled={submitting}
          style={{
            width:'100%',background:'#fff',borderRadius:16,border:'2px dashed #ddd',padding: proofs.length === 0 ? '48px 16px' : '36px 16px',
            textAlign:'center',marginBottom:16,cursor:'pointer',transition:'all .2s'
          }}>
          <div style={{fontSize: proofs.length === 0 ? 48 : 36,marginBottom:8,opacity:.5}}>📤</div>
          <div style={{fontSize: proofs.length === 0 ? 15 : 14,fontWeight:700,color:'#333',marginBottom:4}}>
            {submitting ? 'Uploading...' : proofs.length === 0 ? 'Upload Your First Proof' : 'Upload Screenshot'}
          </div>
          <div style={{fontSize:11,color:'#bbb'}}>Tap to browse or drag & drop</div>
        </button>

        {/* Proofs List */}
        {proofs.length > 0 && (
          <>
            <div style={{fontSize:12,fontWeight:700,color:'#0f0f0f',marginBottom:10}}>Uploaded Proofs ({proofs.length})</div>
            {proofs.map(p => {
              const sCfg = p.status === 'approved' ? { icon: '✅', bg: '#E8F5E9', badgeBg: '#E8F5E9', badgeColor: '#0B5E2E', label: '✓ Confirmed' }
                : p.status === 'rejected' ? { icon: '❌', bg: '#FFF0F0', badgeBg: '#FFF0F0', badgeColor: '#C0392B', label: '✕ Rejected' }
                : { icon: '📱', bg: '#f5f5f5', badgeBg: '#FFF8E1', badgeColor: '#B45309', label: '⏳ Under Review' };
              return (
                <div key={p.id} style={{background:'#fff',borderRadius:14,padding:12,marginBottom:8,display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:56,height:56,borderRadius:12,background:sCfg.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:24}}>
                    {p.image ? <img src={p.image} alt="proof" style={{width:'100%',height:'100%',borderRadius:10,objectFit:'cover'}} /> : sCfg.icon}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:10,color:'#bbb'}}>{p.submitted_at ? new Date(p.submitted_at).toLocaleString() : ''}</div>
                    <span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:10,fontWeight:600,padding:'3px 10px',borderRadius:10,background:sCfg.badgeBg,color:sCfg.badgeColor,marginTop:4}}>{sCfg.label}</span>
                    {p.status === 'rejected' && p.admin_note && (
                      <div style={{fontSize:10,color:'#E04500',marginTop:4,lineHeight:1.4}}>Reason: {p.admin_note}</div>
                    )}
                  </div>
                  {p.status !== 'approved' && (
                    <button onClick={() => removeProof(p.id)} style={{background:'none',border:'none',color:'#ccc',fontSize:16,cursor:'pointer',padding:4}}>✕</button>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* Empty state */}
        {!loading && proofs.length === 0 && (
          <div style={{textAlign:'center',padding:'10px 20px 30px'}}>
            <div style={{fontSize:36,marginBottom:8,opacity:.3}}>📋</div>
            <div style={{fontSize:12,color:'#ccc'}}>No proofs submitted yet</div>
          </div>
        )}

        {/* Note */}
        <div style={{background:'#f8f8f8',borderRadius:12,padding:12,marginTop:12,fontSize:10,color:'#999',lineHeight:1.6}}>
          <div style={{fontWeight:600,color:'#666',marginBottom:4}}>Important</div>
          • Each invite requires a separate verification screenshot<br />
          • Approved submissions cannot be deleted<br />
          • Submitting false proofs will result in account penalties
        </div>
      </div>
    </div>
  );
}
