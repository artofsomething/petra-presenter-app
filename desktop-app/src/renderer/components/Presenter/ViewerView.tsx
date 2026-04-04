// src/renderer/components/Presenter/ViewerView.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Stage, Layer, Rect, Text, Circle, Ellipse, Star,
  Image as KonvaImage,
} from 'react-konva';
import Konva from 'konva';
import { io, Socket } from 'socket.io-client';
import type { SlideElement, GradientConfig,AnimatedBackground } from '../../../server/types';
import AnimatedBackgroundComponent from '../Editor/AnimatedBackground';

const imageCache = new Map<string, HTMLImageElement>();

// ── Gradient helpers ──────────────────────────────────────────────────────────
function gradientToPoints(angle: number, w: number, h: number) {
  const rad = (angle * Math.PI) / 180;
  const cx  = w / 2;
  const cy  = h / 2;
  const len = Math.sqrt(w * w + h * h) / 2;
  return {
    startPoint: { x: cx - Math.cos(rad) * len, y: cy - Math.sin(rad) * len },
    endPoint:   { x: cx + Math.cos(rad) * len, y: cy + Math.sin(rad) * len },
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
    fillLinearGradientStartPoint:  startPoint,
    fillLinearGradientEndPoint:    endPoint,
    fillLinearGradientColorStops:  colorStops,
    fill: undefined,
  };
}

// ── Server URL detection ──────────────────────────────────────────────────────
function getServerUrl(): string {
  const hostname = window.location.hostname;
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8765';
  }
  return `http://${hostname}:8765`;
}

const SLIDE_W = 1920;
const SLIDE_H = 1080;

// ── State shape ───────────────────────────────────────────────────────────────
interface ViewerState {
  presentation:      any | null;
  currentSlideIndex: number;
  isBlackScreen:     boolean;
}

