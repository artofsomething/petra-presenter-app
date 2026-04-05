// src/renderer/components/Editor/Backgrounds/Aurora.tsx
import React from 'react';
import type { AnimatedBackground } from '../../../../../server/types';

interface AuroraProps {
  config:    AnimatedBackground;
  onChange?: (updated: Partial<AnimatedBackground>) => void; // ✅ live update
}

function Aurora({ config, onChange }: AuroraProps) {
  const bg = config.backgroundColor ?? '#0a0015';
  const c1  = config.color1 ?? '#7c3aed';
  const c2  = config.color2 ?? '#2563eb';
  const c3  = config.color3 ?? '#06b6d4';
  const spd = config.speed  ?? 1;
  const dur = (8 / spd).toFixed(1);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: bg }}>
      {/* Blob 1 */}
      <div style={{
        position:     'absolute',
        width:        '70%', height: '70%',
        top: '-20%',  left: '-20%',
        borderRadius: '50%',
        background:   `radial-gradient(circle, ${c1}99 0%, transparent 70%)`,
        animation:    `aurora-shift ${dur}s ease-in-out infinite`,
        filter:       'blur(60px)',
      }} />

      {/* Blob 2 */}
      <div style={{
        position:       'absolute',
        width:          '60%', height: '60%',
        bottom: '-15%', right: '-15%',
        borderRadius:   '50%',
        background:     `radial-gradient(circle, ${c2}99 0%, transparent 70%)`,
        animation:      `aurora-shift-2 ${(parseFloat(dur) * 1.3).toFixed(1)}s ease-in-out infinite`,
        filter:         'blur(50px)',
      }} />

      {/* Blob 3 */}
      <div style={{
        position:     'absolute',
        width:        '50%', height: '50%',
        top: '20%',   left: '25%',
        borderRadius: '50%',
        background:   `radial-gradient(circle, ${c3}88 0%, transparent 70%)`,
        animation:    `aurora-shift-3 ${(parseFloat(dur) * 0.7).toFixed(1)}s ease-in-out infinite`,
        filter:       'blur(70px)',
      }} />
    </div>
  );
}

export default Aurora;