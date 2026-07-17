import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { giftsApi } from '../api/gifts';
import { referralApi } from '../api/referral';
import { claimsApi } from '../api/claims';
import PullToRefresh from '../components/shared/PullToRefresh';
import toast from 'react-hot-toast';
import { Search, Gift, Star, Zap, Heart, ShoppingBag } from 'lucide-react';

const CATS = [
  { icon: Zap, label: 'Hot Deals', color: '#FF5000' },
  { icon: Gift, label: 'Rewards', color: '#FF6B6B' },
  { icon: Star, label: 'Top Earn', color: '#FFB800' },
  { icon: Heart, label: 'Favorites', color: '#FF4081' },
  { icon: ShoppingBag, label: 'Store', color: '#00C9A7' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [gifts, setGifts] = useState([]);
  const [stats, setStats] = useState(null);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);
  const loadAll = async () => {
    try {
      const [g, s, c] = await Promise.all([giftsApi.list(), referralApi.getStats(), claimsApi.list()]);
      setGifts(g.data); setStats(s.data); setClaims(c.data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const effective = stats?.effective_invites || 0;
  const totalEarned = claims.filter(c => c.status !== 'rejected').reduce((s, c) => s + (c.value || 0), 0);

  if (loading) return (
    <div className="p-4 space-y-3" style={{maxWidth:430,margin:'0 auto'}}>
      <div className="skeleton h-12 rounded-full" />
      <div className="skeleton h-20 rounded-2xl" />
      <div className="skeleton h-64 rounded-2xl" />
    </div>
  );

  return (
    <PullToRefresh onRefresh={loadAll}>
    <div className="min-h-screen bg-white" style={{maxWidth:430,margin:'0 auto'}}>
      {/* Header with Search Bar */}
      <div className="bg-gradient-to-b from-[#FF5000] to-[#FF3D00] px-4 pt-10 pb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xs">
            {(user?.name || user?.email || '?')[0].toUpperCase()}
          </div>
          <div className="flex-1 bg-white rounded-full px-4 py-2 flex items-center gap-2" onClick={() => navigate('/store')}>
            <Search size={16} className="text-gray-400" />
            <span className="text-sm text-gray-400">Search products...</span>
          </div>
        </div>
        {/* Banner */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[22px] font-extrabold">${totalEarned.toFixed(2)}</p>
              <p className="text-xs text-white/70">Total Earned</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">{effective}</p>
              <p className="text-xs text-white/70">Effective Invites</p>
            </div>
          </div>
          <button onClick={() => navigate('/tasks')} className="mt-3 w-full py-2 bg-white text-[#FF5000] rounded-lg text-sm font-bold active:scale-[0.98] transition-all">
            Invite Friends to Earn
          </button>
        </div>
      </div>

      {/* Category Icons */}
      <div className="px-4 py-3">
        <div className="flex justify-between">
          {CATS.map((cat, i) => (
            <div key={i} className="flex flex-col items-center gap-1 cursor-pointer active:scale-95 transition-all"
              onClick={() => i === 4 ? navigate('/store') : navigate('/tasks')}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{background: cat.color+'15'}}>
                <cat.icon size={22} style={{color: cat.color}} />
              </div>
              <span className="text-[10px] text-gray-600 font-medium">{cat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Promo Banner */}
      <div className="px-4 mb-4">
        <div className="bg-gradient-to-r from-[#FFF0E8] to-[#FFE0D0] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-[#FF5000]">Free Orders Today!</p>
            <p className="text-xs text-gray-500 mt-0.5">5 free no-deposit trades</p>
          </div>
          <button onClick={() => navigate('/store')} className="bg-[#FF5000] text-white text-xs font-bold px-4 py-2 rounded-full active:scale-95">
            Go Trade
          </button>
        </div>
      </div>

      {/* Reward Gifts */}
      <div className="px-4 mb-4">
        <h2 className="text-base font-bold text-gray-900 mb-3">Invite Rewards</h2>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          {gifts.map((gift) => {
            const done = effective >= gift.required_invites;
            return (
              <div key={gift.id} onClick={() => navigate(`/gift/${gift.id}`)}
                className={`shrink-0 w-36 rounded-2xl border-2 cursor-pointer active:scale-[0.98] transition-all overflow-hidden ${
                  done ? 'border-[#FF5000] bg-[#FFF5F0]' : 'border-gray-100 bg-white'
                }`}>
                <div className={`h-20 flex items-center justify-center ${done ? 'bg-[#FF5000]/10' : 'bg-gray-50'}`}>
                  <Gift size={32} className={done ? 'text-[#FF5000]' : 'text-gray-300'} />
                </div>
                <div className="p-3">
                  <p className="font-semibold text-[12px] text-gray-900 line-clamp-2">{gift.name}</p>
                  <p className="text-lg font-extrabold text-[#FF5000] mt-1">${gift.value}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{gift.required_invites} invites needed</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom spacer */}
      <div className="h-24" />
    </div>
    </PullToRefresh>
  );
}
