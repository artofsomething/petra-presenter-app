import React from "react";
import type { AnimatedBackground } from "../../../../../server/types";

function Galaxy({ config }: { config: AnimatedBackground }) {
  const c1  = config.color1 ?? '#818cf8';
  const c2  = config.color2 ?? '#f472b6';
  const c3  = config.color3 ?? '#fde68a';
  const spd = config.speed  ?? 1;

  // Spiral arm stars
  const stars = React.useMemo(() => {
    const arr = [];
    for (let i = 0; i < 200; i++) {
      const arm    = i % 3;
      const angle  = (i / 15) + (arm * Math.PI * 2 / 3);
      const radius = 5 + (i % 45) * 1.1;
      const spread = (Math.random() - 0.5) * 18;
      arr.push({
        angle,
        radius,
        spread,
        size:   i % 10 === 0 ? 3 : i % 4 === 0 ? 2 : 1,
        color:  arm === 0 ? c1 : arm === 1 ? c2 : c3,
        dur:    (1.5 + (i % 5) * 0.6) / spd,
        delay:  -(i % 9) * 0.3,
        opacity: 0.3 + (i % 7) * 0.1,
      });
    }
    return arr;
  }, [c1, c2, c3, spd]);

  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      background: 'radial-gradient(ellipse at center, #06010f 0%, #000 100%)',
    }}>
      {/* Central core */}
      <div style={{
        position:     'absolute',
        top: '50%',   left: '50%',
        width:        '120px', height: '120px',
        transform:    'translate(-50%, -50%)',
        borderRadius: '50%',
        background:   `radial-gradient(circle, ${c3}ff 0%, ${c1}88 30%, ${c2}33 60%, transparent 100%)`,
        filter:       'blur(8px)',
        animation:    `neon-pulse-1 ${(3 / spd).toFixed(1)}s ease-in-out infinite`,
      }} />
      {/* Rotating spiral container */}
      <div style={{
        position:  'absolute',
        top:       '50%',
        left:      '50%',
        width:     '100%',
        height:    '100%',
        animation: `galaxy-rotate ${(40 / spd).toFixed(1)}s linear infinite`,
      }}>
        {stars.map((s, i) => {
          const x = Math.cos(s.angle) * (s.radius + s.spread);
          const y = Math.sin(s.angle) * (s.radius + s.spread) * 0.4;
          return (
            <div key={i} style={{
              position:        'absolute',
              left:            `calc(50% + ${x}%)`,
              top:             `calc(50% + ${y}%)`,
              width:           s.size,
              height:          s.size,
              borderRadius:    '50%',
              background:      s.color,
              opacity:         s.opacity,
              boxShadow:       s.size > 1 ? `0 0 ${s.size * 3}px ${s.color}` : undefined,
              animation:       `star-twinkle ${s.dur.toFixed(1)}s ease-in-out infinite`,
              animationDelay:  `${s.delay}s`,
            }} />
          );
        })}
      </div>
      {/* Dust cloud overlay */}
      <div style={{
        position:     'absolute',
        top: '50%',   left: '50%',
        width:        '80%', height: '40%',
        transform:    'translate(-50%, -50%) rotate(-15deg)',
        borderRadius: '50%',
        background:   `radial-gradient(ellipse, ${c1}18 0%, ${c2}0a 50%, transparent 100%)`,
        filter:       'blur(20px)',
        animation:    `galaxy-rotate ${(60 / spd).toFixed(1)}s linear infinite`,
      }} />
    </div>
  );
}

export default Galaxy;