const ViewerView: React.FC = () => {
  // ✅ FIX: Single state object prevents partial-update race conditions
  const [viewerState, setViewerState] = useState<ViewerState>({
    presentation:      null,
    currentSlideIndex: 0,
    isBlackScreen:     false,
  });

  const [wsConnected, setWsConnected] = useState(false);
  const [statusMsg,   setStatusMsg]   = useState('Connecting...');
  const [dimensions,  setDimensions]  = useState({
    width:  window.innerWidth,
    height: window.innerHeight,
  });

  // ✅ Stable updater — merges partial state, never loses existing fields
  const applyUpdate = useCallback((patch: Partial<ViewerState>) => {
    setViewerState(prev => {
      const next = { ...prev, ...patch };
      // Clamp index to valid range
      if (next.presentation?.slides) {
        const max = next.presentation.slides.length - 1;
        next.currentSlideIndex = Math.max(0, Math.min(next.currentSlideIndex, max));
      }
      return next;
    });
  }, []);

  // ── Resize ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = () =>
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // ── WebSocket ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const serverUrl = getServerUrl();
    console.log('[ViewerView] Connecting to:', serverUrl);
    setStatusMsg(`Connecting to ${serverUrl}...`);

    let syncTimer: number | null = null;

    const socket: Socket = io(serverUrl, {
      transports:           ['websocket', 'polling'],
      reconnection:         true,
      reconnectionAttempts: Infinity,
      reconnectionDelay:    2000,
      timeout:              10000,
    });

    const requestSync = () => {
      if (socket.connected) {
        socket.emit('request-sync');
      }
    };

    socket.on('connect', () => {
      console.log('[ViewerView] ✅ Connected:', socket.id);
      setWsConnected(true);
      setStatusMsg('Connected — waiting for presentation...');

      socket.emit('register', {
        name: `Viewer-${navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'}`,
        role: 'viewer',
      });

      // ✅ FIX: request-sync after register so server has our role first
      syncTimer = window.setTimeout(requestSync, 400);
    });

    // ── sync-state: full snapshot ─────────────────────────────────────────
    socket.on('sync-state', (data: any) => {
      console.log('[ViewerView] sync-state:', {
        slides:    data.presentation?.slides?.length ?? 0,
        index:     data.currentSlideIndex,
        isBlack:   data.isBlackScreen,
      });

      applyUpdate({
        ...(data.presentation      != null && { presentation:      data.presentation }),
        ...(data.currentSlideIndex != null && { currentSlideIndex: data.currentSlideIndex }),
        ...(data.isBlackScreen     != null && { isBlackScreen:     data.isBlackScreen }),
      });

      if (data.presentation) setStatusMsg('');
    });

    // ── presentation-updated: editor changed content ──────────────────────
    // ✅ FIX: was listening correctly but now uses applyUpdate for safety
    socket.on('presentation-updated', (data: any) => {
      console.log('[ViewerView] presentation-updated:',
        data.presentation?.slides?.length ?? 0, 'slides');

      applyUpdate({
        ...(data.presentation      != null && { presentation:      data.presentation }),
        ...(data.currentSlideIndex != null && { currentSlideIndex: data.currentSlideIndex }),
      });
    });

    // ── slide-changed: index-only update ─────────────────────────────────
    socket.on('slide-changed', (data: { index: number }) => {
      console.log('[ViewerView] slide-changed:', data.index);
      applyUpdate({ currentSlideIndex: data.index });
    });

    // ── black screen ──────────────────────────────────────────────────────
    socket.on('black-screen-toggled', (v: boolean) => {
      console.log('[ViewerView] black-screen:', v);
      applyUpdate({ isBlackScreen: v });
    });

    // ── presentation started ──────────────────────────────────────────────
    socket.on('presentation-started', (data: any) => {
      if (data?.index != null) applyUpdate({ currentSlideIndex: data.index });
    });

    // ── presentation stopped ──────────────────────────────────────────────
    socket.on('presentation-stopped', () => {
      // Optionally show a "presentation ended" screen
    });

    socket.on('disconnect', (reason: string) => {
      console.log('[ViewerView] Disconnected:', reason);
      setWsConnected(false);
      setStatusMsg('Reconnecting...');
    });

    socket.on('connect_error', (err: Error) => {
      console.error('[ViewerView] Connect error:', err.message);
      setStatusMsg(`Cannot connect to ${serverUrl} — ${err.message}`);
    });

    // ✅ Debug: log all events in development
    if (process.env.NODE_ENV === 'development') {
      socket.onAny((event: string, ...args: any[]) => {
        if (event !== 'clients-updated') { // skip noisy events
          console.log('[ViewerView] WS ←', event,
            JSON.stringify(args).substring(0, 120));
        }
      });
    }

    return () => {
      if (syncTimer !== null) window.clearTimeout(syncTimer);
      socket.disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived values ────────────────────────────────────────────────────────
  const { presentation, currentSlideIndex, isBlackScreen } = viewerState;

  const scale   = Math.min(dimensions.width / SLIDE_W, dimensions.height / SLIDE_H);
  const offsetX = (dimensions.width  - SLIDE_W * scale) / 2;
  const offsetY = (dimensions.height - SLIDE_H * scale) / 2;

  // ✅ FIX: No fallback to [0] — if index is wrong, show nothing rather than wrong slide
  const currentSlide = presentation?.slides?.[currentSlideIndex] ?? null;

  // ── Waiting screen ────────────────────────────────────────────────────────
  if (!presentation) {
    return (
      <div style={{
        width:          '100vw',
        height:         '100vh',
        background:     '#0a0a1a',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        color:          '#fff',
        fontFamily:     'system-ui, sans-serif',
        userSelect:     'none',
        gap:            16,
      }}>
        <div style={{ fontSize: 56 }}>📽️</div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
          Presentation Viewer
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width:        8,
            height:       8,
            borderRadius: '50%',
            background:   wsConnected ? '#22c55e' : '#f59e0b',
            boxShadow:    wsConnected ? '0 0 8px #22c55e' : '0 0 8px #f59e0b',
          }} />
          <span style={{ color: '#9ca3af', fontSize: 13 }}>{statusMsg}</span>
        </div>
        <div style={{
          width:          32,
          height:         32,
          border:         '3px solid #1f2937',
          borderTopColor: wsConnected ? '#22c55e' : '#3b82f6',
          borderRadius:   '50%',
          animation:      'spin 1s linear infinite',
        }} />
        <div style={{
          marginTop:    16,
          padding:      '8px 16px',
          background:   '#111827',
          borderRadius: 8,
          fontSize:     11,
          color:        '#4b5563',
          textAlign:    'center',
          fontFamily:   'monospace',
        }}>
          <div>Server: {getServerUrl()}</div>
          <div>Window: {dimensions.width}×{dimensions.height}</div>
          <div>WS: {wsConnected ? '🟢 connected' : '🔴 disconnected'}</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── No slides ─────────────────────────────────────────────────────────────
  if (!currentSlide) {
    return (
      <div style={{
        width: '100vw', height: '100vh', background: '#111',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontFamily: 'system-ui, sans-serif',
      }}>
        <p>No slide at index {currentSlideIndex}</p>
      </div>
    );
  }

  // ── Black screen ──────────────────────────────────────────────────────────
  if (isBlackScreen) {
    return (
      <div style={{
        width: '100vw', height: '100vh', background: '#000',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', bottom: 8, right: 12,
          display: 'flex', alignItems: 'center', gap: 5, opacity: 0.3,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
          <span style={{ color: '#fff', fontSize: 10, fontFamily: 'monospace' }}>Live</span>
        </div>
      </div>
    );
  }

  // ── Background ────────────────────────────────────────────────────────────
  const bgGradient  = currentSlide.backgroundGradient;
  const bgRectProps = bgGradient && !currentSlide.backgroundVideo
    ? buildGradientProps(bgGradient, SLIDE_W, SLIDE_H)
    : {
        fill: currentSlide.backgroundVideo
          ? 'transparent'
          : (currentSlide.backgroundColor || '#ffffff'),
      };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      width:    '100vw',
      height:   '100vh',
      background: '#000',
      overflow: 'hidden',
      position: 'relative',
    }}>

        {currentSlide.animatedBackground && (
        <div style={{
            position: 'absolute',
            left:     offsetX,
            top:      offsetY,
            width:    SLIDE_W * scale,
            height:   SLIDE_H * scale,
            zIndex:   0,
            overflow: 'hidden',
        }}>
            <AnimatedBackgroundComponent
            config={currentSlide.animatedBackground as AnimatedBackground}
            />
        </div>
        )}
      {/* Video background */}
      {currentSlide.backgroundVideo && (
        <video
          key={currentSlide.backgroundVideo}
          autoPlay loop muted playsInline
          src={currentSlide.backgroundVideo}
          style={{
            position:  'absolute',
            left:      offsetX,
            top:       offsetY,
            width:     SLIDE_W * scale,
            height:    SLIDE_H * scale,
            objectFit: 'cover',
            zIndex:    0,
          }}
        />
      )}

      {/*
        ✅ FIX: Key on Stage forces full remount when slide changes.
        Without this, Konva reuses the canvas and gradient/image updates
        are ignored.
      */}
      <Stage
        key={`slide-${currentSlideIndex}-${currentSlide.id ?? currentSlideIndex}`}
        width={dimensions.width}
        height={dimensions.height}
        listening={false}
        style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}
      >
        <Layer x={offsetX} y={offsetY} scaleX={scale} scaleY={scale}>
          <Rect
            x={0} y={0}
            width={SLIDE_W} height={SLIDE_H}
            {...(currentSlide.animatedBackground
            ? { fill: 'transparent' }
            : bgRectProps
          )}
          />

          {currentSlide.backgroundImage && !currentSlide.backgroundVideo && (
            <ViewerBgImage
              src={currentSlide.backgroundImage}
              width={SLIDE_W}
              height={SLIDE_H}
            />
          )}

          {currentSlide.elements?.map((el: SlideElement) => (
            <ViewerElement key={el.id} element={el} />
          ))}
        </Layer>
      </Stage>

      {/* Live indicator */}
      <div style={{
        position:      'absolute',
        bottom:        8,
        right:         12,
        display:       'flex',
        alignItems:    'center',
        gap:           5,
        opacity:       0.35,
        zIndex:        10,
        pointerEvents: 'none',
      }}>
        <div style={{
          width:        6,
          height:       6,
          borderRadius: '50%',
          background:   '#22c55e',
        }} />
        <span style={{ color: '#fff', fontSize: 10, fontFamily: 'monospace' }}>
          {currentSlideIndex + 1} / {presentation.slides.length}
        </span>
      </div>
    </div>
  );
};

