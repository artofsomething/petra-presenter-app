// src/renderer/components/Editor/MobileSlidePanel.tsx
import React, {
  useRef, useState, useCallback, useEffect,
} from 'react';
import usePresentationStore from '../../store/usePresentation';

// ── Types ─────────────────────────────────────────────────────────────────────
interface GradientStop   { offset: number; color: string; }
interface GradientConfig { type: 'linear' | 'radial'; angle: number; stops: GradientStop[]; }

interface AnimatedBackground {
  type:     string;
  speed?:   number;
  color1?:  string;
  color2?:  string;
  color3?:  string;
  opacity?: number;
}

// ── Animated bg metadata ──────────────────────────────────────────────────────
const ANIMATED_BG_META: Record<string, {
  emoji: string; label: string; colors: [string, string];
}> = {
  'aurora':         { emoji: '🌌', label: 'Aurora',      colors: ['#7c3aed', '#06b6d4'] },
  'waves':          { emoji: '🌊', label: 'Waves',       colors: ['#1e40af', '#0891b2'] },
  'neon-pulse':     { emoji: '💜', label: 'Neon Pulse',  colors: ['#f0abfc', '#818cf8'] },
  'geometric':      { emoji: '🔷', label: 'Geometric',   colors: ['#6366f1', '#ec4899'] },
  'starfield':      { emoji: '✨', label: 'Starfield',   colors: ['#0d1b4b', '#1a3a7a'] },
  'bubbles':        { emoji: '🫧', label: 'Bubbles',     colors: ['#020b18', '#3b82f6'] },
  'matrix':         { emoji: '💻', label: 'Matrix',      colors: ['#000000', '#003b00'] },
  'fire':           { emoji: '🔥', label: 'Fire',        colors: ['#1a0000', '#ef4444'] },
  'snowfall':       { emoji: '❄️', label: 'Snowfall',    colors: ['#0a1628', '#162040'] },
  'particles':      { emoji: '🔵', label: 'Particles',   colors: ['#050510', '#6366f1'] },
  'lava-lamp':      { emoji: '🫠', label: 'Lava Lamp',   colors: ['#ff6b6b', '#ffd93d'] },
  'lightning':      { emoji: '⚡',  label: 'Lightning',   colors: ['#a78bfa', '#38bdf8'] },
  'galaxy':         { emoji: '🌀', label: 'Galaxy',      colors: ['#818cf8', '#f472b6'] },
  'cyberpunk-grid': { emoji: '🕹️', label: 'Cyberpunk',   colors: ['#00ffff', '#ff00ff'] },
  'dna-helix':      { emoji: '🧬', label: 'DNA Helix',   colors: ['#22d3ee', '#a78bfa'] },
  'confetti':       { emoji: '🎊', label: 'Confetti',    colors: ['#f43f5e', '#facc15'] },
  'plasma':         { emoji: '🌈', label: 'Plasma',      colors: ['#ff0080', '#7928ca'] },
  'vortex':         { emoji: '🌪️', label: 'Vortex',      colors: ['#6366f1', '#ec4899'] },
  'glitch':         { emoji: '📺', label: 'Glitch',      colors: ['#00ff9f', '#ff003c'] },
  'underwater':     { emoji: '🌊', label: 'Underwater',  colors: ['#0ea5e9', '#06b6d4'] },
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

function slideBackground(slide: any): React.CSSProperties {
  if (slide.animatedBackground) {
    const meta = ANIMATED_BG_META[slide.animatedBackground.type];
    if (meta) {
      const c1 = slide.animatedBackground.color1 ?? meta.colors[0];
      const c2 = slide.animatedBackground.color2 ?? meta.colors[1];
      return { background: `linear-gradient(135deg, ${c1}, ${c2})` };
    }
    return { backgroundColor: '#0a0a1a' };
  }
  if (slide.backgroundGradient) return { background: gradientToCSS(slide.backgroundGradient) };
  if (slide.backgroundImage && !slide.backgroundImage.startsWith('blob:')) {
    return {
      backgroundImage:    `url(${slide.backgroundImage})`,
      backgroundSize:     'cover',
      backgroundPosition: 'center',
    };
  }
  return { backgroundColor: slide.backgroundColor || '#ffffff' };
}

function isColorDark(hex: string): boolean {
  try {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  } catch { return false; }
}

function shouldUseWhiteText(slide: any): boolean {
  if (slide.animatedBackground) return true;
  if (slide.backgroundGradient) {
    const first = slide.backgroundGradient.stops?.[0];
    if (first) return isColorDark(first.color);
  }
  if (slide.backgroundImage) return true;
  return isColorDark(slide.backgroundColor || '#ffffff');
}

// ── Drop Indicator ────────────────────────────────────────────────────────────
const DropIndicator: React.FC = () => (
  <div className="flex items-center gap-1 px-2 py-1 pointer-events-none">
    <div className="w-2.5 h-2.5 rounded-full bg-blue-400 shrink-0" />
    <div className="flex-1 h-0.5 bg-blue-400 rounded-full" />
    <div className="w-2.5 h-2.5 rounded-full bg-blue-400 shrink-0" />
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
interface MobileSlidePanelProps {
  onAddSlide?: () => void;
}

const MobileSlidePanel: React.FC<MobileSlidePanelProps> = ({ onAddSlide }) => {
  const {
    presentation,
    currentSlideIndex,
    setCurrentSlideIndex,
    addSlide,
    deleteSlide,
    duplicateSlide,
    reorderSlides,
  } = usePresentationStore();

  // ── Drag state — all in ONE ref to avoid stale closures ──────────────────
  const dragRef = useRef({
    active:        false,    // is a drag in progress
    startIndex:    -1,       // which slide we picked up
    overIndex:     -1,       // which slot we're hovering
    startY:        0,        // pointer Y when press started
    pointerId:     -1,       // the pointer that started the drag
    longPressTimer: null as ReturnType<typeof setTimeout> | null,
    didMove:       false,    // did pointer move enough to be a drag
  });

  // React state only for re-render
  const [draggingIndex, setDraggingIndex] = useState(-1);
  const [overIndex,     setOverIndex]     = useState(-1);

  const itemRefs   = useRef<(HTMLDivElement | null)[]>([]);
  const listRef    = useRef<HTMLDivElement>(null);
  const slides     = presentation?.slides ?? [];

  // ── Calculate which slot the pointer is over ──────────────────────────────
  const getOverIndex = useCallback((clientY: number): number => {
    let best = slides.length - 1;
    for (let i = 0; i < itemRefs.current.length; i++) {
      const el = itemRefs.current[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) {
        best = i;
        break;
      }
    }
    return best;
  }, [slides.length]);

  // ── Start drag (called after long-press or threshold move) ────────────────
  const startDrag = useCallback((index: number) => {
    dragRef.current.active    = true;
    dragRef.current.startIndex = index;
    dragRef.current.overIndex  = index;
    setDraggingIndex(index);
    setOverIndex(index);

    // Haptic feedback if available
    if ('vibrate' in navigator) navigator.vibrate(30);
  }, []);

  // ── Commit drop ───────────────────────────────────────────────────────────
  const commitDrop = useCallback(() => {
    const d = dragRef.current;
    if (d.active && d.startIndex !== d.overIndex && d.overIndex !== -1) {
      reorderSlides(d.startIndex, d.overIndex);
    }
    // Reset
    dragRef.current.active     = false;
    dragRef.current.startIndex = -1;
    dragRef.current.overIndex  = -1;
    dragRef.current.didMove    = false;
    if (dragRef.current.longPressTimer) {
      clearTimeout(dragRef.current.longPressTimer);
      dragRef.current.longPressTimer = null;
    }
    setDraggingIndex(-1);
    setOverIndex(-1);
  }, [reorderSlides]);

  // ── Cancel drag ───────────────────────────────────────────────────────────
  const cancelDrag = useCallback(() => {
    dragRef.current.active     = false;
    dragRef.current.startIndex = -1;
    dragRef.current.overIndex  = -1;
    dragRef.current.didMove    = false;
    if (dragRef.current.longPressTimer) {
      clearTimeout(dragRef.current.longPressTimer);
      dragRef.current.longPressTimer = null;
    }
    setDraggingIndex(-1);
    setOverIndex(-1);
  }, []);

  // ── Attach native pointer events to the list container ───────────────────
  // ✅ Using native listeners so we can call preventDefault reliably
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const onPointerDown = (e: PointerEvent) => {
      // Find which slide item was pressed
      const target = e.target as HTMLElement;
      const card   = target.closest('[data-slide-index]') as HTMLElement | null;
      if (!card) return;

      const index = parseInt(card.dataset.slideIndex ?? '-1', 10);
      if (index < 0) return;

      // Don't start drag on action buttons
      if (target.closest('[data-no-drag]')) return;

      const d         = dragRef.current;
      d.startY        = e.clientY;
      d.pointerId     = e.pointerId;
      d.didMove       = false;
      d.startIndex    = index;

      // ✅ Long press → start drag after 400ms even without movement
      d.longPressTimer = setTimeout(() => {
        if (!d.active) {
          startDrag(index);
        }
      }, 400);

      list.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (d.pointerId !== e.pointerId) return;

      const dy = Math.abs(e.clientY - d.startY);

      // ✅ Movement threshold — start drag immediately on significant move
      if (!d.active && dy > 8 && d.startIndex >= 0) {
        // Cancel long press timer — movement triggered drag instead
        if (d.longPressTimer) {
          clearTimeout(d.longPressTimer);
          d.longPressTimer = null;
        }
        startDrag(d.startIndex);
      }

      if (d.active) {
        e.preventDefault();
        // Prevent scroll while dragging
        const newOver = getOverIndex(e.clientY);
        if (newOver !== d.overIndex) {
          d.overIndex = newOver;
          setOverIndex(newOver);
          // Gentle haptic on slot change
          if ('vibrate' in navigator) navigator.vibrate(10);
        }
        d.didMove = true;
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const d = dragRef.current;
      if (d.pointerId !== e.pointerId) return;

      if (d.longPressTimer) {
        clearTimeout(d.longPressTimer);
        d.longPressTimer = null;
      }

      if (d.active) {
        commitDrop();
      } else {
        // It was a tap — select the slide
        const target = e.target as HTMLElement;
        const card   = target.closest('[data-slide-index]') as HTMLElement | null;
        if (card && !target.closest('[data-no-drag]')) {
          const index = parseInt(card.dataset.slideIndex ?? '-1', 10);
          if (index >= 0) setCurrentSlideIndex(index);
        }
        cancelDrag();
      }

      d.startIndex = -1;
      d.pointerId  = -1;
    };

    const onPointerCancel = () => {
      cancelDrag();
    };

    // ✅ Use capture:true + passive:false so we can preventDefault scroll
    list.addEventListener('pointerdown',   onPointerDown,  { passive: true  });
    list.addEventListener('pointermove',   onPointerMove,  { passive: false });
    list.addEventListener('pointerup',     onPointerUp,    { passive: true  });
    list.addEventListener('pointercancel', onPointerCancel, { passive: true });

    return () => {
      list.removeEventListener('pointerdown',   onPointerDown);
      list.removeEventListener('pointermove',   onPointerMove);
      list.removeEventListener('pointerup',     onPointerUp);
      list.removeEventListener('pointercancel', onPointerCancel);
    };
  }, [startDrag, commitDrop, cancelDrag, getOverIndex, setCurrentSlideIndex]);

  // ── Display order with drag preview ──────────────────────────────────────
  const displayOrder: number[] = (() => {
    const order = slides.map((_, i) => i);
    if (draggingIndex < 0 || overIndex < 0 || draggingIndex === overIndex) return order;
    const result = [...order];
    const [pulled] = result.splice(draggingIndex, 1);
    result.splice(overIndex, 0, pulled);
    return result;
  })();

  const handleAddSlide = useCallback(() => {
    if (onAddSlide) onAddSlide();
    else            addSlide(currentSlideIndex + 1);
  }, [onAddSlide, addSlide, currentSlideIndex]);

  if (!presentation) return null;

  return (
    <div className="flex flex-col h-full bg-gray-900 select-none">

      {/* ── Sticky header ── */}
      <div className="flex items-center justify-between px-4 py-3
                      border-b border-gray-800 shrink-0 bg-gray-900 z-10">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-sm">Slides</span>
          <span className="bg-gray-700 text-gray-300 text-xs font-mono
                           px-2 py-0.5 rounded-full">
            {slides.length}
          </span>
        </div>
        <button
          onClick={handleAddSlide}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600
                     hover:bg-blue-500 active:bg-blue-700 text-white
                     rounded-xl text-sm font-bold transition-colors"
        >
          ＋ New Slide
        </button>
      </div>

      {/* ── Drag hint ── */}
      {slides.length > 1 && draggingIndex < 0 && (
        <p className="text-[10px] text-gray-600 text-center py-2 shrink-0">
          Hold to reorder · Tap to select
        </p>
      )}

      {/* ── Active drag indicator ── */}
      {draggingIndex >= 0 && (
        <div className="px-4 py-2 bg-blue-950/50 border-b border-blue-800/50 shrink-0">
          <p className="text-[11px] text-blue-300 text-center font-medium">
            Moving slide {draggingIndex + 1}
            {overIndex !== draggingIndex ? ` → position ${overIndex + 1}` : ''}
          </p>
        </div>
      )}

      {/* ── Slide list ── */}
      {slides.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-4">
          <span className="text-5xl">🗂️</span>
          <p className="text-gray-500 text-sm">No slides yet</p>
          <button
            onClick={handleAddSlide}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500
                       text-white rounded-xl text-sm font-bold transition-colors"
          >
            ＋ Add First Slide
          </button>
        </div>
      ) : (
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto overscroll-contain px-3 pb-6 pt-2 space-y-2"
          // ✅ Prevent default scroll only when drag is active
          style={{ touchAction: draggingIndex >= 0 ? 'none' : 'pan-y' }}
        >
          {displayOrder.map((realIndex, displayIndex) => {
            const slide     = slides[realIndex];
            const isActive  = realIndex === currentSlideIndex;
            const isDragged = realIndex === draggingIndex;
            const isOver    = displayIndex === overIndex
                              && draggingIndex >= 0
                              && realIndex !== draggingIndex;

            const bg        = slideBackground(slide);
            const whiteText = shouldUseWhiteText(slide);
            const animBg    = slide.animatedBackground as AnimatedBackground | undefined;
            const animMeta  = animBg ? ANIMATED_BG_META[animBg.type] : null;

            return (
              <React.Fragment key={slide.id}>
                {/* Drop indicator above */}
                {isOver && overIndex < draggingIndex && <DropIndicator />}

                {/* ── Card ── */}
                <div
                  // ✅ data attribute used by native listeners to identify index
                  data-slide-index={realIndex}
                  ref={el => { itemRefs.current[displayIndex] = el; }}
                  className={`
                    flex items-center gap-3 p-3 rounded-2xl border-2
                    transition-all duration-150
                    ${isActive
                      ? animBg
                        ? 'border-purple-400 bg-purple-950/30'
                        : 'border-blue-500 bg-blue-950/30'
                      : 'border-gray-700/60 bg-gray-800/40'
                    }
                    ${isDragged
                      ? 'opacity-50 scale-95 border-blue-400 bg-blue-950/20'
                      : ''
                    }
                    ${draggingIndex >= 0 && !isDragged
                      ? 'transition-transform duration-200'
                      : ''
                    }
                  `}
                >
                  {/* Drag handle — visual only */}
                  <div className="flex flex-col items-center gap-1 shrink-0 w-8 py-1">
                    <span className="text-xs text-gray-500 font-mono font-bold">
                      {displayIndex + 1}
                    </span>
                    {/* 3×2 dot grid handle */}
                    <div className="grid grid-cols-2 gap-0.5 opacity-50">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="w-1 h-1 rounded-full bg-gray-400" />
                      ))}
                    </div>
                  </div>

                  {/* Thumbnail */}
                  <div
                    className="shrink-0 rounded-xl overflow-hidden relative
                               border border-gray-700/50"
                    style={{ width: 112, height: 63, ...bg }}
                  >
                    {animBg && animMeta && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: `radial-gradient(circle at 30% 40%,
                          ${animBg.color1 ?? animMeta.colors[0]}55 0%, transparent 60%),
                          radial-gradient(circle at 70% 60%,
                          ${animBg.color2 ?? animMeta.colors[1]}44 0%, transparent 60%)`,
                      }} />
                    )}

                    {slide.elements
                      .filter((el: any) => el.type === 'text')
                      .slice(0, 2)
                      .map((el: any, i: number) => (
                        <div key={i} style={{
                          position:   'absolute',
                          left:       `${(el.x / 1920) * 100}%`,
                          top:        `${(el.y / 1080) * 100}%`,
                          fontSize:   `${Math.max((el.fontSize || 24) / 1920 * 60, 5)}px`,
                          color:      el.fontColor || (whiteText ? '#fff' : '#000'),
                          fontFamily: el.fontFamily || 'Arial',
                          fontWeight: el.fontWeight || 'normal',
                          whiteSpace: 'nowrap', overflow: 'hidden',
                          maxWidth:   '90%',    lineHeight: 1.1,
                          pointerEvents: 'none',
                          textShadow: whiteText ? '0 1px 2px rgba(0,0,0,0.8)' : 'none',
                        }}>
                          {el.text}
                        </div>
                      ))
                    }

                    {isActive && (
                      <div className={`absolute bottom-1 right-1 w-2 h-2
                        rounded-full ${animBg ? 'bg-purple-400' : 'bg-blue-400'}`}
                      />
                    )}
                  </div>

                  {/* Info + actions */}
                  <div className="flex-1 min-w-0 flex flex-col gap-2">
                    {/* Badges */}
                    <div className="flex flex-wrap gap-1">
                      {isActive && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold
                          ${animBg
                            ? 'bg-purple-900/60 text-purple-300'
                            : 'bg-blue-900/60 text-blue-300'
                          }`}>
                          ● Active
                        </span>
                      )}
                      {animBg && animMeta && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full
                                         bg-gray-700/60 text-gray-300">
                          {animMeta.emoji} {animMeta.label}
                        </span>
                      )}
                      {!animBg && slide.backgroundGradient && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full
                                         bg-gray-700/60 text-purple-300">
                          ∇ Gradient
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] text-gray-500">
                      {slide.elements.length === 0
                        ? 'Empty slide'
                        : `${slide.elements.length} element${slide.elements.length !== 1 ? 's' : ''}`
                      }
                    </span>

                    {/* Action buttons — data-no-drag prevents drag start */}
                    <div className="flex gap-2" data-no-drag="true">
                      <button
                        data-no-drag="true"
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateSlide(realIndex);
                        }}
                        className="flex-1 py-2 bg-gray-700 hover:bg-gray-600
                                   active:bg-gray-500 text-gray-200 rounded-lg
                                   text-[11px] font-medium transition-colors"
                      >
                        📋 Copy
                      </button>
                      {slides.length > 1 && (
                        <button
                          data-no-drag="true"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSlide(realIndex);
                          }}
                          className="flex-1 py-2 bg-red-900/60 hover:bg-red-900
                                     active:bg-red-800 text-red-300 rounded-lg
                                     text-[11px] font-medium transition-colors"
                        >
                          🗑️ Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Drop indicator below */}
                {isOver && overIndex >= draggingIndex && <DropIndicator />}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MobileSlidePanel;