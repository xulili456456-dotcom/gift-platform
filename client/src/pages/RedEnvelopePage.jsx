import RedEnvelopeModal from './RedEnvelopeModal';

export default function RedEnvelopePage() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(4px)' }}>
      <RedEnvelopeModal onClose={() => window.history.back()} />
    </div>
  );
}
