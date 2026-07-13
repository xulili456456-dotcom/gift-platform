import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import client from '../api/client';
import { Upload, CheckCircle, Clock, X, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VerifyPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [proofs, setProofs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    client.get('/proofs').then(({ data }) => setProofs(data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const { data } = await client.post('/proofs', { image: reader.result });
        setProofs(prev => [{ id: data.id, image: reader.result, status: 'pending', submitted_at: new Date().toISOString() }, ...prev]);
        setBurst(true); setTimeout(() => setBurst(false), 1200);
        toast.success(t('verify.uploaded'));
      } catch (err) { toast.error('Upload failed'); }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removeProof = async (id) => {
    setProofs(prev => prev.filter(p => p.id !== id));
  };

  if (loading) return <div className="min-h-screen bg-bg p-4"><div className="skeleton h-40 rounded-2xl" /></div>;

  return (
    <div className="min-h-screen bg-bg animate-fade-in">
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-separator">
        <button onClick={() => navigate('/mine')} className="flex items-center gap-1 text-primary font-medium text-sm pr-2 py-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
          {t('common.back')}
        </button>
        <h2 className="text-[16px] font-bold text-text">{t('verify.title')}</h2>
      </div>
      <div className="p-4 space-y-5">
        <div className="relative rounded-2xl p-4 text-[12px] leading-relaxed overflow-hidden" style={{ background: 'linear-gradient(135deg, #E8225A, #D4206A, #8B2FC9, #E8225A)', backgroundSize: '200% 200%', animation: 'gradientShift 4s ease-in-out infinite' }}>
          {[...Array(6)].map((_, i) => (<div key={i} className="absolute rounded-full bg-white/10" style={{ width: 4+Math.random()*8, height: 4+Math.random()*8, left: 10+i*16+'%', top: 20+Math.random()*60+'%', animation: 'particleFloat '+(2+Math.random()*3)+'s ease-in-out '+i*0.4+'s infinite' }} />))}
          <div className="relative z-10 text-white">
            <div className="flex items-center gap-2 mb-2"><Sparkles size={16} className="animate-pulse" /><p className="text-[13px] font-bold">{t('verify.howTo')}</p></div>
            <p className="text-white/80">1. {t('verify.step1')}</p><p className="text-white/80">2. {t('verify.step2')}</p><p className="text-white/80">3. {t('verify.step3')}</p>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
        <button onClick={() => fileRef.current?.click()} onDragOver={e => { e.preventDefault(); setIsDragOver(true); }} onDragLeave={() => setIsDragOver(false)} onDrop={e => { e.preventDefault(); setIsDragOver(false); if (e.dataTransfer.files[0]) { const dt = new DataTransfer(); dt.items.add(e.dataTransfer.files[0]); fileRef.current.files = dt.files; fileRef.current.dispatchEvent(new Event('change')); } }}
          className={`w-full bg-white rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-300 ${isDragOver ? 'border-primary bg-primary/5 scale-[1.02] shadow-lg' : 'border-primary/30 hover:border-primary/50'}`}>
          <Upload size={40} className="text-primary mx-auto mb-3" /><p className="text-[15px] font-bold text-text">{isDragOver ? t('verify.releaseHere') : t('verify.dropHere')}</p><p className="text-[12px] text-text-muted mt-1">{t('verify.dropHint')}</p>
        </button>
        {burst && (<div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">{['🎉','✨','💫','🌟','🎊'].map((e, i) => (<span key={i} className="absolute text-2xl animate-float-up" style={{ left: 40+i*12+'%', top: '50%', animationDelay: i*0.1+'s' }}>{e}</span>))}</div>)}
        {proofs.length > 0 && (
          <div><h3 className="text-[14px] font-bold text-text mb-3">{t('verify.uploadedList')} ({proofs.length})</h3>
            <div className="space-y-2">{proofs.map((p, idx) => (
              <div key={p.id} className="bg-white rounded-2xl border border-separator p-3 flex items-center gap-3 stagger-item" style={{ animationDelay: idx*0.08+'s' }}>
                <img src={p.image} alt="proof" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                <div className="flex-1 min-w-0"><p className="text-[12px] text-text-muted">{(p.submitted_at||'').slice(0,10)}</p>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full mt-1 ${p.status==='pending'?'bg-yellow-50 text-yellow-600':p.status==='approved'?'bg-success/5 text-success':'bg-red-100 text-red-500'}`}>
                    {p.status==='pending'?<Clock size={12}/>:p.status==='approved'?<CheckCircle size={12}/>:<X size={12}/>}
                    {p.status==='pending'?t('verify.underReview'):p.status==='approved'?t('verify.confirmed'):'Rejected'}
                  </span>
                </div>
                <button onClick={()=>removeProof(p.id)} className="text-red-400 p-1"><X size={16}/></button>
              </div>
            ))}</div>
          </div>
        )}
      </div>
    </div>
  );
}
