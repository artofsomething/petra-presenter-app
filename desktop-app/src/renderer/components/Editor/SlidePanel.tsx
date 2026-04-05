import React, {
  useRef, useState, useCallback, useEffect,
} from 'react';
import usePresentationStore from '../../store/usePresentation';

// ── Types ─────────────────────────────────────────────────────────────────────
interface DragState {
  draggingIndex: number;
  overIndex:     number;
}

interface GradientStop   { offset: number; color: string; }
interface GradientConfig { type: 'linear' | 'radial'; angle: number; stops: GradientStop[]; }

interface AnimatedBackground {
  type:    string;
  speed?:  number;
  color1?: string;
  color2?: string;
  color3?: string;
  opacity?: number;
}

// ── Animated bg metadata ──────────────────────────────────────────────────────
const ANIMATED_BG_META: Record<string, {
  emoji: string; label: string; colors: [string, string];
}> = {
  'aurora':         { emoji: '🌌', label: 'Aurora',     colors: ['#7c3aed', '#06b6d4'] },
  'waves':          { emoji: '🌊', label: 'Waves',      colors: ['#1e40af', '#0891b2'] },
  'neon-pulse':     { emoji: '💜', label: 'Neon Pulse', colors: ['#f0abfc', '#818cf8'] },
  'geometric':      { emoji: '🔷', label: 'Geometric',  colors: ['#6366f1', '#ec4899'] },
  'starfield':      { emoji: '✨', label: 'Starfield',  colors: ['#0d1b4b', '#1a3a7a'] },
  'bubbles':        { emoji: '🫧', label: 'Bubbles',    colors: ['#020b18', '#3b82f6'] },
  'matrix':         { emoji: '💻', label: 'Matrix',     colors: ['#000000', '#003b00'] },
  'fire':           { emoji: '🔥', label: 'Fire',       colors: ['#1a0000', '#ef4444'] },
  'snowfall':       { emoji: '❄️', label: 'Snowfall',   colors: ['#0a1628', '#162040'] },
  'particles':      { emoji: '🔵', label: 'Particles',  colors: ['#050510', '#6366f1'] },
  'lava-lamp':      { emoji: '🫠', label: 'Lava Lamp',  colors: ['#ff6b6b', '#ffd93d'] },
  'lightning':      { emoji: '⚡',  label: 'Lightning',  colors: ['#a78bfa', '#38bdf8'] },
  'galaxy':         { emoji: '🌀', label: 'Galaxy',     colors: ['#818cf8', '#f472b6'] },
  'cyberpunk-grid': { emoji: '🕹️', label: 'Cyberpunk Grid', colors: ['#00ffff','#ff00ff'] },
  'dna-helix':      { emoji: '🧬', label: 'DNA Helix',  colors: ['#22d3ee', '#a78bfa'] },
  'confetti':       { emoji: '🎊', label: 'Confetti',   colors: ['#f43f5e', '#facc15'] },
  'plasma':         { emoji: '🌈', label: 'Plasma',     colors: ['#ff0080', '#7928ca'] },
  'vortex':         { emoji: '🌪️', label: 'Vortex',     colors: ['#6366f1', '#ec4899'] },
  'glitch':         { emoji: '📺', label: 'Glitch',     colors: ['#00ff9f','#ff003c'] },
  'underwater':     { emoji: '🌊', label: 'Underwater', colors: ['#0ea5e9', '#06b6d4'] },
  'northen-lights': { emoji: '🌠', label: 'NorthenLights', colors : ['#00ff87','#60efff']},
  'meteor-shower': { emoji: '☄️', label:'Meteor Shower', colors : ['#93f5fd','#fde68a']},
  'sand-storm': {emoji: '🌪️', label:'Sand Storm', colors: ['#d97706','#92400e']},
  'neon-rain': {emoji: '🌧️', label:'Neon Rain', colors : ['#ff00ff','#00ffff']},
  'bokeh': {emoji:'💡', label:'Bokeh', colors : ['#ff9ff3','#ffeaa7']}
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function gradientToCSS(g: GradientConfig): string {
  const stops = [...g.stops]
    .sort((a, b) => a.offset - b.offset)
    .map(s => `${s.color} ${(s.offset * 100).toFixed(0)}%`)
    .join(', ');
  return g.type === 'radial'
    ? `radial-gradient(circle, ${stops})`
    : `linear-gradient(${g.angle}deg, ${stops})`;
}

// Returns the CSS background for the thumbnail wrapper div
function slideBackground(slide: any): React.CSSProperties {
  // Animated bg — use representative gradient
  if (slide.animatedBackground) {
    const meta = ANIMATED_BG_META[slide.animatedBackground.type];
    if (meta) {
      const c1 = slide.animatedBackground.color1 ?? meta.colors[0];
      const c2 = slide.animatedBackground.color2 ?? meta.colors[1];
      return { background: `linear-gradient(135deg, ${c1}, ${c2})` };
    }
    return { backgroundColor: '#0a0a1a' };
  }

  // Gradient background
  if (slide.backgroundGradient) {
    return { background: gradientToCSS(slide.backgroundGradient) };
  }

  // Image background (skip blob: — Electron-local)
  if (slide.backgroundImage && !slide.backgroundImage.startsWith('blob:')) {
    return {
      backgroundImage:    `url(${slide.backgroundImage})`,
      backgroundSize:     'cover',
      backgroundPosition: 'center',
    };
  }

  // Solid color
  return { backgroundColor: slide.backgroundColor || '#ffffff' };
}

// ── Text color heuristic — white text on dark backgrounds ─────────────────────
function shouldUseWhiteText(slide: any): boolean {
  if (slide.animatedBackground) return true;
  if (slide.backgroundGradient) {
    // Check first stop color brightness
    const firstStop = slide.backgroundGradient.stops?.[0];
    if (firstStop) return isColorDark(firstStop.color);
  }
  if (slide.backgroundImage) return true;
  return isColorDark(slide.backgroundColor || '#ffffff');
}

function isColorDark(hex: string): boolean {
  try {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    // Perceived brightness formula
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  } catch {
    return false;
  }
}


interface SlidePanelProps {
  onAddSlide?: () => void;
}

const SlidePanel: React.FC<SlidePanelProps> = ({ onAddSlide }) => {
  const {
    presentation,
    currentSlideIndex,
    setCurrentSlideIndex,
    addSlide,
    deleteSlide,
    duplicateSlide,
    reorderSlides,
  } = usePresentationStore();

  // ── Drag state ──────────────────────────────────────────────────────────────
  const [drag, setDrag]             = useState<DragState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef                = useRef<HTMLDivElement>(null);
  const itemRefs                    = useRef<(HTMLDivElement | null)[]>([]);
  const dragStartY                  = useRef(0);
  const DRAG_THRESHOLD              = 4;

  const slides = presentation?.slides ?? [];

  // ── Pointer down — wait for threshold ──────────────────────────────────────
  const handlePointerDown = useCallback((
    e: React.PointerEvent<HTMLDivElement>,
    index: number,
  ) => {
    if (e.button !== 0) return;
    dragStartY.current = e.clientY;

    const onPointerMove = (moveEvt: PointerEvent) => {
      if (Math.abs(moveEvt.clientY - dragStartY.current) > DRAG_THRESHOLD) {
        setIsDragging(true);
        setDrag({ draggingIndex: index, overIndex: index });
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup',   onPointerUp);
      }
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup',   onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup',   onPointerUp);
  }, []);

  // ── While dragging ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isDragging || drag === null) return;

    const onMove = (e: PointerEvent) => {
      let newOver = drag.overIndex;
      for (let i = 0; i < itemRefs.current.length; i++) {
        const el = itemRefs.current[i];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const mid  = rect.top + rect.height / 2;
        if (e.clientY < mid) { newOver = i; break; }
        newOver = i;
      }
      if (newOver !== drag.overIndex) {
        setDrag(prev => prev ? { ...prev, overIndex: newOver } : null);
      }
    };

    const onUp = () => {
      if (drag && drag.draggingIndex !== drag.overIndex) {
        reorderSlides(drag.draggingIndex, drag.overIndex);
      }
      setDrag(null);
      setIsDragging(false);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup',   onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup',   onUp);
    };
  }, [isDragging, drag, reorderSlides]);

  // ── Build display order with drop-preview ───────────────────────────────────
  const displayOrder: number[] = (() => {
    const order = slides.map((_, i) => i);
    if (!drag || drag.draggingIndex === drag.overIndex) return order;
    const result = [...order];
    const [pulled] = result.splice(drag.draggingIndex, 1);
    result.splice(drag.overIndex, 0, pulled);
    return result;
  })();

  // ── Handle add slide button ─────────────────────────────────────────────────
  const handleAddSlide = useCallback(() => {
    if (onAddSlide) {
      // Open the layout picker in the parent
      onAddSlide();
    } else {
      // Fallback: plain blank slide
      addSlide(currentSlideIndex + 1);
    }
  }, [onAddSlide, addSlide, currentSlideIndex]);

  if (!presentation) return null;

  return (
    <div
      ref={containerRef}
      className="w-56 bg-gray-900 p-3 overflow-y-auto h-full select-none"
      style={{ userSelect: isDragging ? 'none' : 'auto' }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-white text-sm font-bold">
          Slides
          <span className="ml-1.5 text-gray-500 font-normal text-xs">
            ({slides.length})
          </span>
        </h3>
        {/* ── Updated: opens layout picker if prop provided ── */}
        <button
          onClick={handleAddSlide}
          className="px-2 py-1 bg-blue-600 text-white rounded text-xs
                     hover:bg-blue-700 flex items-center gap-1 transition-colors"
          title="Add new slide"
        >
          ＋ Add
        </button>
      </div>

      {slides.length > 1 && (
        <p className="text-[10px] text-gray-600 mb-2 text-center">⠿ Drag to reorder</p>
      )}

      {/* Slide list */}
      <div className="flex flex-col gap-2">
        {displayOrder.map((realIndex, displayIndex) => {
          const slide      = slides[realIndex];
          const isActive   = realIndex === currentSlideIndex;
          const isDragged  = drag?.draggingIndex === realIndex && isDragging;
          const isOver     = drag?.overIndex === displayIndex && isDragging
                             && drag.draggingIndex !== displayIndex;
          const bg         = slideBackground(slide);
          const whiteText  = shouldUseWhiteText(slide);
          const animBg     = slide.animatedBackground as AnimatedBackground | undefined;
          const animMeta   = animBg ? ANIMATED_BG_META[animBg.type] : null;

          return (
            <React.Fragment key={slide.id}>
              {isOver && drag && drag.overIndex < drag.draggingIndex && <DropIndicator />}

              <div
                ref={el => { itemRefs.current[displayIndex] = el; }}
                onPointerDown={(e) => handlePointerDown(e, realIndex)}
                onClick={() => { if (!isDragging) setCurrentSlideIndex(realIndex); }}
                className={`
                  relative rounded border-2 transition-all
                  ${isActive
                    ? animBg
                      ? 'border-purple-400 shadow-lg shadow-purple-500/30'
                      : 'border-blue-500 shadow-lg shadow-blue-500/30'
                    : 'border-gray-700 hover:border-gray-500'}
                  ${isDragged
                    ? 'opacity-40 scale-95 cursor-grabbing'
                    : 'cursor-grab active:cursor-grabbing'}
                `}
                style={{
                  boxShadow: isDragged ? '0 8px 24px rgba(0,0,0,0.5)' : undefined,
                }}
              >
                {/* Drag handle */}
                <div
                  className="absolute left-1 top-1/2 -translate-y-1/2 z-10
                              text-gray-600 hover:text-gray-400 text-xs pointer-events-none"
                >
                  ⠿
                </div>

                {/* ── Thumbnail ────────────────────────────────────────────── */}
                <div
                  className="w-full aspect-video rounded-t overflow-hidden relative"
                  style={bg}
                >
                  {/* Animated bg shimmer overlay */}
                  {animBg && animMeta && (
                    <div style={{
                      position:   'absolute', inset: 0,
                      background: `radial-gradient(circle at 30% 40%,
                        ${animBg.color1 ?? animMeta.colors[0]}55 0%,
                        transparent 60%),
                        radial-gradient(circle at 70% 60%,
                        ${animBg.color2 ?? animMeta.colors[1]}44 0%,
                        transparent 60%)`,
                      animation:  'none',
                    }} />
                  )}

                  {/* Gradient overlay hint */}
                  {slide.backgroundGradient && !animBg && (
                    <div style={{
                      position:      'absolute', inset: 0,
                      background:    'linear-gradient(to bottom right, transparent 40%, rgba(255,255,255,0.08))',
                      pointerEvents: 'none',
                    }} />
                  )}

                  {/* Miniature text previews */}
                  <div className="relative w-full h-full">
                    {slide.elements
                      .filter((el: any) => el.type === 'text')
                      .slice(0, 2)
                      .map((el: any, i: number) => (
                        <div
                          key={i}
                          style={{
                            position:      'absolute',
                            left:          `${(el.x / 1920) * 100}%`,
                            top:           `${(el.y / 1080) * 100}%`,
                            fontSize:      `${Math.max((el.fontSize || 24) / 1920 * 100, 5)}px`,
                            color:         el.fontColor || (whiteText ? '#fff' : '#000'),
                            fontFamily:    el.fontFamily || 'Arial',
                            fontWeight:    el.fontWeight || 'normal',
                            whiteSpace:    'nowrap',
                            overflow:      'hidden',
                            maxWidth:      '90%',
                            lineHeight:    1.1,
                            pointerEvents: 'none',
                            textShadow:    whiteText ? '0 1px 2px rgba(0,0,0,0.8)' : 'none',
                          }}
                        >
                          {el.text}
                        </div>
                      ))
                    }

                    {/* Animated bg badge */}
                    {animBg && animMeta && (
                      <div style={{
                        position:     'absolute', top: 3, left: 8,
                        fontSize:     9, lineHeight: 1,
                        background:   'rgba(0,0,0,0.45)',
                        borderRadius: 3,
                        padding:      '1px 4px',
                        color:        '#fff',
                        display:      'flex', alignItems: 'center', gap: 2,
                        pointerEvents: 'none',
                      }}>
                        <span>{animMeta.emoji}</span>
                        <span style={{ fontSize: 7, opacity: 0.8 }}>{animMeta.label}</span>
                      </div>
                    )}

                    {/* Gradient badge */}
                    {slide.backgroundGradient && !animBg && (
                      <div style={{
                        position:     'absolute', top: 3, left: 8,
                        fontSize:     7, lineHeight: 1,
                        background:   'rgba(0,0,0,0.4)',
                        borderRadius: 3,
                        padding:      '1px 4px',
                        color:        '#fff',
                        pointerEvents: 'none',
                      }}>
                        ∇ grad
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Footer bar ───────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-2 py-1
                                bg-black/30 rounded-b">
                  <span className="text-[10px] text-gray-300 font-mono font-bold">
                    {displayIndex + 1}
                  </span>

                  <div className="flex items-center gap-1">
                    {animBg && (
                      <span style={{ fontSize: 8 }} title={animMeta?.label ?? 'Animated'}>
                        {animMeta?.emoji ?? '🎨'}
                      </span>
                    )}
                    {!animBg && slide.backgroundGradient && (
                      <span style={{ fontSize: 8, color: '#a78bfa' }} title="Gradient">∇</span>
                    )}
                    {!animBg && !slide.backgroundGradient && slide.backgroundImage && (
                      <span style={{ fontSize: 8, color: '#60a5fa' }} title="Image">🖼</span>
                    )}
                    {slide.elements.length > 0 && (
                      <span className="text-[9px] text-gray-500">
                        {slide.elements.length} el
                      </span>
                    )}
                  </div>
                </div>

                {/* Context actions */}
                <div className="absolute top-1 right-1 flex gap-1
                                opacity-0 hover:opacity-100 transition-opacity z-20">
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); duplicateSlide(realIndex); }}
                    className="w-5 h-5 bg-blue-600 text-white rounded text-xs
                               flex items-center justify-center hover:bg-blue-500"
                    title="Duplicate"
                  >📋</button>
                  {presentation.slides.length > 1 && (
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); deleteSlide(realIndex); }}
                      className="w-5 h-5 bg-red-600 text-white rounded text-xs
                                 flex items-center justify-center hover:bg-red-500"
                      title="Delete"
                    >🗑️</button>
                  )}
                </div>

                {/* Active indicator dot */}
                {isActive && (
                  <div className={`absolute left-1 bottom-1 w-1.5 h-1.5
                    rounded-full pointer-events-none
                    ${animBg ? 'bg-purple-400' : 'bg-blue-400'}`}
                  />
                )}
              </div>

              {isOver && drag && drag.overIndex >= drag.draggingIndex && <DropIndicator />}
            </React.Fragment>
          );
        })}
      </div>

      {/* Empty state */}
      {slides.length === 0 && (
        <div className="text-center text-gray-600 text-xs mt-8 space-y-3">
          <p>No slides yet.</p>
          <button
            onClick={handleAddSlide}
            className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs
                       hover:bg-blue-500 transition-colors"
          >
            ＋ Add First Slide
          </button>
        </div>
      )}
    </div>
  );
};

