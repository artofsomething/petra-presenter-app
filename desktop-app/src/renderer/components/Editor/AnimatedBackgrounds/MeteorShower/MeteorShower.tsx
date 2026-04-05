// src/renderer/components/Editor/AnimatedBackgrounds/MeteorShower/MeteorShower.tsx
import React from 'react';
import type { AnimatedBackground } from '../../../../../server/types';

function MeteorShower({ config }: { config: AnimatedBackground }) {
  const bg = config.backgroundColor  ?? '#020817';
  const c1 = config.color1           ?? '#ffffff';
  const c2 = config.color2           ?? '#93c5fd';
  const c3 = config.color3           ?? '#fde68a';
  const spd = config.speed           ?? 1;

  const meteors = React.useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      top:    `${(i * 13 + 5)  % 70}%`,
      left:   `${(i * 17 + 10) % 90}%`,
      length:  80 + (i * 23) % 120,
      dur:    (1.2 + (i % 5) * 0.4) / spd,
      delay:  -(i * 0.9) % 8,
      color:  [c1, c2, c3][i % 3],
      width:   1 + (i % 3 === 0 ? 1 : 0),
    })),
  [c1, c2, c3, spd]);

  return (
    <div style={{
      position:   'absolute',
      inset:       0,
      overflow:   'hidden',
      background: `radial-gradient(ellipse at 50% 30%, #0a1628 0%, ${bg} 70%)`,
    }}>

      {/* ── static stars ── */}
      {Array.from({ length: 80 }, (_, i) => (
        <div key={`s${i}`} style={{
          position:        'absolute',
          width:            i % 5 === 0 ? 2 : 1,
          height:           i % 5 === 0 ? 2 : 1,
          borderRadius:    '50%',
          background:      '#ffffff',
          top:             `${(i * 11 + 7) % 100}%`,
          left:            `${(i * 13 + 3) % 100}%`,
          opacity:          0.2 + (i % 7) * 0.1,
          animation:       `meteor-star-twinkle ${3 + (i % 5)}s ease-in-out infinite`,
          animationDelay:  `${-(i % 4) * 1.1}s`,
        }} />
      ))}

      {/* ── meteors ── */}
      {meteors.map((m, i) => (
        <div
          key={i}
          style={{
            position:       'absolute',
            top:             m.top,
            left:            m.left,
            width:           m.length,
            height:          m.width,
            // ✅ gradient tail — bright head, fading tail
            background:     `linear-gradient(90deg, transparent 0%, ${m.color}44 30%, ${m.color} 100%)`,
            borderRadius:    m.width,
            transform:      'rotate(-35deg)',
            transformOrigin: 'right center',
            animation:      `meteor-streak ${m.dur.toFixed(2)}s linear infinite`,
            animationDelay: `${m.delay}s`,
            filter:         `drop-shadow(0 0 3px ${m.color})`,
          }}
        >
          {/* ✅ bright head dot */}
          <div style={{
            position:     'absolute',
            right:         0,
            top:           '50%',
            transform:    'translateY(-50%)',
            width:         m.width + 2,
            height:        m.width + 2,
            borderRadius: '50%',
            background:    m.color,
            boxShadow:    `0 0 6px 2px ${m.color}88`,
          }} />
        </div>
      ))}

    </div>
  );
}

export default MeteorShower;