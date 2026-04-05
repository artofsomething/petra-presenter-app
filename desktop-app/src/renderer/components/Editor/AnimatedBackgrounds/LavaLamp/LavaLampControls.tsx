// src/renderer/components/Editor/Backgrounds/LavaLampControls.tsx
import React from 'react';
import ColorRow from '../ColorRowProps';
import type { AnimatedBackground } from '../../../../../server/types';

interface LavaLampControlsProps {
  current:  AnimatedBackground;
  onChange: (updated: Partial<AnimatedBackground>) => void;
}

const LavaLampControls: React.FC<LavaLampControlsProps> = ({ current, onChange }) => {
  const bg = current.backgroundColor ?? '#1a0a00';
  const c1 = current.color1          ?? '#ff6b6b';
  const c2 = current.color2          ?? '#ffd93d';
  const c3 = current.color3          ?? '#ff8e53';

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
            backgroundColor: '#1a0a00',
            color1:          '#ff6b6b',
            color2:          '#ffd93d',
            color3:          '#ff8e53',
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
        label="Base"
        value={bg}
        onChange={(v) => onChange({ backgroundColor: v })}
      />

      {/* ── Blobs ── */}
      <div style={{ height: 1, background: '#1e293b' }} />

      <span style={{
        fontSize:      10,
        color:         '#475569',
        fontWeight:    600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}>
        Blobs
      </span>

      <ColorRow label="Blob 1" value={c1} onChange={(v) => onChange({ color1: v })} />
      <ColorRow label="Blob 2" value={c2} onChange={(v) => onChange({ color2: v })} />
      <ColorRow label="Blob 3" value={c3} onChange={(v) => onChange({ color3: v })} />

      {/* ── live blob preview ── */}
      <div style={{
        height:       32,
        borderRadius: 8,
        background:   bg,
        overflow:     'hidden',
        position:     'relative',
        border:       '1px solid #1e293b',
      }}>
        {[c1, c2, c3].map((c, i) => (
          <div key={i} style={{
            position:     'absolute',
            width:         48,
            height:        48,
            borderRadius: '50%',
            background:   `radial-gradient(circle, ${c}cc, transparent 70%)`,
            filter:       'blur(8px)',
            top:          '-8px',
            left:         `${i * 35 + 5}%`,
            mixBlendMode: 'screen',
          }} />
        ))}
      </div>

    </div>
  );
};

export default LavaLampControls;