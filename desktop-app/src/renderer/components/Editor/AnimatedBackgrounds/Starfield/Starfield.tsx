import React from "react";
import type { AnimatedBackground } from "../../../../../server/types";

function Starfield({ config }: { config: AnimatedBackground }) {
  const c1  = config.color1 ?? '#ffffff';
  const c2  = config.color2 ?? '#93c5fd';
  const spd = config.speed  ?? 1;

  const stars = React.useMemo(() => {
    const arr = [];
    for (let i = 0; i < 120; i++) {
      arr.push({
        x:     `${(i * 13.7 + 7) % 100}%`,
        y:     `${(i * 7.3  + 3) % 100}%`,
        size:  i % 5 === 0 ? 3 : i % 3 === 0 ? 2 : 1,
        dur:   ((i % 5) + 1.5) / spd,
        delay: -(i % 7) * 0.4,
        color: i % 7 === 0 ? c2 : c1,
      });
    }
    return arr;
  }, [c1, c2, spd]);

  const shootingStars = React.useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => ({
      x:     `${(i * 20 + 5)}%`,
      delay: i * 3,
      dur:   (1.5 / spd).toFixed(1),
    }));
  }, [spd]);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden',
                  background: 'radial-gradient(ellipse at center, #0d1b4b 0%, #000005 100%)' }}>
      {stars.map((s, i) => (
        <div key={i} style={{
          position:        'absolute',
          left:            s.x,
          top:             s.y,
          width:           s.size,
          height:          s.size,
          borderRadius:    '50%',
          background:      s.color,
          boxShadow:       s.size > 1 ? `0 0 ${s.size * 2}px ${s.color}` : undefined,
          animation:       `star-twinkle ${s.dur.toFixed(1)}s ease-in-out infinite`,
          animationDelay:  `${s.delay}s`,
        }} />
      ))}
      {shootingStars.map((s, i) => (
        <div key={`shoot-${i}`} style={{
          position:        'absolute',
          left:            s.x,
          top:             `${i * 15 + 5}%`,
          width:           '120px',
          height:          '1px',
          background:      `linear-gradient(90deg, transparent, ${c1}, transparent)`,
          opacity:         0,
          transform:       'rotate(-35deg)',
          animation:       `snow-fall ${s.dur}s ease-in infinite`,
          animationDelay:  `${s.delay}s`,
        }} />
      ))}
    </div>
  );
}

export default Starfield;