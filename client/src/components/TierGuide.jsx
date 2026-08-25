import { useTranslation } from 'react-i18next';

// 6 档店铺简版说明：押金 / 每天最多赚 / 回本周期
const TIER_GUIDE = [
  { nameKey: 'store.small',   deposit: 20 },
  { nameKey: 'store.medium',  deposit: 50 },
  { nameKey: 'store.large',   deposit: 100 },
  { nameKey: 'store.premium', deposit: 200 },
  { nameKey: 'store.elite',   deposit: 500 },
  { nameKey: 'store.supreme', deposit: 2000 },
];

export default function TierGuide() {
  const { t } = useTranslation();
  const cols = '1.2fr 1fr 1fr 0.7fr';
  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: 16, border: '1px solid #e8e8ed', boxShadow: '0 1px 4px rgba(0,0,0,.03)' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f', marginBottom: 12 }}>{t('store.tierGuide')}</div>
      <div style={{ display: 'grid', gridTemplateColumns: cols, fontSize: 10, color: '#999', marginBottom: 6 }}>
        <span>{t('store.tierLevel')}</span>
        <span>{t('store.deposit')}</span>
        <span>{t('store.dailyMaxProfit')}</span>
        <span style={{ textAlign: 'right' }}>{t('store.payback')}</span>
      </div>
      {TIER_GUIDE.map((g) => (
        <div key={g.nameKey} style={{ display: 'grid', gridTemplateColumns: cols, fontSize: 12, padding: '8px 0', borderTop: '1px solid #f0f0f5', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{t(g.nameKey)}</span>
          <span style={{ color: '#333' }}>${g.deposit}</span>
          <span style={{ color: '#00A86B', fontWeight: 700 }}>${(g.deposit / 30).toFixed(2)}</span>
          <span style={{ color: '#666', textAlign: 'right' }}>30{t('store.daysShort')}</span>
        </div>
      ))}
    </div>
  );
}
