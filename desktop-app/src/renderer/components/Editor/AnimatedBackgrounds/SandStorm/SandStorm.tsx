// src/renderer/components/Editor/AnimatedBackgrounds/SandStorm/SandStorm.tsx
import React from 'react';
import type { AnimatedBackground } from '../../../../../server/types';

function SandStorm({ config }: { config: AnimatedBackground }) {
  const bg = config.backgroundColor  ?? '#1a0f00';
  const c1 = config.color1           ?? '#d97706';
  const c2 = config.color2           ?? '#92400e';
  const c3 = config.color3           ?? '#fbbf24';
  const spd = config.speed           ?? 1;

  const particles = React.useMemo(() =>
    Array.from({ length: 80 }, (_, i) => ({
      top:    `${(i * 7  + 3) % 100}%`,
      size:    1 + (i % 4),
      dur:    (2 + (i % 6) * 0.5) / spd,
      delay:  -(i * 0.3) % 5,
      color:  [c1, c2, c3][i % 3],
      opacity: 0.3 + (i % 5) * 0.1,
    })),
  [c1, c2, c3, spd]);

  const streaks = React.useMemo(() =>
    Array.from({ length: 25 }, (_, i) => ({
      top:    `${(i * 13 + 8) % 100}%`,
      width:   40 + (i * 23) % 160,
      dur:    (0.8 + (i % 4) * 0.3) / spd,
      delay:  -(i * 0.4) % 4,
      color:  [c1, c2, c3][i % 3],
      opacity: 0.15 + (i % 4) * 0.08,
    })),
  [c1, c2, c3, spd]);

  return (
    <div style={{
      position:   'absolute',
      inset:       0,
      overflow:   'hidden',
      background: `linear-gradient(180deg, ${bg} 0%, ${c2}33 50%, ${bg} 100%)`,
    }}>

      {/* ── dust streaks ── */}
      {streaks.map((s, i) => (
        <div key={`streak-${i}`} style={{
          position:       'absolute',
          top:             s.top,
          left:           '-20%',
          width:           s.width,
          height:          1,
          background:     `linear-gradient(90deg, transparent, ${s.color}, transparent)`,
          opacity:         s.opacity,
          animation:      `sandstorm-streak ${s.dur.toFixed(2)}s linear infinite`,
          animationDelay: `${s.delay}s`,
        }} />
      ))}

      {/* ── sand particles ── */}
      {particles.map((p, i) => (
        <div key={`p-${i}`} style={{
          position:       'absolute',
          top:             p.top,
          left:           '-2%',
          width:           p.size,
          height:          p.size * 0.5,
          borderRadius:   '50%',
          background:      p.color,
          opacity:         p.opacity,
          animation:      `sandstorm-particle ${p.dur.toFixed(2)}s linear infinite`,
          animationDelay: `${p.delay}s`,
        }} />
      ))}

      {/* ── swirl clouds ── */}
      {[c1, c2, c3].map((c, i) => (
        <div key={`cloud-${i}`} style={{
          position:       'absolute',
          width:          '70%',
          height:         '30%',
          top:            `${20 + i * 25}%`,
          left:           '-20%',
          borderRadius:  '50%',
          background:    `radial-gradient(ellipse, ${c}22 0%, transparent 70%)`,
          filter:        'blur(20px)',
          animation:     `sandstorm-cloud ${(5 + i * 2) / spd}s ease-in-out infinite`,
          animationDelay:`${-i * 2}s`,
        }} />
      ))}

      {/* ── vignette ── */}
      <div style={{
        position:   'absolute',
        inset:       0,
        background: `radial-gradient(ellipse at center, transparent 40%, ${bg}cc 100%)`,
        pointerEvents: 'none',
      }} />
    </div>
  );
}

export default SandStorm;