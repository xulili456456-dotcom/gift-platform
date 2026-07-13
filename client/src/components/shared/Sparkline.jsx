// Simple SVG sparkline chart
export default function Sparkline({ data = [], width = 160, height = 48, color = '#E8225A', area = false }) {
  if (data.length < 2 || data.every(v => v === 0)) {
    return <div style={{ width, height }} />;
  }

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (width - 4) + 2;
    const y = height - 4 - ((v - min) / range) * (height - 8);
    return `${x},${y}`;
  });

  const linePath = `M${points.join(' L')}`;
  const areaPath = area
    ? `${linePath} L${width - 2},${height - 2} L2,${height - 2} Z`
    : null;

  return (
    <svg width={width} height={height} className="shrink-0">
      {area && (
        <path d={areaPath} fill={color} fillOpacity="0.1" />
      )}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last point dot */}
      <circle
        cx={points[points.length - 1].split(',')[0]}
        cy={points[points.length - 1].split(',')[1]}
        r="3"
        fill={color}
      />
    </svg>
  );
}
