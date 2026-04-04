// src/renderer/components/Editor/MobilePropertiesPanel.tsx
import React, { useState, useRef } from 'react';
import usePresentationStore from '../../store/usePresentation';
import { createBlobUrl, readFileAsDataUrl } from '../../utils/fileManager';
import GradientPicker from '../Editor/GradientPicker';
import FontPicker from '../Editor/FontPicker';
import AnimatedBgPicker from '../Editor/AnimatedBgPicker';
import AlignmentToolbar from '../Editor/AlignmentToolbar';
import LayerControls from '../Editor/LayerControls';
import TransitionControl from '../Editor/TransitionControl';

// ─────────────────────────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Full-width touch-friendly number input row */
const NumRow: React.FC<{
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}> = ({ label, value, onChange, min, max, step = 1 }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-gray-400 text-xs shrink-0 w-16">{label}</span>
    <div className="flex items-center gap-1 flex-1">
      <button
        onPointerDown={() => onChange(Math.max(min ?? -9999, value - (step ?? 1)))}
        className="w-8 h-8 flex items-center justify-center rounded-lg
                   bg-gray-700 text-white hover:bg-gray-600 active:bg-gray-500
                   text-sm font-bold shrink-0 select-none"
      >−</button>
      <input
        type="number"
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min} max={max}
        className="flex-1 bg-gray-700 text-white text-center rounded-lg
                   px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500
                   [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none
                   [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        onPointerDown={() => onChange(Math.min(max ?? 9999, value + (step ?? 1)))}
        className="w-8 h-8 flex items-center justify-center rounded-lg
                   bg-gray-700 text-white hover:bg-gray-600 active:bg-gray-500
                   text-sm font-bold shrink-0 select-none"
      >＋</button>
    </div>
  </div>
);

/** Slider row */
const SliderRow: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  display?: string;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, step = 0.01, display, onChange }) => (
  <div className="space-y-1">
    <div className="flex justify-between">
      <span className="text-gray-400 text-xs">{label}</span>
      <span className="text-gray-300 text-xs font-mono">{display ?? value}</span>
    </div>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-2 accent-blue-500 cursor-pointer"
    />
  </div>
);

/** Color swatch + native picker */
const ColorRow: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
}> = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between">
    <span className="text-gray-400 text-xs">{label}</span>
    <label className="flex items-center gap-2 cursor-pointer">
      <div
        className="w-8 h-8 rounded-lg border-2 border-gray-600"
        style={{ background: value }}
      />
      <input
        type="color" value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
      />
      <span className="text-gray-400 text-[10px] font-mono">{value}</span>
    </label>
  </div>
);

/** Toggle button group */
const ToggleGroup: React.FC<{
  options: { label: string; value: string; emoji?: string }[];
  value:   string;
  onChange: (v: string) => void;
}> = ({ options, value, onChange }) => (
  <div className="flex gap-1">
    {options.map((o) => (
      <button
        key={o.value}
        onClick={() => onChange(o.value)}
        className={`flex-1 py-2 text-xs rounded-lg font-medium transition-colors ${
          value === o.value
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
        }`}
      >
        {o.emoji ? `${o.emoji} ` : ''}{o.label}
      </button>
    ))}
  </div>
);

