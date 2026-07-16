import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import client from '../api/client';
import toast from 'react-hot-toast';
import { ChevronLeft, Copy, CheckCircle, Clock, XCircle } from 'lucide-react';

const NETWORKS = [
  { id: 'trc20', label: 'TRC20', icon: '🌐' },
  { id: 'erc20', label: 'ERC20', icon: '🔷' },
  { id: 'bep20', label: 'BEP20', icon: '💛' },
];

export default function DepositPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [network, setNetwork] = useState('trc20');
  const [addresses, setAddresses] = useState({});
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/deposits/addresses').then(({ data }) => setAddresses(data)).catch(() => {});
    client.get('/deposits').then(({ data }) => setHistory(data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const copyAddr = () => {
    navigator.clipboard.writeText(addresses[network] || '');
    toast.success('Address copied!');
  };

  const submit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 1) { toast.error('Minimum $1'); return; }
    if (!txHash.trim()) { toast.error('Please enter transaction hash'); return; }
    setSubmitting(true);
    try {
      const { data } = await client.post('/deposits', { network, amount: amt, tx_hash: txHash.trim() });
      toast.success('Deposit submitted!');
      setAmount(''); setTxHash('');
      setHistory(prev => [data, ...prev]);
    } catch (err) { toast.error(err.response?.data?.error || t('common.operationFailed')); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-[#0d0d1a] safe-top safe-bottom flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#141420] border-b border-[#262636]">
        <button onClick={() => navigate('/mine')}><ChevronLeft size={22} className="text-[#f8f7f4]" /></button>
        <h1 className="text-base font-bold text-[#f8f7f4]">💵 {t('store.deposit') || 'Deposit'}</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Network Selector */}
        <div className="bg-[#141420] rounded-2xl p-4 border border-[#262636]">
          <p className="text-sm font-bold text-[#f8f7f4] mb-3">Select Network</p>
          <div className="flex gap-2">
            {NETWORKS.map(n => (
              <button key={n.id} onClick={() => setNetwork(n.id)}
                className={`flex-1 py-2.5 rounded-xl text-[12px] font-bold border transition-colors ${
                  network === n.id ? 'bg-[#c8a06e]/20 border-[#c8a06e] text-[#c8a06e]' : 'bg-[#1E1E32] border-[#262636] text-[#9e9eaa]'
                }`}>{n.icon} {n.label}</button>
            ))}
          </div>
        </div>

        {/* Deposit Address */}
        <div className="bg-[#141420] rounded-2xl p-4 border border-[#262636]">
          <p className="text-sm font-bold text-[#f8f7f4] mb-2">Deposit Address</p>
          <div className="bg-[#1E1E32] rounded-xl p-3 flex items-center justify-between">
            <p className="text-[11px] text-[#f8f7f4] font-mono break-all flex-1 mr-2">{addresses[network] || 'Not configured'}</p>
            <button onClick={copyAddr} className="shrink-0 p-2 bg-[#c8a06e]/20 rounded-lg"><Copy size={16} className="text-[#c8a06e]" /></button>
          </div>
          <p className="text-[10px] text-[#6e6e7a] mt-2">Send only USDT on {network.toUpperCase()} network. Other tokens will be lost.</p>
        </div>

        {/* Submit Form */}
        <div className="bg-[#141420] rounded-2xl p-4 border border-[#262636]">
          <p className="text-sm font-bold text-[#f8f7f4] mb-3">Submit Deposit</p>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount (USDT)" className="w-full px-3 py-2.5 bg-[#1E1E32] border border-[#262636] rounded-xl text-sm text-[#f8f7f4] mb-3 outline-none focus:border-[#c8a06e]" />
          <input type="text" value={txHash} onChange={e => setTxHash(e.target.value)} placeholder="Transaction Hash (TXID)" className="w-full px-3 py-2.5 bg-[#1E1E32] border border-[#262636] rounded-xl text-sm text-[#f8f7f4] mb-3 outline-none focus:border-[#c8a06e]" />
          <button onClick={submit} disabled={submitting} className="w-full py-3 bg-[#c8a06e] text-[#0d0d1a] font-bold rounded-xl text-sm active:scale-[0.98] disabled:opacity-50">
            {submitting ? '...' : 'Submit Deposit'}
          </button>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="bg-[#141420] rounded-2xl p-4 border border-[#262636]">
            <p className="text-sm font-bold text-[#f8f7f4] mb-3">Deposit History</p>
            <div className="space-y-2">
              {history.map(d => (
                <div key={d.id} className="flex items-center justify-between py-2 border-b border-[#262636] last:border-0">
                  <div>
                    <p className="text-[12px] font-medium text-[#f8f7f4]">${Number(d.amount).toFixed(2)} <span className="text-[10px] text-[#9e9eaa]">{d.network.toUpperCase()}</span></p>
                    <p className="text-[9px] text-[#6e6e7a]">{new Date(d.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    d.status === 'confirmed' ? 'bg-[#00c758]/20 text-[#00c758]' :
                    d.status === 'rejected' ? 'bg-[#fb2c36]/20 text-[#fb2c36]' :
                    'bg-[#c8a06e]/20 text-[#c8a06e]'
                  }`}>
                    {d.status === 'confirmed' ? <CheckCircle size={10} className="inline mr-0.5" /> :
                     d.status === 'rejected' ? <XCircle size={10} className="inline mr-0.5" /> :
                     <Clock size={10} className="inline mr-0.5" />}
                    {d.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
