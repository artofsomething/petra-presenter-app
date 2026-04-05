import React from "react";
import type { AnimatedBackground } from "../../../../../server/types";

function Confetti({ config }: { config: AnimatedBackground }) {
  const c1  = config.color1 ?? '#f43f5e';
  const c2  = config.color2 ?? '#facc15';
  const c3  = config.color3 ?? '#22d3ee';
  const spd = config.speed  ?? 1;

  const pieces = React.useMemo(() => {
    const colors  = [c1, c2, c3, '#a78bfa', '#34d399', '#fb923c'];
    const shapes  = ['rect', 'circle', 'strip'] as const;
    return Array.from({ length: 70 }, (_, i) => ({
      x:       `${(i * 1.43) % 100}%`,
      size:    6 + (i % 5) * 3,
      color:   colors[i % colors.length],
      shape:   shapes[i % shapes.length],
      dur:     (5 + (i % 8) * 1.2) / spd,
      delay:   -(i % 12) * 0.7,
      opacity: 0.7 + (i % 4) * 0.075,
    }));
  }, [c1, c2, c3, spd]);

  return (
    <div style={{
      position:   'absolute', inset: 0, overflow: 'hidden',
      background: 'linear-gradient(135deg, #0f0c29 0%, #1a1a2e 50%, #16213e 100%)',
    }}>
      {pieces.map((p, i) => (
        <div key={i} style={{
          position:        'absolute',
          top:             '-20px',
          left:            p.x,
          width:           p.shape === 'strip' ? p.size * 0.4 : p.size,
          height:          p.shape === 'strip' ? p.size * 2.5  : p.size,
          borderRadius:    p.shape === 'circle' ? '50%' : '2px',
          background:      p.color,
          opacity:         p.opacity,
          animation:       [
            `confetti-fall ${p.dur.toFixed(1)}s ease-in infinite`,
            `confetti-sway ${(p.dur * 0.6).toFixed(1)}s ease-in-out infinite`,
          ].join(', '),
          animationDelay:  `${p.delay}s`,
        }} />
      ))}
    </div>
  );
}

export default Confetti;