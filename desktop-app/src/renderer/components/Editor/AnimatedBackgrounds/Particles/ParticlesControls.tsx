import React, {useCallback} from 'react';
import type { AnimatedBackground } from '../../../../../server/types';
import ColorRow from '../ColorRowProps';

interface ParticlesControlsProps{
    current : AnimatedBackground;
    onChange : (updated:Partial<AnimatedBackground>)=> void;
}

const ParticlesControls:React.FC<ParticlesControlsProps> = ({current, onChange})=>{
    const bg = current.backgroundColor ??'#050510';
    const c1  = current.color1 ?? '#6366f1';
    const c2  = current.color2 ?? '#8b5cf6';
    const c3  = current.color3 ?? '#06b6d4';
    const spd = current.speed  ?? 1;

    const handleReset = () =>
    onChange({
      backgroundColor: '#0a0015',     // ✅ reset bg too
      color1: '#7c3aed',
      color2: '#2563eb',
      color3: '#06b6d4',
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

        {/* ✅ Background color */}
        <ColorRow
            label="Base"
            value={bg}
            onChange={(v) => onChange({ backgroundColor: v })}
        />

        {/* ── divider ── */}
        <div style={{ height: 1, background: '#1e293b' }} />

        {/* Blob colors */}
        <ColorRow label="Blob 1" value={c1} onChange={(v) => onChange({ color1: v })} />
        <ColorRow label="Blob 2" value={c2} onChange={(v) => onChange({ color2: v })} />
        <ColorRow label="Blob 3" value={c3} onChange={(v) => onChange({ color3: v })} />

        </div>
    );
}

export default ParticlesControls;