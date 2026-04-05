import React from 'react';
import type { AnimatedBackground } from '../../../../../server/types';

function Bubbles({ config }: { config: AnimatedBackground }) {
  const bg1 = config.backgroundColor  ?? '#020b18';
  const bg2 = config.backgroundColor2 ?? '#0f1b35';
  const c1  = config.color1           ?? '#3b82f6';
  const c2  = config.color2           ?? '#8b5cf6';
  const c3  = config.color3           ?? '#06b6d4';
  const spd = config.speed            ?? 1;

  const bubbles = React.useMemo(() => {
    const colors = [c1, c2, c3];
    return Array.from({ length: 18 }, (_, i) => ({
      size:  20 + (i * 11) % 60,
      x:     `${(i * 17 + 5) % 95}%`,
      dur:   (6 + (i % 5) * 2) / spd,        // rise duration
      wob:   (3 + (i % 3) * 1.5) / spd,      // ✅ wobble duration
      delay: -(i % 8) * 1.2,
      color: colors[i % 3],
    }));
  }, [c1, c2, c3, spd]);

  return (
    <div style={{
      position:   'absolute',
      inset:       0,
      overflow:   'hidden',
      background: `linear-gradient(180deg, ${bg1} 0%, ${bg2} 100%)`,
    }}>
      {bubbles.map((b, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            bottom:   '-80px',
            left:      b.x,
            width:     b.size,
            height:    b.size,

            // ✅ two animations running simultaneously
            animation: [
              `bubble-rise   ${b.dur.toFixed(1)}s ease-in  infinite ${b.delay}s`,
              `bubble-wobble ${b.wob.toFixed(1)}s ease-in-out infinite ${b.delay}s`,
            ].join(', '),

            // styles
            borderRadius: '50%',
            border:       `2px solid ${b.color}88`,
            background:   `radial-gradient(circle at 35% 35%, ${b.color}55, transparent 60%)`,
            boxShadow:    `inset 0 0 10px ${b.color}33, 0 0 20px ${b.color}22`,
          }}
        >
          {/* ✅ inner glare dot — makes it look like a real bubble */}
          <div style={{
            position:     'absolute',
            top:           '18%',
            left:          '22%',
            width:         '28%',
            height:        '20%',
            borderRadius: '50%',
            background:   'rgba(255,255,255,0.35)',
            filter:       'blur(1px)',
          }} />
        </div>
      ))}
    </div>
  );
}

export default Bubbles;