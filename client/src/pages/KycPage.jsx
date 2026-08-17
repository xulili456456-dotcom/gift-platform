import { useState, useEffect, useRef } from 'react';
import client from '../api/client';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Clock, AlertCircle, Upload, X, Car, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

export default function KycPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [kyc, setKyc] = useState(null);
  const [kycLoading, setKycLoading] = useState(true);
  const [form, setForm] = useState({ docType: 'driver_license', name: '', idNumber: '', frontImg: null, backImg: null, video: null });
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const declRef = useRef(null);
  const [declFlash, setDeclFlash] = useState(false);

  useEffect(() => {
    client.get('/kyc').then(({ data }) => { setKyc(data); setKycLoading(false); }).catch(() => setKycLoading(false));
  }, []);

  if (kycLoading) return (
    <div style={{background:'#f2f2f7',minHeight:'100vh',maxWidth:430,margin:'0 auto'}}>
      <div style={{background:'#0f0f0f',padding:'8px 16px 12px',display:'flex',alignItems:'center',gap:12,color:'#fff'}}>
        <span style={{fontSize:20}}>←</span>
        <span style={{fontSize:14,fontWeight:700}}>{t('kyc.title')}</span>
      </div>
      <div style={{padding:16}}>
        <div style={{background:'#fff',borderRadius:20,padding:18,marginBottom:12,height:80}} />
        <div style={{background:'#fff',borderRadius:20,padding:18,height:400}} />
      </div>
    </div>
  );

  const status = kyc?.status || 'unverified';
  const isRejected = status === 'rejected';
  const isPending = status === 'pending';
  const isVerified = status === 'verified' || status === 'approved';
  const isUnverified = status === 'unverified' || isRejected;

  const DOC_TYPES = [
    { id: 'driver_license', label: t('kyc.driverLicense'), Icon: Car, emoji: '🪪' },
    { id: 'passport', label: t('kyc.passport'), Icon: Globe, emoji: '🌐' },
  ];

  const isPassport = form.docType === 'passport';
  const idLabel = isPassport ? t('kyc.passportNumber') : t('kyc.licenseNumber');
  const idPlaceholder = isPassport ? t('kyc.passportPlaceholder') : t('kyc.licensePlaceholder');
  const frontLabel = isPassport ? t('kyc.passportFront') : t('kyc.frontGeneric');
  const backLabel = isPassport ? t('kyc.passportBack') : t('kyc.backGeneric');

  const handleImage = (e, side) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Compress: resize to max 1000px width + JPEG 0.75 to keep upload small
        const maxW = 1000;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setForm({ ...form, [side]: canvas.toDataURL('image/jpeg', 0.75) });
      };
      img.onerror = () => setForm({ ...form, [side]: reader.result });
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const handleVideo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Video too large (max 5MB, 5 seconds)'); return; }
    const reader = new FileReader();
    reader.onload = () => setForm({ ...form, video: reader.result });
    reader.readAsDataURL(file);
  };

  const submitKyc = () => {
    if (!agreed) {
      toast.error('Please agree to the declaration first');
      declRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setDeclFlash(true);
      setTimeout(() => setDeclFlash(false), 2000);
      return;
    }
    if (!form.name.trim() || !form.idNumber.trim()) { toast.error(t('auth.fillRequired')); return; }
    if (!form.frontImg || !form.backImg) { toast.error(t('kyc.uploadBoth')); return; }
    if (!form.video) { toast.error('Please upload a selfie video holding your ID'); return; }
    setSubmitting(true);
    client.post('/kyc', { doc_type: form.docType, real_name: form.name, id_number: form.idNumber, front_image: form.frontImg, back_image: form.backImg, video: form.video })
      .then(({ data }) => { setKyc({ real_name: form.name, id_number: form.idNumber, doc_type: form.docType, front_image: form.frontImg, back_image: form.backImg, video: form.video, status: 'pending', id: data.id }); setSubmitting(false); toast.success(t('common.submit')); })
      .catch(err => { setSubmitting(false); toast.error(err.response?.data?.error || t('common.operationFailed')); });
  };

  // Pre-fill form from previous submission on rejected
  const handleResubmit = () => {
    if (kyc?.real_name) setForm(f => ({ ...f, name: kyc.real_name }));
    if (kyc?.id_number) setForm(f => ({ ...f, idNumber: kyc.id_number }));
    setKyc({ ...kyc, status: 'unverified' });
  };

  // ======= UNVERIFIED / REJECTED — Show form =======
  const renderForm = () => (
    <div style={{background:'#fff',borderRadius:20,padding:18,marginBottom:12}}>
      <div style={{fontSize:12,fontWeight:700,color:'#0f0f0f',marginBottom:14}}>
        {isRejected ? 'Resubmit Verification' : 'Submit Verification'}
      </div>

      {/* Doc Type */}
      <div style={{marginBottom:14}}>
        <div style={{fontSize:11,color:'#999',marginBottom:6,fontWeight:500}}>{t('kyc.docType')}</div>
        <div style={{display:'flex',gap:8}}>
          {DOC_TYPES.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setForm({ ...form, docType: id })}
              style={{
                flex:1, padding:12, borderRadius:12, border: form.docType === id ? '2px solid #FF5000' : '2px solid #e8e8e8',
                background: form.docType === id ? '#FFF5F0' : '#fff', fontSize:12,
                fontWeight: form.docType === id ? 600 : 500, color: form.docType === id ? '#FF5000' : '#999', cursor:'pointer'
              }}>
              <Icon size={22} style={{display:'block',margin:'0 auto 2px'}} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <div style={{marginBottom:12}}>
        <div style={{fontSize:11,color:'#999',marginBottom:4,fontWeight:500}}>{t('kyc.realName')}</div>
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
          placeholder="As shown on your ID"
          style={{width:'100%',padding:12,background:'#f5f5f5',border:'none',borderRadius:12,fontSize:13,outline:'none',color:'#333'}} />
      </div>

      {/* ID Number */}
      <div style={{marginBottom:14}}>
        <div style={{fontSize:11,color:'#999',marginBottom:4,fontWeight:500}}>{idLabel}</div>
        <input value={form.idNumber} onChange={e => setForm({ ...form, idNumber: e.target.value })}
          placeholder={idPlaceholder} maxLength={isPassport ? 20 : 18}
          style={{width:'100%',padding:12,background:'#f5f5f5',border:'none',borderRadius:12,fontSize:13,outline:'none',color:'#333'}} />
      </div>

      {/* Upload Images */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
        {/* Front */}
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
            <div style={{fontSize:11,color:'#999',fontWeight:500}}>{frontLabel}</div>
            {isRejected && !form.frontImg && <span style={{fontSize:9,color:'#E04500',background:'#FFF0F0',padding:'2px 6px',borderRadius:4}}>⚠ Re-upload needed</span>}
          </div>
          {form.frontImg ? (
            <div style={{position:'relative',background:'#f8f8f8',borderRadius:12,padding:4}}>
              <img src={form.frontImg} alt="front" style={{width:'100%',height:100,objectFit:'cover',borderRadius:10}} />
              <button onClick={() => setForm({ ...form, frontImg: null })}
                style={{position:'absolute',top:8,right:8,width:22,height:22,background:'rgba(0,0,0,.5)',borderRadius:'50%',border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
                <X size={12} color="#fff" />
              </button>
            </div>
          ) : (
            <label style={{
              display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:100,
              background: isRejected ? '#FFF0F0' : '#fafafa', borderRadius:12,
              border: isRejected ? '2px dashed #E04500' : '2px dashed #e0e0e0', cursor:'pointer'
            }}>
              <Upload size={18} color={isRejected ? '#E04500' : '#ccc'} style={{marginBottom:2}} />
              <span style={{fontSize:10,color:isRejected ? '#E04500' : '#bbb',fontWeight:isRejected?500:400}}>
                {isRejected ? 'Retake Photo' : t('kyc.uploadHint')}
              </span>
              <input type="file" accept="image/*" onChange={e => handleImage(e, 'frontImg')} style={{display:'none'}} />
            </label>
          )}
        </div>
        {/* Back */}
        <div>
          <div style={{fontSize:11,color:'#999',marginBottom:4,fontWeight:500}}>{backLabel}</div>
          {form.backImg ? (
            <div style={{position:'relative',background:'#f8f8f8',borderRadius:12,padding:4}}>
              <img src={form.backImg} alt="back" style={{width:'100%',height:100,objectFit:'cover',borderRadius:10}} />
              <button onClick={() => setForm({ ...form, backImg: null })}
                style={{position:'absolute',top:8,right:8,width:22,height:22,background:'rgba(0,0,0,.5)',borderRadius:'50%',border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
                <X size={12} color="#fff" />
              </button>
            </div>
          ) : (
            <label style={{
              display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:100,
              background:'#fafafa',borderRadius:12,border:'2px dashed #e0e0e0',cursor:'pointer'
            }}>
              <Upload size={18} color="#ccc" style={{marginBottom:2}} />
              <span style={{fontSize:10,color:'#bbb'}}>{t('kyc.uploadHint')}</span>
              <input type="file" accept="image/*" onChange={e => handleImage(e, 'backImg')} style={{display:'none'}} />
            </label>
          )}
        </div>
      </div>

      {/* Video Verification */}
      <div style={{marginBottom:14}}>
        <div style={{fontSize:11,color:'#999',marginBottom:6,fontWeight:500}}>Video Verification <span style={{color:'#FF5000'}}>*</span></div>
        {form.video ? (
          <div style={{position:'relative',background:'#f8f8f8',borderRadius:12,padding:4}}>
            <video src={form.video} controls style={{width:'100%',maxHeight:160,borderRadius:10,background:'#000'}} />
            <button onClick={() => setForm({ ...form, video: null })}
              style={{position:'absolute',top:8,right:8,width:22,height:22,background:'rgba(0,0,0,.5)',borderRadius:'50%',border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
              <X size={12} color="#fff" />
            </button>
          </div>
        ) : (
          <label style={{
            display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:80,
            background:'#fafafa',borderRadius:12,border:'2px dashed #e0e0e0',cursor:'pointer'
          }}>
            <Upload size={18} color="#ccc" style={{marginBottom:4}} />
            <span style={{fontSize:10,color:'#bbb'}}>Upload a selfie video holding your ID (required, max 5 seconds)</span>
            <input type="file" accept="video/*" onChange={handleVideo} style={{display:'none'}} />
          </label>
        )}
      </div>

      {/* Declaration */}
      <div ref={declRef} className={declFlash ? 'kyc-decl-flash' : ''} style={{
        background:'#FFF5F0',borderRadius:12,padding:12,marginBottom:14,
        display:'flex',alignItems:'flex-start',gap:10,transition:'box-shadow .3s'
      }}>
        <div onClick={() => setAgreed(!agreed)} style={{
          width:44,height:26,borderRadius:13,position:'relative',cursor:'pointer',flexShrink:0,marginTop:1,
          background: agreed ? '#FF5000' : '#e0e0e0', transition:'background .2s'
        }}>
          <div style={{
            width:22,height:22,background:'#fff',borderRadius:'50%',position:'absolute',top:2,
            left: agreed ? 20 : 2, transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,.15)'
          }} />
        </div>
        <div style={{fontSize:11,color:'#CC3D00',lineHeight:1.5}}>
          I declare that all information provided is true and accurate. I understand that submitting false documents may result in <span style={{fontWeight:700}}>permanent account suspension</span> and forfeiture of all earnings.
        </div>
      </div>

      <button onClick={submitKyc} disabled={submitting} style={{
        width:'100%',padding:13,color:'#fff',border:'none',borderRadius:14,fontSize:14,fontWeight:700,cursor:'pointer',
        background: agreed ? '#FF5000' : '#d0d0d0', transition:'background .2s'
      }}>
        {submitting ? t('kyc.submitting') : isRejected ? 'Resubmit Verification' : 'Submit Verification'}
      </button>
      <div style={{fontSize:10,color:'#bbb',textAlign:'center',marginTop:8}}>🔒 {t('kyc.privacy')}</div>
    </div>
  );

  // ======= PENDING — Review state =======
  const renderPending = () => {
    const maskId = (id) => id ? id.replace(/(\w{1,4})(\w+)(\w{4})/, '$1******$3') : '---';
    return (
      <>
        {/* Submitted Info */}
        <div style={{background:'#fff',borderRadius:20,padding:18,marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:700,color:'#0f0f0f',marginBottom:12}}>{t('kyc.submittedInfo')}</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,fontSize:11}}>
            <div>
              <div style={{color:'#999',marginBottom:2}}>{t('kyc.realName')}</div>
              <div style={{fontWeight:600,color:'#333'}}>{kyc?.real_name || '---'}</div>
            </div>
            <div>
              <div style={{color:'#999',marginBottom:2}}>{idLabel}</div>
              <div style={{fontWeight:600,color:'#333'}}>{maskId(kyc?.id_number)}</div>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:12}}>
            <div style={{background:'#f8f8f8',borderRadius:12,padding:8,textAlign:'center'}}>
              <div style={{fontSize:40,lineHeight:1}}>🪪</div>
              <div style={{fontSize:10,color:'#999',marginTop:4}}>{frontLabel}</div>
            </div>
            <div style={{background:'#f8f8f8',borderRadius:12,padding:8,textAlign:'center'}}>
              <div style={{fontSize:40,lineHeight:1}}>🪪</div>
              <div style={{fontSize:10,color:'#999',marginTop:4}}>{backLabel}</div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div style={{background:'#fff',borderRadius:16,padding:16,marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:700,color:'#0f0f0f',marginBottom:10}}>Status Timeline</div>
          <div style={{display:'flex',alignItems:'center',fontSize:10}}>
            <div style={{textAlign:'center',flex:1}}>
              <div style={{width:24,height:24,borderRadius:12,background:'#FF5000',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 4px',fontSize:12}}>✓</div>
              <div style={{color:'#333',fontWeight:600}}>Submitted</div>
              <div style={{color:'#bbb'}}>{kyc?.submitted_at ? new Date(kyc.submitted_at).toLocaleDateString() : '---'}</div>
            </div>
            <div style={{width:40,height:2,background:'#f0f0f0',marginTop:-16}} />
            <div style={{textAlign:'center',flex:1}}>
              <div style={{width:24,height:24,borderRadius:12,background:'#F59E0B',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 4px',fontSize:12}}>●</div>
              <div style={{color:'#333',fontWeight:600}}>Reviewing</div>
              <div style={{color:'#bbb'}}>In progress</div>
            </div>
            <div style={{width:40,height:2,background:'#f0f0f0',marginTop:-16}} />
            <div style={{textAlign:'center',flex:1}}>
              <div style={{width:24,height:24,borderRadius:12,background:'#e0e0e0',color:'#bbb',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 4px',fontSize:12}}>—</div>
              <div style={{color:'#bbb'}}>Verified</div>
              <div style={{color:'#bbb'}}>—</div>
            </div>
          </div>
        </div>
      </>
    );
  };

  // ======= VERIFIED — Confirmed state =======
  const renderVerified = () => {
    const maskId = (id) => id ? id.replace(/(\w{1,4})(\w+)(\w{4})/, '$1******$3') : '---';
    return (
      <>
        {/* Verified Info */}
        <div style={{background:'#fff',borderRadius:20,padding:18,marginBottom:12}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
            <div style={{background:'#E8F5E9',width:28,height:28,borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>✓</div>
            <div style={{fontSize:12,fontWeight:700,color:'#0f0f0f'}}>Verified Information</div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,fontSize:11,marginBottom:12}}>
            <div><div style={{color:'#999',marginBottom:2}}>{t('kyc.realName')}</div><div style={{fontWeight:600,color:'#333'}}>{kyc?.real_name || '---'}</div></div>
            <div><div style={{color:'#999',marginBottom:2}}>Document Type</div><div style={{fontWeight:600,color:'#333'}}>{kyc?.doc_type === 'passport' ? 'Passport' : "Driver's License"}</div></div>
            <div><div style={{color:'#999',marginBottom:2}}>ID Number</div><div style={{fontWeight:600,color:'#333'}}>{maskId(kyc?.id_number)}</div></div>
            <div><div style={{color:'#999',marginBottom:2}}>Verified On</div><div style={{fontWeight:600,color:'#00A86B'}}>{kyc?.reviewed_at ? new Date(kyc.reviewed_at).toLocaleDateString() : '---'}</div></div>
          </div>
        </div>

        {/* Unlocked Features */}
        <div style={{background:'#fff',borderRadius:16,padding:16}}>
          <div style={{fontSize:12,fontWeight:700,color:'#0f0f0f',marginBottom:10}}>Unlocked Features</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <div style={{display:'flex',alignItems:'center',gap:10,padding:10,background:'#f8f8f8',borderRadius:12}}>
              <span style={{fontSize:20}}>💸</span>
              <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:'#333'}}>Withdrawals</div><div style={{fontSize:10,color:'#999'}}>Transfer the earnings to your wallet account</div></div>
              <span style={{color:'#00A86B',fontWeight:700,fontSize:11}}>Active</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:10,padding:10,background:'#f8f8f8',borderRadius:12}}>
              <span style={{fontSize:20}}>📈</span>
              <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:'#333'}}>Higher Limits</div><div style={{fontSize:10,color:'#999'}}>Increased daily transaction cap</div></div>
              <span style={{color:'#00A86B',fontWeight:700,fontSize:11}}>Active</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:10,padding:10,background:'#f8f8f8',borderRadius:12}}>
              <span style={{fontSize:20}}>🎁</span>
              <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:'#333'}}>VIP Access</div><div style={{fontSize:10,color:'#999'}}>Eligible for VIP tier benefits</div></div>
              <span style={{color:'#00A86B',fontWeight:700,fontSize:11}}>Active</span>
            </div>
          </div>
        </div>
      </>
    );
  };

  // ======= MAIN RENDER =======
  return (
    <div style={{background:'#f2f2f7',minHeight:'100vh',maxWidth:430,margin:'0 auto',paddingBottom:80}}>
      {/* Header */}
      <div style={{background:'#0f0f0f',padding:'8px 16px 12px',display:'flex',alignItems:'center',gap:12,color:'#fff'}}>
        <button onClick={() => navigate('/mine')} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#fff'}}>←</button>
        <span style={{fontSize:14,fontWeight:700}}>{t('kyc.title')}</span>
      </div>

      <div style={{padding:16}}>
        {/* ===== Status Banner ===== */}
        {isUnverified && (
          <div style={{background:'#fff',borderRadius:16,padding:16,display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
            <div style={{width:44,height:44,borderRadius:22,background:'#f5f5f5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>🛡️</div>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:'#999'}}>{t('kyc.unverified')}</div>
              <div style={{fontSize:11,color:'#bbb',marginTop:1}}>{t('kyc.unverifiedDesc')}</div>
            </div>
          </div>
        )}

        {isRejected && (
          <div style={{background:'#fff',borderRadius:20,padding:18,marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:700,color:'#0f0f0f',marginBottom:8}}>Rejection Reason</div>
            <div style={{background:'#FFF0F0',borderRadius:12,padding:12,fontSize:11,color:'#C0392B',lineHeight:1.6,marginBottom:12}}>
              {kyc?.admin_note || 'Your submission did not pass review. Please check the requirements and try again.'}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div>
                <div style={{fontSize:10,color:'#999',marginBottom:4}}>Your Upload (Rejected)</div>
                <div style={{background:'#f8f8f8',borderRadius:10,padding:8,textAlign:'center',border:'2px solid #ffdddd'}}>
                  <div style={{fontSize:36,lineHeight:1,filter:'blur(3px)',opacity:.5}}>🪪</div>
                  <div style={{fontSize:9,color:'#E04500',fontWeight:600,marginTop:2}}>✕ Rejected</div>
                </div>
              </div>
              <div>
                <div style={{fontSize:10,color:'#999',marginBottom:4}}>Good Example</div>
                <div style={{background:'#f8f8f8',borderRadius:10,padding:8,textAlign:'center',border:'2px solid #c8e6c9'}}>
                  <div style={{fontSize:36,lineHeight:1}}>📄</div>
                  <div style={{fontSize:9,color:'#00A86B',fontWeight:600,marginTop:2}}>✓ Clear & sharp</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {isPending && (
          <div style={{background:'#FFF8E1',borderRadius:16,padding:16,display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
            <div style={{width:44,height:44,borderRadius:22,background:'#F59E0B',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,color:'#fff'}}>⏳</div>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:'#B45309'}}>{t('kyc.pending')}</div>
              <div style={{fontSize:11,color:'#B45309',opacity:.8,marginTop:1}}>{t('kyc.pendingDesc')}</div>
            </div>
          </div>
        )}

        {isVerified && (
          <div style={{background:'#E8F5E9',borderRadius:16,padding:16,display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
            <div style={{width:44,height:44,borderRadius:22,background:'#00A86B',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,color:'#fff'}}>✓</div>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:'#0B5E2E'}}>{t('kyc.verified')}</div>
              <div style={{fontSize:11,color:'#0B5E2E',opacity:.8,marginTop:1}}>Full access unlocked — withdrawals enabled</div>
            </div>
          </div>
        )}

        {/* ===== Content by Status ===== */}
        {isUnverified && renderForm()}
        {isPending && renderPending()}
        {isVerified && renderVerified()}

        {/* ===== Shared: Requirements + Rejection Reasons (only for unverified/rejected) ===== */}
        {isUnverified && (
          <>
            <div style={{background:'#fff',borderRadius:16,padding:16,marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:700,color:'#0f0f0f',marginBottom:8}}>Requirements</div>
              <div style={{fontSize:11,color:'#999',lineHeight:1.8}}>
                <div style={{display:'flex',alignItems:'center',gap:6}}><span style={{color:'#FF5000'}}>•</span> Valid government-issued ID</div>
                <div style={{display:'flex',alignItems:'center',gap:6}}><span style={{color:'#FF5000'}}>•</span> Name must match your account</div>
                <div style={{display:'flex',alignItems:'center',gap:6}}><span style={{color:'#FF5000'}}>•</span> Photos must be clear and unobstructed</div>
                <div style={{display:'flex',alignItems:'center',gap:6}}><span style={{color:'#FF5000'}}>•</span> Review takes 1-3 business days</div>
              </div>
            </div>

            <details style={{background:'#fff',borderRadius:16,padding:16,marginBottom:12,cursor:'pointer'}}>
              <summary style={{fontSize:12,fontWeight:700,color:'#0f0f0f',listStyle:'none',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                Common Rejection Reasons
                <span style={{fontSize:10,color:'#bbb'}}>▼ Expand</span>
              </summary>
              <div style={{fontSize:11,color:'#999',lineHeight:1.8,marginTop:10,paddingTop:10,borderTop:'1px solid #f0f0f0'}}>
                <div style={{display:'flex',alignItems:'flex-start',gap:6,marginBottom:6}}><span style={{color:'#E04500',flexShrink:0}}>❌</span> Blurry or unreadable photos — use natural light, hold steady</div>
                <div style={{display:'flex',alignItems:'flex-start',gap:6,marginBottom:6}}><span style={{color:'#E04500',flexShrink:0}}>❌</span> Name mismatch with account registration</div>
                <div style={{display:'flex',alignItems:'flex-start',gap:6,marginBottom:6}}><span style={{color:'#E04500',flexShrink:0}}>❌</span> Expired or damaged ID document</div>
                <div style={{display:'flex',alignItems:'flex-start',gap:6,marginBottom:6}}><span style={{color:'#E04500',flexShrink:0}}>❌</span> Photos cropped or missing document edges</div>
                <div style={{display:'flex',alignItems:'flex-start',gap:6}}><span style={{color:'#E04500',flexShrink:0}}>❌</span> Screenshots or photocopies instead of original document</div>
              </div>
            </details>

            {isRejected && (
              <div style={{background:'#FFFAF5',borderRadius:16,padding:16,border:'1px solid #FFE0C0'}}>
                <div style={{fontSize:12,fontWeight:700,color:'#CC6600',marginBottom:8}}>💡 Tips to Pass Next Time</div>
                <div style={{fontSize:11,color:'#996633',lineHeight:1.8}}>
                  <div style={{display:'flex',alignItems:'center',gap:6}}><span style={{color:'#FF5000'}}>•</span> Place ID on a dark, flat surface</div>
                  <div style={{display:'flex',alignItems:'center',gap:6}}><span style={{color:'#FF5000'}}>•</span> Use natural daylight, not flash</div>
                  <div style={{display:'flex',alignItems:'center',gap:6}}><span style={{color:'#FF5000'}}>•</span> Make sure all 4 corners are visible</div>
                  <div style={{display:'flex',alignItems:'center',gap:6}}><span style={{color:'#FF5000'}}>•</span> Clean your camera lens before shooting</div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
