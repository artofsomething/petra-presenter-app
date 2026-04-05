import React from "react";
import type { AnimatedBackground } from "../../../../../server/types";

function Vortex({ config }: { config: AnimatedBackground }) {
  const c1  = config.color1 ?? '#6366f1';
  const c2  = config.color2 ?? '#ec4899';
  const c3  = config.color3 ?? '#06b6d4';
  const bg1 = config.backgroundColor ?? '#0a0014';
  const bg2 = config.backgroundColor2 ?? '#000';
  const spd = config.speed  ?? 1;

  const rings = React.useMemo(() => [
    { size: '95%',  border: 3, color: c1, dur: 8,  ccw: false, delay: 0    },
    { size: '82%',  border: 2, color: c2, dur: 6,  ccw: true,  delay: -1   },
    { size: '68%',  border: 3, color: c3, dur: 5,  ccw: false, delay: -0.5 },
    { size: '54%',  border: 2, color: c1, dur: 4,  ccw: true,  delay: -2   },
    { size: '40%',  border: 3, color: c2, dur: 3,  ccw: false, delay: -1.5 },
    { size: '27%',  border: 2, color: c3, dur: 2.5,ccw: true,  delay: -0.8 },
    { size: '15%',  border: 3, color: c1, dur: 2,  ccw: false, delay: -0.3 },
  ], [c1, c2, c3]);

  // Spiral particles
  const particles = React.useMemo(() => {
    return Array.from({ length: 40 }, (_, i) => {
      const radius = 8 + (i % 8) * 6;
      return {
        radius,
        dur:   (3 + (i % 5)) / spd,
        delay: -(i * 0.4),
        color: i % 3 === 0 ? c1 : i % 3 === 1 ? c2 : c3,
        size:  i % 4 === 0 ? 4 : 2,
      };
    });
  }, [c1, c2, c3, spd]);

  return (
    <div style={{
      position:   'absolute', inset: 0, overflow: 'hidden',
      background: `radial-gradient(ellipse at center, ${bg1} 0%, ${bg2} 100%)`,
      display:    'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Rings */}
      {rings.map((r, i) => (
        <div key={i} style={{
          position:        'absolute',
          top:             '50%', left: '50%',
          width:           r.size, height: r.size,
          borderRadius:    '50%',
          border:          `${r.border}px solid ${r.color}66`,
          boxShadow:       `0 0 15px ${r.color}44, inset 0 0 15px ${r.color}22`,
          animation:       `${r.ccw ? 'vortex-ring-ccw' : 'vortex-ring'} ${(r.dur / spd).toFixed(1)}s linear infinite`,
          animationDelay:  `${r.delay}s`,
        }} />
      ))}

      {/* Orbiting particles */}
      {particles.map((p, i) => (
        <div key={`vp-${i}`} style={{
          position:        'absolute',
          top:             '50%', left: '50%',
          width:           p.size, height: p.size,
          borderRadius:    '50%',
          background:      p.color,
          boxShadow:       `0 0 ${p.size * 3}px ${p.color}`,
          // Custom property for orbit radius
          ['--vr' as string]: `${p.radius}%`,
          animation:       `vortex-particle ${p.dur.toFixed(1)}s linear infinite`,
          animationDelay:  `${p.delay}s`,
        }} />
      ))}

      {/* Core */}
      <div style={{
        position:     'absolute',
        top: '50%', left: '50%',
        width:        '60px', height: '60px',
        borderRadius: '50%',
        background:   `radial-gradient(circle, #fff 0%, ${c1} 30%, ${c2}88 60%, transparent 100%)`,
        filter:       'blur(4px)',
        animation:    `vortex-core-pulse ${(1.5 / spd).toFixed(1)}s ease-in-out infinite`,
      }} />
    </div>
  );
}

export default Vortex;