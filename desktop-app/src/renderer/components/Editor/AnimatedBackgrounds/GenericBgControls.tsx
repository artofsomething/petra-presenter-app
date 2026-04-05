// ── GenericBgControls.tsx — reusable for all simple 3-color + bg backgrounds ──
// src/renderer/components/Editor/Backgrounds/GenericBgControls.tsx
import React from 'react';
import ColorRow from './ColorRowProps';
import type { AnimatedBackground } from '../../../../server/types';

interface GenericBgControlsProps {
  current:  AnimatedBackground;
  onChange: (updated: Partial<AnimatedBackground>) => void;
  labels:   [string, string, string];
  defaults: {
    backgroundColor:  string;
    color1:           string;
    color2:           string;
    color3:           string;
  };
}

const GenericBgControls: React.FC<GenericBgControlsProps> = ({
  current, onChange, labels, defaults,
}) => {
  const bg = current.backgroundColor ?? defaults.backgroundColor;
  const c1 = current.color1          ?? defaults.color1;
  const c2 = current.color2          ?? defaults.color2;
  const c3 = current.color3          ?? defaults.color3;

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                       color: '#64748b', textTransform: 'uppercase' }}>
          Colors
        </span>
        <button
          onClick={() => onChange(defaults)}
          style={{ fontSize: 10, padding: '2px 8px', background: '#1e293b',
                   border: '1px solid #334155', borderRadius: 4,
                   color: '#94a3b8', cursor: 'pointer' }}
        >
          ↺ Reset
        </button>
      </div>

      <div style={{ height: 1, background: '#1e293b' }} />
      <span style={{ fontSize: 10, color: '#475569', fontWeight: 600,
                     letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Background
      </span>
      <ColorRow label="Base" value={bg} onChange={(v) => onChange({ backgroundColor: v })} />

      <div style={{ height: 1, background: '#1e293b' }} />
      <span style={{ fontSize: 10, color: '#475569', fontWeight: 600,
                     letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Colors
      </span>
      <ColorRow label={labels[0]} value={c1} onChange={(v) => onChange({ color1: v })} />
      <ColorRow label={labels[1]} value={c2} onChange={(v) => onChange({ color2: v })} />
      <ColorRow label={labels[2]} value={c3} onChange={(v) => onChange({ color3: v })} />
    </div>
  );
};

export default GenericBgControls;