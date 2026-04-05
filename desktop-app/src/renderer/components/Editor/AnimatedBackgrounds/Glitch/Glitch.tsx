import React from "react";
import type { AnimatedBackground } from "../../../../../server/types";

function Glitch({ config }: { config: AnimatedBackground }) {
  const c1  = config.color1 ?? '#00ff9f';
  const c2  = config.color2 ?? '#ff003c';
  const c3  = config.color3 ?? '#0066ff';
  const spd = config.speed  ?? 1;

  const bars = React.useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      top:     `${i * 12 + 2}%`,
      height:  `${4 + (i % 3) * 3}%`,
      color:   i % 3 === 0 ? c1 : i % 3 === 1 ? c2 : c3,
      dur:     (3 + i * 0.4) / spd,
      delay:   -(i * 0.6),
    }));
  }, [c1, c2, c3, spd]);

  return (
    <div style={{
      position:   'absolute', inset: 0, overflow: 'hidden',
      background: '#000',
    }}>
      {/* Base gradient */}
      <div style={{
        position:   'absolute', inset: 0,
        background: `linear-gradient(135deg, #0a0a0a 0%, #111 40%, #0a0a0a 100%)`,
        animation:  `glitch-main ${(4 / spd).toFixed(1)}s ease-in-out infinite`,
      }} />

      {/* Grid overlay */}
      <div style={{
        position:        'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(${c1}08 1px, transparent 1px),
          linear-gradient(90deg, ${c1}08 1px, transparent 1px)
        `,
        backgroundSize:  '40px 40px',
        animation:       `glitch-main ${(4 / spd).toFixed(1)}s ease-in-out infinite`,
      }} />

      {/* Glitch colour slices */}
      <div style={{
        position:   'absolute', inset: 0,
        background: `linear-gradient(135deg, ${c3}22 0%, transparent 50%, ${c2}11 100%)`,
        animation:  `glitch-slice-1 ${(4 / spd).toFixed(1)}s steps(1) infinite`,
      }} />
      <div style={{
        position:   'absolute', inset: 0,
        background: `linear-gradient(45deg, ${c2}22 0%, transparent 60%)`,
        animation:  `glitch-slice-2 ${(4 / spd).toFixed(1)}s steps(1) infinite`,
      }} />

      {/* RGB channel separation layers */}
      <div style={{
        position:        'absolute', inset: 0,
        backgroundImage: `
          repeating-linear-gradient(0deg,
            ${c2}18 0px, ${c2}18 1px,
            transparent 1px, transparent 4px)
        `,
        animation:       `glitch-rgb-r ${(4 / spd).toFixed(1)}s steps(1) infinite`,
      }} />
      <div style={{
        position:        'absolute', inset: 0,
        backgroundImage: `
          repeating-linear-gradient(0deg,
            ${c3}18 0px, ${c3}18 1px,
            transparent 1px, transparent 4px)
        `,
        animation:       `glitch-rgb-b ${(4 / spd).toFixed(1)}s steps(1) infinite`,
      }} />

      {/* Horizontal glitch bars */}
      {bars.map((b, i) => (
        <div key={i} style={{
          position:        'absolute',
          top:             b.top,
          left:            0, right: 0,
          height:          b.height,
          background:      `linear-gradient(90deg,
            transparent 0%,
            ${b.color}22 20%,
            ${b.color}44 50%,
            ${b.color}22 80%,
            transparent 100%)`,
          borderTop:       `1px solid ${b.color}55`,
          borderBottom:    `1px solid ${b.color}33`,
          animation:       `glitch-slice-1 ${b.dur.toFixed(1)}s steps(1) infinite`,
          animationDelay:  `${b.delay}s`,
        }} />
      ))}

      {/* Scan line */}
      <div style={{
        position:   'absolute',
        top:        0, left: 0, right: 0,
        height:     '3px',
        background: `linear-gradient(90deg, transparent, ${c1}cc, transparent)`,
        boxShadow:  `0 0 10px ${c1}`,
        animation:  `glitch-scanline ${(6 / spd).toFixed(1)}s linear infinite`,
      }} />

      {/* Corner text decoration */}
      <div style={{
        position:   'absolute',
        top:        '8px', left: '12px',
        color:      `${c1}88`,
        fontFamily: 'monospace',
        fontSize:   '10px',
        letterSpacing: '2px',
        animation:  `glitch-main ${(4 / spd).toFixed(1)}s ease-in-out infinite`,
      }}>
        SYS_ERR::0x{Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase().padStart(4, '0')}
      </div>
    </div>
  );
}

export default Glitch;