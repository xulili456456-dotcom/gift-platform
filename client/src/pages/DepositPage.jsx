import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import client from '../api/client';
import toast from 'react-hot-toast';
import { ChevronLeft, Copy, CheckCircle, Clock, XCircle, Shield, AlertTriangle } from 'lucide-react';

const NETWORKS = [
  { id: 'trc20', label: 'TRC20', desc: 'Tron Network · Fast & Low Fee', icon: '🌐' },
  { id: 'erc20', label: 'ERC20', desc: 'Ethereum Network · Widely Used', icon: '🔷' },
  { id: 'bep20', label: 'BEP20', desc: 'BSC Network · Cheap & Fast', icon: '💛' },
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

  useEffect(() => {
    client.get('/deposits/addresses').then(({ data }) => setAddresses(data)).catch(() => {});
    client.get('/deposits').then(({ data }) => setHistory(data)).catch(() => {});
  }, []);

  const addr = addresses[network] || '';
  const copyAddr = () => {
    if (!addr) return;
    navigator.clipboard.writeText(addr);
    toast.success('Address copied!');
  };

  const submit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 1) { toast.error('Minimum $1'); return; }
    if (!txHash.trim()) { toast.error('Please enter transaction hash'); return; }
    setSubmitting(true);
    try {
      const { data } = await client.post('/deposits', { network, amount: amt, tx_hash: txHash.trim() });
      toast.success('Deposit submitted for review!');
      setAmount(''); setTxHash('');
      setHistory(prev => [data, ...prev]);
    } catch (err) { toast.error(err.response?.data?.error || 'Operation failed'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-[#0d0d1a] safe-top safe-bottom flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#0d0d1a] border-b border-[#262636]">
        <button onClick={() => navigate(-1)}><ChevronLeft size={22} className="text-[#f8f7f4]" /></button>
        <h1 className="text-base font-bold text-[#f8f7f4]">Deposit USDT</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-5">
          {/* Step 1: Network */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-[#c8a06e] text-[#0d0d1a] text-[11px] font-bold flex items-center justify-center">1</span>
              <span className="text-sm font-bold text-[#f8f7f4]">Select Network</span>
            </div>
            <div className="space-y-2">
              {NETWORKS.map(n => (
                <button key={n.id} onClick={() => setNetwork(n.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    network === n.id
                      ? 'bg-[#c8a06e]/10 border-[#c8a06e]'
                      : 'bg-[#141420] border-[#262636] hover:border-[#3a3a4a]'
                  }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{n.icon}</span>
                      <div>
                        <p className={`text-[13px] font-bold ${network === n.id ? 'text-[#c8a06e]' : 'text-[#f8f7f4]'}`}>{n.label}</p>
                        <p className="text-[10px] text-[#6e6e7a]">{n.desc}</p>
                      </div>
                    </div>
                    {network === n.id && <div className="w-5 h-5 rounded-full bg-[#c8a06e] flex items-center justify-center"><CheckCircle size={12} className="text-[#0d0d1a]" /></div>}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Address */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-[#c8a06e] text-[#0d0d1a] text-[11px] font-bold flex items-center justify-center">2</span>
              <span className="text-sm font-bold text-[#f8f7f4]">Send USDT to This Address</span>
            </div>
            <div className="bg-[#141420] rounded-xl border border-[#262636] overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold text-[#9e9eaa] uppercase tracking-wider">{network.toUpperCase()} Address</span>
                  <button onClick={copyAddr} className="flex items-center gap-1 text-[11px] text-[#c8a06e] font-medium"><Copy size={12} /> Copy</button>
                </div>
                <div className="bg-[#0d0d1a] rounded-lg p-3">
                  <p className="text-[11px] text-[#f8f7f4] font-mono break-all leading-relaxed">{addr || 'Not configured yet'}</p>
                </div>
              </div>
              <div className="px-4 py-3 bg-[#1E1E32]/50 border-t border-[#262636] flex items-start gap-2">
                <AlertTriangle size={14} className="text-[#c8a06e] shrink-0 mt-0.5" />
                <p className="text-[10px] text-[#6e6e7a] leading-relaxed">
                  Only send <b className="text-[#f8f7f4]">USDT</b> on the <b className="text-[#f8f7f4]">{network.toUpperCase()}</b> network.
                  Sending other tokens or using the wrong network will result in permanent loss of funds.
                </p>
              </div>
            </div>
          </div>

          {/* Step 3: Submit */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-[#c8a06e] text-[#0d0d1a] text-[11px] font-bold flex items-center justify-center">3</span>
              <span className="text-sm font-bold text-[#f8f7f4]">Confirm Your Deposit</span>
            </div>
            <div className="bg-[#141420] rounded-xl border border-[#262636] p-4 space-y-3">
              <div>
                <label className="text-[10px] font-bold text-[#9e9eaa] uppercase tracking-wider block mb-1">Amount (USDT)</label>
                <div className="relative">
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
                    className="w-full px-4 py-3 bg-[#0d0d1a] border border-[#262636] rounded-lg text-lg font-bold text-[#f8f7f4] outline-none focus:border-[#c8a06e] placeholder:text-[#3a3a4a]" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#9e9eaa]">USDT</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#9e9eaa] uppercase tracking-wider block mb-1">Transaction Hash (TXID)</label>
                <input type="text" value={txHash} onChange={e => setTxHash(e.target.value)} placeholder="Paste your transaction hash here"
                  className="w-full px-4 py-3 bg-[#0d0d1a] border border-[#262636] rounded-lg text-[12px] text-[#f8f7f4] font-mono outline-none focus:border-[#c8a06e] placeholder:text-[#3a3a4a]" />
              </div>
              <button onClick={submit} disabled={submitting || !addr}
                className="w-full py-3.5 bg-[#c8a06e] text-[#0d0d1a] font-bold rounded-xl text-sm active:scale-[0.98] disabled:opacity-40 transition-all">
                {!addr ? 'Deposit address not configured' : submitting ? 'Submitting...' : 'Submit Deposit'}
              </button>
              <div className="flex items-center gap-1.5 justify-center">
                <Shield size={12} className="text-[#6e6e7a]" />
                <p className="text-[9px] text-[#6e6e7a]">Admin review required · Funds credited within 24h</p>
              </div>
            </div>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-[#9e9eaa] uppercase tracking-wider mb-3">Deposit History</p>
              <div className="bg-[#141420] rounded-xl border border-[#262636] divide-y divide-[#262636]">
                {history.map(d => (
                  <div key={d.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-[13px] font-bold text-[#f8f7f4]">${Number(d.amount).toFixed(2)}</p>
                      <p className="text-[10px] text-[#6e6e7a]">{d.network.toUpperCase()} · {new Date(d.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 ${
                      d.status === 'confirmed' ? 'bg-[#00c758]/15 text-[#00c758]' :
                      d.status === 'rejected' ? 'bg-[#fb2c36]/15 text-[#fb2c36]' :
                      'bg-[#c8a06e]/15 text-[#c8a06e]'
                    }`}>
                      {d.status === 'confirmed' ? <CheckCircle size={10} /> :
                       d.status === 'rejected' ? <XCircle size={10} /> : <Clock size={10} />}
                      {d.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}
