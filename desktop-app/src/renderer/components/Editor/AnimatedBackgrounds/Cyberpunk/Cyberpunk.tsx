import type { AnimatedBackground } from "../../../../../server/types";

function CyberpunkGrid({ config }: { config: AnimatedBackground }) {
  const c1  = config.color1 ?? '#00ffff';
  const c2  = config.color2 ?? '#ff00ff';
  const c3  = config.color3 ?? '#ffff00';
  const spd = config.speed  ?? 1;

  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      background: '#000',
    }}>
      {/* Perspective floor grid */}
      <div style={{
        position:   'absolute',
        bottom:     0, left: 0, right: 0,
        height:     '55%',
        backgroundImage: `
          linear-gradient(${c1}55 1px, transparent 1px),
          linear-gradient(90deg, ${c1}55 1px, transparent 1px)
        `,
        backgroundSize:   '60px 60px',
        transform:        'perspective(300px) rotateX(55deg)',
        transformOrigin:  'bottom center',
        animation:        `grid-flicker ${(4 / spd).toFixed(1)}s ease-in-out infinite`,
      }} />
      {/* Horizon glow */}
      <div style={{
        position:   'absolute',
        top:        '45%',
        left:       0, right: 0,
        height:     '3px',
        background: `linear-gradient(90deg, transparent, ${c1}, ${c2}, ${c1}, transparent)`,
        boxShadow:  `0 0 20px ${c1}, 0 0 40px ${c2}`,
        animation:  `grid-pulse ${(2 / spd).toFixed(1)}s ease-in-out infinite`,
      }} />
      {/* Vertical scan line */}
      <div style={{
        position:   'absolute',
        top:        0,
        left:       '50%',
        width:      '2px',
        height:     '45%',
               background: `linear-gradient(180deg, transparent, ${c2}88, ${c2}, transparent)`,
        animation:  `grid-scan ${(3 / spd).toFixed(1)}s linear infinite`,
      }} />
      {/* Top sky gradient */}
      <div style={{
        position:   'absolute',
        top: 0, left: 0, right: 0,
        height:     '45%',
        background: `linear-gradient(180deg, #000 0%, ${c1}11 70%, transparent 100%)`,
      }} />
      {/* Floating neon text lines */}
      {[c1, c2, c3].map((color, i) => (
        <div key={i} style={{
          position:        'absolute',
          top:             `${10 + i * 10}%`,
          left:            0, right: 0,
          height:          '1px',
          background:      `linear-gradient(90deg, transparent 0%, ${color}44 ${20 + i * 15}%, ${color}88 50%, ${color}44 ${80 - i * 15}%, transparent 100%)`,
          animation:       `grid-flicker ${(2.5 + i * 0.7) / spd}s ease-in-out infinite`,
          animationDelay:  `${-i * 0.8}s`,
        }} />
      ))}
      {/* Corner decorations */}
      {[
        { top: '5%',  left: '5%',  borderTop: `2px solid ${c1}`, borderLeft:  `2px solid ${c1}` },
        { top: '5%',  right: '5%', borderTop: `2px solid ${c2}`, borderRight: `2px solid ${c2}` },
        { bottom: '48%', left: '5%',  borderBottom: `2px solid ${c1}`, borderLeft:  `2px solid ${c1}` },
        { bottom: '48%', right: '5%', borderBottom: `2px solid ${c2}`, borderRight: `2px solid ${c2}` },
      ].map((s, i) => (
        <div key={i} style={{
          position: 'absolute',
          width:    '30px', height: '30px',
          ...s,
          animation: `grid-pulse ${(1.5 + i * 0.3) / spd}s ease-in-out infinite`,
          animationDelay: `${-i * 0.4}s`,
        }} />
      ))}
    </div>
  );
}

export default CyberpunkGrid;