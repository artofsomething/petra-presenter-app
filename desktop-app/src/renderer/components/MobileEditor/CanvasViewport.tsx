// src/renderer/components/Editor/CanvasViewport.tsx
import React, {
  useRef, useState, useCallback, useEffect,
  type ReactNode,
} from 'react';

const MIN_ZOOM    = 0.15;
const MAX_ZOOM    = 5.0;
const FIT_PADDING = 24;

export interface ViewState {
  zoom:    number;
  offsetX: number;
  offsetY: number;
}

interface CanvasViewportProps {
  canvasWidth:  number;
  canvasHeight: number;
  children:     (zoom: number) => ReactNode;
  onBgTap?:     () => void;
}

// ── Zoom Pill ─────────────────────────────────────────────────────────────────
const ZoomPill: React.FC<{
  zoom:      number;
  onZoomIn:  () => void;
  onZoomOut: () => void;
  onFit:     () => void;
  onReset:   () => void;
}> = ({ zoom, onZoomIn, onZoomOut, onFit, onReset }) => (
  <div
    className="absolute bottom-4 right-4 z-30
               flex items-center gap-0.5
               bg-gray-900/95 border border-gray-700
               rounded-2xl px-1.5 py-1 shadow-xl"
    style={{ touchAction: 'manipulation' }}
  >
    <button onClick={onZoomOut}
      className="w-10 h-10 flex items-center justify-center rounded-xl
                 text-white bg-gray-700 hover:bg-gray-600 active:bg-gray-500
                 text-xl font-bold select-none">−</button>

    <button onClick={onFit}
      className="px-3 h-10 flex items-center justify-center rounded-xl
                 text-white bg-gray-700 hover:bg-gray-600 active:bg-gray-500
                 text-xs font-mono font-bold min-w-[60px] select-none">
      {Math.round(zoom * 100)}%
    </button>

    <button onClick={onZoomIn}
      className="w-10 h-10 flex items-center justify-center rounded-xl
                 text-white bg-gray-700 hover:bg-gray-600 active:bg-gray-500
                 text-xl font-bold select-none">＋</button>

    <div className="w-px h-6 bg-gray-600 mx-1" />

    <button onClick={onReset}
      className="w-10 h-10 flex items-center justify-center rounded-xl
                 text-gray-300 bg-gray-700 hover:bg-gray-600 active:bg-gray-500
                 text-[10px] font-bold select-none">1:1</button>
  </div>
);

// ── Hint ──────────────────────────────────────────────────────────────────────
const Hint: React.FC = () => {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30
                    pointer-events-none bg-black/70 text-gray-200
                    text-[11px] px-3 py-1.5 rounded-full whitespace-nowrap">
      Pinch to zoom · Two fingers to pan
    </div>
  );
};