// ── Drop indicator ────────────────────────────────────────────────────────────
const DropIndicator: React.FC = () => (
  <div className="flex items-center gap-1 px-1 pointer-events-none">
    <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
    <div className="flex-1 h-0.5 bg-blue-400 rounded-full" />
    <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
  </div>
);

export default SlidePanel;


// ─────────────────────────────────────────────────────────────────────────────
// const SlidePanel: React.FC= () => {
//   const {
//     presentation,
//     currentSlideIndex,
//     setCurrentSlideIndex,
//     addSlide,
//     deleteSlide,
//     duplicateSlide,
//     reorderSlides,
//   } = usePresentationStore();

//   // ── Drag state ──────────────────────────────────────────────────────────────
//   const [drag, setDrag]             = useState<DragState | null>(null);
//   const [isDragging, setIsDragging] = useState(false);
//   const containerRef                = useRef<HTMLDivElement>(null);
//   const itemRefs                    = useRef<(HTMLDivElement | null)[]>([]);
//   const dragStartY                  = useRef(0);
//   const DRAG_THRESHOLD              = 4;

//   const slides = presentation?.slides ?? [];

//   // ── Pointer down — wait for threshold ──────────────────────────────────────
//   const handlePointerDown = useCallback((
//     e: React.PointerEvent<HTMLDivElement>,
//     index: number,
//   ) => {
//     if (e.button !== 0) return;
//     dragStartY.current = e.clientY;

