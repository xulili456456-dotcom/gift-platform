export default function EmptyState({ icon = '📭', title = 'No data', desc = '', action = null }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      <span className="text-5xl mb-4 opacity-50">{icon}</span>
      <p className="text-[15px] font-semibold text-text mb-1">{title}</p>
      {desc && <p className="text-[13px] text-text-muted max-w-[240px] leading-relaxed">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
