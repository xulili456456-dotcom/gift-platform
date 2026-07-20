import { useState, useEffect } from 'react';
import client from '../api/client';
import { Star, Truck, Shield, RotateCcw } from 'lucide-react';

export default function BuyPage() {
  const params = new URLSearchParams(window.location.search);
  const pid = params.get('pid');
  const imgParam = params.get('img') || '';

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bought, setBought] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!pid) { setError('Invalid link'); setLoading(false); return; }
    const imgQuery = imgParam ? `&img=${encodeURIComponent(imgParam)}` : '';
    client.get(`/commissions/public-product/${pid}${imgQuery}`)
      .then(({ data }) => setProduct(data))
      .catch(() => setError('This product is no longer available'))
      .finally(() => setLoading(false));
  }, [pid]);

  const handleBuy = async () => {
    try {
      await client.post('/commissions/buy/' + pid);
      setBought(true);
    } catch (err) { setError('Purchase failed. This product may already be sold.'); }
  };

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center"><div className="w-8 h-8 border-3 border-[#FF9900] border-t-transparent rounded-full animate-spin" /></div>;
  if (error) return <div className="min-h-screen bg-white flex items-center justify-center px-4"><div className="text-center max-w-sm"><p className="text-5xl mb-4">😔</p><p className="text-[#565959] text-sm">{error}</p></div></div>;
  if (bought) return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-full bg-[#067D62]/10 flex items-center justify-center mx-auto mb-4"><span className="text-4xl">✅</span></div>
        <h1 className="text-xl font-bold text-[#0F1111] mb-2">Order Placed!</h1>
        <p className="text-[#067D62] font-bold text-lg">Thank you for your purchase</p>
        <p className="text-[#565959] text-sm mt-1">${product?.commission?.toFixed(2)} commission earned by the sharer</p>
        <p className="text-[#999] text-xs mt-4">Shared by {product?.sharerName || 'a friend'}</p>
      </div>
    </div>
  );

  const price = product.productPrice || 0;
  const listPrice = Math.round(price * 1.18 * 100) / 100;

  return (
    <div className="min-h-screen bg-white">
      {/* Amazon-style header */}
      <div className="bg-[#131921] text-white px-4 py-2 flex items-center gap-4">
        <span className="text-lg font-bold">Shopee</span>
        <span className="text-[11px] text-white/70">Shopping Operations</span>
      </div>

      <div className="max-w-lg mx-auto">
        {/* Product Image */}
        <div className="bg-[#f8f8f8] aspect-square flex items-center justify-center">
          <img src={product.productImg || `/products/${pid || 1}.jpg`} alt={product.productName}
            className="w-full h-full object-contain p-6" />
        </div>

        <div className="p-4">
          {/* Title */}
          <h1 className="text-base font-medium text-[#0F1111] leading-snug">{product.productName}</h1>

          {/* Rating */}
          <div className="flex items-center gap-1 mt-1.5">
            {[1,2,3,4,5].map(i => <Star key={i} size={13} fill="#F59E0B" stroke="#F59E0B" />)}
            <span className="text-xs text-[#007185] ml-1">4.3 (2,458 ratings)</span>
          </div>
          <p className="text-xs text-[#565959] mt-0.5">1K+ bought in past month</p>

          <div className="my-3 border-t border-[#e7e7e7]" />

          {/* Price */}
          <div className="bg-[#fefaf6] border border-[#f5d6b5] rounded-lg p-4">
            <div className="flex items-baseline gap-2">
              <span className="text-xs bg-[#CC0C39] text-white px-1.5 py-0.5 rounded font-bold">-18%</span>
              <span className="text-[28px] font-normal text-[#B12704]">${price.toFixed(2)}</span>
            </div>
            <p className="text-xs text-[#565959] mt-0.5">
              List Price: <span className="line-through">${listPrice.toFixed(2)}</span>
            </p>
            <p className="text-xs text-[#565959] mt-1">FREE delivery</p>
            <p className="text-xs text-[#067D62] font-bold mt-1">In Stock</p>
          </div>

          {/* Delivery info */}
          <div className="flex flex-col gap-2 mt-3 text-xs text-[#0F1111]">
            <div className="flex items-center gap-2"><Truck size={14} className="text-[#565959]" />Free delivery · Arrives within 5-7 business days</div>
            <div className="flex items-center gap-2"><Shield size={14} className="text-[#565959]" />30-day return policy</div>
            <div className="flex items-center gap-2"><RotateCcw size={14} className="text-[#565959]" />Secure transaction</div>
          </div>

          <div className="my-3 border-t border-[#e7e7e7]" />

          {/* Buy Button */}
          <button onClick={handleBuy}
            className="w-full py-3 bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] font-bold rounded-full text-base shadow-md active:scale-95 transition-all border border-[#FCD200]">
            Buy Now
          </button>
          <button onClick={handleBuy}
            className="w-full py-3 bg-[#FFA41C] hover:bg-[#FA8900] text-[#0F1111] font-bold rounded-full text-base mt-2 active:scale-95 transition-all">
            Add to Cart
          </button>

          <p className="text-[10px] text-[#565959] text-center mt-4">
            Shared by {product.sharerName || 'a friend'} · Secure transaction
          </p>
        </div>
      </div>
    </div>
  );
}
