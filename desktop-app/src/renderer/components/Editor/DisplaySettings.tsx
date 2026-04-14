// src/renderer/components/Editor/DisplaySettings.tsx
// REPLACE ENTIRE FILE

import React, { useEffect, useState, useCallback } from 'react';
import usePresentationStore from '../../store/usePresentation';

interface DisplayInfo {
  id:          number;
  index:       number;
  label:       string;
  bounds:      { x: number; y: number; width: number; height: number };
  isPrimary:   boolean;
  scaleFactor: number;
}

interface PresentationSettings {
  selectedDisplayIds: number[];
  slideWidth:         number;
  slideHeight:        number;
}

const RESOLUTION_PRESETS = [
  { label: '1920 × 1080  (16:9 Full HD)',   w: 1920, h: 1080 },
  { label: '2560 × 1440  (16:9 QHD)',       w: 2560, h: 1440 },
  { label: '3840 × 2160  (16:9 4K)',        w: 3840, h: 2160 },
  { label: '1280 × 720   (16:9 HD)',        w: 1280, h:  720 },
  { label: '1024 × 768   (4:3)',            w: 1024, h:  768 },
  { label: '1440 × 1080  (4:3 HD)',         w: 1440, h: 1080 },
  { label: '2560 × 1080  (21:9 UltraWide)', w: 2560, h: 1080 },
  { label: 'Custom',                        w:    0, h:    0 },
] as const;

const MAX_DISPLAYS = 3;

