import React, {
  useEffect, useState, useCallback, useRef, useMemo,
} from 'react';
import { io, Socket } from 'socket.io-client';

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

  const slideBgs = useMemo(
    () => state.slides.map(resolveSlideBackground),
    [state.slides],
  );

  const {
    slides, currentSlideIndex, isPresenting,
    isBlackScreen, presentationName,
  } = state;

  const totalSlides      = slides.length;
  const currentSlideData = slides[currentSlideIndex];
  const currentBg        = slideBgs[currentSlideIndex] ?? { backgroundColor: '#1a1a2e' };

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
        flex: 1, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '0 16px',
      }}>
        <div style={{
          width: '100%', maxWidth: 560, aspectRatio: '16/9',
          borderRadius: 10,
          border: isBlackScreen
            ? '2px solid #333'
            : currentSlideData?.animatedBackground
              ? '2px solid #818cf8'   // ✅ purple border for animated slides
              : '2px solid #3b82f6',
          boxShadow: currentSlideData?.animatedBackground
            ? '0 0 20px rgba(129,140,248,0.3)'
            : '0 0 20px rgba(59,130,246,0.25)',
          position: 'relative', overflow: 'hidden',
          ...(isBlackScreen ? { backgroundColor: '#000' } : currentBg),
        }}>

          {isBlackScreen ? (
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: '#333', fontSize: 16 }}>Black Screen</span>
            </div>
          ) : currentSlideData ? (
            <SlidePreview slide={currentSlideData} />
          ) : null}

          {/* Slide number badge */}
          <div style={{
            position: 'absolute', bottom: 6, right: 10,
            background: 'rgba(0,0,0,0.5)', color: '#fff',
            padding: '2px 8px', borderRadius: 4, fontSize: 11,
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
            bg={slideBgs[i]}
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

// ── SlidePreview ──────────────────────────────────────────────────────────────
const SlidePreview: React.FC<{ slide: SlideInfo }> = React.memo(({ slide }) => {
  const textEls    = slide.elements.filter((el: any) => el.type === 'text').slice(0, 3);
  const nonTextCnt = slide.elements.filter((el: any) => el.type !== 'text').length;
  const animBg     = slide.animatedBackground;
  const meta       = animBg ? ANIMATED_BG_META[animBg.type] : null;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>

      {/* ✅ Animated background shimmer overlay */}
      {animBg && meta && (
        <div style={{
          position:   'absolute', inset: 0,
          background: `linear-gradient(135deg, ${animBg.color1 ?? meta.colors[0]}88, ${animBg.color2 ?? meta.colors[1]}88)`,
          opacity:    animBg.opacity ?? 1,
        }}>
          {/* Pulsing animation indicator */}
          <div style={{
            position:   'absolute', inset: 0,
            background: `radial-gradient(circle at 50% 50%, ${animBg.color1 ?? meta.colors[0]}44, transparent 70%)`,
            animation:  'pulse 2s ease-in-out infinite',
          }} />

          {/* Animated bg label */}
          <div style={{
            position:   'absolute', top: 8, left: 8,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            borderRadius: 6,
            padding:    '3px 8px',
            display:    'flex', alignItems: 'center', gap: 4,
            fontSize:   11, color: '#fff',
          }}>
            <span>{meta.emoji}</span>
            <span style={{ opacity: 0.8 }}>{meta.label}</span>
          </div>
        </div>
      )}

      {/* Text content */}
      <div style={{
        position:       'relative', zIndex: 1,
        width:          '100%', height: '100%',
        display:        'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ padding: 16, textAlign: 'center', width: '100%' }}>
          {textEls.map((el: any, i: number) => (
            <div key={i} style={{
              color:        el.fontColor  || (animBg ? '#fff' : '#000'),
              fontSize:     Math.min((el.fontSize || 24) * 0.35, 20),
              fontWeight:   el.fontWeight || 'normal',
              fontFamily:   el.fontFamily || 'Arial',
              marginBottom: 4,
              textShadow:   animBg
                ? '0 1px 4px rgba(0,0,0,0.8)'
                : el.strokeColor ? `1px 1px 2px ${el.strokeColor}` : 'none',
              overflow:     'hidden',
              textOverflow: 'ellipsis',
              whiteSpace:   'nowrap',
            }}>
              {el.text || ''}
            </div>
          ))}

          {nonTextCnt > 0 && (
            <div style={{ color: animBg ? '#ffffffaa' : '#666', fontSize: 10, marginTop: 8 }}>
              +{nonTextCnt} other element{nonTextCnt !== 1 ? 's' : ''}
            </div>
          )}

          {slide.elements.length === 0 && !animBg && (
            <span style={{ color: '#666', fontSize: 12 }}>Empty Slide</span>
          )}

          {slide.elements.length === 0 && animBg && (
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
              {meta?.emoji} {meta?.label} Background
            </span>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50%       { opacity: 1;   }
        }
      `}</style>
    </div>
  );
});

// ── SlideThumbnail ────────────────────────────────────────────────────────────
const SlideThumbnail: React.FC<{
  slide:   SlideInfo;
  index:   number;
  isActive: boolean;
  bg:      React.CSSProperties;
  onClick: (i: number) => void;
}> = React.memo(({ slide, index, isActive, bg, onClick }) => {
  const textEl = slide.elements.find((el: any) => el.type === 'text');
  const animBg = slide.animatedBackground;
  const meta   = animBg ? ANIMATED_BG_META[animBg.type] : null;

  return (
    <div
      onClick={() => onClick(index)}
      style={{
        minWidth:    70,
        aspectRatio: '16/9',
        borderRadius: 5,
        cursor:      'pointer',
        border:      isActive
          ? animBg ? '2px solid #818cf8' : '2px solid #3b82f6'
          : '2px solid #333',
        boxShadow:   isActive
          ? animBg
            ? '0 0 8px rgba(129,140,248,0.5)'
            : '0 0 8px rgba(59,130,246,0.4)'
          : 'none',
        transition:  'border-color 0.15s, box-shadow 0.15s',
        position:    'relative',
        overflow:    'hidden',
        ...bg,
      }}
    >
      {/* ✅ Animated bg shimmer in thumbnail */}
      {animBg && meta && (
        <div style={{
          position:   'absolute', inset: 0,
          background: `linear-gradient(135deg, ${animBg.color1 ?? meta.colors[0]}66, ${animBg.color2 ?? meta.colors[1]}66)`,
        }}>
          {/* Emoji indicator in corner */}
          <div style={{
            position:  'absolute', top: 2, left: 3,
            fontSize:  8,
            lineHeight: 1,
          }}>
            {meta.emoji}
          </div>
        </div>
      )}

      {/* Text preview */}
      {textEl && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 2, overflow: 'hidden',
        }}>
          <span style={{
            color:        textEl.fontColor || (animBg ? '#fff' : '#000'),
            fontSize:     6,
            fontFamily:   textEl.fontFamily || 'Arial',
            fontWeight:   textEl.fontWeight || 'normal',
            textOverflow: 'ellipsis',
            overflow:     'hidden',
            whiteSpace:   'nowrap',
            maxWidth:     '100%',
            textShadow:   animBg ? '0 1px 2px rgba(0,0,0,0.8)' : 'none',
          }}>
            {textEl.text || ''}
          </span>
        </div>
      )}

      {/* Slide number badge */}
      <span style={{
        position:   'absolute', bottom: 2, right: 3, zIndex: 2,
        fontSize:   7, color: 'rgba(255,255,255,0.9)',
        background: 'rgba(0,0,0,0.55)',
        padding:    '1px 3px', borderRadius: 2,
      }}>
        {index + 1}
      </span>
    </div>
  );
});

export default ControllerPage;



// import React, {
//   useEffect, useState, useCallback, useRef, useMemo,
// } from 'react';
// import { io, Socket } from 'socket.io-client';
// import type { AnimatedBackground } from '../../../server/types';

// // ── Types ─────────────────────────────────────────────────────────────────────
// interface GradientStop   { offset: number; color: string; }
// interface GradientConfig { type: 'linear' | 'radial'; angle: number; stops: GradientStop[]; }

// interface SlideInfo {
//   id:                  string;
//   backgroundColor?:    string;
//   backgroundGradient?: GradientConfig;
//   backgroundImage?:    string;
//   elements:            any[];
//   notes?:              string;
//   animatedBackground?: AnimatedBackground;
// }

// // ── Helpers ───────────────────────────────────────────────────────────────────
// function gradientToCSS(g: GradientConfig): string {
//   const stops = [...g.stops]
//     .sort((a, b) => a.offset - b.offset)
//     .map(s => `${s.color} ${(s.offset * 100).toFixed(0)}%`)
//     .join(', ');
//   return g.type === 'radial'
//     ? `radial-gradient(circle, ${stops})`
//     : `linear-gradient(${g.angle}deg, ${stops})`;
// }

// function resolveSlideBackground(slide: SlideInfo | undefined): React.CSSProperties {
//   if (!slide) return { backgroundColor: '#1a1a2e' };

//   // ✅ Gradient takes priority
//   if (slide.backgroundGradient) {
//     return { background: gradientToCSS(slide.backgroundGradient) };
//   }
//   // ✅ Image (skip blob: URLs — they're Electron-local)
//   if (slide.backgroundImage && !slide.backgroundImage.startsWith('blob:')) {
//     return {
//       backgroundImage:    `url(${slide.backgroundImage})`,
//       backgroundSize:     'cover',
//       backgroundPosition: 'center',
//     };
//   }
//   return { backgroundColor: slide.backgroundColor || '#ffffff' };
// }

// // ✅ FIX: Resolve server URL correctly for all environments
// function resolveServerUrl(): string {
//   const hostname = window.location.hostname;
//   const port     = 8765;

//   // Electron loads from file:// or localhost
//   if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
//     return `http://localhost:${port}`;
//   }

//   // Browser on another device — use the same IP the page was served from
//   return `http://${hostname}:${port}`;
// }

// // ── Controller state ──────────────────────────────────────────────────────────
// interface ControllerState {
//   slides:            SlideInfo[];
//   currentSlideIndex: number;
//   isPresenting:      boolean;
//   isBlackScreen:     boolean;
//   presentationName:  string;
// }

// const DEFAULT_STATE: ControllerState = {
//   slides:            [],
//   currentSlideIndex: 0,
//   isPresenting:      false,
//   isBlackScreen:     false,
//   presentationName:  '',
// };

// // ─────────────────────────────────────────────────────────────────────────────
// const ControllerPage: React.FC = () => {
//   const socketRef = useRef<Socket | null>(null);
//   const serverUrl = useMemo(resolveServerUrl, []);

//   const [connected,   setConnected]   = useState(false);
//   const [error,       setError]       = useState('');
//   const [state,       setState]       = useState<ControllerState>(DEFAULT_STATE);

//   // ── Stable state merger ───────────────────────────────────────────────────
//   const applyPatch = useCallback((patch: Partial<ControllerState>) => {
//     setState(prev => {
//       const next = { ...prev, ...patch };

//       // ✅ Always clamp index to valid range after any update
//       if (next.slides.length > 0) {
//         next.currentSlideIndex = Math.max(
//           0,
//           Math.min(next.currentSlideIndex, next.slides.length - 1),
//         );
//       } else {
//         next.currentSlideIndex = 0;
//       }
//       return next;
//     });
//   }, []);

//   // ── Apply a full presentation object ─────────────────────────────────────
//   const applyPresentation = useCallback((pres: any, index?: number) => {
//     if (!pres) return;
//     applyPatch({
//       slides:           pres.slides            ?? [],
//       presentationName: pres.name              ?? 'Untitled',
//       ...(index != null && { currentSlideIndex: index }),
//     });
//   }, [applyPatch]);

//   // ── Register + sync helper (called on connect AND reconnect) ─────────────
//   const registerAndSync = useCallback((socket: Socket) => {
//     socket.emit('register', {
//       name: `Web Controller (${navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'})`,
//       role: 'controller',
//     });
//     // Small delay so server processes register before sync
//     setTimeout(() => {
//       if (socket.connected) socket.emit('request-sync');
//     }, 300);
//   }, []);

//   // ── Socket setup ──────────────────────────────────────────────────────────
//   useEffect(() => {
//     setError('');

//     const socket = io(serverUrl, {
//       transports:           ['websocket', 'polling'],
//       reconnection:         true,
//       reconnectionAttempts: Infinity,   // ✅ keep trying forever
//       reconnectionDelay:    1000,
//       reconnectionDelayMax: 10000,
//       timeout:              10000,
//     });
//     socketRef.current = socket;

//     // ── connect ────────────────────────────────────────────────────────────
//     socket.on('connect', () => {
//       console.log('[Controller] ✅ Connected:', socket.id);
//       setConnected(true);
//       setError('');
//       registerAndSync(socket);
//     });

//     // ✅ FIX: socket.io-client v4 — reconnect lives on socket.io manager
//     socket.io.on('reconnect', (attempt: number) => {
//       console.log('[Controller] 🔄 Reconnected after', attempt, 'attempts');
//       setConnected(true);
//       registerAndSync(socket);
//     });

//     // ── sync-state: full snapshot ──────────────────────────────────────────
//     socket.on('sync-state', (data: any) => {
//       console.log('[Controller] sync-state →',
//         data.presentation?.slides?.length ?? 0, 'slides,',
//         'index:', data.currentSlideIndex,
//       );

//       const patch: Partial<ControllerState> = {};

//       if (data.presentation) {
//         patch.slides           = data.presentation.slides ?? [];
//         patch.presentationName = data.presentation.name  ?? 'Untitled';
//       }
//       if (data.currentSlideIndex != null) patch.currentSlideIndex = data.currentSlideIndex;
//       if (data.isPresenting      != null) patch.isPresenting      = data.isPresenting;
//       if (data.isBlackScreen     != null) patch.isBlackScreen     = data.isBlackScreen;

//       applyPatch(patch);
//     });

//     // ── presentation-updated: editor pushed new content ────────────────────
//     socket.on('presentation-updated', (data: any) => {
//       console.log('[Controller] presentation-updated →',
//         data.presentation?.slides?.length ?? 0, 'slides');

//       const patch: Partial<ControllerState> = {};

//       if (data.presentation) {
//         patch.slides           = data.presentation.slides ?? [];
//         patch.presentationName = data.presentation.name  ?? 'Untitled';
//       }
//       // ✅ Update index from server if provided, otherwise keep current
//       if (data.currentSlideIndex != null) {
//         patch.currentSlideIndex = data.currentSlideIndex;
//       }

//       applyPatch(patch);
//     });

//     // ── slide-changed: lightweight index update ────────────────────────────
//     socket.on('slide-changed', (data: { index: number }) => {
//       console.log('[Controller] slide-changed →', data.index);
//       applyPatch({ currentSlideIndex: data.index });
//     });

//     // ── presentation control ───────────────────────────────────────────────
//     socket.on('presentation-started', (data: any) => {
//       const patch: Partial<ControllerState> = { isPresenting: true };
//       if (data?.index != null) patch.currentSlideIndex = data.index;
//       applyPatch(patch);
//     });

//     socket.on('presentation-stopped', () => {
//       applyPatch({ isPresenting: false });
//     });

//     socket.on('black-screen-toggled', (v: boolean) => {
//       applyPatch({ isBlackScreen: v });
//     });

//     // ── disconnect ─────────────────────────────────────────────────────────
//     socket.on('disconnect', (reason: string) => {
//       console.log('[Controller] Disconnected:', reason);
//       setConnected(false);
//     });

//     socket.on('connect_error', (err: Error) => {
//       console.error('[Controller] Connect error:', err.message);
//       setError(`Connection error: ${err.message}`);
//       setConnected(false);
//     });

//     return () => {
//       socket.io.off('reconnect');   // ✅ clean up manager-level listener
//       socket.disconnect();
//       socketRef.current = null;
//     };
//   }, [serverUrl, registerAndSync, applyPatch]);

//   // ── Emit actions ──────────────────────────────────────────────────────────
//   const emit = useCallback((event: string, data?: any) => {
//     if (socketRef.current?.connected) {
//       socketRef.current.emit(event, data);
//     } else {
//       console.warn('[Controller] Cannot emit — not connected');
//     }
//   }, []);

//   const nextSlide         = useCallback(() => emit('next-slide'),         [emit]);
//   const prevSlide         = useCallback(() => emit('prev-slide'),         [emit]);
//   const goToSlide         = useCallback((i: number) => emit('go-to-slide', i), [emit]);
//   const startPresentation = useCallback(() => emit('start-presentation'), [emit]);
//   const stopPresentation  = useCallback(() => emit('stop-presentation'),  [emit]);
//   const toggleBlackScreen = useCallback(() => emit('toggle-black-screen'),[emit]);

//   // ── Keyboard shortcuts ────────────────────────────────────────────────────
//   useEffect(() => {
//     const handleKeyDown = (e: KeyboardEvent) => {
//       // Don't hijack input fields
//       if ((e.target as HTMLElement).tagName === 'INPUT') return;
//       switch (e.key) {
//         case 'ArrowRight': case 'ArrowDown': case ' ':
//           e.preventDefault(); nextSlide(); break;
//         case 'ArrowLeft': case 'ArrowUp':
//           e.preventDefault(); prevSlide(); break;
//         case 'b': case 'B': toggleBlackScreen(); break;
//         case 'Escape': stopPresentation(); break;
//       }
//     };
//     window.addEventListener('keydown', handleKeyDown);
//     return () => window.removeEventListener('keydown', handleKeyDown);
//   }, [nextSlide, prevSlide, toggleBlackScreen, stopPresentation]);

//   // ── Memoized backgrounds ──────────────────────────────────────────────────
//   // ✅ FIX: Pre-compute all thumbnail backgrounds once per slides change
//   const slideBgs = useMemo(
//     () => state.slides.map(resolveSlideBackground),
//     [state.slides],
//   );

//   const {
//     slides, currentSlideIndex, isPresenting,
//     isBlackScreen, presentationName,
//   } = state;

//   const totalSlides      = slides.length;
//   const currentSlideData = slides[currentSlideIndex];
//   const currentBg        = slideBgs[currentSlideIndex] ?? { backgroundColor: '#1a1a2e' };

//   // ── Connecting screen ─────────────────────────────────────────────────────
//   if (!connected) {
//     return (
//       <div style={{
//         minHeight: '100vh', backgroundColor: '#0a0a1a',
//         display: 'flex', flexDirection: 'column',
//         alignItems: 'center', justifyContent: 'center',
//         color: '#fff', padding: 20, fontFamily: 'system-ui, sans-serif',
//       }}>
//         <div style={{ fontSize: 48, marginBottom: 16 }}>📡</div>
//         <h1 style={{ fontSize: 24, marginBottom: 8 }}>Connecting...</h1>
//         <p style={{ color: '#888', fontSize: 14, marginBottom: 8 }}>{serverUrl}</p>

//         {error && (
//           <div style={{
//             marginTop: 12, padding: '12px 16px',
//             backgroundColor: '#2a0a0a',
//             border: '1px solid #ff4444', borderRadius: 8,
//             color: '#ff6666', fontSize: 13,
//             maxWidth: 400, textAlign: 'center',
//           }}>
//             {error}
//             <br />
//             <small style={{ color: '#999' }}>
//               Make sure you're on the same WiFi and the app is running.
//             </small>
//           </div>
//         )}

//         <div style={{
//           marginTop: 24, width: 40, height: 40,
//           border: '3px solid #333', borderTopColor: '#3b82f6',
//           borderRadius: '50%', animation: 'spin 1s linear infinite',
//         }} />
//         <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
//       </div>
//     );
//   }

//   // ── No slides yet ─────────────────────────────────────────────────────────
//   if (slides.length === 0) {
//     return (
//       <div style={{
//         minHeight: '100vh', backgroundColor: '#0a0a1a',
//         display: 'flex', flexDirection: 'column',
//         alignItems: 'center', justifyContent: 'center',
//         color: '#fff', padding: 20, fontFamily: 'system-ui, sans-serif',
//       }}>
//         <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
//         <h2 style={{ marginBottom: 8 }}>Connected!</h2>
//         <p style={{ color: '#888', fontSize: 14, textAlign: 'center' }}>
//           Waiting for presentation data…<br />
//           Open or create a presentation on the desktop app.
//         </p>
//         <div style={{
//           marginTop: 24, width: 30, height: 30,
//           border: '3px solid #333', borderTopColor: '#22c55e',
//           borderRadius: '50%', animation: 'spin 1.5s linear infinite',
//         }} />
//         <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
//       </div>
//     );
//   }

//   // ── Main UI ───────────────────────────────────────────────────────────────
//   return (
//     <div style={{
//       minHeight: '100vh', backgroundColor: '#0a0a1a', color: '#fff',
//       fontFamily: 'system-ui, sans-serif',
//       display: 'flex', flexDirection: 'column',
//     }}>

//       {/* Header */}
//       <div style={{
//         padding: '10px 16px', backgroundColor: '#1a1a2e',
//         borderBottom: '1px solid #333',
//         display: 'flex', justifyContent: 'space-between', alignItems: 'center',
//       }}>
//         <div>
//           <h1 style={{ fontSize: 15, margin: 0 }}>🎤 {presentationName}</h1>
//           <span style={{ fontSize: 11, color: '#888' }}>
//             Web Controller • 🟢 Connected
//           </span>
//         </div>
//         <div style={{ display: 'flex', gap: 6 }}>
//           {isPresenting && (
//             <span style={{
//               background: '#166534', color: '#4ade80',
//               padding: '3px 8px', borderRadius: 6,
//               fontSize: 10, fontWeight: 'bold',
//             }}>▶ LIVE</span>
//           )}
//           {isBlackScreen && (
//             <span style={{
//               background: '#333', color: '#999',
//               padding: '3px 8px', borderRadius: 6,
//               fontSize: 10, fontWeight: 'bold',
//             }}>■ BLACK</span>
//           )}
//         </div>
//       </div>

//       {/* Slide counter */}
//       <div style={{ textAlign: 'center', padding: '10px', fontSize: 13, color: '#ccc' }}>
//         Slide {currentSlideIndex + 1} of {totalSlides}
//       </div>

//       {/* Current slide preview */}
//       <div style={{
//         flex: 1, display: 'flex', alignItems: 'center',
//         justifyContent: 'center', padding: '0 16px',
//       }}>
//         <div style={{
//           width: '100%', maxWidth: 560, aspectRatio: '16/9',
//           borderRadius: 10, border: '2px solid #3b82f6',
//           boxShadow: '0 0 20px rgba(59,130,246,0.25)',
//           position: 'relative', overflow: 'hidden',
//           // ✅ Use pre-computed background from memoized array
//           ...(isBlackScreen ? { backgroundColor: '#000' } : currentBg),
//         }}>
//           {isBlackScreen ? (
//             <div style={{
//               width: '100%', height: '100%',
//               display: 'flex', alignItems: 'center', justifyContent: 'center',
//             }}>
//               <span style={{ color: '#333', fontSize: 16 }}>Black Screen</span>
//             </div>

//           ) : currentSlideData ? (
//             <SlidePreview slide={currentSlideData} />
//           ) : null}

//           {/* Slide number badge */}
//           <div style={{
//             position: 'absolute', bottom: 6, right: 10,
//             background: 'rgba(0,0,0,0.5)', color: '#fff',
//             padding: '2px 8px', borderRadius: 4, fontSize: 11,
//           }}>
//             {currentSlideIndex + 1}
//           </div>
//         </div>
//       </div>

//       {/* Speaker notes */}
//       {currentSlideData?.notes && (
//         <div style={{
//           margin: '8px 16px', padding: 10,
//           backgroundColor: '#1a1a2e', borderRadius: 8,
//           maxHeight: 70, overflow: 'auto',
//           fontSize: 11, color: '#ccc',
//         }}>
//           📝 {currentSlideData.notes}
//         </div>
//       )}

//       {/* Slide thumbnails */}
//       <div style={{
//         padding: '8px 16px', overflowX: 'auto',
//         display: 'flex', gap: 6,
//       }}>
//         {slides.map((slide, i) => (
//           <SlideThumbnail
//             key={slide.id || i}
//             slide={slide}
//             index={i}
//             isActive={i === currentSlideIndex}
//             bg={slideBgs[i]}
//             onClick={goToSlide}
//           />
//         ))}
//       </div>

//       {/* Controls */}
//       <div style={{ padding: '10px 16px' }}>
//         <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
//           <button
//             onClick={prevSlide}
//             disabled={currentSlideIndex === 0}
//             style={{
//               flex: 1, padding: '18px', fontSize: 16, borderRadius: 12,
//               border: 'none',
//               cursor:           currentSlideIndex === 0 ? 'default'  : 'pointer',
//               backgroundColor:  currentSlideIndex === 0 ? '#1a1a2a' : '#2a2a4a',
//               color:            currentSlideIndex === 0 ? '#444'     : '#fff',
//             }}
//           >◀ PREV</button>

//           <button
//             onClick={nextSlide}
//             disabled={currentSlideIndex >= totalSlides - 1}
//             style={{
//               flex: 2, padding: '18px', fontSize: 18,
//               borderRadius: 12, border: 'none', fontWeight: 'bold',
//               cursor:          currentSlideIndex >= totalSlides - 1 ? 'default'  : 'pointer',
//               backgroundColor: currentSlideIndex >= totalSlides - 1 ? '#1a2a4a' : '#2563eb',
//               color:           currentSlideIndex >= totalSlides - 1 ? '#555'     : '#fff',
//             }}
//           >NEXT ▶</button>
//         </div>

//         <div style={{ display: 'flex', gap: 6 }}>
//           <button
//             onClick={isPresenting ? stopPresentation : startPresentation}
//             style={{
//               flex: 1, padding: '10px', borderRadius: 10, border: 'none',
//               cursor: 'pointer', fontSize: 12, fontWeight: 'bold',
//               backgroundColor: isPresenting ? '#dc2626' : '#16a34a',
//               color: '#fff',
//             }}
//           >{isPresenting ? '⏹ STOP' : '▶ START'}</button>

//           <button
//             onClick={toggleBlackScreen}
//             style={{
//               flex: 1, padding: '10px', borderRadius: 10, border: 'none',
//               cursor: 'pointer', fontSize: 12, fontWeight: 'bold',
//               backgroundColor: isBlackScreen ? '#ea580c' : '#2a2a4a',
//               color: '#fff',
//             }}
//           >{isBlackScreen ? '🔆 SHOW' : '🖥 BLACK'}</button>

//           <button
//             onClick={() => goToSlide(0)}
//             style={{
//               padding: '10px 14px', borderRadius: 10, border: 'none',
//               cursor: 'pointer', fontSize: 12,
//               backgroundColor: '#2a2a4a', color: '#fff',
//             }}
//           >⏮</button>

//           <button
//             onClick={() => goToSlide(totalSlides - 1)}
//             style={{
//               padding: '10px 14px', borderRadius: 10, border: 'none',
//               cursor: 'pointer', fontSize: 12,
//               backgroundColor: '#2a2a4a', color: '#fff',
//             }}
//           >⏭</button>
//         </div>
//       </div>

//       {/* Keyboard shortcuts hint */}
//       <div style={{
//         padding: '6px 16px 14px',
//         display: 'flex', gap: 6,
//         flexWrap: 'wrap', justifyContent: 'center',
//       }}>
//         {['→ Next', '← Prev', 'B Black', 'Esc Stop'].map(s => (
//           <span key={s} style={{
//             fontSize: 9, color: '#555',
//             background: '#1a1a2e',
//             padding: '2px 6px', borderRadius: 3,
//           }}>{s}</span>
//         ))}
//       </div>
//     </div>
//   );
// };

// // ── Sub-components (extracted to avoid re-creating inline) ────────────────────

// const SlidePreview: React.FC<{ slide: SlideInfo }> = React.memo(({ slide }) => {
//   const textEls    = slide.elements.filter((el: any) => el.type === 'text').slice(0, 3);
//   const nonTextCnt = slide.elements.filter((el: any) => el.type !== 'text').length;

//   return (
//     <div style={{
//       width: '100%', height: '100%',
//       display: 'flex', alignItems: 'center', justifyContent: 'center',
//     }}>
//       <div style={{ padding: 16, textAlign: 'center', width: '100%' }}>
//         {textEls.map((el: any, i: number) => (
//           <div key={i} style={{
//             color:        el.fontColor   || '#000',
//             fontSize:     Math.min((el.fontSize || 24) * 0.35, 20),
//             fontWeight:   el.fontWeight  || 'normal',
//             fontFamily:   el.fontFamily  || 'Arial',
//             marginBottom: 4,
//             textShadow:   el.strokeColor ? `1px 1px 2px ${el.strokeColor}` : 'none',
//             overflow:     'hidden',
//             textOverflow: 'ellipsis',
//             whiteSpace:   'nowrap',
//           }}>
//             {el.text || ''}
//           </div>
//         ))}

//         {nonTextCnt > 0 && (
//           <div style={{ color: '#666', fontSize: 10, marginTop: 8 }}>
//             +{nonTextCnt} other element{nonTextCnt !== 1 ? 's' : ''}
//           </div>
//         )}

//         {slide.elements.length === 0 && (
//           <span style={{ color: '#666', fontSize: 12 }}>Empty Slide</span>
//         )}
//       </div>
//     </div>
//   );
// });

// // ✅ Extracted thumbnail so it only re-renders when its own props change
// const SlideThumbnail: React.FC<{
//   slide:    SlideInfo;
//   index:    number;
//   isActive: boolean;
//   bg:       React.CSSProperties;
//   onClick:  (i: number) => void;
// }> = React.memo(({ slide, index, isActive, bg, onClick }) => {
//   const textEl = slide.elements.find((el: any) => el.type === 'text');

//   return (
//     <div
//       onClick={() => onClick(index)}
//       style={{
//         minWidth:    70,
//         aspectRatio: '16/9',
//         borderRadius: 5,
//         cursor:      'pointer',
//         border:      isActive ? '2px solid #3b82f6' : '2px solid #333',
//         boxShadow:   isActive ? '0 0 8px rgba(59,130,246,0.4)' : 'none',
//         transition:  'border-color 0.15s, box-shadow 0.15s',
//         position:    'relative',
//         overflow:    'hidden',
//         ...bg,
//       }}
//     >
//       {textEl && (
//         <div style={{
//           position: 'absolute', inset: 0,
//           display: 'flex', alignItems: 'center', justifyContent: 'center',
//           padding: 2, overflow: 'hidden',
//         }}>
//           <span style={{
//             color:        textEl.fontColor  || '#000',
//             fontSize:     6,
//             fontFamily:   textEl.fontFamily || 'Arial',
//             fontWeight:   textEl.fontWeight || 'normal',
//             textOverflow: 'ellipsis',
//             overflow:     'hidden',
//             whiteSpace:   'nowrap',
//             maxWidth:     '100%',
//           }}>
//             {textEl.text || ''}
//           </span>
//         </div>
//       )}

//       <span style={{
//         position:   'absolute', bottom: 2, right: 3,
//         fontSize:   7, color: 'rgba(255,255,255,0.7)',
//         background: 'rgba(0,0,0,0.45)',
//         padding: '1px 3px', borderRadius: 2,
//       }}>
//         {index + 1}
//       </span>
//     </div>
//   );
// });

// export default ControllerPage;
// import React, { useEffect, useState, useCallback, useRef } from 'react';
// import { io, Socket } from 'socket.io-client';

// interface SlideInfo {
//   id: string;
//   backgroundColor: string;
//   backgroundImage?: string;
//   elements: any[];
//   notes?: string;
// }

// const ControllerPage: React.FC = () => {
//   const socketRef = useRef<Socket | null>(null);
//   const [connected, setConnected] = useState(false);
//   const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
//   const [slides, setSlides] = useState<SlideInfo[]>([]);
//   const [isPresenting, setIsPresenting] = useState(false);
//   const [isBlackScreen, setIsBlackScreen] = useState(false);
//   const [presentationName, setPresentationName] = useState('');
//   const [error, setError] = useState('');

//   const serverUrl = `http://${window.location.hostname}:8765`;
//   const totalSlides = slides.length;

//   useEffect(() => {
//     console.log('🎮 Controller connecting to:', serverUrl);
//     setError('');

//     const socket = io(serverUrl, {
//       transports: ['websocket', 'polling'],
//       reconnection: true,
//       reconnectionAttempts: 20,
//       reconnectionDelay: 1000,
//       timeout: 10000,
//     });

//     socketRef.current = socket;

//     socket.on('connect', () => {
//       console.log('✅ Controller connected, socket id:', socket.id);
//       setConnected(true);
//       setError('');

//       // Register as controller
//       socket.emit('register', {
//         name: `Web Controller (${navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'})`,
//         role: 'controller',
//       });

//       setTimeout(() => {
//         console.log('📤 Requesting sync...');
//         socket.emit('request-sync');
//       }, 500);
//     });
//     socket.on('reconnect', () => {
//       console.log('🔄 Reconnected, requesting sync...');
//       setConnected(true);
//       socket.emit('register', { name: 'Web Controller', role: 'controller' });
//       setTimeout(() => socket.emit('request-sync'), 500);
//     });

//     socket.on('sync-state', (data: any) => {
//       console.log('📥 sync-state received:', {
//         hasPresentation: !!data.presentation,
//         slideCount: data.presentation?.slides?.length,
//         currentIndex: data.currentSlideIndex,
//       });

//       if (data.presentation) {
//         setSlides(data.presentation.slides || []);
//         setPresentationName(data.presentation.name || 'Untitled');
//         setCurrentSlideIndex(data.currentSlideIndex || 0);
//         setIsPresenting(data.isPresenting || false);
//         setIsBlackScreen(data.isBlackScreen || false);
//       }
//     });

//     socket.on('slide-changed', (data: any) => {
//       console.log('📥 slide-changed:', data.index);
//       setCurrentSlideIndex(data.index);
//     });

//     socket.on('presentation-updated', (data: any) => {
//       console.log('📥 presentation-updated');
//       if (data.slides) setSlides(data.slides);
//       if (data.name) setPresentationName(data.name);
//     });

//     socket.on('slide-added', () => {
//       // Request full re-sync
//       socket.emit('register', { name: 'Web Controller', role: 'controller' });
//     });

//     socket.on('slide-deleted', (data: any) => {
//       if (data.currentSlideIndex !== undefined) {
//         setCurrentSlideIndex(data.currentSlideIndex);
//       }
//       socket.emit('register', { name: 'Web Controller', role: 'controller' });
//     });

//     socket.on('slide-duplicated', () => {
//       socket.emit('register', { name: 'Web Controller', role: 'controller' });
//     });

//     socket.on('presentation-started', (data: any) => {
//       setIsPresenting(true);
//       if (data?.index !== undefined) setCurrentSlideIndex(data.index);
//     });

//     socket.on('presentation-stopped', () => {
//       setIsPresenting(false);
//     });

//     socket.on('black-screen-toggled', (value: boolean) => {
//       setIsBlackScreen(value);
//     });

//     socket.on('disconnect', () => {
//       console.log('❌ Controller disconnected');
//       setConnected(false);
//     });

//     socket.on('connect_error', (err: any) => {
//       console.error('Connection error:', err.message);
//       setError(`Connection error: ${err.message}`);
//       setConnected(false);
//     });

//     return () => {
//       socket.disconnect();
//       socketRef.current = null;
//     };
//   }, [serverUrl]);

//   const nextSlide = useCallback(() => socketRef.current?.emit('next-slide'), []);
//   const prevSlide = useCallback(() => socketRef.current?.emit('prev-slide'), []);
//   const goToSlide = useCallback((i: number) => socketRef.current?.emit('go-to-slide', i), []);
//   const startPresentation = useCallback(() => socketRef.current?.emit('start-presentation'), []);
//   const stopPresentation = useCallback(() => socketRef.current?.emit('stop-presentation'), []);
//   const toggleBlackScreen = useCallback(() => socketRef.current?.emit('toggle-black-screen'), []);

//   // Keyboard
//   useEffect(() => {
//     const handleKeyDown = (e: KeyboardEvent) => {
//       switch (e.key) {
//         case 'ArrowRight': case 'ArrowDown': case ' ': e.preventDefault(); nextSlide(); break;
//         case 'ArrowLeft': case 'ArrowUp': e.preventDefault(); prevSlide(); break;
//         case 'b': case 'B': toggleBlackScreen(); break;
//         case 'Escape': stopPresentation(); break;
//       }
//     };
//     window.addEventListener('keydown', handleKeyDown);
//     return () => window.removeEventListener('keydown', handleKeyDown);
//   }, [nextSlide, prevSlide, toggleBlackScreen, stopPresentation]);

//   // Helper to parse hex color
//   const parseColor = (hex?: string) => hex || '#ffffff';

//   // ===== CONNECTING SCREEN =====
//   if (!connected) {
//     return (
//       <div style={{
//         minHeight: '100vh', backgroundColor: '#0a0a1a',
//         display: 'flex', flexDirection: 'column', alignItems: 'center',
//         justifyContent: 'center', color: '#fff', padding: 20,
//         fontFamily: 'system-ui, sans-serif',
//       }}>
//         <div style={{ fontSize: 48, marginBottom: 16 }}>📡</div>
//         <h1 style={{ fontSize: 24, marginBottom: 8 }}>Connecting...</h1>
//         <p style={{ color: '#888', fontSize: 14, marginBottom: 8 }}>{serverUrl}</p>
//         {error && (
//           <div style={{
//             marginTop: 12, padding: '12px 16px', backgroundColor: '#2a0a0a',
//             border: '1px solid #ff4444', borderRadius: 8, color: '#ff6666',
//             fontSize: 13, maxWidth: 400, textAlign: 'center',
//           }}>
//             {error}
//             <br />
//             <small style={{ color: '#999' }}>Make sure you're on the same WiFi and the app is running.</small>
//           </div>
//         )}
//         <div style={{
//           marginTop: 24, width: 40, height: 40,
//           border: '3px solid #333', borderTopColor: '#3b82f6',
//           borderRadius: '50%', animation: 'spin 1s linear infinite',
//         }} />
//         <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
//       </div>
//     );
//   }

//   // ===== NO PRESENTATION YET =====
//   if (slides.length === 0) {
//     return (
//       <div style={{
//         minHeight: '100vh', backgroundColor: '#0a0a1a',
//         display: 'flex', flexDirection: 'column', alignItems: 'center',
//         justifyContent: 'center', color: '#fff', padding: 20,
//         fontFamily: 'system-ui, sans-serif',
//       }}>
//         <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
//         <h2 style={{ marginBottom: 8 }}>Connected!</h2>
//         <p style={{ color: '#888', fontSize: 14, textAlign: 'center' }}>
//           Waiting for presentation data...<br />
//           Open or create a presentation on the desktop app.
//         </p>
//         <div style={{
//           marginTop: 24, width: 30, height: 30,
//           border: '3px solid #333', borderTopColor: '#22c55e',
//           borderRadius: '50%', animation: 'spin 1.5s linear infinite',
//         }} />
//         <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
//       </div>
//     );
//   }

//   // ===== CONNECTED CONTROLLER UI =====
//   const currentSlideData = slides[currentSlideIndex];

//   return (
//     <div style={{
//       minHeight: '100vh', backgroundColor: '#0a0a1a', color: '#fff',
//       fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column',
//     }}>
//       {/* Header */}
//       <div style={{
//         padding: '10px 16px', backgroundColor: '#1a1a2e',
//         borderBottom: '1px solid #333', display: 'flex',
//         justifyContent: 'space-between', alignItems: 'center',
//       }}>
//         <div>
//           <h1 style={{ fontSize: 15, margin: 0 }}>🎤 {presentationName}</h1>
//           <span style={{ fontSize: 11, color: '#888' }}>
//             Web Controller • 🟢 Connected
//           </span>
//         </div>
//         <div style={{ display: 'flex', gap: 6 }}>
//           {isPresenting && (
//             <span style={{
//               background: '#166534', color: '#4ade80', padding: '3px 8px',
//               borderRadius: 6, fontSize: 10, fontWeight: 'bold',
//             }}>▶ LIVE</span>
//           )}
//           {isBlackScreen && (
//             <span style={{
//               background: '#333', color: '#999', padding: '3px 8px',
//               borderRadius: 6, fontSize: 10, fontWeight: 'bold',
//             }}>■ BLACK</span>
//           )}
//         </div>
//       </div>

//       {/* Slide Counter */}
//       <div style={{ textAlign: 'center', padding: '10px', fontSize: 13, color: '#ccc' }}>
//         Slide {currentSlideIndex + 1} of {totalSlides}
//       </div>

//       {/* Current Slide Preview */}
//       <div style={{
//         flex: 1, display: 'flex', alignItems: 'center',
//         justifyContent: 'center', padding: '0 16px',
//       }}>
//         <div style={{
//           width: '100%', maxWidth: 560, aspectRatio: '16/9',
//           backgroundColor: isBlackScreen ? '#000' : parseColor(currentSlideData?.backgroundColor),
//           borderRadius: 10, border: '2px solid #3b82f6',
//           boxShadow: '0 0 20px rgba(59,130,246,0.25)',
//           position: 'relative', overflow: 'hidden',
//         }}>
//           {isBlackScreen ? (
//             <div style={{
//               width: '100%', height: '100%', display: 'flex',
//               alignItems: 'center', justifyContent: 'center',
//             }}>
//               <span style={{ color: '#333', fontSize: 16 }}>Black Screen</span>
//             </div>
//           ) : currentSlideData ? (
//             <div style={{
//               width: '100%', height: '100%', display: 'flex',
//               alignItems: 'center', justifyContent: 'center',
//             }}>
//               {/* Show text elements as simplified preview */}
//               <div style={{ padding: 16, textAlign: 'center', width: '100%' }}>
//                 {currentSlideData.elements
//                   .filter((el: any) => el.type === 'text')
//                   .slice(0, 3)
//                   .map((el: any, i: number) => (
//                     <div key={i} style={{
//                       color: el.fontColor || '#000',
//                       fontSize: Math.min((el.fontSize || 24) * 0.35, 20),
//                       fontWeight: el.fontWeight || 'normal',
//                       fontFamily: el.fontFamily || 'Arial',
//                       marginBottom: 4,
//                       textShadow: el.strokeColor ? `1px 1px 2px ${el.strokeColor}` : 'none',
//                       overflow: 'hidden',
//                       textOverflow: 'ellipsis',
//                       whiteSpace: 'nowrap',
//                     }}>
//                       {el.text || ''}
//                     </div>
//                   ))}
//                 {currentSlideData.elements.filter((el: any) => el.type !== 'text').length > 0 && (
//                   <div style={{ color: '#666', fontSize: 10, marginTop: 8 }}>
//                     +{currentSlideData.elements.filter((el: any) => el.type !== 'text').length} other elements
//                   </div>
//                 )}
//                 {currentSlideData.elements.length === 0 && (
//                   <span style={{ color: '#666', fontSize: 12 }}>Empty Slide</span>
//                 )}
//               </div>
//             </div>
//           ) : null}

//           {/* Slide number */}
//           <div style={{
//             position: 'absolute', bottom: 6, right: 10,
//             background: 'rgba(0,0,0,0.5)', color: '#fff',
//             padding: '2px 8px', borderRadius: 4, fontSize: 11,
//           }}>
//             {currentSlideIndex + 1}
//           </div>
//         </div>
//       </div>

//       {/* Speaker Notes */}
//       {currentSlideData?.notes && (
//         <div style={{
//           margin: '8px 16px', padding: 10, backgroundColor: '#1a1a2e',
//           borderRadius: 8, maxHeight: 70, overflow: 'auto',
//           fontSize: 11, color: '#ccc',
//         }}>
//           📝 {currentSlideData.notes}
//         </div>
//       )}

//       {/* Slide Thumbnails */}
//       <div style={{
//         padding: '8px 16px', overflowX: 'auto', display: 'flex', gap: 6,
//       }}>
//         {slides.map((slide, i) => (
//           <div key={slide.id || i} onClick={() => goToSlide(i)}
//             style={{
//               minWidth: 70, aspectRatio: '16/9',
//               backgroundColor: parseColor(slide.backgroundColor),
//               borderRadius: 5, cursor: 'pointer',
//               border: i === currentSlideIndex ? '2px solid #3b82f6' : '2px solid #333',
//               display: 'flex', alignItems: 'center', justifyContent: 'center',
//               boxShadow: i === currentSlideIndex ? '0 0 8px rgba(59,130,246,0.4)' : 'none',
//               transition: 'all 0.15s',
//             }}>
//             <span style={{ fontSize: 9, color: '#666' }}>{i + 1}</span>
//           </div>
//         ))}
//       </div>

//       {/* Controls */}
//       <div style={{ padding: '10px 16px' }}>
//         <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
//           <button onClick={prevSlide} disabled={currentSlideIndex === 0}
//             style={{
//               flex: 1, padding: '18px', fontSize: 16, borderRadius: 12,
//               border: 'none', cursor: currentSlideIndex === 0 ? 'default' : 'pointer',
//               backgroundColor: currentSlideIndex === 0 ? '#1a1a2a' : '#2a2a4a',
//               color: currentSlideIndex === 0 ? '#444' : '#fff',
//             }}>◀ PREV</button>
//           <button onClick={nextSlide} disabled={currentSlideIndex >= totalSlides - 1}
//             style={{
//               flex: 2, padding: '18px', fontSize: 18, borderRadius: 12,
//               border: 'none', cursor: currentSlideIndex >= totalSlides - 1 ? 'default' : 'pointer',
//               fontWeight: 'bold',
//               backgroundColor: currentSlideIndex >= totalSlides - 1 ? '#1a2a4a' : '#2563eb',
//               color: currentSlideIndex >= totalSlides - 1 ? '#555' : '#fff',
//             }}>NEXT ▶</button>
//         </div>
//         <div style={{ display: 'flex', gap: 6 }}>
//           <button onClick={isPresenting ? stopPresentation : startPresentation}
//             style={{
//               flex: 1, padding: '10px', borderRadius: 10, border: 'none',
//               cursor: 'pointer', fontSize: 12, fontWeight: 'bold',
//               backgroundColor: isPresenting ? '#dc2626' : '#16a34a', color: '#fff',
//             }}>{isPresenting ? '⏹ STOP' : '▶ START'}</button>
//           <button onClick={toggleBlackScreen}
//             style={{
//               flex: 1, padding: '10px', borderRadius: 10, border: 'none',
//               cursor: 'pointer', fontSize: 12, fontWeight: 'bold',
//               backgroundColor: isBlackScreen ? '#ea580c' : '#2a2a4a', color: '#fff',
//             }}>{isBlackScreen ? '🔆 SHOW' : '🖥 BLACK'}</button>
//           <button onClick={() => goToSlide(0)}
//             style={{
//               padding: '10px 14px', borderRadius: 10, border: 'none',
//               cursor: 'pointer', fontSize: 12, backgroundColor: '#2a2a4a', color: '#fff',
//             }}>⏮</button>
//           <button onClick={() => goToSlide(totalSlides - 1)}
//             style={{
//               padding: '10px 14px', borderRadius: 10, border: 'none',
//               cursor: 'pointer', fontSize: 12, backgroundColor: '#2a2a4a', color: '#fff',
//             }}>⏭</button>
//         </div>
//       </div>

//       {/* Shortcuts */}
//       <div style={{
//         padding: '6px 16px 14px', display: 'flex', gap: 6,
//         flexWrap: 'wrap', justifyContent: 'center',
//       }}>
//         {['→ Next', '← Prev', 'B Black', 'Esc Stop'].map((s) => (
//           <span key={s} style={{
//             fontSize: 9, color: '#555', background: '#1a1a2e',
//             padding: '2px 6px', borderRadius: 3,
//           }}>{s}</span>
//         ))}
//       </div>
//     </div>
//   );
// };

// export default ControllerPage;