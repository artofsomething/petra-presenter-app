import React, {useCallback} from 'react';
import type { AnimatedBackground } from '../../../../../server/types';
import ColorRow from '../ColorRowProps';

interface PlasmaControlsProps{
    current: AnimatedBackground,
    onChange : (updated: Partial<AnimatedBackground>)=>void;
}

const PlasmaControls:React.FC<PlasmaControlsProps> = ({current,onChange})=>{
    const c1  = current.color1 ?? '#ff0080';
    const c2  = current.color2 ?? '#7928ca';
    const c3  = current.color3 ?? '#0070f3';

    const handleReset = ()=>
        onChange({
            color1 : '#ff0080',
            color2: '#7928ca',
            color3: '#0070f3'
        });
    
    return (
    <div style={{
      marginTop:     8,
      padding:       10,
      background:    '#0f172a',
      borderRadius:  8,
      border:        '1px solid #1e293b',
      display:       'flex',
      flexDirection: 'column',
      gap:           8,
    }}>

      {/* ── header ── */}
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
          textTransform: 'uppercase' as const,
        }}>
          Colors
        </span>
        <button
          onClick={handleReset}
          style={{
            fontSize:     10,
            padding:      '2px 7px',
            background:   '#1e293b',
            border:       '1px solid #334155',
            borderRadius: 4,
            color:        '#64748b',
            cursor:       'pointer',
            display:      'flex',
            alignItems:   'center',
            gap:          3,
          }}
        >
          ↺ Reset
        </button>
      </div>

      {/* ── divider ── */}
      <div style={{ height: 1, background: '#1e293b' }} />

      {/* Blob colors */}
      <ColorRow label="Blob 1" value={c1} onChange={(v) => onChange({ color1: v })} />
      <ColorRow label="Blob 2" value={c2} onChange={(v) => onChange({ color2: v })} />
      <ColorRow label="Blob 3" value={c3} onChange={(v) => onChange({ color3: v })} />

    </div>
  );    
}

export default PlasmaControls;