// ── Background image ──────────────────────────────────────────────────────────
const ViewerBgImage: React.FC<{ src: string; width: number; height: number }> = ({
  src, width, height,
}) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const key = src.substring(0, 80);
    if (imageCache.has(key)) {
      setImage(imageCache.get(key)!);
      return;
    }
    const img  = new window.Image();
    img.onload = () => { imageCache.set(key, img); setImage(img); };
    img.onerror = () => console.warn('[ViewerBgImage] Failed to load:', src.substring(0, 60));
    img.src    = src;
  }, [src]);

  if (!image) return null;
  return (
    <KonvaImage
      x={0} y={0} width={width} height={height}
      image={image} listening={false}
    />
  );
};

// ── Element dispatcher ────────────────────────────────────────────────────────
const ViewerElement: React.FC<{ element: SlideElement }> = ({ element }) => {
  switch (element.type) {
    case 'text':  return <ViewerText  element={element} />;
    case 'shape': return <ViewerShape element={element} />;
    case 'image': return <ViewerImage element={element} />;
    case 'video': return <ViewerVideo element={element} />;
    default:      return null;
  }
};

// ── Text ──────────────────────────────────────────────────────────────────────
const ViewerText: React.FC<{ element: SlideElement }> = ({ element }) => (
  <Text
    x={element.x}          y={element.y}
    width={element.width}  height={element.height}
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
    stroke={element.strokeColor || undefined}
    strokeWidth={element.strokeWidth || 0}
    rotation={element.rotation || 0}
    opacity={element.opacity ?? 1}
    listening={false}
  />
);

