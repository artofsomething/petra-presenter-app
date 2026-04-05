// src/renderer/components/Editor/AlignmentPicker.tsx
import React from 'react';
import type { TextPlacement } from '../../utils/alignmentUtils';

interface AlignmentPickerProps {
  value:    TextPlacement;
  onChange: (placement: TextPlacement) => void;
}

const GRID: { placement: TextPlacement; label: string }[][] = [
  [
    { placement: 'topLeft',    label: '↖' },
    { placement: 'topCenter',  label: '↑' },
    { placement: 'topRight',   label: '↗' },
  ],
  [
    { placement: 'middleLeft',   label: '←' },
    { placement: 'middleCenter', label: '·' },
    { placement: 'middleRight',  label: '→' },
  ],
  [
    { placement: 'bottomLeft',   label: '↙' },
    { placement: 'bottomCenter', label: '↓' },
    { placement: 'bottomRight',  label: '↘' },
  ],
];

const AlignmentPicker: React.FC<AlignmentPickerProps> = ({ value, onChange }) => {
  return (
    <div style={styles.wrapper}>
      <span style={styles.label}>Alignment</span>
      <div style={styles.container}>
        {GRID.map((row, rowIdx) =>
          row.map(({ placement, label }) => {
            const isActive = value === placement;
            return (
              <button
                key={placement}
                title={placement}
                onClick={() => onChange(placement)}
                style={{
                  ...styles.cell,
                  ...(isActive ? styles.active : {}),
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.background = '#3a3f4b';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }
                }}
              >
                <span style={styles.icon}>{label}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
const styles: Record<string, React.CSSProperties> = {
  // ── Outer wrapper ──────────────────────────────────────────────
  wrapper: {
    display:        'inline-flex',
    flexDirection:  'column',
    gap:            '6px',
  },

  // ── Section label ──────────────────────────────────────────────
  label: {
    fontSize:      '11px',
    fontWeight:    600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color:         '#8b92a5',
  },

  // ── 3×3 grid ──────────────────────────────────────────────────
  container: {
    display:             'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap:                 '3px',
    padding:             '5px',
    background:          '#1e2330',   // dark navy background
    borderRadius:        '8px',
    border:              '1px solid #2e3447',
  },

  // ── Individual cell ───────────────────────────────────────────
  cell: {
    width:           '36px',
    height:          '36px',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    cursor:          'pointer',
    border:          'none',
    borderRadius:    '6px',
    background:      'transparent',
    transition:      'background 0.15s ease, color 0.15s ease',
    padding:         0,
  },

  // ── Active (selected) cell ────────────────────────────────────
  active: {
    background:   '#3d5afe',          // vivid blue accent — matches "Front" button
    boxShadow:    '0 0 0 1px #5c7cff',
  },

  // ── Arrow icon inside cell ────────────────────────────────────
  icon: {
    fontSize:   '16px',
    lineHeight: 1,
    color:      '#c8cdd8',            // soft light-grey arrows
    userSelect: 'none',
  },
};

export default AlignmentPicker;