// src/renderer/components/Editor/Backgrounds/Waves.tsx
import React from 'react';
import type { AnimatedBackground } from '../../../../../server/types';

function Waves({ config }: { config: AnimatedBackground }) {
  const bg1 = config.backgroundColor  ?? '#000814';
  const bg2 = config.backgroundColor2 ?? '#0f172a';
  const c1  = config.color1           ?? '#1e40af';
  const c2  = config.color2           ?? '#7c3aed';
  const c3  = config.color3           ?? '#0891b2';
  const spd = config.speed            ?? 1;

  const waveStyle = (
    color:    string,
    top:      string,     // ✅ use top instead of bottom
    opacity:  number,
    duration: number,
    delay:    number,
    animName: string,
  ): React.CSSProperties => ({
    position:       'absolute',
    top,
    left:           '-50%',
    width:          '200%',
    height:         '300px',       // ✅ tall enough to show only the curve edge
    background:     color,

    // ✅ subtle curve — NOT a pill shape
    // top-left, top-right rounded heavily → creates the wave "crest"
    // bottom flat so it fills downward
    borderRadius:   '100% 100% 0 0 / 80px 80px 0 0',

    opacity,
    animation:      `${animName} ${(duration / spd).toFixed(1)}s ease-in-out infinite`,
    animationDelay: `${delay}s`,
    willChange:     'transform',
  });

  return (
    <div style={{
      position:   'absolute',
      inset:       0,
      overflow:   'hidden',
      background: `linear-gradient(180deg, ${bg1} 0%, ${bg2} 100%)`,
    }}>

      {/* Wave 4 — bottom / front */}
      <div style={waveStyle(c2, '55%', 1.0, 7,   0,  'wave-move'  )} />

      {/* Wave 3 */}
      <div style={waveStyle(c1, '60%', 0.8, 9,  -2,  'wave-move-2')} />

      {/* Wave 2 */}
      <div style={waveStyle(c3, '65%', 0.6, 11, -4,  'wave-move'  )} />

      {/* Wave 1 — deepest */}
      <div style={waveStyle(c1, '70%', 0.4, 13, -6,  'wave-move-2')} />

    </div>
  );
}

export default Waves;