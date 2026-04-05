import React from "react";
import type { AnimatedBackground } from "../../../../../server/types";

function DNAHelix({ config }: { config: AnimatedBackground }) {
  const c1  = config.color1 ?? '#22d3ee';
  const c2  = config.color2 ?? '#a78bfa';
  const c3  = config.color3 ?? '#34d399';
  const spd = config.speed  ?? 1;

  const STRANDS = 28; // number of node pairs

  const nodes = React.useMemo(() => {
    return Array.from({ length: STRANDS }, (_, i) => {
      const phase = (i / STRANDS) * Math.PI * 2;
      return {
        i,
        phase,
        yPct:  `${(i / (STRANDS - 1)) * 100}%`,
        dur:   (3 / spd).toFixed(1),
        delay: `-${((i / STRANDS) * (3 / spd)).toFixed(2)}s`,
        colorL: i % 3 === 0 ? c3 : c1,
        colorR: i % 3 === 0 ? c3 : c2,
        // Cross-rung only when nodes are near centre (cos ≈ 0)
        showRung: Math.abs(Math.cos(phase)) < 0.4,
      };
    });
  }, [c1, c2, c3, spd]);

  return (
    <div style={{
      position:   'absolute', inset: 0, overflow: 'hidden',
      background: 'linear-gradient(180deg, #020818 0%, #050f2e 50%, #020818 100%)',
      display:    'flex', justifyContent: 'center',
    }}>
      {/* Ambient glow behind helix */}
      <div style={{
        position:     'absolute',
        top: '10%',   left: '50%',
        transform:    'translateX(-50%)',
        width:        '200px', height: '80%',
        borderRadius: '50%',
        background:   `radial-gradient(ellipse, ${c1}0d 0%, ${c2}08 50%, transparent 100%)`,
        filter:       'blur(30px)',
      }} />

      {/* Helix column */}
      <div style={{ position: 'relative', width: '160px', height: '100%' }}>
        {nodes.map((n) => (
          <div key={n.i} style={{
            position: 'absolute',
            top:      n.yPct,
            left:     0, right: 0,
            height:   '2px',
            display:  'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            {/* Left node */}
            <div style={{
              width:           '12px', height: '12px',
              borderRadius:    '50%',
              background:      n.colorL,
              boxShadow:       `0 0 8px ${n.colorL}, 0 0 16px ${n.colorL}88`,
              animation:       `dna-node-left ${n.dur}s ease-in-out infinite`,
              animationDelay:  n.delay,
              flexShrink:      0,
            }} />

            {/* Cross-rung connector */}
            {n.showRung && (
              <div style={{
                flex:       1,
                height:     '2px',
                background: `linear-gradient(90deg, ${n.colorL}88, ${c3}cc, ${n.colorR}88)`,
                boxShadow:  `0 0 4px ${c3}88`,
                margin:     '0 2px',
              }} />
            )}
            {!n.showRung && <div style={{ flex: 1 }} />}

            {/* Right node */}
            <div style={{
              width:           '12px', height: '12px',
              borderRadius:    '50%',
              background:      n.colorR,
              boxShadow:       `0 0 8px ${n.colorR}, 0 0 16px ${n.colorR}88`,
              animation:       `dna-node-right ${n.dur}s ease-in-out infinite`,
              animationDelay:  n.delay,
              flexShrink:      0,
            }} />
          </div>
        ))}
      </div>

      {/* Scrolling duplicate for seamless loop feel */}
      <div style={{
        position:   'absolute', inset: 0,
        background: `linear-gradient(180deg,
          #020818 0%, transparent 10%,
          transparent 90%, #020818 100%)`,
        pointerEvents: 'none',
      }} />
    </div>
  );
}

export default DNAHelix;