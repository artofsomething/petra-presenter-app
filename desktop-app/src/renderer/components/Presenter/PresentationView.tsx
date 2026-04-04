// src/renderer/components/Presenter/PresentationView.tsx
// REPLACE ENTIRE FILE

import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  Stage, Layer, Rect, Text, Circle, Ellipse, Star,
  Image as KonvaImage,
} from 'react-konva';
import Konva from 'konva';
import { io } from 'socket.io-client';
import type { SlideElement, GradientConfig, AnimatedBackground } from '../../../server/types';
import SlideTransition from './SlideTransition';
import AnimatedBackgroundComponent from '../Editor/AnimatedBackground';
import type { TransitionType } from '../../types/transitions';

// ── Image cache ───────────────────────────────────────────────────────────────
const presentationImageCache = new Map<string, HTMLImageElement>();

// ── Gradient helpers ──────────────────────────────────────────────────────────
function gradientToPoints(angle: number, w: number, h: number) {
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const cx  = w / 2;
  const cy  = h / 2;
  const len = Math.sqrt(w * w + h * h) / 2;
  return {
    startPoint: { x: cx - cos * len, y: cy - sin * len },
    endPoint:   { x: cx + cos * len, y: cy + sin * len },
  };
}

function buildGradientProps(gradient: GradientConfig, w: number, h: number) {
  const colorStops = [...gradient.stops]
    .sort((a, b) => a.offset - b.offset)
    .flatMap((s) => [s.offset, s.color]);

  if (gradient.type === 'radial') {
    return {
      fillRadialGradientStartPoint:  { x: w / 2, y: h / 2 },
      fillRadialGradientStartRadius: 0,
      fillRadialGradientEndPoint:    { x: w / 2, y: h / 2 },
      fillRadialGradientEndRadius:   Math.max(w, h) / 2,
      fillRadialGradientColorStops:  colorStops,
      fill: undefined,
    };
  }

  const { startPoint, endPoint } = gradientToPoints(gradient.angle, w, h);
  return {
    fillLinearGradientStartPoint:    startPoint,
    fillLinearGradientEndPoint:      endPoint,
    fillLinearGradientColorStops:    colorStops,
    fill: undefined,
  };
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface SlideData {
  id:                   string;
  backgroundColor?:     string;
  backgroundGradient?:  GradientConfig;
  backgroundImage?:     string;
  backgroundVideo?:     string;
  backgroundVideoLoop?: boolean;
  backgroundVideoMuted?:boolean;
  elements:             SlideElement[];
  transition?:          string;
  transitionDuration?:  number;
  animatedBackground?: AnimatedBackground;
  notes?:               string;
}

interface PresentationData {
  name:   string;
  slides: SlideData[];
  settings?: { defaultTransition?: string };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const PresentationView: React.FC = () => {

  // ── All state INSIDE the component ───────────────────────────────────────
  const [slideSize, setSlideSize]       = useState({ width: 1920, height: 1080 });
  const [presentation, setPresentation] = useState<PresentationData | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isBlackScreen, setIsBlackScreen]         = useState(false);
  const [wsConnected, setWsConnected]             = useState(false);
  const [debugLines, setDebugLines]               = useState<string[]>([]);
  const [showDebug, setShowDebug]                 = useState(true);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  const [dimensions, setDimensions] = useState({
    width:  window.innerWidth,
    height: window.innerHeight,
  });

  const addDebug = useCallback((msg: string) => {
    console.log('[PresentationView]', msg);
    setDebugLines((prev) => [...prev.slice(-10), msg]);
  }, []);

  // ── Hide debug overlay after 20s ─────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setShowDebug(false), 20000);
    return () => clearTimeout(t);
  }, []);

  // ── Window resize ─────────────────────────────────────────────────────────
  useEffect(() => {
    addDebug(`Window: ${window.innerWidth}×${window.innerHeight}`);
    addDebug(`Hash: ${window.location.hash}`);

    const handler = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
      addDebug(`Resized: ${window.innerWidth}×${window.innerHeight}`);
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // ── IPC: display-info + resolution changes ────────────────────────────────
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api) {
      addDebug('❌ electronAPI not found');
      return;
    }
    addDebug('✅ electronAPI found');

    const unsubInfo = api.onDisplayInfo?.((data: {
      displayId:   number;
      slideWidth:  number;
      slideHeight: number;
    }) => {
      addDebug(`display-info: ${data.slideWidth}×${data.slideHeight}`);
      setSlideSize({ width: data.slideWidth, height: data.slideHeight });
    });

    const unsubRes = api.onResolutionChanged?.((data: {
      width: number;
      height: number;
    }) => {
      addDebug(`resolution-changed: ${data.width}×${data.height}`);
      setSlideSize({ width: data.width, height: data.height });
    });

    return () => {
      unsubInfo?.();
      unsubRes?.();
    };
  }, []);

  // ── WebSocket: get presentation state ─────────────────────────────────────
  // The presentation window is a SEPARATE process from the editor.
  // It CANNOT share Zustand state. It must get data via WebSocket.
  useEffect(() => {
    addDebug('Connecting to WS...');

    const socket = io('http://localhost:8765', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      addDebug('✅ WS connected: ' + socket.id);
      setWsConnected(true);

      socket.emit('register', {
        name: 'Presentation Display',
        role: 'display',
      });

      // Request full state
      setTimeout(() => {
        socket.emit('request-sync');
        addDebug('request-sync sent');
      }, 300);
    });

    socket.on('sync-state', (data: any) => {
      addDebug(`sync-state: ${data.presentation?.slides?.length ?? 0} slides, idx=${data.currentSlideIndex}`);
      if (data.presentation)              setPresentation(data.presentation);
      if (data.currentSlideIndex != null) setCurrentSlideIndex(data.currentSlideIndex);
      if (data.isBlackScreen    != null)  setIsBlackScreen(data.isBlackScreen);
    });

    socket.on('slide-changed', (data: any) => {
      addDebug(`slide-changed: ${data.index}`);
      setCurrentSlideIndex(data.index);
    });

    socket.on('presentation-updated', (data: any) => {
      addDebug('presentation-updated');
      if (data.presentation) setPresentation(data.presentation);
    });

    socket.on('black-screen-toggled', (value: boolean) => {
      addDebug(`black-screen: ${value}`);
      setIsBlackScreen(value);
    });

    socket.on('presentation-started', (data: any) => {
      addDebug('presentation-started');
      if (data?.index != null) setCurrentSlideIndex(data.index);
    });

    socket.on('disconnect', () => {
      addDebug('❌ WS disconnected');
      setWsConnected(false);
    });

    socket.on('connect_error', (err: any) => {
      addDebug(`WS error: ${err.message}`);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // ── Keyboard navigation ───────────────────────────────────────────────────
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const socket = socketRef.current;
    if (!socket) return;
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': case ' ': case 'PageDown':
        socket.emit('next-slide'); break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp':
        socket.emit('prev-slide'); break;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ── Scale calculation ─────────────────────────────────────────────────────
  const scaleX  = dimensions.width  / slideSize.width;
  const scaleY  = dimensions.height / slideSize.height;
  const scale   = Math.min(scaleX, scaleY);
  const offsetX = (dimensions.width  - slideSize.width  * scale) / 2;
  const offsetY = (dimensions.height - slideSize.height * scale) / 2;

  const currentSlide = presentation?.slides[currentSlideIndex];

  // ── Debug overlay ─────────────────────────────────────────────────────────
  const DebugOverlay = (
    <div style={{
      position:   'absolute',
      top:        10, left: 10,
      zIndex:     99999,
      background: 'rgba(0,0,0,0.9)',
      color:      '#00ff00',
      fontFamily: 'monospace',
      fontSize:   12,
      padding:    10,
      borderRadius: 6,
      border:     '1px solid #00ff00',
      maxWidth:   480,
      pointerEvents: 'none',
      lineHeight: 1.6,
    }}>
      <div style={{ color: '#ffff00', marginBottom: 4, fontWeight: 'bold' }}>
        🔍 PresentationView Debug
      </div>
      <div>WS: {wsConnected ? '🟢 connected' : '🔴 disconnected'}</div>
      <div>Slides: {presentation?.slides.length ?? 0}</div>
      <div>Index: {currentSlideIndex}</div>
      <div>SlideSize: {slideSize.width}×{slideSize.height}</div>
      <div>Window: {dimensions.width}×{dimensions.height}</div>
      <div>Scale: {scale.toFixed(3)}</div>
      <div style={{ borderTop: '1px solid #333', marginTop: 4, paddingTop: 4 }}>
        {debugLines.map((l, i) => <div key={i}>{l}</div>)}
      </div>
      <div style={{ color: '#555', fontSize: 10, marginTop: 4 }}>
        (hides in 20s — press Ctrl+D to toggle)
      </div>
    </div>
  );

  // ── Ctrl+D to toggle debug ────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        setShowDebug((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Black screen ──────────────────────────────────────────────────────────
  if (isBlackScreen) {
    return (
      <div style={{ width: '100vw', height: '100vh',
                    backgroundColor: '#000', cursor: 'none' }}>
        {showDebug && DebugOverlay}
      </div>
    );
  }

  // ── No data yet ───────────────────────────────────────────────────────────
  if (!presentation || !currentSlide) {
    return (
      <div style={{
        width: '100vw', height: '100vh', backgroundColor: '#111',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        color: '#fff', cursor: 'none', userSelect: 'none',
      }}>
        {showDebug && DebugOverlay}
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎤</div>
        <p style={{ color: '#555', fontSize: 16 }}>
          {wsConnected
            ? 'Connected — waiting for sync...'
            : 'Connecting to presentation...'}
        </p>
        <p style={{ color: '#333', fontSize: 12, marginTop: 8 }}>
          {dimensions.width} × {dimensions.height}
        </p>
      </div>
    );
  }

  // ── Background rect props ─────────────────────────────────────────────────
  const bgGradient  = currentSlide.backgroundGradient;
  const bgRectProps = bgGradient && !currentSlide.backgroundVideo
    ? buildGradientProps(bgGradient, slideSize.width, slideSize.height)
    : {
        fill: currentSlide.backgroundVideo
          ? 'transparent'
          : (currentSlide.backgroundColor || '#ffffff'),
      };

  const transition         = (currentSlide.transition
    || presentation.settings?.defaultTransition
    || 'fade') as TransitionType;
  const transitionDuration = currentSlide.transitionDuration || 500;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      width: '100vw', height: '100vh',
      backgroundColor: '#000',
      cursor: 'none', overflow: 'hidden', position: 'relative',
    }}>
      {showDebug && DebugOverlay}

      <SlideTransition
        slideIndex={currentSlideIndex}
        transition={transition}
        duration={transitionDuration}
      >
        {currentSlide.animatedBackground && (
          <div style={{
            position: 'absolute',
            left:     offsetX,
            top:      offsetY,
            width:    slideSize.width  * scale,
            height:   slideSize.height * scale,
            zIndex:   0,
            overflow: 'hidden',
          }}>
            <AnimatedBackgroundComponent
              config={currentSlide.animatedBackground as AnimatedBackground}
            />
          </div>
        )}
        {/* Video background — outside Konva */}
        {currentSlide.backgroundVideo && (
          <VideoBackground
            src={currentSlide.backgroundVideo}
            loop={currentSlide.backgroundVideoLoop  ?? true}
            muted={currentSlide.backgroundVideoMuted ?? true}
            offsetX={offsetX}
            offsetY={offsetY}
            width={slideSize.width  * scale}
            height={slideSize.height * scale}
          />
        )}

        <Stage
          width={dimensions.width}
          height={dimensions.height}
          listening={false}
          style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}
        >
          <Layer x={offsetX} y={offsetY} scaleX={scale} scaleY={scale}>

            {/* Slide background */}
            <Rect
              x={0} y={0}
              width={slideSize.width}
              height={slideSize.height}
              {...(currentSlide.animatedBackground
              ? { fill: 'transparent' }   // let HTML layer show
              : bgRectProps               // use normal bg
            )}
            />

            {/* Background image */}
            {currentSlide.backgroundImage && !currentSlide.backgroundVideo && (
              <PresentationBackgroundImage
                src={currentSlide.backgroundImage}
                width={slideSize.width}
                height={slideSize.height}
              />
            )}

            {/* Elements */}
            {currentSlide.elements.map((element) => (
              <PresentationElement key={element.id} element={element} />
            ))}

          </Layer>
        </Stage>
      </SlideTransition>

      {/* Slide counter */}
      <div style={{
        position: 'absolute', bottom: 8, right: 16,
        color: 'rgba(255,255,255,0.15)', fontSize: 12, zIndex: 10,
        pointerEvents: 'none',
      }}>
        {currentSlideIndex + 1} / {presentation.slides.length}
      </div>
    </div>
  );
};