//     const onPointerMove = (moveEvt: PointerEvent) => {
//       if (Math.abs(moveEvt.clientY - dragStartY.current) > DRAG_THRESHOLD) {
//         setIsDragging(true);
//         setDrag({ draggingIndex: index, overIndex: index });
//         window.removeEventListener('pointermove', onPointerMove);
//         window.removeEventListener('pointerup',   onPointerUp);
//       }
//     };

//     const onPointerUp = () => {
//       window.removeEventListener('pointermove', onPointerMove);
//       window.removeEventListener('pointerup',   onPointerUp);
//     };

//     window.addEventListener('pointermove', onPointerMove);
//     window.addEventListener('pointerup',   onPointerUp);
//   }, []);

//   // ── While dragging ──────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!isDragging || drag === null) return;

//     const onMove = (e: PointerEvent) => {
//       let newOver = drag.overIndex;
//       for (let i = 0; i < itemRefs.current.length; i++) {
//         const el = itemRefs.current[i];
//         if (!el) continue;
//         const rect = el.getBoundingClientRect();
//         const mid  = rect.top + rect.height / 2;
//         if (e.clientY < mid) { newOver = i; break; }
//         newOver = i;
//       }
//       if (newOver !== drag.overIndex) {
//         setDrag(prev => prev ? { ...prev, overIndex: newOver } : null);
//       }
//     };