// ── Shape ─────────────────────────────────────────────────────────────────────
const ViewerShape: React.FC<{ element: SlideElement }> = ({ element }) => {
  const common = {
    opacity:   element.opacity ?? 1,
    rotation:  element.rotation || 0,
    listening: false as const,
  };
  const { x, y, width: w, height: h } = element;

  const getFill = (fallback: string) =>
    element.fillGradient
      ? buildGradientProps(element.fillGradient, w, h)
      : { fill: element.fill || fallback };

  switch (element.shapeType) {
    case 'circle': {
      const r  = Math.min(w, h) / 2;
      const gp = element.fillGradient
        ? buildGradientProps(element.fillGradient, r * 2, r * 2)
        : { fill: element.fill || '#3b82f6' };
      return (
        <Circle {...common} {...gp}
          x={x + w / 2} y={y + h / 2} radius={r}
          stroke={element.stroke} strokeWidth={element.strokeWidth || 0}
        />
      );
    }
    case 'ellipse': {
      const gp = element.fillGradient
        ? buildGradientProps(element.fillGradient, w, h)
        : { fill: element.fill || '#3b82f6' };
      return (
        <Ellipse {...common} {...gp}
          x={x + w / 2} y={y + h / 2}
          radiusX={w / 2} radiusY={h / 2}
          stroke={element.stroke} strokeWidth={element.strokeWidth || 0}
        />
      );
    }
    case 'star': {
      const r  = Math.min(w, h) / 2;
      const gp = element.fillGradient
        ? buildGradientProps(element.fillGradient, r * 2, r * 2)
        : { fill: element.fill || '#eab308' };
      return (
        <Star {...common} {...gp}
          x={x + w / 2} y={y + h / 2}
          numPoints={5} innerRadius={r / 2} outerRadius={r}
          stroke={element.stroke} strokeWidth={element.strokeWidth || 0}
        />
      );
    }
    case 'rounded-rect':
      return (
        <Rect {...common} {...getFill('#3b82f6')}
          x={x} y={y} width={w} height={h}
          cornerRadius={Math.min(element.cornerRadius ?? 20, Math.min(w, h) / 2)}
          stroke={element.stroke} strokeWidth={element.strokeWidth || 0}
        />
      );
    default:
      return (
        <Rect {...common} {...getFill('#3b82f6')}
          x={x} y={y} width={w} height={h}
          cornerRadius={0}
          stroke={element.stroke} strokeWidth={element.strokeWidth || 0}
        />
      );
  }
};

// ── Image ─────────────────────────────────────────────────────────────────────
const ViewerImage: React.FC<{ element: SlideElement }> = ({ element }) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!element.src) return;
    const key = element.src.substring(0, 80) + element.id;
    if (imageCache.has(key)) { setImage(imageCache.get(key)!); return; }
    const img  = new window.Image();
    img.onload = () => { imageCache.set(key, img); setImage(img); };
    img.onerror = () => console.warn('[ViewerImage] Failed to load:', element.src?.substring(0, 60));
    img.src    = element.src;
  }, [element.src, element.id]);

  if (!image) return null;
  return (
    <KonvaImage
      x={element.x}         y={element.y}
      width={element.width} height={element.height}
      image={image}
      rotation={element.rotation || 0}
      opacity={element.opacity ?? 1}
      listening={false}
    />
  );
};

// ── Video ─────────────────────────────────────────────────────────────────────
const ViewerVideo: React.FC<{ element: SlideElement }> = ({ element }) => {
  const imgRef  = useRef<Konva.Image>(null);
  const animRef = useRef<number>(0);
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!element.videoSrc) return;
    const vid        = document.createElement('video');
    vid.muted        = true;
    vid.loop         = element.loop ?? true;
    vid.playsInline  = true;
    vid.src          = element.videoSrc;
    vid.onloadeddata = () => {
      setVideo(vid);
      if (element.autoplay) vid.play().catch(() => {});
    };
    return () => {
      vid.pause();
      vid.src = '';
      cancelAnimationFrame(animRef.current);
    };
  }, [element.videoSrc]);

  useEffect(() => {
    if (!video || !imgRef.current) return;
    const update = () => {
      imgRef.current?.getLayer()?.batchDraw();
      animRef.current = requestAnimationFrame(update);
    };
    animRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animRef.current);
  }, [video]);

  if (!video) return null;
  return (
    <KonvaImage
      ref={imgRef}
      x={element.x}         y={element.y}
      width={element.width} height={element.height}
      image={video}
      rotation={element.rotation || 0}
      opacity={element.opacity ?? 1}
      listening={false}
    />
  );
};

export default ViewerView;