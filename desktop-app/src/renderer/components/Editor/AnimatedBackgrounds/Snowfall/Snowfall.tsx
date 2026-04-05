import React from "react";
import type { AnimatedBackground } from "../../../../../server/types";

function Snowfall({ config }: { config: AnimatedBackground }) {
  const c1  = config.color1 ?? '#ffffff';
  const c2  = config.color2 ?? '#bfdbfe';
  const spd = config.speed  ?? 1;

  const flakes = React.useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => ({
      size:    i % 7 === 0 ? 8 : i % 3 === 0 ? 5 : 3,
      x:       `${(i * 1.667) % 100}%`,
      dur:     (8 + (i % 7) * 2) / spd,
      delay:   -(i % 10) * 1.5,
      opacity: 0.4 + (i % 5) * 0.12,
      color:   i % 5 === 0 ? c2 : c1,
      blur:    i % 4 === 0 ? 1 : 0,
    }));
  }, [c1, c2, spd]);

  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      background: `linear-gradient(180deg, #0a1628 0%, #162040 50%, #0a0f1e 100%)`,
    }}>
      <div style={{
        position:     'absolute',
        top: '20%',   left: '30%',
        width: '40%', height: '40%',
        borderRadius: '50%',
        background:   `radial-gradient(circle, ${c2}11 0%, transparent 70%)`,
        filter:       'blur(40px)',
      }} />
      {flakes.map((f, i) => (
        <div key={i} style={{
          position:        'absolute',
          top:             '-10px',
          left:            f.x,
          width:           f.size,
          height:          f.size,
          borderRadius:    '50%',
          background:      f.color,
          opacity:         f.opacity,
          filter:          f.blur ? `blur(${f.blur}px)` : undefined,
          boxShadow:       f.size > 4 ? `0 0 ${f.size}px ${f.color}88` : undefined,
          animation:       `snow-fall ${f.dur.toFixed(1)}s linear infinite`,
          animationDelay:  `${f.delay}s`,
        }} />
      ))}
    </div>
  );
}

export default Snowfall;