//     const onUp = () => {
//       if (drag && drag.draggingIndex !== drag.overIndex) {
//         reorderSlides(drag.draggingIndex, drag.overIndex);
//       }
//       setDrag(null);
//       setIsDragging(false);
//     };

//     window.addEventListener('pointermove', onMove);
//     window.addEventListener('pointerup',   onUp);
//     return () => {
//       window.removeEventListener('pointermove', onMove);
//       window.removeEventListener('pointerup',   onUp);
//     };
//   }, [isDragging, drag, reorderSlides]);

//   // ── Build display order with drop-preview ───────────────────────────────────
//   const displayOrder: number[] = (() => {
//     const order = slides.map((_, i) => i);
//     if (!drag || drag.draggingIndex === drag.overIndex) return order;
//     const result = [...order];
//     const [pulled] = result.splice(drag.draggingIndex, 1);
//     result.splice(drag.overIndex, 0, pulled);
//     return result;
//   })();

//   if (!presentation) return null;

//   return (
//     <div
//       ref={containerRef}
//       className="w-56 bg-gray-900 p-3 overflow-y-auto h-full select-none"
//       style={{ userSelect: isDragging ? 'none' : 'auto' }}
//     >
//       {/* Header */}
//       <div className="flex justify-between items-center mb-3">
//         <h3 className="text-white text-sm font-bold">
//           Slides
//           <span className="ml-1.5 text-gray-500 font-normal text-xs">
//             ({slides.length})
//           </span>
//         </h3>
//         <button
//           onClick={() => addSlide(currentSlideIndex + 1)}
//           className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
//         >
//           + Add
//         </button>
//       </div>

