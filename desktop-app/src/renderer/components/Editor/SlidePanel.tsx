import React, {
  useRef, useState, useCallback, useEffect,
} from 'react';
import usePresentationStore from '../../store/usePresentation';
import StageSlideCanvas from '../Stage/StageSlideCanvas';
import type { Slide } from '../../../server/types';

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
           
          const animBg     = slide.animatedBackground as AnimatedBackground | undefined;
          const animMeta   = animBg ?? null;

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
               <div className="w-full aspect-video rounded-t overflow-hidden relative">
                  <StageSlideCanvas
                    slide={slide as unknown as Slide}
                    width={192}
                    height={108}
                  />
                </div>

                {/* ── Footer bar ───────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-2 py-1
                                bg-black/30 rounded-b">
                  <span className="text-[10px] text-gray-300 font-mono font-bold">
                    {displayIndex + 1}
                  </span>

                  <div className="flex items-center gap-1">
                    
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