// ── Helpers (add near top of file) ───────────────────────────────────────────

/** Only set crossOrigin for actual remote HTTP URLs */
function needsCrossOrigin(src: string): boolean {
  return src.startsWith('http:') || src.startsWith('https:');
}

/** Validate src is a usable media URL */
function isValidSrc(src: string | null | undefined): src is string {
  if (!src || src.trim() === '') return false;
  return (
    src.startsWith('blob:')  ||
    src.startsWith('data:')  ||
    src.startsWith('file:')  ||
    src.startsWith('http:')  ||
    src.startsWith('https:')
  );
}
// ── Video Background ──────────────────────────────────────────────────────────
interface VideoBackgroundProps {
  src: string; loop: boolean; muted: boolean;
  offsetX: number; offsetY: number; width: number; height: number;
}

const VideoBackground: React.FC<VideoBackgroundProps> = ({
  src, loop, muted, offsetX, offsetY, width, height,
}) => {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const mountedRef  = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // ✅ FIX: Validate src before touching the element
    if (!isValidSrc(src)) {
      console.warn('[VideoBackground] Invalid src:', src);
      return;
    }

    video.pause();

    // ✅ FIX: Only set crossOrigin for remote URLs
    if (needsCrossOrigin(src)) {
      video.crossOrigin = 'anonymous';
    } else {
      video.removeAttribute('crossorigin');
    }

    video.loop  = loop;
    video.muted = muted;
    video.src   = src;
    // ✅ FIX: Only one load() call — remove the manual one, let src assignment trigger it
    // video.load() is implicit when you set video.src

    const onCanPlay = () => {
      if (!mountedRef.current) return;
      video.play().catch((e) => console.warn('[VideoBackground] Autoplay blocked:', e.message));
    };

    const onError = () => {
      if (!mountedRef.current) return;
      const err = video.error;
      console.error(
        '[VideoBackground] Load error:',
        err ? `code ${err.code}: ${err.message}` : 'unknown',
        '\n  src:', src.substring(0, 80),
      );
    };

    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('error',   onError);

    return () => {
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('error',   onError);
      video.pause();
      // ✅ FIX: Set src to empty, do NOT call load() — avoids spurious error events
      video.src = '';
    };
  }, [src, loop, muted]);

  return (
    <video
      ref={videoRef}
      playsInline
      muted={muted}
      style={{
        position:  'absolute',
        left:      offsetX,
        top:       offsetY,
        width,
        height,
        objectFit: 'cover',
        zIndex:    0,
      }}
    />
  );
};

