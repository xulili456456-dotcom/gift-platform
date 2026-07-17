import { useState, useEffect } from 'react';
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
  const [form, setForm] = useState({ docType: 'driver_license', name: '', idNumber: '', frontImg: null, backImg: null });
  useEffect(() => {
    client.get('/kyc').then(({ data }) => { setKyc(data); setKycLoading(false); }).catch(() => setKycLoading(false));
  }, []);
  const [submitting, setSubmitting] = useState(false);
  if (kycLoading) return <div className="min-h-screen bg-bg p-4 space-y-4"><div className="skeleton h-8 w-32 rounded-lg" /><div className="skeleton h-20 rounded-2xl" /><div className="skeleton h-64 rounded-2xl" /></div>;

  const DOC_TYPES = [
    { id: 'driver_license', label: t('kyc.driverLicense'), Icon: Car },
    { id: 'passport', label: t('kyc.passport'), Icon: Globe },
  ];

  const handleImage = (e, side) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm({ ...form, [side]: reader.result });
    reader.readAsDataURL(file);
  };

  const submitKyc = () => {
    if (!form.name.trim() || !form.idNumber.trim()) { toast.error(t('auth.fillRequired')); return; }
    if (!form.frontImg || !form.backImg) { toast.error(t('kyc.uploadBoth')); return; }
    setSubmitting(true);
    const data = { ...form, status: 'pending', submittedAt: new Date().toISOString() };
    client.post('/kyc', { doc_type: form.docType, real_name: form.name, id_number: form.idNumber, front_image: form.frontImg, back_image: form.backImg })
      .then(({ data }) => { setKyc({ ...form, status: 'pending', id: data.id }); setSubmitting(false); toast.success(t('common.submit')); })
      .catch(err => { setSubmitting(false); toast.error(err.response?.data?.error || t('common.operationFailed')); });
  };

  const statusCfg = {
    unverified: { icon: AlertCircle, color: 'text-text-muted', bg: 'bg-bg', label: t('kyc.unverified'), desc: t('kyc.unverifiedDesc') },
    pending: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', label: t('kyc.pending'), desc: t('kyc.pendingDesc') },
    verified: { icon: CheckCircle, color: 'text-success', bg: 'bg-success/5', label: t('kyc.verified'), desc: t('kyc.verifiedDesc') },
    approved: { icon: CheckCircle, color: 'text-success', bg: 'bg-success/5', label: t('kyc.verified'), desc: t('kyc.verifiedDesc') },
    rejected: { icon: AlertCircle, color: 'text-text-muted', bg: 'bg-bg', label: t('kyc.unverified'), desc: t('kyc.unverifiedDesc') },
  };

  const current = statusCfg[kyc?.status || 'unverified'];
  const isPassport = form.docType === 'passport';
  const idLabel = isPassport ? t('kyc.passportNumber') : form.docType === 'driver_license' ? t('kyc.licenseNumber') : t('kyc.id_number');
  const idPlaceholder = isPassport ? t('kyc.passportPlaceholder') : form.docType === 'driver_license' ? t('kyc.licensePlaceholder') : t('kyc.idPlaceholder');
  const frontLabel = isPassport ? t('kyc.passportFront') : t('kyc.frontGeneric');
  const backLabel = isPassport ? t('kyc.passportBack') : t('kyc.backGeneric');

  return (
    <div className="min-h-screen bg-bg animate-fade-in">
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-separator">
        <button onClick={() => navigate('/mine')} className="flex items-center gap-1 text-primary font-medium text-sm pr-2 py-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
          {t('common.back')}
        </button>
        <h2 className="text-[16px] font-bold text-text">{t('kyc.title')}</h2>
      </div>

      <div className="p-4 space-y-5">
        <div className={`${current.bg} rounded-2xl p-5 flex items-center gap-4`}>
          <current.icon size={36} className={current.color} />
          <div>
            <p className={`text-[15px] font-bold ${current.color}`}>{current.label}</p>
            <p className="text-[12px] text-text-secondary mt-0.5">{current.desc}</p>
          </div>
        </div>

        {kyc && kyc.status !== 'unverified' && kyc.status !== 'rejected' && (
          <div className="bg-white rounded-2xl p-5 border border-separator shadow-sm space-y-3">
            <h3 className="text-[14px] font-bold text-text">{t('kyc.submittedInfo')}</h3>
            <div className="grid grid-cols-2 gap-3 text-[12px]">
              <div><span className="text-text-muted">{t('kyc.real_name')}</span><p className="font-semibold mt-0.5">{kyc.real_name}</p></div>
              <div><span className="text-text-muted">{idLabel}</span><p className="font-semibold mt-0.5">{kyc.id_number.replace(/(\d{4})\d{10}(\d{4})/, '$1**********$2')}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-bg rounded-xl p-2 text-center">
                <img src={kyc.front_image} alt="front" className="h-28 mx-auto rounded-lg object-cover" />
                <p className="text-[10px] text-text-muted mt-1">{frontLabel}</p>
              </div>
              <div className="bg-bg rounded-xl p-2 text-center">
                <img src={kyc.back_image} alt="back" className="h-28 mx-auto rounded-lg object-cover" />
                <p className="text-[10px] text-text-muted mt-1">{backLabel}</p>
              </div>
            </div>
          </div>
        )}

        {(!kyc || kyc.status === 'unverified' || kyc.status === 'rejected') && (
          <div className="bg-white rounded-2xl p-5 border border-separator shadow-sm space-y-4">
            <h3 className="text-[14px] font-bold text-text">{t('kyc.submitForm')}</h3>

            <div>
              <label className="text-[11px] text-text-muted font-medium mb-2 block">{t('kyc.docType')}</label>
              <div className="flex gap-2">
                {DOC_TYPES.map(({ id, label, Icon }) => (
                  <button key={id} onClick={() => setForm({ ...form, docType: id })}
                    className={`flex-1 py-3 rounded-xl text-[12px] font-semibold border-2 transition-all ${
                      form.docType === id ? 'border-primary bg-primary/5 text-primary' : 'border-separator text-text-secondary hover:border-gray-300'
                    }`}>
                    <Icon size={20} className="block mx-auto mb-1" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] text-text-muted font-medium mb-1 block">{t('kyc.realName')}</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Full name" className="w-full px-4 py-3 rounded-xl border border-separator bg-bg text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-[11px] text-text-muted font-medium mb-1 block">{idLabel}</label>
              <input value={form.idNumber} onChange={e => setForm({ ...form, idNumber: e.target.value })}
                placeholder={idPlaceholder}
                maxLength={isPassport ? 20 : 18}
                className="w-full px-4 py-3 rounded-xl border border-separator bg-bg text-sm focus:outline-none focus:border-primary" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-text-muted font-medium mb-1 block">{frontLabel}</label>
                {form.frontImg ? (
                  <div className="relative bg-bg rounded-xl p-2">
                    <img src={form.frontImg} alt="front" className="h-28 w-full object-cover rounded-lg" />
                    <button onClick={() => setForm({ ...form, frontImg: null })}
                      className="absolute top-3 right-3 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center"><X size={12} className="text-white" /></button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-28 bg-bg rounded-xl border-2 border-dashed border-separator cursor-pointer hover:border-primary transition-colors">
                    <Upload size={18} className="text-text-muted mb-1" />
                    <span className="text-[10px] text-text-muted">{t('kyc.uploadHint')}</span>
                    <input type="file" accept="image/*" onChange={e => handleImage(e, 'frontImg')} className="hidden" />
                  </label>
                )}
              </div>
              <div>
                <label className="text-[11px] text-text-muted font-medium mb-1 block">{backLabel}</label>
                {form.backImg ? (
                  <div className="relative bg-bg rounded-xl p-2">
                    <img src={form.backImg} alt="back" className="h-28 w-full object-cover rounded-lg" />
                    <button onClick={() => setForm({ ...form, backImg: null })}
                      className="absolute top-3 right-3 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center"><X size={12} className="text-white" /></button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-28 bg-bg rounded-xl border-2 border-dashed border-separator cursor-pointer hover:border-primary transition-colors">
                    <Upload size={18} className="text-text-muted mb-1" />
                    <span className="text-[10px] text-text-muted">{t('kyc.uploadHint')}</span>
                    <input type="file" accept="image/*" onChange={e => handleImage(e, 'backImg')} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            <button onClick={submitKyc} disabled={submitting}
              className="w-full py-3.5 bg-primary text-white rounded-xl text-[14px] font-bold active:scale-[0.98] transition-transform">
              {submitting ? t('kyc.submitting') : t('kyc.submitBtn')}
            </button>
            <p className="text-[10px] text-text-muted text-center">{t('kyc.privacy')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