//       {slides.length > 1 && (
//         <p className="text-[10px] text-gray-600 mb-2 text-center">⠿ Drag to reorder</p>
//       )}

//       {/* Slide list */}
//       <div className="flex flex-col gap-2">
//         {displayOrder.map((realIndex, displayIndex) => {
//           const slide      = slides[realIndex];
//           const isActive   = realIndex === currentSlideIndex;
//           const isDragged  = drag?.draggingIndex === realIndex && isDragging;
//           const isOver     = drag?.overIndex === displayIndex && isDragging
//                              && drag.draggingIndex !== displayIndex;
//           const bg         = slideBackground(slide);
//           const whiteText  = shouldUseWhiteText(slide);
//           const animBg     = slide.animatedBackground as AnimatedBackground | undefined;
//           const animMeta   = animBg ? ANIMATED_BG_META[animBg.type] : null;

//           return (
//             <React.Fragment key={slide.id}>
//               {isOver && drag && drag.overIndex < drag.draggingIndex && <DropIndicator />}

//               <div
//                 ref={el => { itemRefs.current[displayIndex] = el; }}
//                 onPointerDown={(e) => handlePointerDown(e, realIndex)}
//                 onClick={() => { if (!isDragging) setCurrentSlideIndex(realIndex); }}
//                 className={`
//                   relative rounded border-2 transition-all
//                   ${isActive
//                     ? animBg
//                       ? 'border-purple-400 shadow-lg shadow-purple-500/30'
//                       : 'border-blue-500 shadow-lg shadow-blue-500/30'
//                     : 'border-gray-700 hover:border-gray-500'}
//                   ${isDragged
//                     ? 'opacity-40 scale-95 cursor-grabbing'
//                     : 'cursor-grab active:cursor-grabbing'}
//                 `}
//                 style={{
//                   boxShadow: isDragged ? '0 8px 24px rgba(0,0,0,0.5)' : undefined,
//                 }}
//               >
//                 {/* Drag handle */}
//                 <div
//                   className="absolute left-1 top-1/2 -translate-y-1/2 z-10
//                               text-gray-600 hover:text-gray-400 text-xs pointer-events-none"
//                 >
//                   ⠿
//                 </div>