/** Section divider */
const Divider: React.FC<{ label?: string }> = ({ label }) => (
  <div className="flex items-center gap-2 py-1">
    {label && <span className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider shrink-0">{label}</span>}
    <div className="flex-1 h-px bg-gray-700" />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Tab types
// ─────────────────────────────────────────────────────────────────────────────
type Tab = 'element' | 'slide' | 'notes';

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const MobilePropertiesPanel: React.FC = () => {
  const {
    presentation, currentSlideIndex, selectedElementId,
    updateElement, deleteElement, updateSlide,
  } = usePresentationStore();

  const bgImageInputRef      = useRef<HTMLInputElement>(null);
  const bgVideoInputRef      = useRef<HTMLInputElement>(null);
  const elementImageInputRef = useRef<HTMLInputElement>(null);

  const currentSlide    = presentation?.slides[currentSlideIndex];
  const selectedElement = currentSlide?.elements.find(el => el.id === selectedElementId);

  // Auto-switch to element tab when something is selected
  const [tab, setTab] = useState<Tab>('element');

  if (!currentSlide) return null;

  // ── File handlers ─────────────────────────────────────────────────────────
  const onBgVideoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const slideIdx = usePresentationStore.getState().currentSlideIndex;
    const blobUrl  = createBlobUrl(file);
    usePresentationStore.getState().updateSlide(slideIdx, {
      backgroundVideo: blobUrl, backgroundVideoLoop: true, backgroundVideoMuted: true,
    });
    e.target.value = '';
  };

  const onBgImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const slideIdx = usePresentationStore.getState().currentSlideIndex;
    const dataUrl  = await readFileAsDataUrl(file);
    if (dataUrl) usePresentationStore.getState().updateSlide(slideIdx, { backgroundImage: dataUrl });
    e.target.value = '';
  };

  const onElementImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const state     = usePresentationStore.getState();
    const elementId = state.selectedElementId;
    const slideIdx  = state.currentSlideIndex;
    if (!elementId) return;
    const dataUrl = await readFileAsDataUrl(file);
    if (dataUrl) state.updateElement(slideIdx, elementId, { src: dataUrl });
    e.target.value = '';
  };

  // ── Shortcut for updating selected element ────────────────────────────────
  const upEl = (patch: Record<string, any>) => {
    if (!selectedElement) return;
    updateElement(currentSlideIndex, selectedElement.id, patch);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-gray-900">

      {/* ── Hidden file inputs ── */}
      <input ref={bgVideoInputRef}      type="file" accept="video/mp4,video/webm,video/ogg"
             style={{ display:'none' }} onChange={onBgVideoSelected} />
      <input ref={bgImageInputRef}      type="file" accept="image/png,image/jpeg,image/gif,image/webp"
             style={{ display:'none' }} onChange={onBgImageSelected} />
      <input ref={elementImageInputRef} type="file" accept="image/*"
             style={{ display:'none' }} onChange={onElementImageSelected} />

      {/* ── Tab bar ── */}
      <div className="flex border-b border-gray-800 shrink-0 px-2 pt-1 gap-1">
        {([ 
          { id: 'element', label: selectedElement ? `✏️ ${selectedElement.type}` : '✏️ Element' },
          { id: 'slide',   label: '🖼️ Slide' },
          { id: 'notes',   label: '📝 Notes' },
        ] as { id: Tab; label: string }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 text-xs font-semibold rounded-t-lg transition-colors
              ${tab === t.id
                ? 'text-blue-400 bg-gray-800 border-b-2 border-blue-400'
                : 'text-gray-500 hover:text-gray-300'
              } ${t.id === 'element' && !selectedElement ? 'opacity-40' : ''}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4">

        {/* ══════════════════════════════
            TAB: ELEMENT
            ══════════════════════════════ */}
        {tab === 'element' && (
          <>
            {!selectedElement ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <span className="text-4xl">👆</span>
                <p className="text-gray-500 text-sm text-center">
                  Tap an element on the canvas to edit its properties
                </p>
              </div>
            ) : (
              <>
                {/* ── Transform ── */}
                <Divider label="Position & Size" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-800 rounded-xl p-3 space-y-2">
                    <span className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">X</span>
                    <div className="flex items-center gap-1">
                      <button
                        onPointerDown={() => updateElement(currentSlideIndex, selectedElement.id, { x: selectedElement.x - 1 })}
                        className="w-7 h-7 flex items-center justify-center rounded-lg
                                  bg-gray-700 text-white hover:bg-gray-600 active:bg-gray-500
                                  text-sm font-bold shrink-0 select-none"
                      >−</button>
                      <input
                        type="number"
                        value={Math.round(selectedElement.x)}
                        onChange={(e) => upEl({ x: Number(e.target.value) })}
                        className="flex-1 min-w-0 bg-gray-700 text-white text-center rounded-lg
                                  px-1 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-500
                                  [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none
                                  [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        onPointerDown={() => upEl({ x: selectedElement.x + 1 })}
                        className="w-7 h-7 flex items-center justify-center rounded-lg
                                  bg-gray-700 text-white hover:bg-gray-600 active:bg-gray-500
                                  text-sm font-bold shrink-0 select-none"
                      >＋</button>
                    </div>
                  </div>

                  {/* Y */}
                  <div className="bg-gray-800 rounded-xl p-3 space-y-2">
                    <span className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">Y</span>
                    <div className="flex items-center gap-1">
                      <button
                        onPointerDown={() => upEl({ y: selectedElement.y - 1 })}
                        className="w-7 h-7 flex items-center justify-center rounded-lg
                                  bg-gray-700 text-white hover:bg-gray-600 active:bg-gray-500
                                  text-sm font-bold shrink-0 select-none"
                      >−</button>
                      <input
                        type="number"
                        value={Math.round(selectedElement.y)}
                        onChange={(e) => upEl({ y: Number(e.target.value) })}
                        className="flex-1 min-w-0 bg-gray-700 text-white text-center rounded-lg
                                  px-1 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-500
                                  [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none
                                  [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        onPointerDown={() => upEl({ y: selectedElement.y + 1 })}
                        className="w-7 h-7 flex items-center justify-center rounded-lg
                                  bg-gray-700 text-white hover:bg-gray-600 active:bg-gray-500
                                  text-sm font-bold shrink-0 select-none"
                      >＋</button>
                    </div>
                  </div>

                  {/* W */}
                  <div className="bg-gray-800 rounded-xl p-3 space-y-2">
                    <span className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">Width</span>
                    <div className="flex items-center gap-1">
                      <button
                        onPointerDown={() => upEl({ width: Math.max(10, selectedElement.width - 1) })}
                        className="w-7 h-7 flex items-center justify-center rounded-lg
                                  bg-gray-700 text-white hover:bg-gray-600 active:bg-gray-500
                                  text-sm font-bold shrink-0 select-none"
                      >−</button>
                      <input
                        type="number"
                        value={Math.round(selectedElement.width)}
                        onChange={(e) => upEl({ width: Math.max(10, Number(e.target.value)) })}
                        min={10}
                        className="flex-1 min-w-0 bg-gray-700 text-white text-center rounded-lg
                                  px-1 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-500
                                  [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none
                                  [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        onPointerDown={() => upEl({ width: selectedElement.width + 1 })}
                        className="w-7 h-7 flex items-center justify-center rounded-lg
                                  bg-gray-700 text-white hover:bg-gray-600 active:bg-gray-500
                                  text-sm font-bold shrink-0 select-none"
                      >＋</button>
                    </div>
                  </div>

                  {/* H */}
                  <div className="bg-gray-800 rounded-xl p-3 space-y-2">
                    <span className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">Height</span>
                    <div className="flex items-center gap-1">
                      <button
                        onPointerDown={() => upEl({ height: Math.max(10, selectedElement.height - 1) })}
                        className="w-7 h-7 flex items-center justify-center rounded-lg
                                  bg-gray-700 text-white hover:bg-gray-600 active:bg-gray-500
                                  text-sm font-bold shrink-0 select-none"
                      >−</button>
                      <input
                        type="number"
                        value={Math.round(selectedElement.height)}
                        onChange={(e) => upEl({ height: Math.max(10, Number(e.target.value)) })}
                        min={10}
                        className="flex-1 min-w-0 bg-gray-700 text-white text-center rounded-lg
                                  px-1 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-500
                                  [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none
                                  [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        onPointerDown={() => upEl({ height: selectedElement.height + 1 })}
                        className="w-7 h-7 flex items-center justify-center rounded-lg
                                  bg-gray-700 text-white hover:bg-gray-600 active:bg-gray-500
                                  text-sm font-bold shrink-0 select-none"
                      >＋</button>
                    </div>
                  </div>
                </div>

                <SliderRow
                  label="Rotation" value={selectedElement.rotation || 0}
                  min={0} max={360} step={1}
                  display={`${selectedElement.rotation || 0}°`}
                  onChange={(v) => upEl({ rotation: v })}
                />
                <SliderRow
                  label="Opacity" value={selectedElement.opacity ?? 1}
                  min={0} max={1} step={0.05}
                  display={`${Math.round((selectedElement.opacity ?? 1) * 100)}%`}
                  onChange={(v) => upEl({ opacity: v })}
                />

                {/* ── TEXT ── */}
                {selectedElement.type === 'text' && (
                  <>
                    <Divider label="Text" />

                    <NumRow label="Font Size" value={selectedElement.fontSize || 24}
                      onChange={(v) => upEl({ fontSize: Math.max(6, v) })} min={6} />

                    <div className="space-y-1">
                      <span className="text-gray-400 text-xs">Font Family</span>
                      <FontPicker
                        value={selectedElement.fontFamily || 'Arial'}
                        onChange={(fontFamily) => upEl({ fontFamily })}
                      />
                    </div>

                    <ColorRow
                      label="Text Color"
                      value={selectedElement.fontColor || '#ffffff'}
                      onChange={(v) => upEl({ fontColor: v })}
                    />

                    <Divider label="Style" />

                    {/* Bold / Italic */}
                    <ToggleGroup
                      options={[
                        { label: 'Bold',   value: 'bold'   },
                        { label: 'Normal', value: 'normal' },
                      ]}
                      value={selectedElement.fontWeight || 'normal'}
                      onChange={(v) => upEl({ fontWeight: v })}
                    />
                    <ToggleGroup
                      options={[
                        { label: 'Italic', value: 'italic' },
                        { label: 'Normal', value: 'normal' },
                      ]}
                      value={selectedElement.fontStyle || 'normal'}
                      onChange={(v) => upEl({ fontStyle: v })}
                    />

                    {/* Alignment */}
                    <ToggleGroup
                      options={[
                        { label: '≡←',  value: 'left'   },
                        { label: '≡↔', value: 'center' },
                        { label: '→≡',  value: 'right'  },
                      ]}
                      value={selectedElement.textAlign || 'left'}
                      onChange={(v) => upEl({ textAlign: v })}
                    />

                    <Divider label="Stroke" />
                    <ColorRow
                      label="Stroke Color"
                      value={selectedElement.strokeColor || '#000000'}
                      onChange={(v) => upEl({ strokeColor: v })}
                    />
                    <NumRow
                      label="Stroke W" value={selectedElement.strokeWidth || 0}
                      min={0} max={20}
                      onChange={(v) => upEl({ strokeWidth: v })}
                    />
                  </>
                )}

                {/* ── SHAPE ── */}
                {selectedElement.type === 'shape' && (
                  <>
                    <Divider label="Fill" />
                    <GradientPicker
                      label="Fill"
                      solidColor={selectedElement.fill || '#3b82f6'}
                      gradient={selectedElement.fillGradient}
                      onSolidChange={(color) =>
                        upEl({ fill: color, fillGradient: undefined })
                      }
                      onGradientChange={(gradient) =>
                        upEl({ fillGradient: gradient, fill: gradient ? undefined : (selectedElement.fill ?? '#3b82f6') })
                      }
                    />

                    <Divider label="Stroke" />
                    <ColorRow
                      label="Stroke Color"
                      value={selectedElement.stroke || '#000000'}
                      onChange={(v) => upEl({ stroke: v })}
                    />
                    <NumRow
                      label="Stroke W" value={selectedElement.strokeWidth || 0}
                      min={0} max={20}
                      onChange={(v) => upEl({ strokeWidth: v })}
                    />

                    {/* Rounded rect corner radius */}
                    {selectedElement.shapeType === 'rounded-rect' && (
                      <>
                        <Divider label="Corners" />
                        <SliderRow
                          label="Corner Radius"
                          value={selectedElement.cornerRadius ?? 20}
                          min={0} max={100} step={1}
                          display={`${selectedElement.cornerRadius ?? 20}px`}
                          onChange={(v) => upEl({ cornerRadius: v })}
                        />
                        <div className="flex justify-between text-[10px] text-gray-500 -mt-2 px-1">
                          <span>Square</span>
                          <span>Pill</span>
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* ── IMAGE ── */}
                {selectedElement.type === 'image' && (
                  <>
                    <Divider label="Image" />
                    {selectedElement.src && (
                      <div className="rounded-xl overflow-hidden border border-gray-700"
                           style={{ aspectRatio: '16/9' }}>
                        <img src={selectedElement.src} alt="current"
                             className="w-full h-full object-cover" />
                      </div>
                    )}
                    <button
                      onClick={() => elementImageInputRef.current?.click()}
                      className="w-full py-3 bg-gray-700 text-white rounded-xl
                                 text-sm hover:bg-gray-600 active:bg-gray-500
                                 transition-colors font-medium"
                    >
                      🔄 Change Image
                    </button>
                  </>
                )}

                {/* ── VIDEO ── */}
                {selectedElement.type === 'video' && (
                  <>
                    <Divider label="Video" />
                    <div className="space-y-3">
                      <label className="flex items-center justify-between
                                        bg-gray-800 rounded-xl px-4 py-3 cursor-pointer">
                        <span className="text-sm text-gray-300">Autoplay</span>
                        <input type="checkbox"
                          checked={selectedElement.autoplay ?? false}
                          onChange={(e) => upEl({ autoplay: e.target.checked })}
                          className="w-5 h-5 accent-blue-500 cursor-pointer"
                        />
                      </label>
                      <label className="flex items-center justify-between
                                        bg-gray-800 rounded-xl px-4 py-3 cursor-pointer">
                        <span className="text-sm text-gray-300">Loop</span>
                        <input type="checkbox"
                          checked={selectedElement.loop ?? false}
                          onChange={(e) => upEl({ loop: e.target.checked })}
                          className="w-5 h-5 accent-blue-500 cursor-pointer"
                        />
                      </label>
                    </div>
                  </>
                )}

                {/* ── Alignment + Layers ── */}
                <Divider label="Arrange" />
                <AlignmentToolbar visible={!!selectedElementId} />
                <LayerControls />

                {/* ── Delete ── */}
                <button
                  onClick={() => {
                    deleteElement(currentSlideIndex, selectedElement.id);
                  }}
                  className="w-full py-3 bg-red-600/80 hover:bg-red-600
                             active:bg-red-700 text-white rounded-xl
                             text-sm font-bold transition-colors mt-2"
                >
                  🗑️ Delete Element
                </button>
              </>
            )}
          </>
        )}

        {/* ══════════════════════════════
            TAB: SLIDE
            ══════════════════════════════ */}
        {tab === 'slide' && (
          <>
            <Divider label="Background Color" />
            <GradientPicker
              label="Background"
              solidColor={currentSlide.backgroundColor || '#ffffff'}
              gradient={currentSlide.backgroundGradient}
              onSolidChange={(color) =>
                updateSlide(currentSlideIndex, {
                  backgroundColor: color, backgroundGradient: undefined,
                })
              }
              onGradientChange={(gradient) =>
                updateSlide(currentSlideIndex, {
                  backgroundGradient: gradient,
                  backgroundColor: gradient ? undefined : (currentSlide.backgroundColor ?? '#ffffff'),
                })
              }
            />

            <Divider label="Animated Background" />
            <AnimatedBgPicker />

            {/* ── Video Background ── */}
            <Divider label="Video Background" />
            {currentSlide.backgroundVideo ? (
              <div className="space-y-3">
                <div className="relative bg-black rounded-xl overflow-hidden"
                     style={{ aspectRatio: '16/9' }}>
                  <video src={currentSlide.backgroundVideo}
                    loop muted autoPlay playsInline
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 right-2 bg-green-900/90 text-green-400
                                   text-[10px] px-2 py-0.5 rounded-full font-bold">
                    ▶ Active
                  </span>
                </div>
                <label className="flex items-center justify-between
                                  bg-gray-800 rounded-xl px-4 py-3 cursor-pointer">
                  <span className="text-sm text-gray-300">Loop</span>
                  <input type="checkbox"
                    checked={currentSlide.backgroundVideoLoop ?? true}
                    onChange={(e) => updateSlide(currentSlideIndex, { backgroundVideoLoop: e.target.checked })}
                    className="w-5 h-5 accent-blue-500 cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between
                                  bg-gray-800 rounded-xl px-4 py-3 cursor-pointer">
                  <span className="text-sm text-gray-300">Muted</span>
                  <input type="checkbox"
                    checked={currentSlide.backgroundVideoMuted ?? true}
                    onChange={(e) => updateSlide(currentSlideIndex, { backgroundVideoMuted: e.target.checked })}
                    className="w-5 h-5 accent-blue-500 cursor-pointer"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => bgVideoInputRef.current?.click()}
                    className="py-3 bg-gray-700 text-white rounded-xl text-sm
                               hover:bg-gray-600 active:bg-gray-500 transition-colors">
                    🔄 Change
                  </button>
                  <button
                    onClick={() => updateSlide(currentSlideIndex, {
                      backgroundVideo: undefined,
                      backgroundVideoLoop: undefined,
                      backgroundVideoMuted: undefined,
                    })}
                    className="py-3 bg-red-900/80 text-red-300 rounded-xl text-sm
                               hover:bg-red-900 active:bg-red-800 transition-colors">
                    🗑️ Remove
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => bgVideoInputRef.current?.click()}
                className="w-full py-3 bg-gray-700 text-white rounded-xl
                           text-sm hover:bg-gray-600 active:bg-gray-500
                           transition-colors font-medium">
                🎬 Add Video Background
              </button>
            )}

            {/* ── Image Background ── */}
            <Divider label="Image Background" />
            {currentSlide.backgroundImage ? (
              <div className="space-y-3">
                <img src={currentSlide.backgroundImage} alt="bg"
                     className="w-full rounded-xl object-cover border border-gray-700"
                     style={{ aspectRatio: '16/9' }} />
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => bgImageInputRef.current?.click()}
                    className="py-3 bg-gray-700 text-white rounded-xl text-sm
                               hover:bg-gray-600 active:bg-gray-500 transition-colors">
                    🔄 Change
                  </button>
                  <button
                    onClick={() => updateSlide(currentSlideIndex, { backgroundImage: undefined })}
                    className="py-3 bg-red-900/80 text-red-300 rounded-xl text-sm
                               hover:bg-red-900 active:bg-red-800 transition-colors">
                    🗑️ Remove
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => bgImageInputRef.current?.click()}
                className="w-full py-3 bg-gray-700 text-white rounded-xl
                           text-sm hover:bg-gray-600 active:bg-gray-500
                           transition-colors font-medium">
                📷 Add Background Image
              </button>
            )}

            {/* ── Transition ── */}
            <Divider label="Transition" />
            <TransitionControl />
          </>
        )}

        {/* ══════════════════════════════
            TAB: NOTES
            ══════════════════════════════ */}
        {tab === 'notes' && (
          <>
            <Divider label="Speaker Notes" />
            <textarea
              value={currentSlide.notes || ''}
              onChange={(e) => updateSlide(currentSlideIndex, { notes: e.target.value })}
              className="w-full bg-gray-800 text-white rounded-xl p-4
                         text-sm resize-none outline-none
                         focus:ring-2 focus:ring-blue-500 transition-colors
                         placeholder-gray-600"
              placeholder="Add speaker notes for this slide…"
              rows={10}
            />
            <p className="text-gray-600 text-xs text-center">
              Notes are visible on the Flutter controller app
            </p>
          </>
        )}

      </div>
    </div>
  );
};

export default MobilePropertiesPanel;