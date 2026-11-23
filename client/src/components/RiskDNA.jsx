const axes = [
  ["rankIntegrity", "Rank Integrity"],
  ["documentValidity", "Document Validity"],
  ["timingPattern", "Timing Pattern"],
  ["quotaCompliance", "Quota Compliance"],
  ["scoreConsistency", "Score Consistency"],
  ["overrideHistory", "Override History"],
  ["networkConnections", "Network Connections"],
  ["historicalPattern", "Historical Pattern"]
];

const RiskDNA = ({ risk = {} }) => {
  const dims = risk.dimensions || {};
  const cx = 210;
  const cy = 210;
  const radius = 145;

  const points = axes.map(([key], i) => {
    const angle = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
    const normalized = Math.max(0, Math.min(1, Number(dims[key] || 0) / 100));
    const x = cx + Math.cos(angle) * radius * normalized;
    const y = cy + Math.sin(angle) * radius * normalized;
    return { x, y, angle, value: normalized };
  });

  const polyPoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="surface">
      <div className="surface-head">
        <h3>Risk DNA Radar</h3>
        <span className="badge high">Final {risk.finalScore || 0}</span>
      </div>
      <svg viewBox="0 0 420 420" style={{ width: "100%", maxHeight: 390 }}>
        {[0.25, 0.5, 0.75, 1].map((tick) => (
          <circle
            key={tick}
            cx={cx}
            cy={cy}
            r={radius * tick}
            fill="none"
            stroke="#3a4d6b"
            strokeWidth="1.4"
          />
        ))}

        {axes.map(([_, label], i) => {
          const angle = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
          const x2 = cx + Math.cos(angle) * radius;
          const y2 = cy + Math.sin(angle) * radius;
          const lx = cx + Math.cos(angle) * (radius + 24);
          const ly = cy + Math.sin(angle) * (radius + 24);

          return (
            <g key={label}>
              <line x1={cx} y1={cy} x2={x2} y2={y2} stroke="#3a4d6b" strokeWidth="1.2" />
              <text x={lx} y={ly} fill="#e5eefb" fontSize="11" fontWeight="600" textAnchor="middle">
                {label}
              </text>
            </g>
          );
        })}

        <polygon points={polyPoints} fill="rgba(230,57,70,0.28)" stroke="#E63946" strokeWidth="2.6" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#ffd0d4" />
        ))}
      </svg>
    </div>
  );
};

export default RiskDNA;
