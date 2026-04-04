// src/renderer/components/Editor/GradientPicker.tsx
import React, { useState, useCallback, useRef } from 'react';
import type { GradientConfig, GradientStop } from '../../../server/types';

interface GradientPickerProps {
  /** Current solid color (used when no gradient active) */
  solidColor:       string;
  gradient?:        GradientConfig;
  onSolidChange:    (color: string) => void;
  onGradientChange: (gradient: GradientConfig | undefined) => void;
  label?:           string;
}

const DEFAULT_GRADIENT: GradientConfig = {
  type:  'linear',
  angle: 90,
  stops: [
    { offset: 0,   color: '#3b82f6' },
    { offset: 1,   color: '#8b5cf6' },
  ],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Build a CSS gradient string for preview */
function toCSSGradient(g: GradientConfig): string {
  const stops = g.stops
    .slice()
    .sort((a, b) => a.offset - b.offset)
    .map((s) => `${s.color} ${(s.offset * 100).toFixed(0)}%`)
    .join(', ');

  if (g.type === 'radial') {
    return `radial-gradient(circle, ${stops})`;
  }
  return `linear-gradient(${g.angle}deg, ${stops})`;
}

/** Convert angle → konva-compatible {start,end} points (0-1 space) */
export function gradientToKonvaPoints(
  angle: number,
  w: number,
  h: number
): { startPoint: { x: number; y: number }; endPoint: { x: number; y: number } } {
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Centre is (0.5w, 0.5h); extend by half-diagonal
  const cx = w / 2;
  const cy = h / 2;
  const len = Math.sqrt(w * w + h * h) / 2;

  return {
    startPoint: { x: cx - cos * len, y: cy - sin * len },
    endPoint:   { x: cx + cos * len, y: cy + sin * len },
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

const GradientPicker: React.FC<GradientPickerProps> = ({
  solidColor,
  gradient,
  onSolidChange,
  onGradientChange,
  label = 'Fill',
}) => {
  const [expanded, setExpanded]   = useState(false);
  const [mode, setMode]           = useState<'solid' | 'gradient'>(
    gradient ? 'gradient' : 'solid'
  );
  const [localGrad, setLocalGrad] = useState<GradientConfig>(
    gradient ?? DEFAULT_GRADIENT
  );
  // which stop index is being edited
  const [activeStop, setActiveStop] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  // ── Mode toggle ───────────────────────────────────────
  const handleModeChange = (m: 'solid' | 'gradient') => {
    setMode(m);
    if (m === 'gradient') {
      onGradientChange(localGrad);
    } else {
      onGradientChange(undefined);
    }
  };

  // ── Gradient mutators ─────────────────────────────────
  const updateGrad = useCallback((next: GradientConfig) => {
    setLocalGrad(next);
    onGradientChange(next);
  }, [onGradientChange]);

  const updateStop = (index: number, partial: Partial<GradientStop>) => {
    const stops = localGrad.stops.map((s, i) =>
      i === index ? { ...s, ...partial } : s
    );
    updateGrad({ ...localGrad, stops });
  };

  const addStop = () => {
    if (localGrad.stops.length >= 6) return;
    // insert at midpoint between last two stops
    const sorted = [...localGrad.stops].sort((a, b) => a.offset - b.offset);
    const last   = sorted[sorted.length - 1];
    const prev   = sorted[sorted.length - 2];
    const mid    = (last.offset + prev.offset) / 2;
    const stops  = [...localGrad.stops, { offset: mid, color: '#ffffff' }];
    updateGrad({ ...localGrad, stops });
    setActiveStop(stops.length - 1);
  };

  const removeStop = (index: number) => {
    if (localGrad.stops.length <= 2) return;
    const stops = localGrad.stops.filter((_, i) => i !== index);
    updateGrad({ ...localGrad, stops });
    setActiveStop(Math.max(0, index - 1));
  };

  // ── Drag stop on track ────────────────────────────────
  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect  = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    updateStop(activeStop, { offset: ratio });
  };

  const cssPreview = mode === 'gradient'
    ? toCSSGradient(localGrad)
    : solidColor;

  return (
    <div style={{ width: '100%' }}>

      {/* ── Row: label + preview swatch + expand toggle ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <label style={{ color: '#9ca3af', fontSize: 11, flex: 1 }}>{label}</label>

        {/* Swatch preview */}
        <div
          onClick={() => setExpanded((o) => !o)}
          style={{
            width: 56, height: 22,
            borderRadius: 4,
            border: '1px solid #4b5563',
            background: cssPreview,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        />

        {/* Expand chevron */}
        <button
          type="button"
          onClick={() => setExpanded((o) => !o)}
          style={{
            background: 'none', border: 'none',
            color: '#9ca3af', cursor: 'pointer', padding: 2,
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10"
            fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d={expanded ? 'M1 7l4-4 4 4' : 'M1 3l4 4 4-4'} />
          </svg>
        </button>
      </div>

      {/* ── Expanded panel ────────────────────────────── */}
      {expanded && (
        <div style={{
          background: '#111827',
          border: '1px solid #374151',
          borderRadius: 8,
          padding: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>

          {/* Mode tabs */}
          <div style={{ display: 'flex', gap: 4 }}>
            {(['solid', 'gradient'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => handleModeChange(m)}
                style={{
                  flex: 1, padding: '4px 0',
                  borderRadius: 5,
                  border: '1px solid',
                  borderColor: mode === m ? '#3b82f6' : '#374151',
                  background:  mode === m ? '#1e3a5f' : 'transparent',
                  color:       mode === m ? '#93c5fd' : '#9ca3af',
                  fontSize: 11, cursor: 'pointer', fontWeight: mode === m ? 600 : 400,
                }}
              >
                {m === 'solid' ? '■ Solid' : '▦ Gradient'}
              </button>
            ))}
          </div>

          {/* ── SOLID mode ── */}
          {mode === 'solid' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="color"
                value={solidColor}
                onChange={(e) => onSolidChange(e.target.value)}
                style={{ width: 40, height: 30, borderRadius: 4,
                         border: '1px solid #4b5563', cursor: 'pointer' }}
              />
              <input
                type="text"
                value={solidColor}
                onChange={(e) => {
                  if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value))
                    onSolidChange(e.target.value);
                }}
                style={{
                  flex: 1, background: '#1f2937',
                  border: '1px solid #374151', borderRadius: 4,
                  color: '#fff', fontSize: 11, padding: '3px 6px',
                  outline: 'none', fontFamily: 'monospace',
                }}
              />
            </div>
          )}

          {/* ── GRADIENT mode ── */}
          {mode === 'gradient' && (
            <>
              {/* Type + Angle */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {/* Type */}
                <div style={{ display: 'flex', gap: 3 }}>
                  {(['linear', 'radial'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => updateGrad({ ...localGrad, type: t })}
                      style={{
                        padding: '3px 8px', borderRadius: 4,
                        border: '1px solid',
                        borderColor: localGrad.type === t ? '#3b82f6' : '#374151',
                        background:  localGrad.type === t ? '#1e3a5f' : 'transparent',
                        color:       localGrad.type === t ? '#93c5fd' : '#9ca3af',
                        fontSize: 10, cursor: 'pointer',
                      }}
                    >
                      {t === 'linear' ? '↗ Linear' : '◎ Radial'}
                    </button>
                  ))}
                </div>

                {/* Angle (linear only) */}
                {localGrad.type === 'linear' && (
                  <div style={{ display: 'flex', alignItems: 'center',
                                gap: 4, marginLeft: 'auto' }}>
                    <label style={{ color: '#9ca3af', fontSize: 10 }}>
                      {localGrad.angle}°
                    </label>
                    <input
                      type="range" min={0} max={360} step={1}
                      value={localGrad.angle}
                      onChange={(e) =>
                        updateGrad({ ...localGrad, angle: Number(e.target.value) })
                      }
                      style={{ width: 70 }}
                    />
                  </div>
                )}
              </div>

              {/* Gradient track preview + stop markers */}
              <div style={{ position: 'relative' }}>
                {/* Track */}
                <div
                  ref={trackRef}
                  onClick={handleTrackClick}
                  style={{
                    height: 20,
                    borderRadius: 10,
                    background: toCSSGradient({ ...localGrad, type: 'linear', angle: 90 }),
                    border: '1px solid #374151',
                    cursor: 'crosshair',
                    position: 'relative',
                  }}
                />

                {/* Stop handles */}
                {localGrad.stops.map((stop, i) => (
                  <div
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setActiveStop(i); }}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: `${stop.offset * 100}%`,
                      transform: 'translate(-50%, -50%)',
                      width: 14, height: 14,
                      borderRadius: '50%',
                      background: stop.color,
                      border: activeStop === i
                        ? '2px solid #fff'
                        : '2px solid #6b7280',
                      cursor: 'pointer',
                      boxShadow: activeStop === i ? '0 0 0 2px #3b82f6' : 'none',
                      zIndex: 1,
                    }}
                  />
                ))}
              </div>

              {/* Active stop editor */}
              <div style={{
                background: '#1f2937',
                borderRadius: 6, padding: '8px',
                border: '1px solid #374151',
              }}>
                <div style={{ display: 'flex', alignItems: 'center',
                              gap: 8, marginBottom: 6 }}>
                  <span style={{ color: '#9ca3af', fontSize: 10 }}>
                    Stop {activeStop + 1} of {localGrad.stops.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeStop(activeStop)}
                    disabled={localGrad.stops.length <= 2}
                    style={{
                      marginLeft: 'auto',
                      padding: '1px 6px', borderRadius: 4,
                      border: '1px solid #7f1d1d',
                      background: 'transparent',
                      color: localGrad.stops.length <= 2 ? '#4b5563' : '#fca5a5',
                      fontSize: 10, cursor: localGrad.stops.length <= 2 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Remove
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {/* Color */}
                  <input
                    type="color"
                    value={localGrad.stops[activeStop]?.color ?? '#ffffff'}
                    onChange={(e) => updateStop(activeStop, { color: e.target.value })}
                    style={{ width: 36, height: 28, borderRadius: 4,
                             border: '1px solid #4b5563', cursor: 'pointer' }}
                  />
                  {/* Hex input */}
                  <input
                    type="text"
                    value={localGrad.stops[activeStop]?.color ?? '#ffffff'}
                    onChange={(e) => {
                      if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value))
                        updateStop(activeStop, { color: e.target.value });
                    }}
                    style={{
                      width: 70, background: '#111827',
                      border: '1px solid #374151', borderRadius: 4,
                      color: '#fff', fontSize: 11,
                      padding: '3px 6px', outline: 'none',
                      fontFamily: 'monospace',
                    }}
                  />
                  {/* Position */}
                  <label style={{ color: '#9ca3af', fontSize: 10, marginLeft: 'auto' }}>
                    {Math.round((localGrad.stops[activeStop]?.offset ?? 0) * 100)}%
                  </label>
                  <input
                    type="range" min={0} max={100} step={1}
                    value={Math.round((localGrad.stops[activeStop]?.offset ?? 0) * 100)}
                    onChange={(e) =>
                      updateStop(activeStop, { offset: Number(e.target.value) / 100 })
                    }
                    style={{ width: 60 }}
                  />
                </div>
              </div>

              {/* Add stop */}
              <button
                type="button"
                onClick={addStop}
                disabled={localGrad.stops.length >= 6}
                style={{
                  width: '100%', padding: '4px 0',
                  borderRadius: 5,
                  border: '1px dashed #374151',
                  background: 'transparent',
                  color: localGrad.stops.length >= 6 ? '#4b5563' : '#9ca3af',
                  fontSize: 11, cursor: localGrad.stops.length >= 6 ? 'not-allowed' : 'pointer',
                }}
              >
                + Add Stop {localGrad.stops.length >= 6 ? '(max 6)' : ''}
              </button>

              {/* Quick presets */}
              <div>
                <label style={{ color: '#6b7280', fontSize: 10 }}>Presets</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  {GRADIENT_PRESETS.map((preset) => (
                    <div
                      key={preset.name}
                      title={preset.name}
                      onClick={() => updateGrad(preset.config)}
                      style={{
                        width: 28, height: 28,
                        borderRadius: 5,
                        background: toCSSGradient(preset.config),
                        border: '1px solid #374151',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ── Presets ───────────────────────────────────────────────────────────────────
const GRADIENT_PRESETS: { name: string; config: GradientConfig }[] = [
  {
    name: 'Ocean',
    config: { type: 'linear', angle: 135,
      stops: [{ offset: 0, color: '#0ea5e9' }, { offset: 1, color: '#6366f1' }] },
  },
  {
    name: 'Sunset',
    config: { type: 'linear', angle: 90,
      stops: [{ offset: 0, color: '#f97316' }, { offset: 1, color: '#ec4899' }] },
  },
  {
    name: 'Forest',
    config: { type: 'linear', angle: 135,
      stops: [{ offset: 0, color: '#22c55e' }, { offset: 1, color: '#14b8a6' }] },
  },
  {
    name: 'Night',
    config: { type: 'linear', angle: 180,
      stops: [{ offset: 0, color: '#1e1b4b' }, { offset: 1, color: '#0f172a' }] },
  },
  {
    name: 'Gold',
    config: { type: 'linear', angle: 90,
      stops: [{ offset: 0, color: '#f59e0b' }, { offset: 1, color: '#ef4444' }] },
  },
  {
    name: 'Rose',
    config: { type: 'radial', angle: 0,
      stops: [{ offset: 0, color: '#fda4af' }, { offset: 1, color: '#9f1239' }] },
  },
  {
    name: 'Aurora',
    config: { type: 'linear', angle: 135,
      stops: [
        { offset: 0,   color: '#06b6d4' },
        { offset: 0.5, color: '#8b5cf6' },
        { offset: 1,   color: '#ec4899' },
      ],
    },
  },
  {
    name: 'Charcoal',
    config: { type: 'linear', angle: 180,
      stops: [{ offset: 0, color: '#374151' }, { offset: 1, color: '#111827' }] },
  },
];

export { toCSSGradient };
export default GradientPicker;