const DisplaySettings: React.FC = () => {
  const [open, setOpen]           = useState(false);
  const [displays, setDisplays]   = useState<DisplayInfo[]>([]);
  const [settings, setSettings]   = useState<PresentationSettings>({
    selectedDisplayIds: [],
    slideWidth:  1920,
    slideHeight: 1080,
  });
  const [customW, setCustomW]     = useState('1920');
  const [customH, setCustomH]     = useState('1080');
  const [isCustom, setIsCustom]   = useState(false);
  const [saved, setSaved]         = useState(false);
  const [saving, setSaving]       = useState(false);

  const setCanvasResolutaion = usePresentationStore(s=>s.setCanvasResolution);

  // ── Load on open ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const api = (window as any).electronAPI;
    if (!api) return;

    Promise.all([
      api.getDisplays(),
      api.getPresentationSettings(),
    ]).then(([d, s]: [DisplayInfo[], PresentationSettings]) => {
      setDisplays(d);
      setSettings(s);
      setCustomW(String(s.slideWidth));
      setCustomH(String(s.slideHeight));
      const match = RESOLUTION_PRESETS.find(
        (p) => p.w === s.slideWidth && p.h === s.slideHeight
      );
      setIsCustom(!match || match.label === 'Custom');
    });
  }, [open]);

  // ── Toggle a display on/off ───────────────────────────────────────────────
  const toggleDisplay = (id: number) => {
    setSettings((prev) => {
      const has = prev.selectedDisplayIds.includes(id);
      if (has) {
        return { ...prev, selectedDisplayIds: prev.selectedDisplayIds.filter((x) => x !== id) };
      }
      if (prev.selectedDisplayIds.length >= MAX_DISPLAYS) return prev; // cap at 3
      return { ...prev, selectedDisplayIds: [...prev.selectedDisplayIds, id] };
    });
  };

  // ── Resolution preset change ──────────────────────────────────────────────
  const handlePresetChange = (label: string, w: number, h: number) => {
    if (label === 'Custom') { setIsCustom(true); return; }
    setIsCustom(false);
    setSettings((s) => ({ ...s, slideWidth: w, slideHeight: h }));
    setCustomW(String(w));
    setCustomH(String(h));
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    const api = (window as any).electronAPI;
    if (!api) return;

    setSaving(true);

    const finalW = isCustom ? parseInt(customW, 10) : settings.slideWidth;
    const finalH = isCustom ? parseInt(customH, 10) : settings.slideHeight;

    await api.setSelectedDisplays(settings.selectedDisplayIds);
    await api.setPresentationResolution(finalW, finalH);

    setCanvasResolutaion(finalW,finalH);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [settings, isCustom, customW, customH]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const currentPreset = isCustom
    ? 'Custom'
    : (RESOLUTION_PRESETS.find(
        (p) => p.w === settings.slideWidth && p.h === settings.slideHeight
      )?.label ?? 'Custom');

  const aspectRatio = (() => {
    const w = isCustom ? parseInt(customW) : settings.slideWidth;
    const h = isCustom ? parseInt(customH) : settings.slideHeight;
    if (!w || !h) return null;
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    const d = gcd(w, h);
    return `${w / d}:${h / d}`;
  })();

  return (
    <div style={{ position: 'relative' }}>

      {/* ── Trigger ── */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Display & Resolution Settings"
        style={{
          display:      'flex',
          alignItems:   'center',
          gap:          6,
          padding:      '6px 12px',
          background:   open ? '#1e3a5f' : '#1f2937',
          border:       `1px solid ${open ? '#3b82f6' : '#374151'}`,
          borderRadius: 6,
          color:        '#e5e7eb',
          fontSize:     12,
          cursor:       'pointer',
          whiteSpace:   'nowrap',
          transition:   'all 0.15s',
        }}
      >
        <MonitorIcon />
        <span>Displays</span>
        {settings.selectedDisplayIds.length > 0 && (
          <span style={{
            background:   '#2563eb',
            color:        '#fff',
            borderRadius: '50%',
            width:        16, height: 16,
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
            fontSize:     9,
            fontWeight:   700,
          }}>
            {settings.selectedDisplayIds.length}
          </span>
        )}
        <ChevronIcon up={open} />
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div style={{
          position:      'absolute',
          top:           'calc(100% + 6px)',
          right:         0,
          zIndex:        9999,
          width:         360,
          background:    '#111827',
          border:        '1px solid #374151',
          borderRadius:  10,
          boxShadow:     '0 8px 32px rgba(0,0,0,0.7)',
          padding:       16,
          display:       'flex',
          flexDirection: 'column',
          gap:           14,
        }}>

          <div style={{ display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: 13, color: '#f9fafb', fontWeight: 600 }}>
              🖥️ Display Settings
            </h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none',
                       color: '#6b7280', cursor: 'pointer', fontSize: 16 }}
            >×</button>
          </div>

          {/* ── Display selection ── */}
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between',
                          alignItems: 'center', marginBottom: 8 }}>
              <label style={{ color: '#9ca3af', fontSize: 11 }}>
                Presentation Displays
              </label>
              <span style={{ color: '#6b7280', fontSize: 10 }}>
                Select up to {MAX_DISPLAYS}
              </span>
            </div>

            {displays.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: 11, margin: 0 }}>
                Loading displays...
              </p>
            ) : (
              <>
                {/* Visual display layout diagram */}
                <DisplayDiagram
                  displays={displays}
                  selectedIds={settings.selectedDisplayIds}
                  onToggle={toggleDisplay}
                  maxSelectable={MAX_DISPLAYS}
                />

                {/* Display list */}
                <div style={{ display: 'flex', flexDirection: 'column',
                              gap: 5, marginTop: 10 }}>
                  {displays.map((d) => {
                    const selected = settings.selectedDisplayIds.includes(d.id);
                    const disabled = !selected &&
                      settings.selectedDisplayIds.length >= MAX_DISPLAYS;
                    return (
                      <DisplayRow
                        key={d.id}
                        display={d}
                        selected={selected}
                        disabled={disabled}
                        onToggle={() => toggleDisplay(d.id)}
                      />
                    );
                  })}
                </div>

                {settings.selectedDisplayIds.length === 0 && (
                  <p style={{ color: '#f59e0b', fontSize: 10,
                              margin: '6px 0 0', textAlign: 'center' }}>
                    ⚠️ No display selected — will use external display or primary
                  </p>
                )}
              </>
            )}
          </section>

          <Divider />

          {/* ── Resolution ── */}
          <section>
            <label style={{ color: '#9ca3af', fontSize: 11,
                            marginBottom: 8, display: 'block' }}>
              Slide Canvas Resolution
            </label>

            <select
              value={currentPreset}
              onChange={(e) => {
                const p = RESOLUTION_PRESETS.find((x) => x.label === e.target.value);
                if (p) handlePresetChange(p.label, p.w, p.h);
              }}
              style={selectStyle}
            >
              {RESOLUTION_PRESETS.map((p) => (
                <option key={p.label} value={p.label}>{p.label}</option>
              ))}
            </select>

            {isCustom && (
              <div style={{ display: 'flex', gap: 8,
                            alignItems: 'center', marginTop: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={smallLabel}>Width (px)</label>
                  <input
                    type="number" min={320} max={7680}
                    value={customW}
                    onChange={(e) => setCustomW(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <span style={{ color: '#4b5563', marginTop: 14 }}>×</span>
                <div style={{ flex: 1 }}>
                  <label style={smallLabel}>Height (px)</label>
                  <input
                    type="number" min={240} max={4320}
                    value={customH}
                    onChange={(e) => setCustomH(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
            )}

            {aspectRatio && (
              <p style={{ color: '#6b7280', fontSize: 10, margin: '5px 0 0' }}>
                Aspect ratio: {aspectRatio}
              </p>
            )}
          </section>

          {/* ── Save ── */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding:      '9px 0',
              borderRadius: 7,
              border:       'none',
              background:   saved ? '#166534' : saving ? '#1e3a5f' : '#2563eb',
              color:        '#fff',
              fontSize:     13,
              fontWeight:   600,
              cursor:       saving ? 'wait' : 'pointer',
              transition:   'background 0.2s',
            }}
          >
            {saved ? '✓ Applied!' : saving ? 'Applying...' : 'Apply Settings'}
          </button>

          <p style={{ margin: 0, fontSize: 10, color: '#4b5563', textAlign: 'center' }}>
            Display changes apply next time you start the presentation.
            <br />Resolution changes apply immediately.
          </p>
        </div>
      )}
    </div>
  );
};

// ── Display diagram component ─────────────────────────────────────────────────
interface DiagramProps {
  displays:      DisplayInfo[];
  selectedIds:   number[];
  onToggle:      (id: number) => void;
  maxSelectable: number;
}

const DisplayDiagram: React.FC<DiagramProps> = ({
  displays, selectedIds, onToggle, maxSelectable,
}) => {
  if (displays.length <= 1) return null;

  // Normalize bounds to fit in a small preview area
  const allX = displays.map((d) => d.bounds.x);
  const allY = displays.map((d) => d.bounds.y);
  const allR = displays.map((d) => d.bounds.x + d.bounds.width);
  const allB = displays.map((d) => d.bounds.y + d.bounds.height);

  const minX     = Math.min(...allX);
  const minY     = Math.min(...allY);
  const totalW   = Math.max(...allR) - minX;
  const totalH   = Math.max(...allB) - minY;

  const PREVIEW_W = 300;
  const PREVIEW_H = 80;
  const scaleW    = PREVIEW_W / totalW;
  const scaleH    = PREVIEW_H / totalH;
  const sc        = Math.min(scaleW, scaleH) * 0.85;

  return (
    <div style={{
      position:      'relative',
      width:         PREVIEW_W,
      height:        PREVIEW_H,
      background:    '#0a0f1a',
      borderRadius:  6,
      border:        '1px solid #1f2937',
      margin:        '0 auto',
      overflow:      'hidden',
    }}>
      {displays.map((d, i) => {
        const selected  = selectedIds.includes(d.id);
        const disabled  = !selected && selectedIds.length >= maxSelectable;
        const bx        = (d.bounds.x - minX) * sc + (PREVIEW_W - totalW * sc) / 2;
        const by        = (d.bounds.y - minY) * sc + (PREVIEW_H - totalH * sc) / 2;
        const bw        = d.bounds.width  * sc;
        const bh        = d.bounds.height * sc;
        const orderIdx  = selectedIds.indexOf(d.id);

        return (
          <div
            key={d.id}
            onClick={() => !disabled && onToggle(d.id)}
            title={`${d.label || `Display ${i + 1}`} (${d.bounds.width}×${d.bounds.height})`}
            style={{
              position:   'absolute',
              left:       bx, top: by,
              width:      bw, height: bh,
              borderRadius: 2,
              border:     `2px solid ${
                selected  ? '#3b82f6' :
                disabled  ? '#1f2937' : '#374151'
              }`,
              background: selected ? 'rgba(59,130,246,0.25)' : 'rgba(31,41,55,0.8)',
              cursor:     disabled ? 'not-allowed' : 'pointer',
              display:    'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
              opacity:    disabled ? 0.4 : 1,
            }}
          >
            {/* Order badge */}
            {selected && (
              <span style={{
                background:  '#2563eb',
                color:       '#fff',
                borderRadius: '50%',
                width:       14, height: 14,
                display:     'flex',
                alignItems:  'center',
                justifyContent: 'center',
                fontSize:    8,
                fontWeight:  700,
                position:    'absolute',
                top: 2, right: 2,
              }}>
                {orderIdx + 1}
              </span>
            )}
            <span style={{
              fontSize:   9,
              color:      selected ? '#93c5fd' : '#4b5563',
              fontWeight: selected ? 600 : 400,
            }}>
              {i + 1}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ── Single display row ────────────────────────────────────────────────────────
interface DisplayRowProps {
  display:  DisplayInfo;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}

const DisplayRow: React.FC<DisplayRowProps> = ({
  display, selected, disabled, onToggle,
}) => (
  <button
    type="button"
    onClick={onToggle}
    disabled={disabled}
    style={{
      display:      'flex',
      alignItems:   'center',
      gap:          10,
      padding:      '8px 10px',
      borderRadius: 7,
      border:       `1px solid ${selected ? '#3b82f6' : '#374151'}`,
      background:   selected ? '#1e3a5f' : '#1f2937',
      color:        selected ? '#93c5fd' : disabled ? '#374151' : '#d1d5db',
      cursor:       disabled ? 'not-allowed' : 'pointer',
      textAlign:    'left',
      transition:   'all 0.12s',
      opacity:      disabled ? 0.5 : 1,
      width:        '100%',
    }}
  >
    {/* Checkbox */}
    <div style={{
      width:        16, height: 16,
      borderRadius: 4,
      border:       `2px solid ${selected ? '#3b82f6' : '#4b5563'}`,
      background:   selected ? '#2563eb' : 'transparent',
      display:      'flex',
      alignItems:   'center',
      justifyContent: 'center',
      flexShrink:   0,
      transition:   'all 0.12s',
    }}>
      {selected && (
        <svg width="10" height="10" viewBox="0 0 10 10"
          fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
          <path d="M1.5 5l2.5 2.5 4.5-4.5" />
        </svg>
      )}
    </div>

    {/* Monitor icon */}
    <div style={{
      width:        28, height: 20,
      borderRadius: 2,
      border:       `2px solid ${selected ? '#3b82f6' : '#4b5563'}`,
      background:   selected ? '#1e40af' : '#111827',
      display:      'flex',
      alignItems:   'center',
      justifyContent: 'center',
      flexShrink:   0,
      fontSize:     8,
      color:        selected ? '#93c5fd' : '#4b5563',
    }}>
      {display.index + 1}
    </div>

    {/* Info */}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 500,
                    display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {display.label || `Display ${display.index + 1}`}
        </span>
        {display.isPrimary && (
          <span style={{
            fontSize: 9, background: '#374151', color: '#9ca3af',
            padding: '1px 4px', borderRadius: 3, flexShrink: 0,
          }}>Primary</span>
        )}
      </div>
      <div style={{ fontSize: 10, color: '#6b7280', marginTop: 1 }}>
        {display.bounds.width} × {display.bounds.height}
        {display.scaleFactor !== 1 && ` · ${display.scaleFactor}× HiDPI`}
        {` · (${display.bounds.x}, ${display.bounds.y})`}
      </div>
    </div>

    {/* Checkmark */}
    {selected && (
      <svg width="14" height="14" viewBox="0 0 14 14"
        fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round">
        <path d="M2 7l4 4 6-6" />
      </svg>
    )}
  </button>
);

// ── Reusable style objects ────────────────────────────────────────────────────
const selectStyle: React.CSSProperties = {
  width:        '100%',
  padding:      '6px 8px',
  background:   '#1f2937',
  border:       '1px solid #374151',
  borderRadius: 6,
  color:        '#e5e7eb',
  fontSize:     12,
  cursor:       'pointer',
};

const inputStyle: React.CSSProperties = {
  width:        '100%',
  padding:      '5px 7px',
  background:   '#1f2937',
  border:       '1px solid #374151',
  borderRadius: 5,
  color:        '#e5e7eb',
  fontSize:     12,
  boxSizing:    'border-box',
  outline:      'none',
};

const smallLabel: React.CSSProperties = {
  color:         '#6b7280',
  fontSize:      10,
  display:       'block',
  marginBottom:  3,
};

const Divider = () => (
  <div style={{ borderTop: '1px solid #1f2937' }} />
);

// ── Icons ─────────────────────────────────────────────────────────────────────
const MonitorIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
);

const ChevronIcon: React.FC<{ up: boolean }> = ({ up }) => (
  <svg width="10" height="10" viewBox="0 0 10 10"
    fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
    style={{ transform: up ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
    <path d="M1 3l4 4 4-4" />
  </svg>
);

export default DisplaySettings;