//                 {/* ── Thumbnail ────────────────────────────────────────────── */}
//                 <div
//                   className="w-full aspect-video rounded-t overflow-hidden relative"
//                   style={bg}
//                 >
//                   {/* ✅ Animated bg shimmer overlay */}
//                   {animBg && animMeta && (
//                     <div style={{
//                       position:   'absolute', inset: 0,
//                       background: `radial-gradient(circle at 30% 40%,
//                         ${animBg.color1 ?? animMeta.colors[0]}55 0%,
//                         transparent 60%),
//                         radial-gradient(circle at 70% 60%,
//                         ${animBg.color2 ?? animMeta.colors[1]}44 0%,
//                         transparent 60%)`,
//                       animation:  'none',
//                     }} />
//                   )}

//                   {/* ✅ Gradient overlay hint */}
//                   {slide.backgroundGradient && !animBg && (
//                     <div style={{
//                       position:   'absolute', inset: 0,
//                       background: 'linear-gradient(to bottom right, transparent 40%, rgba(255,255,255,0.08))',
//                       pointerEvents: 'none',
//                     }} />
//                   )}

//                   {/* Miniature text previews */}
//                   <div className="relative w-full h-full">
//                     {slide.elements
//                       .filter((el: any) => el.type === 'text')
//                       .slice(0, 2)
//                       .map((el: any, i: number) => (
//                         <div
//                           key={i}
//                           style={{
//                             position:      'absolute',
//                             left:          `${(el.x / 1920) * 100}%`,
//                             top:           `${(el.y / 1080) * 100}%`,
//                             fontSize:      `${Math.max((el.fontSize || 24) / 1920 * 100, 5)}px`,
//                             color:         el.fontColor || (whiteText ? '#fff' : '#000'),
//                             fontFamily:    el.fontFamily || 'Arial',
//                             fontWeight:    el.fontWeight || 'normal',
//                             whiteSpace:    'nowrap',
//                             overflow:      'hidden',
//                             maxWidth:      '90%',
//                             lineHeight:    1.1,
//                             pointerEvents: 'none',
//                             textShadow:    whiteText ? '0 1px 2px rgba(0,0,0,0.8)' : 'none',
//                           }}
//                         >
//                           {el.text}
//                         </div>
//                       ))
//                     }

