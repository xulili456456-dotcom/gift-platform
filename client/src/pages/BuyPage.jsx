import { useState, useEffect } from 'react';
import client from '../api/client';

export default function BuyPage() {
  const params = new URLSearchParams(window.location.search);
  const pid = params.get('pid');
  const ref = params.get('ref');

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bought, setBought] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!pid) { setError('Invalid link'); setLoading(false); return; }
    client.get('/commissions/public-product/' + pid)
      .then(({ data }) => setProduct(data))
      .catch(() => setError('Product no longer available'))
      .finally(() => setLoading(false));
  }, [pid]);

  const handleBuy = async () => {
    try {
      await client.post('/commissions/buy/' + pid);
      setBought(true);
    } catch (err) { setError('Purchase failed. Product may already be sold.'); }
  };

  if (loading) return <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center"><div className="w-8 h-8 border-3 border-[#c8a06e] border-t-transparent rounded-full animate-spin" /></div>;
  if (error) return <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center px-4"><div className="text-center"><p className="text-4xl mb-4">😔</p><p className="text-[#9e9eaa]">{error}</p></div></div>;
  if (bought) return (
    <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-full bg-[#00c758]/20 flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">🎉</span>
        </div>
        <h1 className="text-2xl font-bold text-[#f8f7f4] mb-2">Purchase Complete!</h1>
        <p className="text-[#9e9eaa] text-sm">${product?.commission?.toFixed(2)} commission credited to the sharer.</p>
        <p className="text-[#6e6e7a] text-xs mt-4">Shared by {product?.sharerName || 'a user'}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0d0d1a] flex flex-col items-center justify-center px-4">
      <div className="bg-[#141420] rounded-2xl border border-[#262636] p-6 w-full max-w-sm text-center">
        <div className="text-5xl mb-4">🛍️</div>
        <h1 className="text-xl font-bold text-[#f8f7f4] mb-1">{product.productName}</h1>
        <p className="text-3xl font-black text-[#e0c78e] my-3">${product.productPrice?.toFixed(2)}</p>
        <p className="text-[11px] text-[#6e6e7a] mb-5">Shared by {product.sharerName || 'someone'}</p>
        <button onClick={handleBuy}
          className="w-full py-3.5 bg-gradient-to-r from-[#c8a06e] to-[#a07840] text-[#0d0d1a] font-bold rounded-xl text-sm active:scale-95 transition-all">
          Buy Now
        </button>
        <p className="text-[9px] text-[#6e6e7a] mt-3">This is a simulated purchase for demo purposes</p>
      </div>
    </div>
  );
}
