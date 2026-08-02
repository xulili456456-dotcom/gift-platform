import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import client from '../api/client';
import toast from 'react-hot-toast';

const TYPE_COLORS = {
  order_profit: { color: '#00A86B', bg: '#E8F8F0' },
  task_reward: { color: '#4C6EF5', bg: '#EEF2FF' },
  commission: { color: '#FF5000', bg: '#FFF5F0' },
  checkin: { color: '#F59E0B', bg: '#FFFDEB' },
  deposit: { color: '#20C997', bg: '#E6FCF5' },
  deposit_return: { color: '#339AF0', bg: '#E7F5FF' },
  agent_reward: { color: '#F06595', bg: '#FFF0F6' },
  staking_refund: { color: '#7950F2', bg: '#F3F0FF' },
  balance_split: { color: '#868E96', bg: '#F1F3F5' },
  bonus: { color: '#845EF7', bg: '#F3F0FF' },
  ad: { color: '#FCC419', bg: '#FFF9DB' },
  admin_adjust: { color: '#E03131', bg: '#FFF0F0' },
};

export default function TransactionsPage() {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [types, setTypes] = useState([]);
  const [summary, setSummary] = useState({ balance: 0, netProfit: 0 });
  const [expandedId, setExpandedId] = useState(null);

  const loadData = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const [txRes, statsRes] = await Promise.all([
        client.get(`/transactions?page=${p}&limit=30${typeFilter ? '&type=' + typeFilter : ''}`),
        client.get('/store/earnings-stats').catch(() => ({ data: {} })),
      ]);
      setTransactions(txRes.data.transactions || []);
      setTotalPages(txRes.data.totalPages || 1);
      setTypes(txRes.data.types || []);
      setPage(p);
      const s = statsRes.data || {};
      setSummary({ balance: s.balance || 0, netProfit: s.netProfit || 0 });
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, [typeFilter]);

  useEffect(() => { loadData(1); }, [loadData]);
  // Auto-refresh summary every 15s
  useEffect(() => {
    const t = setInterval(async () => {
      try { const { data } = await client.get('/store/earnings-stats'); setSummary({ balance: data.balance || 0, netProfit: data.netProfit || 0 }); } catch {}
    }, 15000);
    return () => clearInterval(t);
  }, []);

  const formatDate = (d) => {
    const dt = new Date(d);
    return dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatAmount = (amount, type) => {
    const isNegative = type === 'withdrawal';
    const sign = amount >= 0 ? '+' : '';
    return sign + amount.toFixed(2);
  };

  return (
    <div style={{background:'#f2f2f7',minHeight:'100vh',maxWidth:430,margin:'0 auto',paddingBottom:20}}>
      {/* Header */}
      <div style={{background:'#0f0f0f',padding:'12px 16px 16px',color:'#fff'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span onClick={() => window.history.back()} style={{cursor:'pointer',fontSize:18}}>‹</span>
            <span style={{fontSize:15,fontWeight:700}}>Transaction History</span>
          </div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <div style={{flex:1,background:'#1a1a1a',borderRadius:10,padding:10,textAlign:'center'}}>
            <div style={{fontSize:10,color:'#888'}}>Balance</div>
            <div style={{fontSize:18,fontWeight:700,color:'#FFD54F'}}>${summary.balance.toFixed(2)}</div>
          </div>
          <div style={{flex:1,background:'#1a1a1a',borderRadius:10,padding:10,textAlign:'center'}}>
            <div style={{fontSize:10,color:'#888'}}>Total Profit</div>
            <div style={{fontSize:18,fontWeight:700,color:'#4FC3F7'}}>${summary.netProfit.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Type Filter */}
      <div style={{padding:'12px 12px 0',overflowX:'auto',whiteSpace:'nowrap'}}>
        <button onClick={() => setTypeFilter('')} style={{
          ...filterBtn, background: !typeFilter ? '#0f0f0f' : '#fff', color: !typeFilter ? '#fff' : '#333',
        }}>All</button>
        {types.map(t => (
          <button key={t.key} onClick={() => setTypeFilter(t.key)} style={{
            ...filterBtn, background: typeFilter === t.key ? '#0f0f0f' : '#fff', color: typeFilter === t.key ? '#fff' : '#333',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Transaction List */}
      <div style={{padding:'0 12px',marginTop:12}}>
        {loading ? (
          <div style={{textAlign:'center',padding:40,color:'#999'}}>Loading...</div>
        ) : transactions.length === 0 ? (
          <div style={{textAlign:'center',padding:40,background:'#fff',borderRadius:14}}>
            <div style={{fontSize:32,marginBottom:8}}>📋</div>
            <div style={{fontSize:13,color:'#999'}}>No transactions yet</div>
          </div>
        ) : (
          <>
            {transactions.map((tx, i) => {
              const tc = TYPE_COLORS[tx.type] || { color: '#666', bg: '#f5f5f5' };
              const isExpanded = expandedId === tx.id;
              const hasDetail = tx.detail && (tx.detail.productName || tx.detail.taskTitle || tx.detail.network);
              const isFirst = i === 0, isLast = i === transactions.length - 1;
              const radius = isFirst && isLast ? 14 : isFirst ? '14px 14px 0 0' : isLast && !isExpanded ? '0 0 14px 14px' : 0;
              return (
                <div key={tx.id}>
                  <div onClick={() => setExpandedId(isExpanded ? null : tx.id)} style={{
                    background:'#fff', borderBottom: isExpanded ? 'none' : (isLast ? 'none' : '1px solid #f0f0f0'),
                    padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
                    borderRadius: radius, cursor: hasDetail ? 'pointer' : 'default',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 18, background: tc.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, flexShrink: 0,
                    }}>
                      {tx.type === 'order_profit' ? '📦' :
                       tx.type === 'task_reward' ? '🎯' :
                       tx.type === 'commission' ? '🔗' :
                       tx.type === 'checkin' ? '📅' :
                       tx.type === 'deposit' ? '💵' :
                       tx.type === 'deposit_return' ? '🔓' :
                       tx.type === 'agent_reward' ? '🤝' :
                       tx.type === 'staking_refund' ? '🔒' :
                       tx.type === 'balance_split' ? '🔄' :
                       tx.type === 'bonus' ? '💰' :
                       tx.type === 'ad' ? '📢' : '⚙️'}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:600,color:'#333'}}>
                        {tx.typeLabel}
                        {hasDetail && <span style={{fontSize:10,color:'#bbb',marginLeft:4}}>{isExpanded ? '▲' : '▼'}</span>}
                      </div>
                      <div style={{fontSize:10,color:'#999'}}>{formatDate(tx.createdAt)}</div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontSize:14,fontWeight:700,color:tc.color}}>
                        {tx.amount >= 0 ? '+' : ''}{tx.amount.toFixed(2)}
                      </div>
                      <div style={{fontSize:9,color:'#bbb'}}>Bal: ${tx.balance.toFixed(2)}</div>
                    </div>
                  </div>

                  {/* Expanded Detail Panel */}
                  {isExpanded && tx.detail && (
                    <div style={{
                      background: '#fafafa', borderBottomLeftRadius: isLast ? 14 : 0,
                      borderBottomRightRadius: isLast ? 14 : 0,
                      borderBottom: isLast ? 'none' : '1px solid #f0f0f0',
                      padding: '8px 14px 12px 60px',
                    }}>
                      {tx.type === 'order_profit' && tx.detail.productName && (
                        <div style={{fontSize:11,color:'#555',lineHeight:'18px'}}>
                          <div><b>Product:</b> {tx.detail.productName}</div>
                          <div><b>Price:</b> ${(tx.detail.productPrice || 0).toFixed(2)} · <b>Held:</b> {tx.detail.holdHours || '?'}h</div>
                          <div><b>Profit Rate:</b> <span style={{color:'#00A86B',fontWeight:600}}>{tx.detail.profitRate}%</span></div>
                          {tx.detail.buyTime && <div style={{color:'#999'}}>Bought: {formatDate(tx.detail.buyTime)}</div>}
                          {tx.detail.sellTime && <div style={{color:'#999'}}>Sold: {formatDate(tx.detail.sellTime)}</div>}
                        </div>
                      )}
                      {tx.type === 'commission' && tx.detail.productName && (
                        <div style={{fontSize:11,color:'#555',lineHeight:'18px'}}>
                          <div><b>Product:</b> {tx.detail.productName}</div>
                          <div><b>Price:</b> ${(tx.detail.productPrice || 0).toFixed(2)} · <b>Rate:</b> {tx.detail.commissionRate || '3%'}</div>
                          <div><b>Commission Earned:</b> <span style={{color:'#FF5000',fontWeight:600}}>+${(tx.detail.commission || tx.amount).toFixed(2)}</span></div>
                        </div>
                      )}
                      {tx.type === 'deposit' && tx.detail.network && (
                        <div style={{fontSize:11,color:'#555',lineHeight:'18px'}}>
                          <div><b>Network:</b> {tx.detail.network.toUpperCase()}</div>
                          {tx.detail.txHash && <div style={{wordBreak:'break-all'}}><b>TX:</b> <span style={{color:'#999',fontSize:9}}>{tx.detail.txHash}</span></div>}
                        </div>
                      )}
                      {tx.type === 'task_reward' && tx.detail.taskTitle && (
                        <div style={{fontSize:11,color:'#555',lineHeight:'18px'}}>
                          <div><b>Task:</b> {tx.detail.taskTitle}</div>
                        </div>
                      )}
                      {(tx.type === 'deposit_return' || tx.type === 'staking_refund') && (
                        <div style={{fontSize:11,color:'#555'}}>
                          {tx.type === 'deposit_return' ? 'Store deposit returned to balance' : 'Staking plan unlocked, funds returned to balance'}
                        </div>
                      )}
                      {tx.type === 'checkin' && (
                        <div style={{fontSize:11,color:'#555'}}>Daily check-in streak reward</div>
                      )}
                      {tx.type === 'balance_split' && (
                        <div style={{fontSize:11,color:'#999'}}>System remainder from transaction balance split</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{display:'flex',justifyContent:'center',gap:8,padding:12}}>
          <button disabled={page <= 1} onClick={() => loadData(page - 1)} style={pageBtn(page <= 1)}>‹ Prev</button>
          <span style={{padding:'6px 12px',fontSize:12,color:'#666'}}>{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => loadData(page + 1)} style={pageBtn(page >= totalPages)}>Next ›</button>
        </div>
      )}
    </div>
  );
}

const filterBtn = {
  padding: '6px 14px', borderRadius: 20, border: '1px solid #e0e0e0',
  fontSize: 11, fontWeight: 600, cursor: 'pointer', marginRight: 6, flexShrink: 0,
};

const pageBtn = (disabled) => ({
  padding: '6px 14px', borderRadius: 10, border: '1px solid #e0e0e0',
  background: disabled ? '#f5f5f5' : '#fff', color: disabled ? '#ccc' : '#333',
  fontSize: 12, cursor: disabled ? 'default' : 'pointer',
});