// ── Background Image ──────────────────────────────────────────────────────────
const PresentationBackgroundImage: React.FC<{
  src: string; width: number; height: number;
}> = ({ src, width, height }) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!isValidSrc(src)) return;

    const key = src.substring(0, 80);
    if (presentationImageCache.has(key)) {
      setImage(presentationImageCache.get(key)!);
      return;
    }

    const img = new window.Image();

    // ✅ FIX: Only set crossOrigin for remote URLs
    if (needsCrossOrigin(src)) {
      img.crossOrigin = 'anonymous';
    }

    img.onload  = () => { presentationImageCache.set(key, img); setImage(img); };
    img.onerror = () => console.warn('[PresentationBgImage] Failed:', src.substring(0, 60));
    img.src     = src;
  }, [src]);

  if (!image) return null;
  return (
    <KonvaImage
      x={0} y={0}
      width={width}
      height={height}
      image={image}
      listening={false}
    />
  );
};

// ── Element dispatcher ────────────────────────────────────────────────────────
const PresentationElement: React.FC<{ element: SlideElement }> = ({ element }) => {
  switch (element.type) {
    case 'text':  return <PresentationText  element={element} />;
    case 'shape': return <PresentationShape element={element} />;
    case 'image': return <PresentationImage element={element} />;
    case 'video': return <PresentationVideo element={element} />;
    default:      return null;
  }
};

// ── Text ──────────────────────────────────────────────────────────────────────
const PresentationText: React.FC<{ element: SlideElement }> = ({ element }) => (
  <Text
    x={element.x}           y={element.y}
    width={element.width}   height={element.height}
    text={element.text || ''}
    fontSize={element.fontSize || 24}
    fontFamily={element.fontFamily || 'Arial'}
    fill={element.fontColor || '#000000'}
    fontStyle={
      `${element.fontWeight === 'bold' ? 'bold' : ''} ${
        element.fontStyle === 'italic' ? 'italic' : ''
      }`.trim() || 'normal'
    }
    align={element.textAlign || 'left'}
    wrap="word"
    stroke={element.strokeColor   || undefined}
    strokeWidth={element.strokeWidth || 0}
    shadowColor={element.shadowColor || undefined}
    shadowBlur={element.shadowBlur   || 0}
    shadowOffsetX={element.shadowOffsetX || 0}
    shadowOffsetY={element.shadowOffsetY || 0}
    rotation={element.rotation || 0}
    opacity={element.opacity ?? 1}
    listening={false}
  />
);

