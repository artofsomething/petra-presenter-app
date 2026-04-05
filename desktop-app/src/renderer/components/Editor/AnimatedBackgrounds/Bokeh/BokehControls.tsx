// src/renderer/components/Editor/Backgrounds/BokehControls.tsx
import React from 'react';
import ColorRow from '../ColorRowProps';
import type { AnimatedBackground } from '../../../../../server/types';

interface BokehControlsProps {
  current:  AnimatedBackground;
  onChange: (updated: Partial<AnimatedBackground>) => void;
}

const BokehControls: React.FC<BokehControlsProps> = ({ current, onChange }) => {
  const bg  = current.backgroundColor  ?? '#0a0a0f';
  const bg2 = current.backgroundColor2 ?? '#0f0a1a';
  const c1  = current.color1           ?? '#ff9ff3';
  const c2  = current.color2           ?? '#ffeaa7';
  const c3  = current.color3           ?? '#74b9ff';

  return (
    <div style={{
      marginTop:     8,
      padding:       10,
      background:    '#0f172a',
      borderRadius:  8,
      border:        '1px solid #334155',
      display:       'flex',
      flexDirection: 'column',
      gap:           8,
    }}>

      {/* ── Header ── */}
      <div style={{
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'center',
      }}>
        <span style={{
          fontSize:      10,
          fontWeight:    700,
          letterSpacing: '0.08em',
          color:         '#64748b',
          textTransform: 'uppercase',
        }}>
          Colors
        </span>
        <button
          onClick={() => onChange({
            backgroundColor:  '#0a0a0f',
            backgroundColor2: '#0f0a1a',
            color1:           '#ff9ff3',
            color2:           '#ffeaa7',
            color3:           '#74b9ff',
          })}
          style={{
            fontSize:     10,
            padding:      '2px 8px',
            background:   '#1e293b',
            border:       '1px solid #334155',
            borderRadius: 4,
            color:        '#94a3b8',
            cursor:       'pointer',
          }}
        >
          ↺ Reset
        </button>
      </div>

      {/* ── Background ── */}
      <div style={{ height: 1, background: '#1e293b' }} />
      <span style={{
        fontSize:      10,
        color:         '#475569',
        fontWeight:    600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}>
        Background
      </span>

      <ColorRow
        label="Dark 1"
        value={bg}
        onChange={(v) => onChange({ backgroundColor: v })}
      />
      <ColorRow
        label="Dark 2"
        value={bg2}
        onChange={(v) => onChange({ backgroundColor2: v })}
      />

      {/* live bg preview */}
      <div style={{
        height:       12,
        borderRadius: 6,
        background:   `radial-gradient(ellipse at 40% 60%, ${bg2} 0%, ${bg} 100%)`,
        border:       '1px solid #1e293b',
      }} />

      {/* ── Light colors ── */}
      <div style={{ height: 1, background: '#1e293b' }} />
      <span style={{
        fontSize:      10,
        color:         '#475569',
        fontWeight:    600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}>
        Lights
      </span>

      <ColorRow label="Light 1" value={c1} onChange={(v) => onChange({ color1: v })} />
      <ColorRow label="Light 2" value={c2} onChange={(v) => onChange({ color2: v })} />
      <ColorRow label="Light 3" value={c3} onChange={(v) => onChange({ color3: v })} />

      {/* ── live bokeh dot preview ── */}
      <div style={{
        height:       40,
        borderRadius: 8,
        background:   bg,
        overflow:     'hidden',
        position:     'relative',
        border:       '1px solid #1e293b',
      }}>
        {[c1, c2, c3, c1, c2].map((c, i) => (
          <div key={i} style={{
            position:     'absolute',
            width:         18 + i * 6,
            height:        18 + i * 6,
            borderRadius: '50%',
            top:           '50%',
            left:         `${12 + i * 18}%`,
            marginTop:   -(9 + i * 3),
            marginLeft:  -(9 + i * 3),
            background:  `radial-gradient(circle at 50% 50%,
              transparent 35%,
              ${c}99      45%,
              ${c}99      55%,
              transparent 65%)`,
            boxShadow:   `0 0 8px 4px ${c}44`,
            filter:      `blur(${1 + i % 2}px)`,
          }} />
        ))}
      </div>

    </div>
  );
};

export default BokehControls;