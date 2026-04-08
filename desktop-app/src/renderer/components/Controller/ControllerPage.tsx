import React, {
  useEffect, useState, useCallback, useRef, useMemo,
} from 'react';
import { io, Socket } from 'socket.io-client';
import StageSlideCanvas from '../Stage/StageSlideCanvas';
import type { Slide } from '../../../server/types';

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

interface SlideInfo {
  id:                   string;
  backgroundColor?:     string;
  backgroundGradient?:  GradientConfig;
  backgroundImage?:     string;
  animatedBackground?:  AnimatedBackground;  // ✅ new
  elements:             any[];
  notes?:               string;
}

// ── Animated bg metadata (mirrors AnimatedBackground.tsx) ─────────────────────
const ANIMATED_BG_META: Record<string, { emoji: string; label: string; colors: string[] }> = {
  'aurora':     { emoji: '🌌', label: 'Aurora',      colors: ['#7c3aed', '#2563eb', '#06b6d4'] },
  'waves':      { emoji: '🌊', label: 'Waves',       colors: ['#1e40af', '#7c3aed', '#0891b2'] },
  'neon-pulse': { emoji: '💜', label: 'Neon Pulse',  colors: ['#f0abfc', '#818cf8', '#34d399'] },
  'geometric':  { emoji: '🔷', label: 'Geometric',   colors: ['#6366f1', '#8b5cf6', '#ec4899'] },
  'starfield':  { emoji: '✨', label: 'Starfield',   colors: ['#0d1b4b', '#1a3a7a', '#0d1b4b'] },
  'bubbles':    { emoji: '🫧', label: 'Bubbles',     colors: ['#020b18', '#3b82f6', '#8b5cf6'] },
  'matrix':     { emoji: '💻', label: 'Matrix',      colors: ['#000000', '#003b00', '#000000'] },
  'fire':       { emoji: '🔥', label: 'Fire',        colors: ['#1a0000', '#ef4444', '#f97316'] },
  'snowfall':   { emoji: '❄️', label: 'Snowfall',    colors: ['#0a1628', '#162040', '#0a1628'] },
  'particles':  { emoji: '🔵', label: 'Particles',   colors: ['#050510', '#6366f1', '#050510'] },
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

// ✅ Returns CSS background for static backgrounds only
// Animated backgrounds are handled separately as an overlay
function resolveSlideBackground(slide: SlideInfo | undefined): React.CSSProperties {
  if (!slide) return { backgroundColor: '#1a1a2e' };

  // ✅ If animated bg — use its representative gradient as base color
  if (slide.animatedBackground) {
    const meta = ANIMATED_BG_META[slide.animatedBackground.type];
    if (meta) {
      const c1 = slide.animatedBackground.color1 ?? meta.colors[0];
      const c2 = slide.animatedBackground.color2 ?? meta.colors[1];
      return {
        background: `linear-gradient(135deg, ${c1}, ${c2})`,
      };
    }
    return { backgroundColor: '#0a0a1a' };
  }

  if (slide.backgroundGradient) {
    return { background: gradientToCSS(slide.backgroundGradient) };
  }

  if (slide.backgroundImage && !slide.backgroundImage.startsWith('blob:')) {
    return {
      backgroundImage:    `url(${slide.backgroundImage})`,
      backgroundSize:     'cover',
      backgroundPosition: 'center',
    };
  }

  return { backgroundColor: slide.backgroundColor || '#ffffff' };
}

function resolveServerUrl(): string {
  const hostname = window.location.hostname;
  const port     = 8765;
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
    return `http://localhost:${port}`;
  }
  return `http://${hostname}:${port}`;
}

// ── Controller state ──────────────────────────────────────────────────────────
interface ControllerState {
  slides:            SlideInfo[];
  currentSlideIndex: number;
  isPresenting:      boolean;
  isBlackScreen:     boolean;
  presentationName:  string;
}