// ── Shape ─────────────────────────────────────────────────────────────────────
const PresentationShape: React.FC<{ element: SlideElement }> = ({ element }) => {
  const common = {
    opacity:   element.opacity ?? 1,
    rotation:  element.rotation || 0,
    listening: false,
  };

  const { x, y, width: w, height: h } = element;

  const getFill = (fallback: string) =>
    element.fillGradient
      ? buildGradientProps(element.fillGradient, w, h)
      : { fill: element.fill || fallback };

  switch (element.shapeType) {

    case 'circle': {
      const radius    = Math.min(w, h) / 2;
      const gradProps = element.fillGradient
        ? buildGradientProps(element.fillGradient, radius * 2, radius * 2)
        : { fill: element.fill || '#3b82f6' };
      return (
        <Circle {...common} {...gradProps}
          x={x + w / 2} y={y + h / 2}
          radius={radius}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth || 0}
        />
      );
    }

    case 'ellipse': {
      const gradProps = element.fillGradient
        ? buildGradientProps(element.fillGradient, w, h)
        : { fill: element.fill || '#3b82f6' };
      return (
        <Ellipse {...common} {...gradProps}
          x={x + w / 2} y={y + h / 2}
          radiusX={w / 2} radiusY={h / 2}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth || 0}
        />
      );
    }

    case 'star': {
      const r         = Math.min(w, h) / 2;
      const gradProps = element.fillGradient
        ? buildGradientProps(element.fillGradient, r * 2, r * 2)
        : { fill: element.fill || '#eab308' };
      return (
        <Star {...common} {...gradProps}
          x={x + w / 2} y={y + h / 2}
          numPoints={5}
          innerRadius={r / 2}
          outerRadius={r}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth || 0}
        />
      );
    }

    case 'rounded-rect': {
      const capped = Math.min(element.cornerRadius ?? 20, Math.min(w, h) / 2);
      return (
        <Rect {...common} {...getFill('#3b82f6')}
          x={x} y={y} width={w} height={h}
          cornerRadius={capped}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth || 0}
        />
      );
    }

    default:
      return (
        <Rect {...common} {...getFill('#3b82f6')}
          x={x} y={y} width={w} height={h}
          cornerRadius={0}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth || 0}
        />
      );
  }
};

// ── Image ─────────────────────────────────────────────────────────────────────
const PresentationImage: React.FC<{ element: SlideElement }> = ({ element }) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!isValidSrc(element.src)) return;

    const src = element.src!;
    const key = src.substring(0, 80) + element.id;

    if (presentationImageCache.has(key)) {
      setImage(presentationImageCache.get(key)!);
      return;
    }

    const img = new window.Image();

    // ✅ FIX: Only set crossOrigin for remote URLs
    if (needsCrossOrigin(src)) {
      img.crossOrigin = 'anonymous';
    }

    img.onload  = () => { presentationImageCache.set(key, img); setImage(img); };
    img.onerror = () => console.warn('[PresentationImage] Failed:', src.substring(0, 60));
    img.src     = src;
  }, [element.src, element.id]);

  if (!image) return null;
  return (
    <KonvaImage
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      image={image}
      rotation={element.rotation || 0}
      opacity={element.opacity   ?? 1}
      listening={false}
    />
  );
};

// ── Video ─────────────────────────────────────────────────────────────────────
const PresentationVideo: React.FC<{ element: SlideElement }> = ({ element }) => {
  const imgRef     = useRef<Konva.Image>(null);
  const animRef    = useRef<number>(0);
  const mountedRef = useRef(true);
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    // ✅ FIX: Validate src
    if (!isValidSrc(element.videoSrc)) {
      console.warn('[PresentationVideo] Invalid videoSrc for:', element.id, element.videoSrc);
      return;
    }

    const src = element.videoSrc;
    const vid = document.createElement('video');

    // ✅ FIX: Only set crossOrigin for remote URLs
    if (needsCrossOrigin(src)) {
      vid.crossOrigin = 'anonymous';
    }

    vid.muted       = true;
    vid.loop        = element.loop      ?? true;
    vid.playsInline = true;
    vid.preload     = 'auto';

    // ✅ FIX: Attach ALL listeners BEFORE setting src
    const onLoaded = () => {
      if (!mountedRef.current) return;
      setVideo(vid);
      if (element.autoplay !== false) {
        vid.play().catch((e) =>
          console.warn('[PresentationVideo] Autoplay blocked:', e.message)
        );
      }
    };

    const onError = () => {
      if (!mountedRef.current) return;
      const err = vid.error;
      console.error(
        '[PresentationVideo] Load error for element:', element.id,
        '\n  code:', err?.code,
        '\n  src:', src.substring(0, 80),
      );
    };

    vid.addEventListener('loadeddata', onLoaded);
    vid.addEventListener('error',      onError);

    // ✅ FIX: Set src AFTER listeners are attached
    vid.src = src;

    return () => {
      cancelAnimationFrame(animRef.current);
      vid.removeEventListener('loadeddata', onLoaded);
      vid.removeEventListener('error',      onError);
      vid.pause();
      // ✅ FIX: Don't call vid.load() in cleanup — just clear src
      vid.src = '';
      if (mountedRef.current) setVideo(null);
    };
  }, [element.videoSrc, element.loop, element.autoplay, element.id]);

  // ── RAF: only draw when video is actually playing ─────────────────────────
  useEffect(() => {
    if (!video || !imgRef.current) return;

    let frameId: number;

    const update = () => {
      // ✅ FIX: Skip batchDraw when paused — saves GPU on idle video
      if (!video.paused && !video.ended) {
        imgRef.current?.getLayer()?.batchDraw();
      }
      frameId = requestAnimationFrame(update);
    };

    frameId = requestAnimationFrame(update);
    animRef.current = frameId;

    return () => cancelAnimationFrame(frameId);
  }, [video]);

  if (!video) return null;

  return (
    <KonvaImage
      ref={imgRef}
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      image={video}
      rotation={element.rotation || 0}
      opacity={element.opacity   ?? 1}
      listening={false}
    />
  );
};

export default PresentationView;

// import React, { useEffect, useCallback, useRef, useState } from 'react';
// import { Stage, Layer, Rect, Text, Circle, Ellipse, Star, Image as KonvaImage } from 'react-konva';
// import Konva from 'konva';
// import usePresentationStore from '../../store/usePresentation';
// import type { SlideElement } from '../../../server/types';
// import { useSocket } from '../../hooks/useSocket';
// import SlideTransition from './SlideTransition';
// import type { TransitionType } from '../../types/transitions';

// const presentationImageCache = new Map<string, HTMLImageElement>();