//                     {/* Animated bg badge — top left */}
//                     {animBg && animMeta && (
//                       <div style={{
//                         position:   'absolute', top: 3, left: 8,
//                         fontSize:   9, lineHeight: 1,
//                         background: 'rgba(0,0,0,0.45)',
//                         borderRadius: 3,
//                         padding:    '1px 4px',
//                         color:      '#fff',
//                         display:    'flex', alignItems: 'center', gap: 2,
//                         pointerEvents: 'none',
//                       }}>
//                         <span>{animMeta.emoji}</span>
//                         <span style={{ fontSize: 7, opacity: 0.8 }}>{animMeta.label}</span>
//                       </div>
//                     )}

//                     {/* Gradient badge — top left */}
//                     {slide.backgroundGradient && !animBg && (
//                       <div style={{
//                         position:   'absolute', top: 3, left: 8,
//                         fontSize:   7, lineHeight: 1,
//                         background: 'rgba(0,0,0,0.4)',
//                         borderRadius: 3,
//                         padding:    '1px 4px',
//                         color:      '#fff',
//                         pointerEvents: 'none',
//                       }}>
//                         ∇ grad
//                       </div>
//                     )}
//                   </div>
//                 </div>

//                 {/* ── Footer bar ───────────────────────────────────────────── */}
//                 <div className="flex items-center justify-between px-2 py-1
//                                 bg-black/30 rounded-b">
//                   <span className="text-[10px] text-gray-300 font-mono font-bold">
//                     {displayIndex + 1}
//                   </span>

//                   <div className="flex items-center gap-1">
//                     {/* Background type icon */}
//                     {animBg && (
//                       <span style={{ fontSize: 8 }} title={animMeta?.label ?? 'Animated'}>
//                         {animMeta?.emoji ?? '🎨'}
//                       </span>
//                     )}
//                     {!animBg && slide.backgroundGradient && (
//                       <span style={{ fontSize: 8, color: '#a78bfa' }} title="Gradient">∇</span>
//                     )}
//                     {!animBg && !slide.backgroundGradient && slide.backgroundImage && (
//                       <span style={{ fontSize: 8, color: '#60a5fa' }} title="Image">🖼</span>
//                     )}

//                     {slide.elements.length > 0 && (
//                       <span className="text-[9px] text-gray-500">
//                         {slide.elements.length} el
//                       </span>
//                     )}
//                   </div>
//                 </div>

