import type { AnimatedBackground } from "../../../../../server/types";

function Geometric({ config }: { config: AnimatedBackground }) {
    const bg = config.backgroundColor ?? '#0f0f1a';
  const c1  = config.color1 ?? '#6366f1';
  const c2  = config.color2 ?? '#8b5cf6';
  const c3  = config.color3 ?? '#ec4899';
  const spd = config.speed  ?? 1;

  const shapes = [
    { size: 180, x: '10%',  y: '10%', anim: 'geo-spin-cw',  dur: 20, shape: 'square', color: c1 },
    { size: 120, x: '75%',  y: '15%', anim: 'geo-spin-ccw', dur: 15, shape: 'tri',    color: c2 },
    { size: 200, x: '60%',  y: '60%', anim: 'geo-spin-cw',  dur: 25, shape: 'square', color: c3 },
    { size: 80,  x: '20%',  y: '65%', anim: 'geo-float',    dur: 4,  shape: 'circle', color: c1 },
    { size: 140, x: '85%',  y: '50%', anim: 'geo-spin-ccw', dur: 18, shape: 'square', color: c2 },
    { size: 60,  x: '45%',  y: '30%', anim: 'geo-float',    dur: 3,  shape: 'circle', color: c3 },
    { size: 100, x: '5%',   y: '45%', anim: 'geo-spin-cw',  dur: 12, shape: 'tri',    color: c1 },
  ];

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden',
                  background: bg }}>
      {shapes.map((s, i) => (
        <div key={i} style={{
          position:        'absolute',
          left:            s.x,
          top:             s.y,
          width:           s.size,
          height:          s.size,
          opacity:         0.15,
          animation:       `${s.anim} ${(s.dur / spd).toFixed(1)}s linear infinite`,
          animationDelay:  `${-i * 2}s`,
          borderRadius:    s.shape === 'circle' ? '50%' : s.shape === 'tri' ? '0' : '8px',
          background:      s.shape === 'tri'
            ? 'transparent'
            : `linear-gradient(135deg, ${s.color}, transparent)`,
          border:          `2px solid ${s.color}`,
          clipPath:        s.shape === 'tri'
            ? 'polygon(50% 0%, 0% 100%, 100% 100%)'
            : undefined,
        }} />
      ))}
    </div>
  );
}
export default Geometric;