// const PresentationView: React.FC = () => {
//   const {
//     presentation, currentSlideIndex, isBlackScreen,
//     nextSlide, prevSlide,
//   } = usePresentationStore();

//   const { emitNextSlide, emitPrevSlide } = useSocket({
//     role: 'display',
//     name: 'Presentation Display',
//   });

//   const currentSlide = presentation?.slides[currentSlideIndex];

//   const [dimensions, setDimensions] = useState({
//     width: window.innerWidth,
//     height: window.innerHeight,
//   });

//   useEffect(() => {
//     const handleResize = () => {
//       setDimensions({ width: window.innerWidth, height: window.innerHeight });
//     };
//     window.addEventListener('resize', handleResize);
//     return () => window.removeEventListener('resize', handleResize);
//   }, []);

//   const scaleX = dimensions.width / 1920;
//   const scaleY = dimensions.height / 1080;
//   const scale = Math.min(scaleX, scaleY);
//   const offsetX = (dimensions.width - 1920 * scale) / 2;
//   const offsetY = (dimensions.height - 1080 * scale) / 2;

//   const handleKeyDown = useCallback((e: KeyboardEvent) => {
//     switch (e.key) {
//       case 'ArrowRight': case 'ArrowDown': case ' ': case 'PageDown':
//         nextSlide(); emitNextSlide(); break;
//       case 'ArrowLeft': case 'ArrowUp': case 'PageUp':
//         prevSlide(); emitPrevSlide(); break;
//     }
//   }, [nextSlide, prevSlide, emitNextSlide, emitPrevSlide]);

//   useEffect(() => {
//     window.addEventListener('keydown', handleKeyDown);
//     return () => window.removeEventListener('keydown', handleKeyDown);
//   }, [handleKeyDown]);

//   const transition = (currentSlide?.transition || presentation?.settings?.defaultTransition || 'fade') as TransitionType;
//   const transitionDuration = currentSlide?.transitionDuration || 500;

//   if (isBlackScreen) {
//     return <div style={{ width: '100vw', height: '100vh', backgroundColor: '#000', cursor: 'none' }} />;
//   }

//   if (!currentSlide) {
//     return (
//       <div style={{
//         width: '100vw', height: '100vh', backgroundColor: '#000',
//         display: 'flex', alignItems: 'center', justifyContent: 'center',
//         color: '#fff', fontSize: 24,
//       }}>No presentation loaded</div>
//     );
//   }

//   return (
//     <div style={{
//       width: '100vw', height: '100vh', backgroundColor: '#000',
//       cursor: 'none', overflow: 'hidden', position: 'relative',
//     }}>
//       <SlideTransition
//         slideIndex={currentSlideIndex}
//         transition={transition}
//         duration={transitionDuration}
//       >
//         {/* ✅ FIX: Moved video OUTSIDE Konva, managed by its own component */}
//         {currentSlide.backgroundVideo && (
//           <VideoBackground
//             src={currentSlide.backgroundVideo}
//             loop={currentSlide.backgroundVideoLoop ?? true}
//             muted={currentSlide.backgroundVideoMuted ?? true}
//             offsetX={offsetX}
//             offsetY={offsetY}
//             width={1920 * scale}
//             height={1080 * scale}
//           />
//         )}

//         {/* Konva Stage */}
//         <Stage
//           width={dimensions.width}
//           height={dimensions.height}
//           listening={false}
//           style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}
//         >
//           <Layer x={offsetX} y={offsetY} scaleX={scale} scaleY={scale}>
//             {/* ✅ Transparent rect when video is playing */}
//             <Rect
//               x={0} y={0} width={1920} height={1080}
//               fill={
//                 currentSlide.backgroundVideo
//                   ? 'transparent'
//                   : (currentSlide.backgroundColor || '#ffffff')
//               }
//             />

//             {/* Background Image (only when no video) */}
//             {currentSlide.backgroundImage && !currentSlide.backgroundVideo && (
//               <PresentationBackgroundImage src={currentSlide.backgroundImage} />
//             )}

//             {currentSlide.elements.map((element) => (
//               <PresentationElement key={element.id} element={element} />
//             ))}
//           </Layer>
//         </Stage>
//       </SlideTransition>

//       {/* Slide counter */}
//       <div style={{
//         position: 'absolute', bottom: 8, right: 16,
//         color: 'rgba(255,255,255,0.1)', fontSize: 12, zIndex: 10,
//       }}>
//         {currentSlideIndex + 1} / {presentation?.slides.length}
//       </div>
//     </div>
//   );
// };

// // ===== ✅ NEW: Dedicated Video Background Component =====
// interface VideoBackgroundProps {
//   src: string;
//   loop: boolean;
//   muted: boolean;
//   offsetX: number;
//   offsetY: number;
//   width: number;
//   height: number;
// }

// const VideoBackground: React.FC<VideoBackgroundProps> = ({
//   src, loop, muted, offsetX, offsetY, width, height,
// }) => {
//   const videoRef = useRef<HTMLVideoElement>(null);

//   useEffect(() => {
//     const video = videoRef.current;
//     if (!video) return;

//     // ✅ Reset and reload video properly
//     video.pause();
//     video.src = src;
//     video.loop = loop;
//     video.muted = muted;
//     video.load(); // ✅ Critical: force reload after src change

//     // ✅ Play after load
//     const handleCanPlay = () => {
//       video.play().catch((err) => {
//         console.warn('Video autoplay blocked:', err);
//       });
//     };

//     video.addEventListener('canplay', handleCanPlay);

//     return () => {
//       video.removeEventListener('canplay', handleCanPlay);
//       video.pause();
//       video.src = '';
//       video.load();
//     };
//   }, [src, loop, muted]); // ✅ Re-run when src changes (slide change)

//   return (
//     <video
//       ref={videoRef}
//       playsInline
//       style={{
//         position: 'absolute',
//         left: offsetX,
//         top: offsetY,
//         width: width,
//         height: height,
//         objectFit: 'cover',
//         zIndex: 0,           // ✅ Behind Konva stage
//         display: 'block',
//       }}
//     />
//   );
// };

