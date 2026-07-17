import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import PullToRefresh from '../components/shared/PullToRefresh';
import { giftsApi } from '../api/gifts';
import { referralApi } from '../api/referral';
import { claimsApi } from '../api/claims';
import toast from 'react-hot-toast';
import { Gift, Users, TrendingUp, ChevronRight } from 'lucide-react';

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
  const maxReq = Math.max(...gifts.map(g => g.required_invites), 1);

  if (loading) return (
    <div className="p-4 space-y-3" style={{maxWidth:430,margin:'0 auto'}}>
      <div className="skeleton h-32 rounded-2xl" />
      <div className="skeleton h-48 rounded-2xl" />
    </div>
  );

  return (
    <PullToRefresh onRefresh={loadAll}>
    <div className="min-h-screen bg-white" style={{maxWidth:430,margin:'0 auto'}}>
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-[13px] text-gray-400 font-medium">Welcome back</p>
            <h1 className="text-[20px] font-bold text-gray-900">{user?.name || user?.email}</h1>
          </div>
          <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-white font-bold text-sm">
            {(user?.name || user?.email || '?')[0].toUpperCase()}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 mb-6">
        <div className="bg-gray-50 rounded-2xl p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">{effective}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Effective</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats?.direct_count || 0}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Direct</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats?.total_invites || 0}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Total</p>
            </div>
          </div>
          <div className="w-full h-1.5 bg-gray-200 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-gray-900 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, (effective / maxReq) * 100)}%` }} />
          </div>
        </div>
      </div>

      {/* Total Earned */}
      <div className="px-5 mb-6">
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-5 text-white">
          <p className="text-[12px] text-gray-400 font-medium mb-1">Total Earned</p>
          <p className="text-[32px] font-extrabold">${totalEarned.toFixed(2)}</p>
          <button onClick={() => navigate('/tasks')} className="mt-3 bg-white/20 text-white text-xs font-medium px-3 py-1.5 rounded-full inline-flex items-center gap-1">
            Invite Friends <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* Gift Grid */}
      <div className="px-5 mb-6">
        <h2 className="text-base font-bold text-gray-900 mb-3">Rewards</h2>
        <div className="grid grid-cols-2 gap-3">
          {gifts.map((gift) => {
            const done = effective >= gift.required_invites;
            const pct = Math.min(100, (effective / gift.required_invites) * 100);
            return (
              <div key={gift.id} onClick={() => navigate(`/gift/${gift.id}`)}
                className={`rounded-2xl p-4 border-2 transition-all cursor-pointer active:scale-[0.98] ${
                  done ? 'border-gray-900 bg-gray-50' : 'border-gray-100 bg-white hover:border-gray-200'
                }`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${done ? 'bg-gray-900' : 'bg-gray-100'}`}>
                    <Gift size={16} className={done ? 'text-white' : 'text-gray-500'} />
                  </div>
                  {done && <span className="text-[10px] bg-gray-900 text-white px-2 py-0.5 rounded-full font-bold">Ready</span>}
                </div>
                <p className="font-semibold text-[13px] text-gray-900 leading-tight mb-1 line-clamp-2">{gift.name}</p>
                <p className="text-xl font-extrabold text-gray-900">${gift.value}</p>
                <div className="w-full h-1 bg-gray-200 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-gray-900 rounded-full transition-all" style={{ width: `${pct}%` }} />
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
