// src/renderer/components/Editor/Backgrounds/WavesControls.tsx
import React from 'react';
import ColorRow from '../ColorRowProps';
import type { AnimatedBackground } from '../../../../../server/types';

interface WavesControlsProps {
  current:  AnimatedBackground;
  onChange: (updated: Partial<AnimatedBackground>) => void;
}

const WavesControls: React.FC<WavesControlsProps> = ({ current, onChange }) => {
  const bg1 = current.backgroundColor  ?? '#000000';
  const bg2 = current.backgroundColor2 ?? '#0f172a';
  const c1  = current.color1           ?? '#1e40af';
  const c2  = current.color2           ?? '#7c3aed';
  const c3  = current.color3           ?? '#0891b2';

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
            backgroundColor:  '#000000',
            backgroundColor2: '#0f172a',
            color1:           '#1e40af',
            color2:           '#7c3aed',
            color3:           '#0891b2',
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

      {/* ── Background gradient ── */}
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
        label="Top"
        value={bg1}
        onChange={(v) => onChange({ backgroundColor: v })}
      />
      <ColorRow
        label="Bottom"
        value={bg2}
        onChange={(v) => onChange({ backgroundColor2: v })}
      />

      {/* ── Gradient preview strip ── */}
      <div style={{
        height:       12,
        borderRadius: 6,
        background:   `linear-gradient(90deg, ${bg1} 0%, ${bg2} 100%)`,
        border:       '1px solid #1e293b',
      }} />

      {/* ── Wave colors ── */}
      <div style={{ height: 1, background: '#1e293b' }} />

      <span style={{
        fontSize:      10,
        color:         '#475569',
        fontWeight:    600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}>
        Waves
      </span>

      <ColorRow label="Wave 1" value={c2} onChange={(v) => onChange({ color2: v })} />
      <ColorRow label="Wave 2" value={c1} onChange={(v) => onChange({ color1: v })} />
      <ColorRow label="Wave 3" value={c3} onChange={(v) => onChange({ color3: v })} />

    </div>
  );
};

export default WavesControls;