// // ===== Background Image =====
// const PresentationBackgroundImage: React.FC<{ src: string }> = ({ src }) => {
//   const [image, setImage] = useState<HTMLImageElement | null>(null);

//   useEffect(() => {
//     const cacheKey = src.substring(0, 80);
//     if (presentationImageCache.has(cacheKey)) {
//       setImage(presentationImageCache.get(cacheKey)!);
//       return;
//     }
//     const img = new window.Image();
//     img.crossOrigin = 'anonymous';
//     img.onload = () => { presentationImageCache.set(cacheKey, img); setImage(img); };
//     img.src = src;
//   }, [src]);

//   if (!image) return null;
//   return (
//     <KonvaImage
//       x={0} y={0} width={1920} height={1080}
//       image={image} listening={false}
//     />
//   );
// };

// // ===== Element Renderer =====
// const PresentationElement: React.FC<{ element: SlideElement }> = ({ element }) => {
//   switch (element.type) {
//     case 'text':
//       return (
//         <Text
//           x={element.x} y={element.y}
//           width={element.width} height={element.height}
//           text={element.text || ''}
//           fontSize={element.fontSize || 24}
//           fontFamily={element.fontFamily || 'Arial'}
//           fill={element.fontColor || '#000000'}
//           fontStyle={
//             `${element.fontWeight === 'bold' ? 'bold' : ''} ${
//               element.fontStyle === 'italic' ? 'italic' : ''
//             }`.trim() || 'normal'
//           }
//           align={element.textAlign || 'left'}
//           wrap="word"
//           stroke={element.strokeColor || undefined}
//           strokeWidth={element.strokeWidth || 0}
//           shadowColor={element.shadowColor || undefined}
//           shadowBlur={element.shadowBlur || 0}
//           shadowOffsetX={element.shadowOffsetX || 0}
//           shadowOffsetY={element.shadowOffsetY || 0}
//           rotation={element.rotation || 0}
//           opacity={element.opacity ?? 1}
//           listening={false}
//         />
//       );
//     case 'shape': return <PresentationShape element={element} />;
//     case 'image': return <PresentationImage element={element} />;
//     case 'video': return <PresentationVideo element={element} />;
//     default: return null;
//   }
// };
// // src/renderer/components/Presenter/PresentationView.tsx
// // Update PresentationShape component

// const PresentationShape: React.FC<{ element: SlideElement }> = ({ element }) => {
//   const common = {
//     opacity: element.opacity ?? 1,
//     rotation: element.rotation || 0,
//     listening: false,
//   };

//   switch (element.shapeType) {
//     case 'circle':
//       return <Circle {...common}
//         x={element.x + element.width / 2}
//         y={element.y + element.height / 2}
//         radius={Math.min(element.width, element.height) / 2}
//         fill={element.fill || '#3b82f6'}
//         stroke={element.stroke}
//         strokeWidth={element.strokeWidth || 0}
//       />;

//     case 'ellipse':
//       return <Ellipse {...common}
//         x={element.x + element.width / 2}
//         y={element.y + element.height / 2}
//         radiusX={element.width / 2}
//         radiusY={element.height / 2}
//         fill={element.fill || '#3b82f6'}
//         stroke={element.stroke}
//       />;

//     case 'star':
//       return <Star {...common}
//         x={element.x + element.width / 2}
//         y={element.y + element.height / 2}
//         numPoints={5}
//         innerRadius={Math.min(element.width, element.height) / 4}
//         outerRadius={Math.min(element.width, element.height) / 2}
//         fill={element.fill || '#eab308'}
//         stroke={element.stroke}
//       />;

//     // ✅ NEW: Rounded rect in presentation view
//     case 'rounded-rect': {
//       const rawRadius = element.cornerRadius ?? 20;
//       const cappedRadius = Math.min(rawRadius, Math.min(element.width, element.height) / 2);
//       return <Rect {...common}
//         x={element.x}
//         y={element.y}
//         width={element.width}
//         height={element.height}
//         fill={element.fill || '#3b82f6'}
//         stroke={element.stroke}
//         strokeWidth={element.strokeWidth || 0}
//         cornerRadius={cappedRadius}      // ✅ No scaling needed in presentation (1920x1080)
//       />;
//     }

//     default: // plain rect
//       return <Rect {...common}
//         x={element.x}
//         y={element.y}
//         width={element.width}
//         height={element.height}
//         fill={element.fill || '#3b82f6'}
//         stroke={element.stroke}
//         strokeWidth={element.strokeWidth || 0}
//         cornerRadius={0}
//       />;
//   }
// };

// const PresentationImage: React.FC<{ element: SlideElement }> = ({ element }) => {
//   const [image, setImage] = useState<HTMLImageElement | null>(null);

//   useEffect(() => {
//     if (!element.src) return;
//     const key = element.src.substring(0, 80) + element.id;
//     if (presentationImageCache.has(key)) {
//       setImage(presentationImageCache.get(key)!);
//       return;
//     }
//     const img = new window.Image();
//     img.crossOrigin = 'anonymous';
//     img.onload = () => { presentationImageCache.set(key, img); setImage(img); };
//     img.src = element.src;
//   }, [element.src, element.id]);

//   if (!image) return null;
//   return (
//     <KonvaImage
//       x={element.x} y={element.y}
//       width={element.width} height={element.height}
//       image={image}
//       rotation={element.rotation || 0}
//       opacity={element.opacity ?? 1}
//       listening={false}
//     />
//   );
// };

// const PresentationVideo: React.FC<{ element: SlideElement }> = ({ element }) => {
//   const imgRef = useRef<Konva.Image>(null);
//   const [video, setVideo] = useState<HTMLVideoElement | null>(null);
//   const animRef = useRef<number>(0);

//   useEffect(() => {
//     if (!element.videoSrc) return;
//     const vid = document.createElement('video');
//     vid.crossOrigin = 'anonymous';
//     vid.muted = true;
//     vid.loop = element.loop ?? true;
//     vid.playsInline = true;
//     vid.src = element.videoSrc;
//     vid.onloadeddata = () => {
//       setVideo(vid);
//       if (element.autoplay) vid.play().catch(() => {});
//     };
//     return () => {
//       vid.pause();
//       vid.src = '';
//       vid.load();
//       cancelAnimationFrame(animRef.current);
//     };
//   }, [element.videoSrc]);

