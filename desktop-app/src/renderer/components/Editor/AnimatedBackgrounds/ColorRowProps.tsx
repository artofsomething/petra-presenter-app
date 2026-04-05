// ── small reusable color row ──────────────────────────────────────────────────
interface ColorRowProps {
  label:    string;
  value:    string;
  onChange: (hex: string) => void;
}

const ColorRow: React.FC<ColorRowProps> = ({ label, value, onChange }) => {
  // ✅ Ensure value is always a valid hex for the color input
  const safeHex = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000';

  return (
    <div style={{
      display:     'flex',
      alignItems:  'center',
      gap:         6,
      width:       '100%',
    }}>
      {/* label */}
      <span style={{
        fontSize:   11,
        color:      '#94a3b8',
        width:      36,
        flexShrink: 0,
      }}>
        {label}
      </span>

      {/* ✅ Swatch — input IS the clickable element, styled on top */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width:        22,
          height:       22,
          borderRadius: 5,
          background:   safeHex,       // ✅ live color from prop
          border:       '2px solid #334155',
          pointerEvents:'none',        // let the input handle clicks
        }} />
        <input
          type="color"
          value={safeHex}
          onChange={(e) => onChange(e.target.value)}
          style={{
            position: 'absolute',
            inset:    0,
            opacity:  0,
            width:    '100%',
            height:   '100%',
            cursor:   'pointer',
            padding:  0,
            border:   'none',
          }}
        />
      </div>

      {/* hex text input */}
      <input
        type="text"
        value={value}
        maxLength={7}
        spellCheck={false}
        onChange={(e) => {
          const v = e.target.value.startsWith('#')
            ? e.target.value
            : `#${e.target.value}`;
          if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v);
        }}
        style={{
          width:        80,            // ✅ fixed width instead of flex:1
          background:   '#1e293b',
          border:       '1px solid #334155',
          borderRadius: 5,
          color:        '#e2e8f0',
          fontSize:     11,
          padding:      '3px 7px',
          fontFamily:   'monospace',
          outline:      'none',
          flexShrink:   0,
        }}
      />
    </div>
  );
};
export default ColorRow;