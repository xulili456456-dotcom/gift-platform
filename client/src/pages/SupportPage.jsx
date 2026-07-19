import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Send } from 'lucide-react';

const FAQ_DB = [
  { q: ['invite','邀请','invitar','招待','共有'], aKey: 'messages.faq1a' },
  { q: ['withdraw','提现','retirar','出金','提取','effective','有效'], aKey: 'messages.faq2a' },
  { q: ['kyc','identity','verification','认证','实名','本人確認'], aKey: 'messages.faq3a' },
  { q: ['commission','earn','佣金','comisión','報酬','收益'], aKey: 'messages.faq1a' },
  { q: ['review','how long','审核','pendiente','審査','時間'], aKey: 'messages.faq1a' },
  { q: ['wallet','bind','钱包','billetera','ウォレット','アドレス'], aKey: 'messages.faq4a' },
  { q: ['password','pass','contraseña','パスワード','セキュリティ','security'], aKey: 'messages.faq2a' },
  { q: ['stake','staking','质押','bloquear','ステーキング'], aKey: 'messages.faq2a' },
  { q: ['task','任务','tarea','タスク','trade','购物'], aKey: 'messages.faq1a' },
  { q: ['vip','member','会员','miembro','メンバー','ランク','等级'], aKey: 'messages.faq1a' },
  { q: ['claim','领取','怎么领','拿钱','reward','recibir','reclamar','受取'], aKey: 'messages.faq3a' },
  { q: ['ban','cheat','违规','作弊','封号','fraud','trampa','不正','禁止'], aKey: 'messages.faq3a' },
];

const QUICK_QUESTIONS = [
  'support.q1', 'support.q2', 'support.q3', 'support.q4',
  'support.q5', 'support.q6', 'support.q7', 'support.q8',
];

export default function SupportPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
    let best = null, bestScore = 0;
    for (const faq of FAQ_DB) {
      for (const keyword of faq.q) {
        if (q.includes(keyword.toLowerCase())) {
          if (keyword.length > bestScore) { bestScore = keyword.length; best = faq; }
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
      const answer = findAnswer(q) || ('I\'m not sure about that. Please try rephrasing your question, or contact our support team on Telegram: @Shopping_Operations for direct assistance.');
      setMessages(m => m.slice(-40).concat({ from: 'bot', text: answer, time: new Date() }));
      setTyping(false);
    }, 600 + Math.random() * 800);
  };

  return (
    <div style={{background:'#f2f2f7',height:'100vh',maxWidth:430,margin:'0 auto',display:'flex',flexDirection:'column'}}>
      {/* Header */}
      <div style={{background:'#0f0f0f',padding:'10px 16px 12px',display:'flex',alignItems:'center',gap:12,color:'#fff',flexShrink:0}}>
        <button onClick={() => navigate('/mine')} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#fff'}}>←</button>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:36,height:36,borderRadius:18,background:'#FF5000',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🤖</div>
          <div>
            <div style={{fontSize:14,fontWeight:700}}>{t('support.title')}</div>
            <div style={{fontSize:10,color:'#aaa'}}>{t('support.online')}</div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{flex:1,overflowY:'auto',padding:16,display:'flex',flexDirection:'column',gap:14}}>
        {messages.map((msg, i) => (
          <div key={i} style={{display:'flex',gap:8,alignItems:'flex-end',flexDirection: msg.from === 'bot' ? 'row' : 'row-reverse'}}>
            <div style={msg.from === 'bot'
              ? {width:28,height:28,borderRadius:14,background:'#f0f0f0',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:14}
              : {width:28,height:28,borderRadius:14,background:'#FF5000',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:12,color:'#fff'}}>
              {msg.from === 'bot' ? '🤖' : '👤'}
            </div>
            <div style={msg.from === 'bot'
              ? {maxWidth:'75%',background:'#fff',borderRadius:'16px 16px 16px 4px',padding:'12px 14px',fontSize:12,color:'#333',lineHeight:1.5,boxShadow:'0 1px 3px rgba(0,0,0,.04)'}
              : {maxWidth:'75%',background:'#FF5000',borderRadius:'16px 16px 4px 16px',padding:'12px 14px',fontSize:12,color:'#fff',lineHeight:1.5}}>
              {msg.text}
            </div>
          </div>
        ))}
        {typing && (
          <div style={{display:'flex',gap:8,alignItems:'flex-end'}}>
            <div style={{width:28,height:28,borderRadius:14,background:'#f0f0f0',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:14}}>🤖</div>
            <div style={{background:'#fff',borderRadius:'16px 16px 16px 4px',padding:'12px 16px',display:'flex',gap:4,boxShadow:'0 1px 3px rgba(0,0,0,.04)'}}>
              <div className="typing-dot" style={{width:7,height:7,borderRadius:'50%',background:'#ccc',animation:'bounce 1.4s infinite ease-in-out',animationDelay:'0s'}} />
              <div className="typing-dot" style={{width:7,height:7,borderRadius:'50%',background:'#ccc',animation:'bounce 1.4s infinite ease-in-out',animationDelay:'0.2s'}} />
              <div className="typing-dot" style={{width:7,height:7,borderRadius:'50%',background:'#ccc',animation:'bounce 1.4s infinite ease-in-out',animationDelay:'0.4s'}} />
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Quick Questions */}
      <div style={{padding:'8px 16px',display:'flex',gap:6,overflowX:'auto',flexShrink:0}}>
        {QUICK_QUESTIONS.map((q, i) => (
          <button key={i} onClick={() => send(t(q))} style={{
            padding:'8px 14px',background:'#fff',border:'1px solid #eee',borderRadius:20,fontSize:11,color:'#666',
            whiteSpace:'nowrap',cursor:'pointer',flexShrink:0
          }}>{t(q)}</button>
        ))}
      </div>

      {/* Input */}
      <div style={{padding:'10px 16px 14px',background:'#fff',borderTop:'1px solid #f0f0f0',display:'flex',gap:8,flexShrink:0}}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={t('support.placeholder')}
          style={{flex:1,padding:'10px 14px',background:'#f5f5f5',border:'none',borderRadius:24,fontSize:13,outline:'none',color:'#333'}} />
        <button onClick={() => send()} style={{width:40,height:40,borderRadius:20,background:'#FF5000',border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}>
          <Send size={16} color="#fff" />
        </button>
      </div>

      {/* Keyframes for dot animation */}
      <style>{`@keyframes bounce{0%,80%,100%{transform:scale(.6)}40%{transform:scale(1)}}`}</style>
    </div>
  );
}