//   useEffect(() => {
//     if (!video || !imgRef.current) return;
//     const update = () => {
//       imgRef.current?.getLayer()?.batchDraw();
//       animRef.current = requestAnimationFrame(update);
//     };
//     animRef.current = requestAnimationFrame(update);
//     return () => cancelAnimationFrame(animRef.current);
//   }, [video]);

//   if (!video) return null;
//   return (
//     <KonvaImage
//       ref={imgRef}
//       x={element.x} y={element.y}
//       width={element.width} height={element.height}
//       image={video}
//       rotation={element.rotation || 0}
//       opacity={element.opacity ?? 1}
//       listening={false}
//     />
//   );
// };

// export default PresentationView;




// import React, { useEffect, useCallback, useRef, useState } from 'react';
// import { Stage, Layer, Rect, Text, Circle, Ellipse, Star, Image as KonvaImage } from 'react-konva';
// import Konva from 'konva';
// import usePresentationStore from '../../store/usePresentation';
// import type { SlideElement } from '../../../server/types';
// import { useSocket } from '../../hooks/useSocket';
// import SlideTransition from './SlideTransition';
// import type { TransitionType } from '../../types/transitions';

// const presentationImageCache = new Map<string, HTMLImageElement>();

// const PresentationView: React.FC = () => {
//   const {
//     presentation, currentSlideIndex, isBlackScreen,
//     nextSlide, prevSlide,
//   } = usePresentationStore();

//   const { emitNextSlide, emitPrevSlide } = useSocket({
//     role: 'display',
//     name: 'Presentation Display',
//   });

//   const currentSlide = presentation?.slides[currentSlideIndex];
//   const videoRef = useRef<HTMLVideoElement>(null);

//   const [dimensions, setDimensions] = useState({
//     width: window.innerWidth,
//     height: window.innerHeight,
//   });

//   useEffect(() => {
//     const handleResize = () => {
//       setDimensions({ width: window.innerWidth, height: window.innerHeight });
//     };
//     window.addEventListener('resize', handleResize);
//     return () => window.removeEventListener('resize', handleResize);
//   }, []);

//   const scaleX = dimensions.width / 1920;
//   const scaleY = dimensions.height / 1080;
//   const scale = Math.min(scaleX, scaleY);
//   const offsetX = (dimensions.width - 1920 * scale) / 2;
//   const offsetY = (dimensions.height - 1080 * scale) / 2;

//   const handleKeyDown = useCallback((e: KeyboardEvent) => {
//     switch (e.key) {
//       case 'ArrowRight': case 'ArrowDown': case ' ': case 'PageDown':
//         nextSlide(); emitNextSlide(); break;
//       case 'ArrowLeft': case 'ArrowUp': case 'PageUp':
//         prevSlide(); emitPrevSlide(); break;
//     }
//   }, [nextSlide, prevSlide, emitNextSlide, emitPrevSlide]);

//   useEffect(() => {
//     window.addEventListener('keydown', handleKeyDown);
//     return () => window.removeEventListener('keydown', handleKeyDown);
//   }, [handleKeyDown]);

//   // Video background
//   useEffect(() => {
//     if (videoRef.current && currentSlide?.backgroundVideo) {
//       videoRef.current.src = currentSlide.backgroundVideo;
//       videoRef.current.loop = currentSlide.backgroundVideoLoop ?? true;
//       videoRef.current.muted = currentSlide.backgroundVideoMuted ?? true;
//       videoRef.current.play().catch(() => {});
//     } else if (videoRef.current) {
//       videoRef.current.pause();
//       videoRef.current.removeAttribute('src');
//     }
//   }, [currentSlide?.backgroundVideo, currentSlideIndex]);

//   // Get transition settings
//   const transition = (currentSlide?.transition || presentation?.settings?.defaultTransition || 'fade') as TransitionType;
//   const transitionDuration = currentSlide?.transitionDuration || 500;

//   if (isBlackScreen) {
//     return <div style={{ width: '100vw', height: '100vh', backgroundColor: '#000', cursor: 'none' }} />;
//   }

//   if (!currentSlide) {
//     return (
//       <div style={{
//         width: '100vw', height: '100vh', backgroundColor: '#000',
//         display: 'flex', alignItems: 'center', justifyContent: 'center',
//         color: '#fff', fontSize: 24,
//       }}>No presentation loaded</div>
//     );
//   }

//   return (
//     <div style={{
//       width: '100vw', height: '100vh', backgroundColor: '#000',
//       cursor: 'none', overflow: 'hidden', position: 'relative',
//     }}>
//       {/* ===== TRANSITION WRAPPER ===== */}
//       <SlideTransition
//         slideIndex={currentSlideIndex}
//         transition={transition}
//         duration={transitionDuration}
//       >
//         {/* Video Background */}
//         {currentSlide.backgroundVideo && (
//           <video
//             ref={videoRef}
//             playsInline
//             style={{
//               position: 'absolute',
//               left: offsetX, top: offsetY,
//               width: 1920 * scale, height: 1080 * scale,
//               objectFit: 'cover', zIndex: 0,
//             }}
//           />
//         )}

//         {/* Konva Stage */}
//         <Stage
//           width={dimensions.width}
//           height={dimensions.height}
//           listening={false}
//           style={{ position: 'relative', zIndex: 1 }}
//         >
//           <Layer x={offsetX} y={offsetY} scaleX={scale} scaleY={scale}>
//             <Rect
//               x={0} y={0} width={1920} height={1080}
//               fill={currentSlide.backgroundVideo ? 'transparent' : (currentSlide.backgroundColor || '#ffffff')}
//             />

//             {/* Background Image */}
//             {currentSlide.backgroundImage && !currentSlide.backgroundVideo && (
//               <PresentationBackgroundImage src={currentSlide.backgroundImage} />
//             )}

//             {currentSlide.elements.map((element) => (
//               <PresentationElement key={element.id} element={element} />
//             ))}
//           </Layer>
//         </Stage>
//       </SlideTransition>