// ── CanvasViewport ────────────────────────────────────────────────────────────
const CanvasViewport: React.FC<CanvasViewportProps> = ({
  canvasWidth, canvasHeight, children, onBgTap,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Use refs for everything touch-handlers read — avoids stale closures
  const zoomRef    = useRef(1);
  const offsetXRef = useRef(0);
  const offsetYRef = useRef(0);
  const cwRef      = useRef(0);  // container width
  const chRef      = useRef(0);  // container height

  // React state only for re-render
  const [view, setView] = useState<ViewState>({ zoom: 1, offsetX: 0, offsetY: 0 });

  // Commit refs → state (triggers re-render)
  const commit = useCallback(() => {
    setView({
      zoom:    zoomRef.current,
      offsetX: offsetXRef.current,
      offsetY: offsetYRef.current,
    });
  }, []);

  // ── Clamp offset so canvas never floats too far off-screen ───────────────
  const clampAndSet = useCallback((ox: number, oy: number, z: number) => {
    const cw = cwRef.current;
    const ch = chRef.current;
    const sw = canvasWidth  * z;
    const sh = canvasHeight * z;
    offsetXRef.current = sw < cw ? (cw - sw) / 2 : Math.min(0, Math.max(cw - sw, ox));
    offsetYRef.current = sh < ch ? (ch - sh) / 2 : Math.min(0, Math.max(ch - sh, oy));
    zoomRef.current    = z;
  }, [canvasWidth, canvasHeight]);

  // ── Fit to container ──────────────────────────────────────────────────────
  const doFit = useCallback(() => {
    const cw = cwRef.current;
    const ch = chRef.current;
    if (!cw || !ch) return;
    const z  = Math.min(
      (cw - FIT_PADDING * 2) / canvasWidth,
      (ch - FIT_PADDING * 2) / canvasHeight,
      1,
    );
    const ox = (cw - canvasWidth  * z) / 2;
    const oy = (ch - canvasHeight * z) / 2;
    zoomRef.current    = z;
    offsetXRef.current = ox;
    offsetYRef.current = oy;
    commit();
  }, [canvasWidth, canvasHeight, commit]);

  // ── Zoom around a focal point ─────────────────────────────────────────────
  const zoomAround = useCallback((newZoom: number, fx: number, fy: number) => {
    const z     = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom));
    const ratio = z / zoomRef.current;
    const ox    = fx - (fx - offsetXRef.current) * ratio;
    const oy    = fy - (fy - offsetYRef.current) * ratio;
    clampAndSet(ox, oy, z);
    commit();
  }, [clampAndSet, commit]);

  // ── Measure container ─────────────────────────────────────────────────────
  const didFit = useRef(false);
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width: w, height: h } = e.contentRect;
      cwRef.current = w;
      chRef.current = h;
      if (!didFit.current && w > 0 && h > 0) {
        didFit.current = true;
        doFit();
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [doFit]);

  // ── Button handlers ───────────────────────────────────────────────────────
  const centerX   = () => cwRef.current / 2;
  const centerY   = () => chRef.current / 2;
  const onZoomIn  = () => zoomAround(zoomRef.current * 1.3,  centerX(), centerY());
  const onZoomOut = () => zoomAround(zoomRef.current / 1.3,  centerX(), centerY());
  const onFit     = () => doFit();
  const onReset   = () => {
    const z  = 1;
    const ox = (cwRef.current  - canvasWidth)  / 2;
    const oy = (chRef.current - canvasHeight) / 2;
    clampAndSet(ox, oy, z);
    commit();
  };

  // ── Native event listeners (passive: false) ───────────────────────────────
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    // ── Wheel ──────────────────────────────────────────────────────────────
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect   = el.getBoundingClientRect();
      const fx     = e.clientX - rect.left;
      const fy     = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.12 : 0.9;
      zoomAround(zoomRef.current * factor, fx, fy);
    };

    // ── Touch ──────────────────────────────────────────────────────────────
    let isPinching  = false;
    let lastDist    = 0;
    let lastMidX    = 0;
    let lastMidY    = 0;
    let panActive   = false;
    let panMoved    = false;
    let panStartX   = 0;
    let panStartY   = 0;
    let panStartOX  = 0;
    let panStartOY  = 0;

    const getTouchDist = (a: Touch, b: Touch) =>
      Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

    const onTouchStart = (e: TouchEvent) => {
      const rect = el.getBoundingClientRect();

      if (e.touches.length >= 2) {
        e.preventDefault();
        isPinching = true;
        panActive  = false;
        lastDist   = getTouchDist(e.touches[0], e.touches[1]);
        lastMidX   = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        lastMidY   = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
        return;
      }

      if (e.touches.length === 1 && !isPinching) {
        panActive  = true;
        panMoved   = false;
        panStartX  = e.touches[0].clientX;
        panStartY  = e.touches[0].clientY;
        panStartOX = offsetXRef.current;
        panStartOY = offsetYRef.current;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      const rect = el.getBoundingClientRect();

      // ── Pinch zoom ──────────────────────────────────────────────────────
      if (e.touches.length >= 2 && isPinching) {
        e.preventDefault();

        const newDist = getTouchDist(e.touches[0], e.touches[1]);
        const newMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const newMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

        if (lastDist > 0) {
          const factor = newDist / lastDist;
          const newZ   = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomRef.current * factor));
          const ratio  = newZ / zoomRef.current;

          // Zoom around mid-point AND pan from mid-point delta
          const ox = newMidX - (newMidX - offsetXRef.current) * ratio + (newMidX - lastMidX);
          const oy = newMidY - (newMidY - offsetYRef.current) * ratio + (newMidY - lastMidY);
          clampAndSet(ox, oy, newZ);
          commit();
        }

        lastDist = newDist;
        lastMidX = newMidX;
        lastMidY = newMidY;
        return;
      }

      // ── Single-finger pan ────────────────────────────────────────────────
      if (e.touches.length === 1 && panActive && !isPinching) {
        const dx = e.touches[0].clientX - panStartX;
        const dy = e.touches[0].clientY - panStartY;

        if (!panMoved && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
          panMoved = true;
        }

        if (panMoved) {
          e.preventDefault();
          clampAndSet(panStartOX + dx, panStartOY + dy, zoomRef.current);
          commit();
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) isPinching = false;
      if (e.touches.length === 0) {
        if (panActive && !panMoved) {
          // Tap with no movement = background tap
          onBgTap?.();
        }
        panActive = false;
        panMoved  = false;
      }
    };

    el.addEventListener('wheel',      onWheel,      { passive: false });
    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove',  onTouchMove,  { passive: false });
    el.addEventListener('touchend',   onTouchEnd,   { passive: false });

    return () => {
      el.removeEventListener('wheel',      onWheel);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove',  onTouchMove);
      el.removeEventListener('touchend',   onTouchEnd);
    };
  // ✅ Empty deps — all values read via refs, no stale closure issues
  }, []);                                             // eslint-disable-line

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      ref={wrapperRef}
      className="relative w-full h-full bg-gray-950 overflow-hidden"
      style={{ touchAction: 'none', userSelect: 'none' }}
    >
      {/* ✅ CSS transform on a plain div — Konva Stage sits inside at full size */}
      <div
        style={{
          position:       'absolute',
          left:            0,
          top:             0,
          width:           canvasWidth,
          height:          canvasHeight,
          transform:       `translate(${view.offsetX}px, ${view.offsetY}px) scale(${view.zoom})`,
          transformOrigin: 'top left',
          willChange:      'transform',
          boxShadow:       '0 8px 48px rgba(0,0,0,0.8)',
          borderRadius:    8,
          overflow:        'hidden',
        }}
      >
        {/*
          ✅ children() receives zoom so MobileSlideCanvas can scale
             transformer anchor sizes inversely
        */}
        {children(view.zoom)}
      </div>

      <ZoomPill
        zoom={view.zoom}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onFit={onFit}
        onReset={onReset}
      />

      <Hint />
    </div>
  );
};

export default CanvasViewport;