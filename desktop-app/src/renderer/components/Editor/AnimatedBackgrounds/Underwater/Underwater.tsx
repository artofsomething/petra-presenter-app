import React from "react";
import type { AnimatedBackground } from "../../../../../server/types";

function Underwater({ config }: { config: AnimatedBackground }) {
  const c1  = config.color1 ?? '#0ea5e9';
  const c2  = config.color2 ?? '#06b6d4';
  const c3  = config.color3 ?? '#34d399';
  const spd = config.speed  ?? 1;

  const bubbles = React.useMemo(() => {
    return Array.from({ length: 25 }, (_, i) => ({
      size:   4 + (i * 7) % 20,
      x:      `${(i * 4.1) % 95}%`,
      dur:    (6 + (i % 6) * 2) / spd,
      delay:  -(i % 9) * 1.3,
      color:  i % 3 === 0 ? c3 : i % 2 === 0 ? c2 : c1,
    }));
  }, [c1, c2, c3, spd]);

  const weeds = React.useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      x:      `${(i * 8.5) % 96}%`,
      height: 60 + (i * 23) % 100,
      color:  i % 3 === 0 ? c3 : i % 2 === 0 ? c2 : c1,
      dur:    (2 + (i % 4) * 0.5) / spd,
      delay:  -(i % 5) * 0.6,
      width:  6 + (i % 3) * 4,
    }));
  }, [c1, c2, c3, spd]);

  const caustics = React.useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      x:     `${(i * 13 + 5) % 90}%`,
      y:     `${(i * 9  + 5) % 60}%`,
      size:  60 + (i % 4) * 40,
      dur:   (4 + (i % 3) * 2) / spd,
      delay: -(i % 6) * 1.1,
      color: i % 2 === 0 ? c1 : c2,
    }));
  }, [c1, c2, spd]);

  const lightRays = React.useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => ({
      x:     `${10 + i * 16}%`,
      dur:   (4 + (i % 3)) / spd,
      delay: -(i * 0.8),
      width: 30 + (i % 3) * 20,
    }));
  }, [spd]);

  return (
    <div style={{
      position:   'absolute', inset: 0, overflow: 'hidden',
      background: `linear-gradient(180deg,
        ${c1}55 0%,
        ${c2}44 25%,
        #003355 60%,
        #001a2e 100%)`,
    }}>
      {/* Light rays from surface */}
      {lightRays.map((r, i) => (
        <div key={`ray-${i}`} style={{
          position:        'absolute',
          top:             0,
          left:            r.x,
          width:           `${r.width}px`,
          height:          '70%',
          background:      `linear-gradient(180deg, ${c1}22 0%, transparent 100%)`,
          clipPath:        'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
          animation:       `underwater-light-ray ${r.dur.toFixed(1)}s ease-in-out infinite`,
          animationDelay:  `${r.delay}s`,
          transformOrigin: 'top center',
        }} />
      ))}

      {/* Caustic light patterns */}
      {caustics.map((c, i) => (
        <div key={`caust-${i}`} style={{
          position:        'absolute',
          left:            c.x,
          top:             c.y,
          width:           c.size,
          height:          c.size,
          borderRadius:    '50%',
          border:          `2px solid ${c.color}33`,
          background:      `radial-gradient(circle, ${c.color}18 0%, transparent 70%)`,
          animation:       `underwater-caustic ${c.dur.toFixed(1)}s ease-in-out infinite`,
          animationDelay:  `${c.delay}s`,
        }} />
      ))}

      {/* Rising bubbles */}
      {bubbles.map((b, i) => (
        <div key={`ub-${i}`} style={{
          position:        'absolute',
          bottom:          '5%',
          left:            b.x,
          width:           b.size,
          height:          b.size,
          borderRadius:    '50%',
          border:          `1px solid ${b.color}88`,
          background:      `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.4), ${b.color}22)`,
          animation:       `underwater-bubble ${b.dur.toFixed(1)}s ease-in infinite`,
          animationDelay:  `${b.delay}s`,
        }} />
      ))}

      {/* Sea floor */}
      <div style={{
        position:   'absolute',
        bottom:     0, left: 0, right: 0,
        height:     '18%',
        background: `linear-gradient(180deg, transparent 0%, #001020 60%, #000810 100%)`,
      }} />

      {/* Sea weeds */}
      {weeds.map((w, i) => (
        <div key={`weed-${i}`} style={{
          position:        'absolute',
          bottom:          '15%',
          left:            w.x,
          width:           w.width,
          height:          w.height,
          borderRadius:    '40% 60% 60% 40% / 60% 40% 60% 40%',
          background:      `linear-gradient(180deg, ${w.color}cc 0%, ${w.color}66 100%)`,
          transformOrigin: 'bottom center',
          animation:       `underwater-weed ${w.dur.toFixed(1)}s ease-in-out infinite`,
          animationDelay:  `${w.delay}s`,
        }} />
      ))}

      {/* Floating particles / plankton */}
      {Array.from({ length: 30 }, (_, i) => (
        <div key={`plank-${i}`} style={{
          position:        'absolute',
          left:            `${(i * 3.3) % 100}%`,
          top:             `${(i * 7.1) % 80}%`,
          width:           2,
          height:          2,
          borderRadius:    '50%',
          background:      i % 2 === 0 ? c3 : c1,
          opacity:         0.4,
          animation:       `underwater-float ${((3 + i % 4) / spd).toFixed(1)}s ease-in-out infinite`,
          animationDelay:  `${-(i % 6) * 0.5}s`,
        }} />
      ))}

      {/* Water surface shimmer at top */}
      <div style={{
        position:   'absolute',
        top: 0, left: 0, right: 0,
        height:     '6px',
        background: `linear-gradient(90deg,
          transparent, ${c1}88, ${c2}cc,
          ${c1}88, transparent)`,
        filter:     'blur(2px)',
        animation:  `wave-move ${(3 / spd).toFixed(1)}s linear infinite`,
      }} />
    </div>
  );
}

export default Underwater;