//       {/* Slide counter */}
//       <div style={{
//         position: 'absolute', bottom: 8, right: 16,
//         color: 'rgba(255,255,255,0.1)', fontSize: 12, zIndex: 10,
//       }}>
//         {currentSlideIndex + 1} / {presentation?.slides.length}
//       </div>
//     </div>
//   );
// };

// // ===== Background Image =====
// const PresentationBackgroundImage: React.FC<{ src: string }> = ({ src }) => {
//   const [image, setImage] = useState<HTMLImageElement | null>(null);

//   useEffect(() => {
//     const cacheKey = src.substring(0, 80);
//     if (presentationImageCache.has(cacheKey)) {
//       setImage(presentationImageCache.get(cacheKey)!);
//       return;
//     }
//     const img = new window.Image();
//     img.crossOrigin = 'anonymous';
//     img.onload = () => { presentationImageCache.set(cacheKey, img); setImage(img); };
//     img.src = src;
//   }, [src]);

//   if (!image) return null;
//   return <KonvaImage x={0} y={0} width={1920} height={1080} image={image} listening={false} />;
// };

// // ===== Element Renderer =====
// const PresentationElement: React.FC<{ element: SlideElement }> = ({ element }) => {
//   switch (element.type) {
//     case 'text':
//       return (
//         <Text
//           x={element.x} y={element.y}
//           width={element.width} height={element.height}
//           text={element.text || ''}
//           fontSize={element.fontSize || 24}
//           fontFamily={element.fontFamily || 'Arial'}
//           fill={element.fontColor || '#000000'}
//           fontStyle={
//             `${element.fontWeight === 'bold' ? 'bold' : ''} ${
//               element.fontStyle === 'italic' ? 'italic' : ''
//             }`.trim() || 'normal'
//           }
//           align={element.textAlign || 'left'}
//           wrap="word"
//           stroke={element.strokeColor || undefined}
//           strokeWidth={element.strokeWidth || 0}
//           shadowColor={element.shadowColor || undefined}
//           shadowBlur={element.shadowBlur || 0}
//           shadowOffsetX={element.shadowOffsetX || 0}
//           shadowOffsetY={element.shadowOffsetY || 0}
//           rotation={element.rotation || 0}
//           opacity={element.opacity ?? 1}
//           listening={false}
//         />
//       );
//     case 'shape': return <PresentationShape element={element} />;
//     case 'image': return <PresentationImage element={element} />;
//     case 'video': return <PresentationVideo element={element} />;
//     default: return null;
//   }
// };

// const PresentationShape: React.FC<{ element: SlideElement }> = ({ element }) => {
//   const common = { opacity: element.opacity ?? 1, rotation: element.rotation || 0, listening: false };

//   switch (element.shapeType) {
//     case 'circle':
//       return <Circle {...common}
//         x={element.x + element.width / 2} y={element.y + element.height / 2}
//         radius={Math.min(element.width, element.height) / 2}
//         fill={element.fill || '#3b82f6'} stroke={element.stroke} strokeWidth={element.strokeWidth || 0} />;
//     case 'ellipse':
//       return <Ellipse {...common}
//         x={element.x + element.width / 2} y={element.y + element.height / 2}
//         radiusX={element.width / 2} radiusY={element.height / 2}
//         fill={element.fill || '#3b82f6'} stroke={element.stroke} />;
//     case 'star':
//       return <Star {...common}
//         x={element.x + element.width / 2} y={element.y + element.height / 2}
//         numPoints={5} innerRadius={Math.min(element.width, element.height) / 4}
//         outerRadius={Math.min(element.width, element.height) / 2}
//         fill={element.fill || '#eab308'} stroke={element.stroke} />;
//     default:
//       return <Rect {...common}
//         x={element.x} y={element.y} width={element.width} height={element.height}
//         fill={element.fill || '#3b82f6'} stroke={element.stroke}
//         strokeWidth={element.strokeWidth || 0} cornerRadius={4} />;
//   }
// };

// const PresentationImage: React.FC<{ element: SlideElement }> = ({ element }) => {
//   const [image, setImage] = useState<HTMLImageElement | null>(null);
//   useEffect(() => {
//     if (!element.src) return;
//     const key = element.src.substring(0, 80) + element.id;
//     if (presentationImageCache.has(key)) { setImage(presentationImageCache.get(key)!); return; }
//     const img = new window.Image();
//     img.crossOrigin = 'anonymous';
//     img.onload = () => { presentationImageCache.set(key, img); setImage(img); };
//     img.src = element.src;
//   }, [element.src, element.id]);

//   if (!image) return null;
//   return <KonvaImage x={element.x} y={element.y} width={element.width} height={element.height}
//     image={image} rotation={element.rotation || 0} opacity={element.opacity ?? 1} listening={false} />;
// };

// const PresentationVideo: React.FC<{ element: SlideElement }> = ({ element }) => {
//   const imgRef = useRef<Konva.Image>(null);
//   const [video, setVideo] = useState<HTMLVideoElement | null>(null);
//   const animRef = useRef<number>(0);

//   useEffect(() => {
//     if (!element.videoSrc) return;
//     const vid = document.createElement('video');
//     vid.crossOrigin = 'anonymous';
//     vid.muted = true;
//     vid.loop = element.loop ?? true;
//     vid.playsInline = true;
//     vid.src = element.videoSrc;
//     vid.onloadeddata = () => { setVideo(vid); if (element.autoplay) vid.play().catch(() => {}); };
//     return () => { vid.pause(); vid.removeAttribute('src'); cancelAnimationFrame(animRef.current); };
//   }, [element.videoSrc]);

//   useEffect(() => {
//     if (!video || !imgRef.current) return;
//     const update = () => { imgRef.current?.getLayer()?.batchDraw(); animRef.current = requestAnimationFrame(update); };
//     animRef.current = requestAnimationFrame(update);
//     return () => cancelAnimationFrame(animRef.current);
//   }, [video]);

//   if (!video) return null;
//   return <KonvaImage ref={imgRef} x={element.x} y={element.y} width={element.width} height={element.height}
//     image={video} rotation={element.rotation || 0} opacity={element.opacity ?? 1} listening={false} />;
// };

// export default PresentationView;