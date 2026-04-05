// src/renderer/components/Editor/AnimatedBackgrounds/Bokeh/Bokeh.tsx
import React from 'react';
import type { AnimatedBackground } from '../../../../../server/types';

function Bokeh({ config }: { config: AnimatedBackground }) {
  const bg  = config.backgroundColor  ?? '#0a0a0f';
  const bg2 = config.backgroundColor2 ?? '#0f0a1a';
  const c1  = config.color1           ?? '#ff9ff3';
  const c2  = config.color2           ?? '#ffeaa7';
  const c3  = config.color3           ?? '#74b9ff';
  const spd = config.speed            ?? 1;

  const circles = React.useMemo(() => {
    const colors = [c1, c2, c3];
    return Array.from({ length: 35 }, (_, i) => {
      const size    = 40 + (i * 37) % 180;   // 40px → 220px
      const opacity = 0.08 + (i % 6) * 0.06; // very soft: 0.08 → 0.38
      return {
        size,
        x:       `${(i * 19 + 7)  % 95}%`,
        y:       `${(i * 13 + 11) % 90}%`,
        color:    colors[i % 3],
        opacity,
        dur:     (8 + (i * 7) % 14) / spd,
        xDur:    (6 + (i * 5) % 10) / spd,
        delay:   -(i * 1.3) % 12,
        xDelay:  -(i * 0.9) % 8,
        // each circle gets a unique blur — bigger = more out-of-focus
        blur:    12 + (i % 5) * 14,
      };
    });
  }, [c1, c2, c3, spd]);

  return (
    <div style={{
      position:   'absolute',
      inset:       0,
      overflow:   'hidden',
      background: `radial-gradient(ellipse at 40% 60%, ${bg2} 0%, ${bg} 100%)`,
    }}>

      {/* ── bokeh circles ── */}
      {circles.map((c, i) => (
        <div
          key={i}
          style={{
            position:     'absolute',
            top:           c.y,
            left:          c.x,
            width:         c.size,
            height:        c.size,
            marginLeft:   -c.size / 2,
            marginTop:    -c.size / 2,
            borderRadius: '50%',

            // ✅ key to bokeh look:
            // - radial gradient with bright center ring (like real lens bokeh)
            // - very soft outer glow
            background: `radial-gradient(circle at 50% 50%,
              transparent          0%,
              transparent         15%,
              ${c.color}${toHex(c.opacity * 0.4)}  42%,
              ${c.color}${toHex(c.opacity * 0.9)}  47%,
              ${c.color}${toHex(c.opacity * 0.9)}  53%,
              ${c.color}${toHex(c.opacity * 0.4)}  58%,
              transparent         95%,
              transparent        100%
            )`,

            // ✅ outer soft glow halo
            boxShadow: `
              0 0 ${c.blur}px      ${c.blur / 2}px ${c.color}${toHex(c.opacity * 0.5)},
              0 0 ${c.blur * 2}px  ${c.blur}px     ${c.color}${toHex(c.opacity * 0.2)}
            `,

            filter: `blur(${2 + (i % 3)}px)`,

            // ✅ two independent animations: float vertically + drift horizontally
            animation: [
              `bokeh-float ${c.dur.toFixed(1)}s ease-in-out infinite`,
              `bokeh-drift ${c.xDur.toFixed(1)}s ease-in-out infinite`,
            ].join(', '),
            animationDelay: `${c.delay}s, ${c.xDelay}s`,
          }}
        />
      ))}

      {/* ── large very soft background glow blobs (depth layer) ── */}
      {[
        { x: '20%',  y: '30%', size: 400, color: c1, opacity: 0.04 },
        { x: '75%',  y: '60%', size: 350, color: c2, opacity: 0.05 },
        { x: '50%',  y: '80%', size: 300, color: c3, opacity: 0.04 },
      ].map((blob, i) => (
        <div key={`blob-${i}`} style={{
          position:     'absolute',
          top:           blob.y,
          left:          blob.x,
          width:         blob.size,
          height:        blob.size,
          marginLeft:   -blob.size / 2,
          marginTop:    -blob.size / 2,
          borderRadius: '50%',
          background:   `radial-gradient(circle, ${blob.color} 0%, transparent 70%)`,
          opacity:       blob.opacity,
          filter:       'blur(60px)',
          animation:    `bokeh-blob ${(14 + i * 4) / spd}s ease-in-out infinite`,
          animationDelay: `${-i * 3}s`,
        }} />
      ))}

    </div>
  );
}

// ── helper: number 0–1 → 2-char hex opacity ──────────────────────────────────
function toHex(opacity: number): string {
  return Math.round(Math.min(Math.max(opacity, 0), 1) * 255)
    .toString(16)
    .padStart(2, '0');
}

export default Bokeh;