const DEFAULT_STATE: ControllerState = {
  slides:            [],
  currentSlideIndex: 0,
  isPresenting:      false,
  isBlackScreen:     false,
  presentationName:  '',
};

// ─────────────────────────────────────────────────────────────────────────────
const ControllerPage: React.FC = () => {
  const socketRef = useRef<Socket | null>(null);
  const serverUrl = useMemo(resolveServerUrl, []);

  const [connected, setConnected] = useState(false);
  const [error,     setError]     = useState('');
  const [state,     setState]     = useState<ControllerState>(DEFAULT_STATE);

  const applyPatch = useCallback((patch: Partial<ControllerState>) => {
    setState(prev => {
      const next = { ...prev, ...patch };
      if (next.slides.length > 0) {
        next.currentSlideIndex = Math.max(
          0, Math.min(next.currentSlideIndex, next.slides.length - 1),
        );
      } else {
        next.currentSlideIndex = 0;
      }
      return next;
    });
  }, []);

  const registerAndSync = useCallback((socket: Socket) => {
    socket.emit('register', {
      name: `Web Controller (${navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'})`,
      role: 'controller',
    });
    setTimeout(() => {
      if (socket.connected) socket.emit('request-sync');
    }, 300);
  }, []);

  useEffect(() => {
    setError('');

    const socket = io(serverUrl, {
      transports:           ['websocket', 'polling'],
      reconnection:         true,
      reconnectionAttempts: Infinity,
      reconnectionDelay:    1000,
      reconnectionDelayMax: 10000,
      timeout:              10000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setError('');
      registerAndSync(socket);
    });

    socket.io.on('reconnect', () => {
      setConnected(true);
      registerAndSync(socket);
    });

    socket.on('sync-state', (data: any) => {
      const patch: Partial<ControllerState> = {};
      if (data.presentation) {
        patch.slides           = data.presentation.slides ?? [];
        patch.presentationName = data.presentation.name  ?? 'Untitled';
      }
      if (data.currentSlideIndex != null) patch.currentSlideIndex = data.currentSlideIndex;
      if (data.isPresenting      != null) patch.isPresenting      = data.isPresenting;
      if (data.isBlackScreen     != null) patch.isBlackScreen     = data.isBlackScreen;
      applyPatch(patch);
    });

    socket.on('presentation-updated', (data: any) => {
      const patch: Partial<ControllerState> = {};
      if (data.presentation) {
        patch.slides           = data.presentation.slides ?? [];
        patch.presentationName = data.presentation.name  ?? 'Untitled';
      }
      if (data.currentSlideIndex != null) patch.currentSlideIndex = data.currentSlideIndex;
      applyPatch(patch);
    });

    socket.on('slide-changed',        (data: { index: number }) => applyPatch({ currentSlideIndex: data.index }));
    socket.on('presentation-started', (data: any) => {
      const patch: Partial<ControllerState> = { isPresenting: true };
      if (data?.index != null) patch.currentSlideIndex = data.index;
      applyPatch(patch);
    });
    socket.on('presentation-stopped', ()           => applyPatch({ isPresenting: false }));
    socket.on('black-screen-toggled', (v: boolean) => applyPatch({ isBlackScreen: v }));
    socket.on('disconnect',  ()          => setConnected(false));
    socket.on('connect_error', (err: Error) => {
      setError(`Connection error: ${err.message}`);
      setConnected(false);
    });

    return () => {
      socket.io.off('reconnect');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [serverUrl, registerAndSync, applyPatch]);

  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  const nextSlide         = useCallback(() => emit('next-slide'),          [emit]);
  const prevSlide         = useCallback(() => emit('prev-slide'),          [emit]);
  const goToSlide         = useCallback((i: number) => emit('go-to-slide', i), [emit]);
  const startPresentation = useCallback(() => emit('start-presentation'),  [emit]);
  const stopPresentation  = useCallback(() => emit('stop-presentation'),   [emit]);
  const toggleBlackScreen = useCallback(() => emit('toggle-black-screen'), [emit]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      switch (e.key) {
        case 'ArrowRight': case 'ArrowDown': case ' ':
          e.preventDefault(); nextSlide(); break;
        case 'ArrowLeft': case 'ArrowUp':
          e.preventDefault(); prevSlide(); break;
        case 'b': case 'B': toggleBlackScreen(); break;
        case 'Escape': stopPresentation(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide, toggleBlackScreen, stopPresentation]);



  const {
    slides, currentSlideIndex, isPresenting,
    isBlackScreen, presentationName,
  } = state;

  const totalSlides      = slides.length;
  const currentSlideData = slides[currentSlideIndex];
  

  // ── Connecting screen ─────────────────────────────────────────────────────
  if (!connected) {
    return (
      <div style={{
        minHeight: '100vh', backgroundColor: '#0a0a1a',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        color: '#fff', padding: 20, fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📡</div>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>Connecting...</h1>
        <p style={{ color: '#888', fontSize: 14, marginBottom: 8 }}>{serverUrl}</p>
        {error && (
          <div style={{
            marginTop: 12, padding: '12px 16px', backgroundColor: '#2a0a0a',
            border: '1px solid #ff4444', borderRadius: 8,
            color: '#ff6666', fontSize: 13, maxWidth: 400, textAlign: 'center',
          }}>
            {error}
            <br />
            <small style={{ color: '#999' }}>
              Make sure you're on the same WiFi and the app is running.
            </small>
          </div>
        )}
        <div style={{
          marginTop: 24, width: 40, height: 40,
          border: '3px solid #333', borderTopColor: '#3b82f6',
          borderRadius: '50%', animation: 'spin 1s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── No slides yet ─────────────────────────────────────────────────────────
  if (slides.length === 0) {
    return (
      <div style={{
        minHeight: '100vh', backgroundColor: '#0a0a1a',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        color: '#fff', padding: 20, fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
        <h2 style={{ marginBottom: 8 }}>Connected!</h2>
        <p style={{ color: '#888', fontSize: 14, textAlign: 'center' }}>
          Waiting for presentation data…<br />
          Open or create a presentation on the desktop app.
        </p>
        <div style={{
          marginTop: 24, width: 30, height: 30,
          border: '3px solid #333', borderTopColor: '#22c55e',
          borderRadius: '50%', animation: 'spin 1.5s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Main UI ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#0a0a1a', color: '#fff',
      fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 16px', backgroundColor: '#1a1a2e',
        borderBottom: '1px solid #333',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <h1 style={{ fontSize: 15, margin: 0 }}>🎤 {presentationName}</h1>
          <span style={{ fontSize: 11, color: '#888' }}>
            Web Controller • 🟢 Connected
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {isPresenting && (
            <span style={{
              background: '#166534', color: '#4ade80',
              padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 'bold',
            }}>▶ LIVE</span>
          )}
          {isBlackScreen && (
            <span style={{
              background: '#333', color: '#999',
              padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 'bold',
            }}>■ BLACK</span>
          )}
        </div>
      </div>

      {/* Slide counter */}
      <div style={{ textAlign: 'center', padding: '10px', fontSize: 13, color: '#ccc' }}>
        Slide {currentSlideIndex + 1} of {totalSlides}
        {currentSlideData?.animatedBackground && (
          <span style={{
            marginLeft: 8, fontSize: 10,
            color: '#818cf8', background: '#1e1b4b',
            padding: '1px 6px', borderRadius: 10,
          }}>
            {ANIMATED_BG_META[currentSlideData.animatedBackground.type]?.emoji}{' '}
            {ANIMATED_BG_META[currentSlideData.animatedBackground.type]?.label ?? 'Animated'}
          </span>
        )}
      </div>

      {/* Current slide preview */}
      <div style={{
          flex:           1,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          padding:        '0 16px',
        }}>
          <div style={{
            width:        '100%',
            maxWidth:     560,
            aspectRatio:  '16/9',
            borderRadius: 10,
            border:       isBlackScreen
              ? '2px solid #333'
              : currentSlideData?.animatedBackground
                ? '2px solid #818cf8'
                : '2px solid #3b82f6',
            boxShadow: currentSlideData?.animatedBackground
              ? '0 0 20px rgba(129,140,248,0.3)'
              : '0 0 20px rgba(59,130,246,0.25)',
            overflow:     'hidden',
            position:     'relative',
            // ✅ No manual background needed - StageSlideCanvas handles it
          }}>
            {isBlackScreen ? (
              <div style={{
                width:          '100%',
                height:         '100%',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                background:     '#000',
              }}>
                <span style={{ color: '#333', fontSize: 16 }}>Black Screen</span>
              </div>
            ) : currentSlideData ? (
              <SlidePreview slide={currentSlideData} />
            ) : null}

            {/* Slide number badge */}
            <div style={{
              position:   'absolute',
              bottom:     6,
              right:      10,
              background: 'rgba(0,0,0,0.5)',
              color:      '#fff',
              padding:    '2px 8px',
              borderRadius: 4,
              fontSize:   11,
              zIndex:     10,
              pointerEvents: 'none',
            }}>
              {currentSlideIndex + 1}
            </div>
          </div>
        </div>

      {/* Speaker notes */}
      {currentSlideData?.notes && (
        <div style={{
          margin: '8px 16px', padding: 10,
          backgroundColor: '#1a1a2e', borderRadius: 8,
          maxHeight: 70, overflow: 'auto', fontSize: 11, color: '#ccc',
        }}>
          📝 {currentSlideData.notes}
        </div>
      )}

      {/* Slide thumbnails */}
      <div style={{ padding: '8px 16px', overflowX: 'auto', display: 'flex', gap: 6 }}>
        {slides.map((slide, i) => (
          <SlideThumbnail
            key={slide.id || i}
            slide={slide}
            index={i}
            isActive={i === currentSlideIndex}
        
            onClick={goToSlide}
          />
        ))}
      </div>

      {/* Controls */}
      <div style={{ padding: '10px 16px' }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <button
            onClick={prevSlide}
            disabled={currentSlideIndex === 0}
            style={{
              flex: 1, padding: '18px', fontSize: 16, borderRadius: 12, border: 'none',
              cursor:          currentSlideIndex === 0 ? 'default'  : 'pointer',
              backgroundColor: currentSlideIndex === 0 ? '#1a1a2a' : '#2a2a4a',
              color:           currentSlideIndex === 0 ? '#444'     : '#fff',
            }}
          >◀ PREV</button>

          <button
            onClick={nextSlide}
            disabled={currentSlideIndex >= totalSlides - 1}
            style={{
              flex: 2, padding: '18px', fontSize: 18,
              borderRadius: 12, border: 'none', fontWeight: 'bold',
              cursor:          currentSlideIndex >= totalSlides - 1 ? 'default'  : 'pointer',
              backgroundColor: currentSlideIndex >= totalSlides - 1 ? '#1a2a4a' : '#2563eb',
              color:           currentSlideIndex >= totalSlides - 1 ? '#555'     : '#fff',
            }}
          >NEXT ▶</button>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={isPresenting ? stopPresentation : startPresentation}
            style={{
              flex: 1, padding: '10px', borderRadius: 10, border: 'none',
              cursor: 'pointer', fontSize: 12, fontWeight: 'bold',
              backgroundColor: isPresenting ? '#dc2626' : '#16a34a', color: '#fff',
            }}
          >{isPresenting ? '⏹ STOP' : '▶ START'}</button>

          <button
            onClick={toggleBlackScreen}
            style={{
              flex: 1, padding: '10px', borderRadius: 10, border: 'none',
              cursor: 'pointer', fontSize: 12, fontWeight: 'bold',
              backgroundColor: isBlackScreen ? '#ea580c' : '#2a2a4a', color: '#fff',
            }}
          >{isBlackScreen ? '🔆 SHOW' : '🖥 BLACK'}</button>

          <button
            onClick={() => goToSlide(0)}
            style={{
              padding: '10px 14px', borderRadius: 10, border: 'none',
              cursor: 'pointer', fontSize: 12, backgroundColor: '#2a2a4a', color: '#fff',
            }}
          >⏮</button>

          <button
            onClick={() => goToSlide(totalSlides - 1)}
            style={{
              padding: '10px 14px', borderRadius: 10, border: 'none',
              cursor: 'pointer', fontSize: 12, backgroundColor: '#2a2a4a', color: '#fff',
            }}
          >⏭</button>
        </div>
      </div>

      {/* Keyboard shortcuts */}
      <div style={{
        padding: '6px 16px 14px', display: 'flex', gap: 6,
        flexWrap: 'wrap', justifyContent: 'center',
      }}>
        {['→ Next', '← Prev', 'B Black', 'Esc Stop'].map(s => (
          <span key={s} style={{
            fontSize: 9, color: '#555', background: '#1a1a2e',
            padding: '2px 6px', borderRadius: 3,
          }}>{s}</span>
        ))}
      </div>
    </div>
  );
};

// ── SlidePreview — now uses StageSlideCanvas ──────────────────────────────────
const SlidePreview: React.FC<{ slide: SlideInfo }> = React.memo(({ slide }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 560, height: 315 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = entry.contentRect.width;
      const h = w * (9 / 16);
      setDims({ width: Math.floor(w), height: Math.floor(h) });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', aspectRatio: '16/9' }}
    >
      <StageSlideCanvas
        slide={slide as unknown as Slide}
        width={dims.width}
        height={dims.height}
      />
    </div>
  );
});

// ── SlideThumbnail ────────────────────────────────────────────────────────────
// ── SlideThumbnail — now uses StageSlideCanvas ────────────────────────────────
const SlideThumbnail: React.FC<{
  slide:    SlideInfo;
  index:    number;
  isActive: boolean;
  onClick:  (i: number) => void;
}> = React.memo(({ slide, index, isActive, onClick }) => {
  const animBg = slide.animatedBackground;

  return (
    <div
      onClick={() => onClick(index)}
      style={{
        minWidth:     70,
        aspectRatio:  '16/9',
        borderRadius: 5,
        cursor:       'pointer',
        border:       isActive
          ? animBg ? '2px solid #818cf8' : '2px solid #3b82f6'
          : '2px solid #333',
        boxShadow: isActive
          ? animBg
            ? '0 0 8px rgba(129,140,248,0.5)'
            : '0 0 8px rgba(59,130,246,0.4)'
          : 'none',
        transition:   'border-color 0.15s, box-shadow 0.15s',
        position:     'relative',
        overflow:     'hidden',
        flexShrink:   0,
      }}
    >
      {/* ✅ StageSlideCanvas at thumbnail size */}
      <StageSlideCanvas
        slide={slide as unknown as Slide}
        width={70}
        height={Math.round(70 * 9 / 16)}
      />

      {/* Slide number badge */}
      <span style={{
        position:   'absolute',
        bottom:     2,
        right:      3,
        zIndex:     10,
        fontSize:   7,
        color:      'rgba(255,255,255,0.9)',
        background: 'rgba(0,0,0,0.55)',
        padding:    '1px 3px',
        borderRadius: 2,
        pointerEvents: 'none',
      }}>
        {index + 1}
      </span>

      {/* Active indicator */}
      {isActive && (
        <div style={{
          position:    'absolute',
          inset:       0,
          border:      animBg
            ? '2px solid #818cf8'
            : '2px solid #3b82f6',
          borderRadius: 4,
          pointerEvents: 'none',
          zIndex:      10,
        }} />
      )}
    </div>
  );
});

export default ControllerPage;

