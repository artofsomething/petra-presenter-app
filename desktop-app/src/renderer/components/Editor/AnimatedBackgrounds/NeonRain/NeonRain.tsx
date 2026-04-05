// src/renderer/components/Editor/AnimatedBackgrounds/NeonRain/NeonRain.tsx
import React from 'react';
import type { AnimatedBackground } from '../../../../../server/types';

function NeonRain({ config }: { config: AnimatedBackground }) {
  const bg = config.backgroundColor  ?? '#020012';
  const c1 = config.color1           ?? '#ff00ff';
  const c2 = config.color2           ?? '#00ffff';
  const c3 = config.color3           ?? '#ff3366';
  const spd = config.speed           ?? 1;

  const drops = React.useMemo(() =>
    Array.from({ length: 60 }, (_, i) => ({
      left:    `${(i * 17 + 3) % 100}%`,
      height:   20 + (i * 13) % 60,
      dur:     (0.6 + (i % 6) * 0.2) / spd,
      delay:   -(i * 0.25) % 3,
      color:   [c1, c2, c3][i % 3],
      width:    1 + (i % 3 === 0 ? 1 : 0),
      opacity:  0.5 + (i % 4) * 0.1,
    })),
  [c1, c2, c3, spd]);

  const puddles = React.useMemo(() =>
    Array.from({ length: 15 }, (_, i) => ({
      left:   `${(i * 23 + 7) % 95}%`,
      dur:    (1 + (i % 4) * 0.5) / spd,
      delay:  -(i * 0.4) % 3,
      color:  [c1, c2, c3][i % 3],
    })),
  [c1, c2, c3, spd]);

  return (
    <div style={{
      position:   'absolute',
      inset:       0,
      overflow:   'hidden',
      background: `linear-gradient(180deg, ${bg} 0%, #0a0020 100%)`,
    }}>

      {/* ── wet floor reflection ── */}
      <div style={{
        position:   'absolute',
        bottom:     0,
        left:       0,
        right:      0,
        height:     '30%',
        background: `linear-gradient(0deg,
                      ${c1}08 0%,
                      ${c2}05 50%,
                      transparent 100%)`,
        backdropFilter: 'blur(1px)',
      }} />

      {/* ── rain drops ── */}
      {drops.map((d, i) => (
        <div key={i} style={{
          position:       'absolute',
          top:            '-10%',
          left:            d.left,
          width:           d.width,
          height:          d.height,
          // ✅ bright tip fading upward
          background:     `linear-gradient(180deg,
                            transparent    0%,
                            ${d.color}44  40%,
                            ${d.color}    100%)`,
          borderRadius:    d.width,
          opacity:         d.opacity,
          animation:      `neon-rain-drop ${d.dur.toFixed(2)}s linear infinite`,
          animationDelay: `${d.delay}s`,
          filter:         `drop-shadow(0 0 2px ${d.color})`,
        }} />
      ))}

      {/* ── puddle ripples at bottom ── */}
      {puddles.map((p, i) => (
        <div key={`puddle-${i}`} style={{
          position:       'absolute',
          bottom:          '2%',
          left:            p.left,
          width:           0,
          height:          0,
          borderRadius:   '50%',
          border:         `1px solid ${p.color}66`,
          animation:      `neon-rain-ripple ${p.dur.toFixed(2)}s ease-out infinite`,
          animationDelay: `${p.delay}s`,
        }} />
      ))}

      {/* ── glow orbs ── */}
      {[c1, c2, c3].map((c, i) => (
        <div key={`glow-${i}`} style={{
          position:     'absolute',
          width:         '30%',
          height:        '40%',
          top:          `${10 + i * 30}%`,
          left:         `${i * 35}%`,
          borderRadius: '50%',
          background:   `radial-gradient(circle, ${c}15 0%, transparent 70%)`,
          filter:       'blur(30px)',
          animation:    `neon-rain-glow ${(4 + i) / spd}s ease-in-out infinite`,
          animationDelay:`${-i * 1.5}s`,
        }} />
      ))}

    </div>
  );
}

export default NeonRain;