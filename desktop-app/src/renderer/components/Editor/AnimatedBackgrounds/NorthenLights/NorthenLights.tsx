// src/renderer/components/Editor/AnimatedBackgrounds/NorthernLights/NorthernLights.tsx
import React from 'react';
import type { AnimatedBackground } from '../../../../../server/types';

function NorthernLights({ config }: { config: AnimatedBackground }) {
  const bg = config.backgroundColor  ?? '#000511';
  const c1 = config.color1           ?? '#00ff87';
  const c2 = config.color2           ?? '#60efff';
  const c3 = config.color3           ?? '#9b5de5';
  const spd = config.speed           ?? 1;

  const curtains = [
    { color: c1, left: '-10%', width: '50%', dur: (8  / spd).toFixed(1), delay: '0s',    skew: '-8deg'  },
    { color: c2, left: '15%',  width: '45%', dur: (11 / spd).toFixed(1), delay: '-3s',   skew: '5deg'   },
    { color: c3, left: '35%',  width: '55%', dur: (9  / spd).toFixed(1), delay: '-5s',   skew: '-3deg'  },
    { color: c1, left: '55%',  width: '40%', dur: (13 / spd).toFixed(1), delay: '-7s',   skew: '10deg'  },
    { color: c2, left: '70%',  width: '50%', dur: (7  / spd).toFixed(1), delay: '-2s',   skew: '-6deg'  },
  ];

  return (
    <div style={{
      position:   'absolute',
      inset:       0,
      overflow:   'hidden',
      background: `radial-gradient(ellipse at 50% 100%, ${bg}ff 0%, #000208 100%)`,
    }}>

      {/* ── curtain bands ── */}
      {curtains.map((c, i) => (
        <div key={i} style={{
          position:       'absolute',
          top:            '-20%',
          left:            c.left,
          width:           c.width,
          height:         '75%',
          background:     `linear-gradient(180deg,
                            transparent       0%,
                            ${c.color}18     15%,
                            ${c.color}55     40%,
                            ${c.color}33     65%,
                            ${c.color}11     85%,
                            transparent      100%)`,
          transform:      `skewX(${c.skew})`,
          filter:         'blur(18px)',
          animation:      `nl-curtain ${c.dur}s ease-in-out infinite`,
          animationDelay:  c.delay,
          mixBlendMode:   'screen',
        }} />
      ))}

      {/* ── bottom star layer ── */}
      {Array.from({ length: 60 }, (_, i) => (
        <div key={`star-${i}`} style={{
          position:        'absolute',
          width:            i % 3 === 0 ? 2 : 1,
          height:           i % 3 === 0 ? 2 : 1,
          borderRadius:    '50%',
          background:      '#ffffff',
          top:             `${50 + (i * 13) % 50}%`,
          left:            `${(i * 17 + 3) % 100}%`,
          opacity:          0.4 + (i % 5) * 0.1,
          animation:       `nl-star-twinkle ${2 + (i % 4)}s ease-in-out infinite`,
          animationDelay:  `${-(i % 6) * 0.8}s`,
        }} />
      ))}

      {/* ── horizon glow ── */}
      <div style={{
        position:   'absolute',
        bottom:     0,
        left:       0,
        right:      0,
        height:     '25%',
        background: `linear-gradient(0deg, ${bg}ff 0%, transparent 100%)`,
      }} />
    </div>
  );
}

export default NorthernLights;