//                 {/* Context actions */}
//                 <div className="absolute top-1 right-1 flex gap-1
//                                 opacity-0 hover:opacity-100 transition-opacity z-20">
//                   <button
//                     onPointerDown={(e) => e.stopPropagation()}
//                     onClick={(e) => { e.stopPropagation(); duplicateSlide(realIndex); }}
//                     className="w-5 h-5 bg-blue-600 text-white rounded text-xs
//                                flex items-center justify-center hover:bg-blue-500"
//                     title="Duplicate"
//                   >📋</button>
//                   {presentation.slides.length > 1 && (
//                     <button
//                       onPointerDown={(e) => e.stopPropagation()}
//                       onClick={(e) => { e.stopPropagation(); deleteSlide(realIndex); }}
//                       className="w-5 h-5 bg-red-600 text-white rounded text-xs
//                                  flex items-center justify-center hover:bg-red-500"
//                       title="Delete"
//                     >🗑️</button>
//                   )}
//                 </div>

//                 {/* Active indicator */}
//                 {isActive && (
//                   <div className={`absolute left-1 bottom-1 w-1.5 h-1.5
//                     rounded-full pointer-events-none
//                     ${animBg ? 'bg-purple-400' : 'bg-blue-400'}`}
//                   />
//                 )}
//               </div>

//               {isOver && drag && drag.overIndex >= drag.draggingIndex && <DropIndicator />}
//             </React.Fragment>
//           );
//         })}
//       </div>

//       {slides.length === 0 && (
//         <div className="text-center text-gray-600 text-xs mt-8">
//           No slides yet.<br />Click "+ Add" to start.
//         </div>
//       )}
//     </div>
//   );
// };

// // ── Drop indicator ────────────────────────────────────────────────────────────
// const DropIndicator: React.FC = () => (
//   <div className="flex items-center gap-1 px-1 pointer-events-none">
//     <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
//     <div className="flex-1 h-0.5 bg-blue-400 rounded-full" />
//     <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
//   </div>
// );

// export default SlidePanel;


// import React from 'react';
// import usePresentationStore from '../../store/usePresentation';

// const SlidePanel: React.FC = () => {
//   const {
//     presentation,
//     currentSlideIndex,
//     setCurrentSlideIndex,
//     addSlide,
//     deleteSlide,
//     duplicateSlide,
//   } = usePresentationStore();

//   if (!presentation) return null;

//   return (
//     <div className="w-56 bg-gray-900 p-3 overflow-y-auto h-full">
//       <div className="flex justify-between items-center mb-3">
//         <h3 className="text-white text-sm font-bold">Slides</h3>
//         <button
//           onClick={() => addSlide(currentSlideIndex + 1)}
//           className="px-2 py-1 bg-blue-600 text-white rounded
//                      text-xs hover:bg-blue-700"
//         >
//           + Add
//         </button>
//       </div>

//       <div className="flex flex-col gap-2">
//         {presentation.slides.map((slide, index) => (
//           <div
//             key={slide.id}
//             className={`relative cursor-pointer rounded border-2
//               transition-all ${
//                 index === currentSlideIndex
//                   ? 'border-blue-500 shadow-lg shadow-blue-500/30'
//                   : 'border-gray-700 hover:border-gray-500'
//               }`}
//             onClick={() => setCurrentSlideIndex(index)}
//           >
//             {/* Slide thumbnail preview */}
//             <div
//               className="w-full aspect-video rounded"
//               style={{
//                 backgroundColor:
//                   slide.backgroundColor || '#ffffff',
//               }}
//             >
//               <div className="p-1">
//                 <span className="text-xs text-gray-400">
//                   {index + 1}
//                 </span>
//                 {slide.elements.length > 0 && (
//                   <span className="text-xs text-gray-500 ml-1">
//                     ({slide.elements.length} elements)
//                   </span>
//                 )}
//               </div>
//             </div>

//             {/* Context actions */}
//             <div
//               className="absolute top-0 right-0 flex gap-1 p-1
//                           opacity-0 hover:opacity-100 transition"
//             >
//               <button
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   duplicateSlide(index);
//                 }}
//                 className="w-5 h-5 bg-blue-600 text-white
//                            rounded text-xs"
//                 title="Duplicate"
//               >
//                 📋
//               </button>
//               {presentation.slides.length > 1 && (
//                 <button
//                   onClick={(e) => {
//                     e.stopPropagation();
//                     deleteSlide(index);
//                   }}
//                   className="w-5 h-5 bg-red-600 text-white
//                              rounded text-xs"
//                   title="Delete"
//                 >
//                   🗑️
//                 </button>
//               )}
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };

// export default SlidePanel;