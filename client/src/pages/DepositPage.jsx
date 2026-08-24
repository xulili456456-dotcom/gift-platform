import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import toast from 'react-hot-toast';

const NETWORKS = [
  { id: 'trc20', name: 'TRC20', color: '#FF5000', desc: 'TRON Network · Low fee', emoji: '🔵' },
  { id: 'erc20', name: 'ERC20', color: '#8B5CF6', desc: 'Ethereum Network', emoji: '🟣' },
];

export default function DepositPage() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [network, setNetwork] = useState('trc20');
  const [amount, setAmount] = useState('');
  const [image, setImage] = useState('');
  const [deposits, setDeposits] = useState([]);
  const [addresses, setAddresses] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    client.get('/deposits/addresses').then(({data}) => setAddresses(data)).catch(()=>{});
    client.get('/deposits').then(({data}) => setDeposits(data||[])).catch(()=>{});
  }, []);

  const currentAddress = addresses[network] || '';
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };
  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 50) { toast.error('Minimum deposit is $50'); return; }
    if (!image) { toast.error('Please upload your transfer screenshot'); return; }
    setSubmitting(true);
    try {
      await client.post('/deposits', { network, amount: amt, image });
      toast.success('Deposit submitted for review');
      setAmount('');
      setImage('');
      const {data} = await client.get('/deposits');
      setDeposits(data||[]);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSubmitting(false); }
  };
  const copyAddress = () => { if (!currentAddress) return; navigator.clipboard.writeText(currentAddress); toast.success('Address copied'); };
  const contactSupport = () => document.dispatchEvent(new CustomEvent('showContactSupport'));

  return (
    <div style={{background:'#f2f2f7',minHeight:'100vh',maxWidth:430,margin:'0 auto',paddingBottom:80}}>
      <div style={{background:'#0f0f0f',padding:'8px 16px 12px',display:'flex',alignItems:'center',gap:12,color:'#fff'}}>
        <button onClick={() => navigate('/mine')} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#fff'}}>←</button>
        <span style={{fontSize:14,fontWeight:700}}>Deposit</span>
      </div>
      <div style={{padding:16}}>
        <div style={{background:'#FFF5F0',borderRadius:14,padding:14,marginBottom:14,fontSize:11,color:'#FF5000',display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:20}}>💡</span>
          <div>Deposits are reviewed manually. Submit and our team will credit your account within 24 hours.</div>
        </div>

        {/* STEP 1 */}
        <div style={{background:'#fff',borderRadius:20,padding:20,marginBottom:14}}>
          <div style={{fontSize:10,fontWeight:700,color:'#999',marginBottom:8,letterSpacing:1}}>STEP 1</div>
          <div style={{fontSize:14,fontWeight:700,color:'#0f0f0f',marginBottom:10}}>Choose Network</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {NETWORKS.map(n => (
              <div key={n.id} onClick={()=>setNetwork(n.id)}
                style={{display:'flex',alignItems:'center',padding:14,background:network===n.id?'#FFF5F0':'#f8f8f8',borderRadius:12,cursor:'pointer',border:network===n.id?'2px solid #FF5000':'2px solid transparent'}}>
                <span style={{fontSize:20,marginRight:10}}>{n.emoji}</span>
                <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{n.name}</div><div style={{fontSize:10,color:'#999'}}>{n.desc}</div></div>
                {network===n.id && <span style={{background:'#FF5000',color:'#fff',borderRadius:'50%',width:20,height:20,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>✓</span>}
              </div>
            ))}
          </div>
        </div>

        {/* STEP 2 */}
        <div style={{background:'#fff',borderRadius:20,padding:20,marginBottom:14}}>
          <div style={{fontSize:10,fontWeight:700,color:'#999',marginBottom:8,letterSpacing:1}}>STEP 2</div>
          <div style={{fontSize:14,fontWeight:700,color:'#0f0f0f',marginBottom:10}}>Send USDT to this Address</div>
          <div style={{background:'#f5f5f5',borderRadius:12,padding:14,textAlign:'center',marginBottom:12}}>
            <div style={{fontSize:10,color:'#999',marginBottom:4}}>{network.toUpperCase()} Deposit Address</div>
            <div style={{fontSize:13,fontWeight:600,color:'#0f0f0f',wordBreak:'break-all',marginBottom:8}}>{currentAddress || 'Contact support for address'}</div>
            {currentAddress && <button onClick={copyAddress} style={{padding:'6px 14px',background:'#FF5000',color:'#fff',border:'none',borderRadius:8,fontSize:11,fontWeight:600,cursor:'pointer'}}>Copy Address</button>}
          </div>
          <div style={{background:'#F0FAF4',borderRadius:10,padding:10,fontSize:10,color:'#00A86B',textAlign:'center',marginBottom:4}}>
            Need another network? <button onClick={contactSupport} style={{background:'#E8F5E9',color:'#00A86B',border:'1px solid #00A86B',borderRadius:8,padding:'4px 10px',fontSize:10,fontWeight:600,cursor:'pointer'}}>Contact Support</button>
          </div>
          <div style={{background:'#F0FAF4',borderRadius:10,padding:10,fontSize:10,color:'#00A86B',textAlign:'center',marginBottom:4}}>
            Want faster confirmation? <button onClick={contactSupport} style={{background:'#E8F5E9',color:'#00A86B',border:'1px solid #00A86B',borderRadius:8,padding:'4px 10px',fontSize:10,fontWeight:600,cursor:'pointer'}}>Contact Support</button>
          </div>
          <div style={{fontSize:10,color:'#999',textAlign:'center'}}>Send only USDT · Minimum $50 · Usually arrives in 10-30 min</div>
        </div>

        {/* STEP 3 */}
        <div style={{background:'#fff',borderRadius:20,padding:20,marginBottom:14}}>
          <div style={{fontSize:10,fontWeight:700,color:'#999',marginBottom:8,letterSpacing:1}}>STEP 3</div>
          <div style={{fontSize:14,fontWeight:700,color:'#0f0f0f',marginBottom:10}}>Submit Deposit Request</div>
          <div style={{fontSize:12,fontWeight:700,color:'#0f0f0f',marginBottom:4}}>Amount</div>
          <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Enter USDT amount" style={{width:'100%',padding:'12px 14px',background:'#f5f5f5',border:'none',borderRadius:12,fontSize:14,fontWeight:600,outline:'none',marginBottom:12}} />
          <div style={{fontSize:12,fontWeight:700,color:'#0f0f0f',marginBottom:4}}>Transfer Screenshot</div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{display:'none'}} />
          {image ? (
            <div style={{position:'relative',marginBottom:12}}>
              <img src={image} alt="proof" style={{width:'100%',borderRadius:12,border:'1px solid #eee',display:'block'}} />
              <button onClick={()=>setImage('')} style={{position:'absolute',top:8,right:8,background:'rgba(0,0,0,.6)',color:'#fff',border:'none',borderRadius:20,width:28,height:28,fontSize:14,cursor:'pointer',lineHeight:1}}>✕</button>
            </div>
          ) : (
            <button onClick={()=>fileRef.current?.click()} type="button" style={{width:'100%',padding:'16px',background:'#f8f8f8',border:'2px dashed #ddd',borderRadius:12,textAlign:'center',cursor:'pointer',marginBottom:12}}>
              <div style={{fontSize:28,marginBottom:4,opacity:.5}}>📸</div>
              <div style={{fontSize:12,fontWeight:600,color:'#666'}}>Upload Transfer Screenshot</div>
              <div style={{fontSize:10,color:'#bbb',marginTop:2}}>Show the transfer amount & destination address</div>
            </button>
          )}
          <button onClick={handleSubmit} disabled={submitting}
            style={{width:'100%',padding:14,background:'#00A86B',color:'#fff',border:'none',borderRadius:14,fontSize:15,fontWeight:700,cursor:'pointer',opacity:submitting?0.6:1}}>{submitting?'Submitting...':'Submit Deposit'}</button>
          <div style={{marginTop:12,padding:'10px 12px',background:'#f8f8f8',borderRadius:10,fontSize:10,color:'#999',lineHeight:1.5}}>
            <div style={{fontWeight:600,color:'#666',marginBottom:2}}>Important Notice</div>
            Send only USDT to the address above. Transfers to wrong addresses or wrong networks cannot be recovered. The platform is not responsible for any loss caused by incorrect transfers.
          </div>
        </div>

        {/* History */}
        {deposits.length > 0 && (
          <div style={{background:'#fff',borderRadius:20,padding:16,marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:700,color:'#0f0f0f',marginBottom:10}}>Deposit History</div>
            {deposits.slice(0,20).map(d => (
              <div key={d.id} style={{padding:'8px 0',borderBottom:'1px solid #f5f5f5',fontSize:11,cursor:'pointer'}} onClick={()=>setExpandedId(expandedId===d.id?null:d.id)}>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <div><div style={{fontWeight:600}}>${Number(d.amount||0).toFixed(2)}</div><div style={{color:'#999',fontSize:9}}>{d.network} · {String(d.created_at||'').slice(0,10)}</div></div>
                  <span style={{background:d.status==='confirmed'?'#E8F5E9':d.status==='rejected'?'#f5f5f5':'#FFF8E1',color:d.status==='confirmed'?'#00A86B':d.status==='rejected'?'#999':'#F59E0B',borderRadius:8,padding:'2px 8px',fontSize:10,fontWeight:600}}>{d.status==='confirmed'?'Confirmed':d.status==='rejected'?'Rejected':'Pending'}</span>
                </div>
                {expandedId===d.id && (
                  <div style={{marginTop:6,padding:8,background:'#f8f8f8',borderRadius:8,fontSize:10,color:'#666'}}>
                    <div>Network: {d.network?.toUpperCase()}</div>
                    <div>Amount: ${Number(d.amount||0).toFixed(2)}</div>
                    <div>Time: {new Date(d.created_at).toLocaleString()}</div>
                    {d.image && <img src={d.image} alt="proof" style={{width:'100%',borderRadius:8,marginTop:6,display:'block'}} />}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
