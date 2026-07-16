import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Send, Bot, User, Sparkles } from 'lucide-react';

const FAQ_DB = [
  { q: ['如何邀请','怎么邀请','邀请方式','邀请链接','分享链接','复制链接','二维码','invite','share','referral','link','copy','qr','invitar','compartir','招待','共有','リンク'], aKey: 'messages.faq1a' },
  { q: ['有效邀请','怎么算','计算方式','权重','有效人数','effective','calculate','formula','weight','calcular','efectivo','有効','計算'], aKey: 'messages.faq2a' },
  { q: ['领取','怎么领','提现','怎么提','到账','奖励发放','拿钱','怎么拿','claim','withdraw','receive','reward','recibir','reclamar','受取','受け取り','出金'], aKey: 'messages.faq3a' },
  { q: ['钱包','绑定钱包','加密钱包','USDT','地址','网络','TRC20','ERC20','BEP20','wallet','crypto','address','network','bind','billetera','vincular','ウォレット','アドレス'], aKey: 'messages.faq4a' },
  { q: ['审核','审核多久','review','approve','how long','pendiente','revisión','審査','時間'], aKey: 'messages.faq1a' },
  { q: ['密码','改密码','修改密码','忘记密码','安全','password','security','change','reset','contraseña','seguridad','パスワード','セキュリティ'], aKey: 'messages.faq2a' },
  { q: ['实名','认证','KYC','identity','verification','document','verificación','identidad','本人確認','認証'], aKey: 'messages.faq3a' },
  { q: ['会员','等级','VIP','member','tier','level','gold','diamond','silver','platinum','miembro','nivel','メンバー','ランク'], aKey: 'messages.faq1a' },
  { q: ['保证金','锁仓','staking','质押','stake','deposit','lock','plan','bloquear','ステーキング','ロック'], aKey: 'messages.faq2a' },
  { q: ['违规','封号','作弊','ban','cheat','script','violation','fraud','trampa','不正','禁止','違反'], aKey: 'messages.faq3a' },
];

const QUICK_QUESTIONS = [
  'support.q1', 'support.q2', 'support.q3', 'support.q4',
  'support.q5', 'support.q6', 'support.q7', 'support.q8',
];

export default function SupportPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  useEffect(() => { setTimeout(() => setReady(true), 200); }, []);
  const [messages, setMessages] = useState(() => {
    try { const saved = sessionStorage.getItem('chat_messages'); return saved ? JSON.parse(saved) : [{ from: 'bot', text: t('support.welcome'), time: new Date() }]; }
    catch { return [{ from: 'bot', text: t('support.welcome'), time: new Date() }]; }
  });
  useEffect(() => { sessionStorage.setItem('chat_messages', JSON.stringify(messages)); }, [messages]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const findAnswer = (query) => {
    const q = query.toLowerCase();
    let best = null;
    let bestScore = 0;
    for (const faq of FAQ_DB) {
      for (const keyword of faq.q) {
        if (q.includes(keyword.toLowerCase())) {
          const score = keyword.length;
          if (score > bestScore) { bestScore = score; best = faq; }
        }
      }
    }
    return best ? t(best.aKey) : null;
  };

  const send = (text) => {
    const q = text || input.trim();
    if (!q) return;
    setMessages(m => [...m, { from: 'user', text: q, time: new Date() }]);
    setInput('');
    setTyping(true);

    setTimeout(() => {
      const answer = findAnswer(q) || t('support.notFound');
      setMessages(m => m.slice(-50).concat({ from: 'bot', text: answer, time: new Date() }));
      setTyping(false);
    }, 600 + Math.random() * 800);
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col animate-fade-in" style={{ paddingBottom: '100px' }}>
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-separator">
        <button onClick={() => navigate('/mine')} className="flex items-center gap-1 text-primary font-medium text-sm pr-2 py-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
          {t('common.back')}
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot size={18} className="text-primary" />
          </div>
          <div>
            <h2 className="text-[14px] font-bold text-text">{t('support.title')}</h2>
            <p className="text-[10px] text-text-muted">{t('support.online')}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.from === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
              msg.from === 'bot' ? 'bg-primary/10' : 'bg-primary'
            }`}>
              {msg.from === 'bot'
                ? <Bot size={14} className="text-primary" />
                : <User size={14} className="text-white" />
              }
            </div>
            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
              msg.from === 'bot'
                ? 'bg-white border border-separator text-text'
                : 'bg-primary text-white'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot size={14} className="text-primary" />
            </div>
            <div className="bg-white border border-separator rounded-2xl px-4 py-3 flex gap-1.5">
              <span className="w-2 h-2 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '0s' }} />
              <span className="w-2 h-2 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '0.2s' }} />
              <span className="w-2 h-2 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Quick Questions */}
      <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-none">
        {QUICK_QUESTIONS.map((q, i) => (
          <button key={i} onClick={() => send(t(q))}
            className="shrink-0 px-3 py-1.5 bg-white border border-separator rounded-full text-[11px] text-text-secondary active:bg-bg transition-colors whitespace-nowrap">
            {t(q)}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-white border-t border-separator flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={t('support.placeholder')}
          className="flex-1 px-4 py-2.5 rounded-xl border border-separator bg-bg text-[13px] focus:outline-none focus:border-primary" />
        <button onClick={() => send()}
          className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center active:scale-95 transition-transform">
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
