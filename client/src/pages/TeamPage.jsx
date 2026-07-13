import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { referralApi } from '../api/referral';
import { Users, TrendingUp, Network, Layers, ChevronDown } from 'lucide-react';
import Sparkline from '../components/shared/Sparkline';
import toast from 'react-hot-toast';

export default function TeamPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [showExplain, setShowExplain] = useState(true);

  useEffect(() => {
    referralApi.getStats()
      .then(({ data }) => setStats(data))
      .catch(() => toast.error('Load failed'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-bg p-4 space-y-4">
      <div className="skeleton h-8 w-32" /><div className="skeleton h-40 rounded-2xl" />
      <div className="skeleton h-64 rounded-2xl" /><div className="skeleton h-48 rounded-2xl" />
    </div>
  );

  const breakdown = stats?.breakdown || { level1: 0, level2: 0, level3: 0 };
  const effective = stats?.effective_invites || 0;
  const allInvitees = stats?.recent_invitees || [];
  const totalInvites = stats?.total_invites || 0;
  const directCount = stats?.direct_count || 0;

  const [page, setPage] = useState(1);
  const PER_PAGE = 20;
  const filtered = allInvitees.filter(inv => {
    if (filterLevel > 0 && inv.level !== filterLevel) return false;
    if (searchTerm && !(inv.name || inv.email || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-bg animate-fade-in">
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-separator">
        <button onClick={() => navigate('/mine')} className="flex items-center gap-1 text-primary font-medium text-sm pr-2 py-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
          {t('common.back')}
        </button>
        <h2 className="text-[16px] font-bold text-text">{t('mine.myTeam')}</h2>
        <span className="text-[11px] text-text-muted ml-auto">{t('tasks.totalInvites')}: {totalInvites}</span>
      </div>

      <div className="p-4 space-y-5">
        {/* ── Stats Overview ── */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { v: directCount, l: t('tasks.level1'), icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
            { v: breakdown.level2, l: t('tasks.level2'), icon: Network, color: 'text-purple-500', bg: 'bg-purple-50' },
            { v: breakdown.level3, l: t('tasks.level3'), icon: Layers, color: 'text-amber-500', bg: 'bg-amber-50' },
            { v: effective, l: t('gifts.effectiveInvites'), icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/5' },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className={`${s.bg} rounded-2xl p-3 text-center`}>
                <Icon size={18} className={`${s.color} mx-auto mb-1`} />
                <p className="text-lg font-black text-text">{s.v}</p>
                <p className="text-[9px] text-text-muted font-medium leading-tight">{s.l}</p>
              </div>
            );
          })}
        </div>

        {/* ── Effective Formula ── */}
        <div className="bg-gradient-to-r from-primary to-accent rounded-2xl p-4 text-white text-center shadow-lg shadow-purple-500/20">
          <p className="text-white/60 text-[11px] font-medium mb-1">{t('gifts.effectiveInvites')}</p>
          <p className="text-4xl font-black">{effective}</p>
          <p className="text-white/50 text-[11px] mt-1">
            = {breakdown.level1}×1.0 + {breakdown.level2}×0.5 + {breakdown.level3}×0.25
          </p>
          {/* Mini chart */}
          <div className="mt-3 flex justify-center">
            <Sparkline data={[0, breakdown.level1 || 0, (breakdown.level1 || 0) + (breakdown.level2 || 0) * 0.5, effective]} width={200} height={36} color="#FFD54F" area />
          </div>
        </div>

        {/* ── Explanation ── */}
        <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-2xl border border-primary/10 overflow-hidden">
          <button onClick={() => setShowExplain(!showExplain)}
            className="w-full px-4 py-3 flex items-center justify-between">
            <span className="text-[13px] font-bold text-text">{t('team.title')}</span>
            <ChevronDown size={16} className={`text-text-muted transition-transform ${showExplain ? 'rotate-180' : ''}`} />
          </button>
          {showExplain && (
            <div className="px-4 pb-4 space-y-2 text-[12px] text-text-secondary leading-relaxed">
              <div className="flex gap-2"><span className="text-primary font-bold shrink-0">{t('tasks.level1')}：</span><span dangerouslySetInnerHTML={{ __html: t('team.level1Desc') }} /></div>
              <div className="flex gap-2"><span className="text-purple-500 font-bold shrink-0">{t('tasks.level2')}：</span><span dangerouslySetInnerHTML={{ __html: t('team.level2Desc') }} /></div>
              <div className="flex gap-2"><span className="text-amber-500 font-bold shrink-0">{t('tasks.level3')}：</span><span dangerouslySetInnerHTML={{ __html: t('team.level3Desc') }} /></div>
            </div>
          )}
        </div>

        {/* ── Team Members ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] font-bold text-text">👥 {t('team.tree')}</h3>
            <span className="text-[11px] text-text-muted">{totalInvites} {t('common.people')}</span>
          </div>

          {/* Search + Filter */}
          <div className="space-y-2 mb-3">
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder={t('admin.searchPlaceholder')}
              className="w-full px-4 py-3 rounded-xl border border-separator bg-white text-[13px] focus:outline-none focus:border-primary" />
            <div className="flex gap-2">
              {[
                { v: 0, l: 'all' },
                { v: 1, l: '1' },
                { v: 2, l: '2' },
                { v: 3, l: '3' },
              ].map(({ v, l }) => (
                <button key={v} onClick={() => setFilterLevel(v)}
                  className={`flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition-colors ${
                    filterLevel === v ? 'bg-primary text-white' : 'bg-white border border-separator text-text-secondary'
                  }`}>
                  {v === 0 ? t('admin.all') : `${l}${t('tasks.level')}`}
                </button>
              ))}
            </div>
          </div>

          {/* Member List */}
          {filtered.length > 0 ? (
            <div className="bg-white rounded-2xl border border-separator divide-y divide-separator">
              {filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE).map((inv, idx) => (
                <div key={inv.id} className="px-4 py-3.5 flex items-center gap-3 stagger-item" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                    inv.level === 1 ? 'bg-blue-50 text-blue-600' :
                    inv.level === 2 ? 'bg-purple-50 text-purple-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    {(inv.name || inv.email || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-semibold text-text">{inv.name || inv.email}</p>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                        inv.level === 1 ? 'bg-blue-50 text-blue-600' :
                        inv.level === 2 ? 'bg-purple-50 text-purple-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        L{inv.level}
                      </span>
                    </div>
                    <p className="text-[10px] text-text-muted mt-0.5">{t('team.joinedOn')}: {inv.invited_at?.slice(0, 10)}</p>
                  </div>
                  <span className={`text-[13px] font-bold ${
                    inv.level === 1 ? 'text-blue-500' : inv.level === 2 ? 'text-purple-500' : 'text-amber-500'
                  }`}>
                    +{inv.level === 1 ? '1.0' : inv.level === 2 ? '0.5' : '0.25'}
                  </span>
                </div>
              ))}
              {filtered.length > PER_PAGE && (
                <div className="flex justify-center gap-3 px-4 py-3 border-t border-separator">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1.5 text-xs rounded-lg bg-bg disabled:opacity-30">{t('admin.prevPage')}</button>
                  <span className="text-xs text-text-muted py-1.5">{page} / {Math.ceil(filtered.length / PER_PAGE)}</span>
                  <button disabled={page >= Math.ceil(filtered.length / PER_PAGE)} onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1.5 text-xs rounded-lg bg-bg disabled:opacity-30">{t('admin.nextPage')}</button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-separator py-16 text-center">
              <Users size={40} className="text-text-muted mx-auto mb-4 opacity-30" />
              <p className="text-[14px] font-semibold text-text mb-1">{t('tasks.noInvitees')}</p>
              <p className="text-[12px] text-text-muted">{t('tasks.noInviteesHint')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
