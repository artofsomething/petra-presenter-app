import type { AnimatedBackground } from "../../../../../server/types";
function NeonPulse({ config }: { config: AnimatedBackground }) {
  const bg = config.backgroundColor??'#050010';
  const c1  = config.color1 ?? '#f0abfc';
  const c2  = config.color2 ?? '#818cf8';
  const c3  = config.color3 ?? '#34d399';
  const spd = config.speed  ?? 1;

  const rings = [
    { size: '90%',  dur: 3.0, delay: 0,    color: c1 },
    { size: '70%',  dur: 4.0, delay: -1,   color: c2 },
    { size: '50%',  dur: 2.5, delay: -0.5, color: c3 },
    { size: '30%',  dur: 3.5, delay: -1.5, color: c1 },
  ];

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden',
                  background: bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        position:     'absolute',
        width: '110%', height: '110%',
        borderRadius: '50%',
        border:       `2px solid ${c1}44`,
        animation:    `neon-rotate ${(20 / spd).toFixed(1)}s linear infinite`,
      }} />
      {rings.map((r, i) => (
        <div key={i} style={{
          position:        'absolute',
          width:           r.size,
          height:          r.size,
          borderRadius:    '50%',
          background:      `radial-gradient(circle, ${r.color}33 0%, transparent 70%)`,
          boxShadow:       `0 0 60px ${r.color}44, inset 0 0 60px ${r.color}22`,
          animation:       `neon-pulse-${(i % 2) + 1} ${(r.dur / spd).toFixed(1)}s ease-in-out infinite`,
          animationDelay:  `${r.delay}s`,
        }} />
      ))}
      <div style={{
        position:     'absolute',
        width:        '15%', height: '15%',
        borderRadius: '50%',
        background:   `radial-gradient(circle, ${c1}cc 0%, ${c2}44 50%, transparent 100%)`,
        filter:       'blur(8px)',
        animation:    `neon-pulse-1 ${(2 / spd).toFixed(1)}s ease-in-out infinite`,
      }} />
    </div>
  );
}

export default NeonPulse