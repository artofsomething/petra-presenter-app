// src/renderer/components/Editor/AnimatedBackground.tsx
import React, { useEffect, useRef } from 'react';
import type { AnimatedBackground, AnimatedBgType } from '../../../server/types';

interface AnimatedBackgroundProps {
  config:  AnimatedBackground;
  width?:  number;
  height?: number;
  style?:  React.CSSProperties;
}

// ── CSS keyframes injected once ───────────────────────────────────────────────
const STYLE_ID = 'animated-bg-keyframes';

function injectKeyframes() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    /* Aurora */
    @keyframes aurora-shift {
      0%   { transform: translate(-10%, -10%) rotate(0deg)   scale(1);    }
      33%  { transform: translate(5%,   15%)  rotate(120deg) scale(1.15); }
      66%  { transform: translate(15%, -5%)   rotate(240deg) scale(0.95); }
      100% { transform: translate(-10%, -10%) rotate(360deg) scale(1);    }
    }
    @keyframes aurora-shift-2 {
      0%   { transform: translate(10%,  10%) rotate(0deg)   scale(1.1);  }
      33%  { transform: translate(-5%, -15%) rotate(-120deg) scale(1);   }
      66%  { transform: translate(-15%, 5%)  rotate(-240deg) scale(1.2); }
      100% { transform: translate(10%,  10%) rotate(-360deg) scale(1.1); }
    }
    @keyframes aurora-shift-3 {
      0%   { transform: translate(0%,  5%)  scale(1);    }
      50%  { transform: translate(-5%, -5%) scale(1.05); }
      100% { transform: translate(0%,  5%)  scale(1);    }
    }

    /* Waves */
    @keyframes wave-move {
      0%   { transform: translateX(0)    scaleY(1);    }
      50%  { transform: translateX(-25%) scaleY(0.85); }
      100% { transform: translateX(-50%) scaleY(1);    }
    }
    @keyframes wave-move-2 {
      0%   { transform: translateX(0)    scaleY(1);    }
      50%  { transform: translateX(-25%) scaleY(1.15); }
      100% { transform: translateX(-50%) scaleY(1);    }
    }

    /* Neon pulse */
    @keyframes neon-pulse-1 {
      0%, 100% { opacity: 0.4; transform: scale(1);    }
      50%      { opacity: 1;   transform: scale(1.08); }
    }
    @keyframes neon-pulse-2 {
      0%, 100% { opacity: 0.6; transform: scale(1.05); }
      50%      { opacity: 0.2; transform: scale(0.95); }
    }
    @keyframes neon-rotate {
      from { transform: rotate(0deg);   }
      to   { transform: rotate(360deg); }
    }

    /* Geometric */
    @keyframes geo-spin-cw {
      from { transform: rotate(0deg);   }
      to   { transform: rotate(360deg); }
    }
    @keyframes geo-spin-ccw {
      from { transform: rotate(0deg);    }
      to   { transform: rotate(-360deg); }
    }
    @keyframes geo-float {
      0%, 100% { transform: translateY(0px);   }
      50%      { transform: translateY(-20px);  }
    }

    /* Fire */
    @keyframes fire-rise {
      0%   { transform: translateY(0%)   scaleX(1);    opacity: 1;   }
      100% { transform: translateY(-100%) scaleX(1.5); opacity: 0;   }
    }
    @keyframes fire-flicker {
      0%, 100% { transform: skewX(0deg)  scaleY(1);   }
      25%      { transform: skewX(-3deg) scaleY(1.02); }
      75%      { transform: skewX(3deg)  scaleY(0.98); }
    }

    /* Snowfall */
    @keyframes snow-fall {
      0%   { transform: translateY(-5vh)  translateX(0px)   rotate(0deg);   opacity: 0;   }
      10%  { opacity: 1; }
      90%  { opacity: 0.8; }
      100% { transform: translateY(105vh) translateX(60px)  rotate(360deg); opacity: 0;   }
    }
    @keyframes snow-sway {
      0%, 100% { margin-left: 0px;   }
      50%      { margin-left: 30px;  }
    }

    /* Starfield */
    @keyframes star-twinkle {
      0%, 100% { opacity: 1;   transform: scale(1);    }
      50%      { opacity: 0.2; transform: scale(0.5);  }
    }
    @keyframes star-drift {
      from { transform: translateZ(0px);   }
      to   { transform: translateZ(500px); }
    }

    /* ── NEW: Lava Lamp ── */
    @keyframes lava-blob-1 {
      0%         { transform: translate(0%,    0%)    scale(1);    border-radius: 40% 60% 55% 45% / 45% 55% 60% 40%; }
      25%        { transform: translate(15%,  -20%)   scale(1.1);  border-radius: 60% 40% 45% 55% / 55% 45% 40% 60%; }
      50%        { transform: translate(-10%,  25%)   scale(0.95); border-radius: 50% 50% 40% 60% / 60% 40% 50% 50%; }
      75%        { transform: translate(20%,   10%)   scale(1.05); border-radius: 45% 55% 60% 40% / 40% 60% 45% 55%; }
      100%       { transform: translate(0%,    0%)    scale(1);    border-radius: 40% 60% 55% 45% / 45% 55% 60% 40%; }
    }
    @keyframes lava-blob-2 {
      0%         { transform: translate(0%,    0%)    scale(1);    border-radius: 55% 45% 40% 60% / 60% 40% 55% 45%; }
      33%        { transform: translate(-20%,  15%)   scale(1.15); border-radius: 40% 60% 55% 45% / 45% 55% 40% 60%; }
      66%        { transform: translate(10%,  -25%)   scale(0.9);  border-radius: 60% 40% 45% 55% / 55% 45% 60% 40%; }
      100%       { transform: translate(0%,    0%)    scale(1);    border-radius: 55% 45% 40% 60% / 60% 40% 55% 45%; }
    }
    @keyframes lava-blob-3 {
      0%         { transform: translate(0%,  0%)   scale(1);    }
      20%        { transform: translate(-15%, 20%)  scale(1.2);  }
      40%        { transform: translate(20%, -15%)  scale(0.85); }
      60%        { transform: translate(-5%,  25%)  scale(1.1);  }
      80%        { transform: translate(15%, -10%)  scale(0.95); }
      100%       { transform: translate(0%,  0%)   scale(1);    }
    }

    /* ── NEW: Lightning ── */
    @keyframes lightning-flash {
      0%, 89%, 91%, 93%, 100% { opacity: 0; }
      90%, 92%                { opacity: 1; }
    }
    @keyframes lightning-glow {
      0%, 94%, 100% { opacity: 0; }
      95%           { opacity: 0.6; }
    }
    @keyframes lightning-bg-flash {
      0%, 88%, 92%, 100% { opacity: 0; }
      89%, 91%           { opacity: 0.08; }
    }

    /* ── NEW: Galaxy ── */
    @keyframes galaxy-rotate {
      from { transform: translate(-50%, -50%) rotate(0deg); }
      to   { transform: translate(-50%, -50%) rotate(360deg); }
    }
    @keyframes galaxy-rotate-slow {
      from { transform: translate(-50%, -50%) rotate(0deg); }
      to   { transform: translate(-50%, -50%) rotate(360deg); }
    }
    @keyframes galaxy-star-pulse {
      0%, 100% { opacity: 0.8; }
      50%      { opacity: 0.2; }
    }

    /* ── NEW: Cyberpunk Grid ── */
    @keyframes grid-scan {
      0%   { transform: translateY(-100%); opacity: 0; }
      10%  { opacity: 1; }
      90%  { opacity: 1; }
      100% { transform: translateY(200%);  opacity: 0; }
    }
    @keyframes grid-flicker {
      0%, 100%      { opacity: 1;   }
      92%           { opacity: 1;   }
      93%           { opacity: 0.4; }
      94%           { opacity: 1;   }
      96%           { opacity: 0.2; }
      97%           { opacity: 1;   }
    }
    @keyframes grid-pulse {
      0%, 100% { opacity: 0.4; }
      50%      { opacity: 1;   }
    }

    /* ── NEW: DNA Helix ── */
    @keyframes dna-node-left {
      0%   { transform: translateX(0px)  scale(1);    opacity: 1;   }
      25%  { transform: translateX(40px) scale(0.6);  opacity: 0.4; }
      50%  { transform: translateX(0px)  scale(0.2);  opacity: 0.1; }
      75%  { transform: translateX(-40px) scale(0.6); opacity: 0.4; }
      100% { transform: translateX(0px)  scale(1);    opacity: 1;   }
    }
    @keyframes dna-node-right {
      0%   { transform: translateX(0px)   scale(1);    opacity: 1;   }
      25%  { transform: translateX(-40px) scale(0.6);  opacity: 0.4; }
      50%  { transform: translateX(0px)   scale(0.2);  opacity: 0.1; }
      75%  { transform: translateX(40px)  scale(0.6);  opacity: 0.4; }
      100% { transform: translateX(0px)   scale(1);    opacity: 1;   }
    }
    @keyframes dna-drift {
      0%   { transform: translateY(0px);   }
      100% { transform: translateY(-60px); }
    }

    /* ── NEW: Confetti ── */
    @keyframes confetti-fall {
      0%   { transform: translateY(-20px) rotate(0deg)   translateX(0px);  opacity: 1;   }
      100% { transform: translateY(110vh) rotate(720deg) translateX(80px); opacity: 0.2; }
    }
    @keyframes confetti-sway {
      0%, 100% { margin-left: 0px;  }
      25%      { margin-left: 20px; }
      75%      { margin-left: -20px;}
    }

    /* ── NEW: Plasma ── */
    @keyframes plasma-band-1 {
      0%   { transform: translateY(0%)   scaleX(1);   opacity: 0.6; }
      50%  { transform: translateY(-8%)  scaleX(1.1); opacity: 1;   }
      100% { transform: translateY(0%)   scaleX(1);   opacity: 0.6; }
    }
    @keyframes plasma-band-2 {
      0%   { transform: translateY(0%)  scaleX(1);   opacity: 0.4; }
      50%  { transform: translateY(10%) scaleX(0.9); opacity: 0.8; }
      100% { transform: translateY(0%)  scaleX(1);   opacity: 0.4; }
    }
    @keyframes plasma-hue {
      0%   { filter: hue-rotate(0deg)   blur(40px); }
      100% { filter: hue-rotate(360deg) blur(40px); }
    }
    @keyframes plasma-hue-2 {
      0%   { filter: hue-rotate(180deg) blur(50px); }
      100% { filter: hue-rotate(540deg) blur(50px); }
    }

    /* ── NEW: Vortex ── */
    @keyframes vortex-ring {
      0%   { transform: translate(-50%, -50%) rotate(0deg)   scale(1);    opacity: 0.6; }
      50%  { transform: translate(-50%, -50%) rotate(180deg) scale(1.05); opacity: 1;   }
      100% { transform: translate(-50%, -50%) rotate(360deg) scale(1);    opacity: 0.6; }
    }
    @keyframes vortex-ring-ccw {
      0%   { transform: translate(-50%, -50%) rotate(0deg)    scale(1);    opacity: 0.5; }
      50%  { transform: translate(-50%, -50%) rotate(-180deg) scale(0.95); opacity: 0.9; }
      100% { transform: translate(-50%, -50%) rotate(-360deg) scale(1);    opacity: 0.5; }
    }
    @keyframes vortex-core-pulse {
      0%, 100% { transform: translate(-50%, -50%) scale(1);    opacity: 0.8; }
      50%      { transform: translate(-50%, -50%) scale(1.2);  opacity: 1;   }
    }
    @keyframes vortex-particle {
      0%   { transform: rotate(0deg)   translateX(var(--vr)) rotate(0deg);   opacity: 0; }
      10%  { opacity: 1; }
      90%  { opacity: 0.8; }
      100% { transform: rotate(360deg) translateX(var(--vr)) rotate(-360deg); opacity: 0; }
    }

    /* ── NEW: Glitch ── */
    @keyframes glitch-main {
      0%, 90%, 100%  { transform: translate(0); filter: none; }
      91%            { transform: translate(-4px, 2px); filter: hue-rotate(90deg); }
      92%            { transform: translate(4px, -2px); }
      93%            { transform: translate(-2px, 4px); filter: hue-rotate(-90deg); }
      94%            { transform: translate(0); filter: none; }
      97%            { transform: translate(3px, -1px); filter: saturate(200%); }
      98%            { transform: translate(-3px, 1px); }
      99%            { transform: translate(0); filter: none; }
    }
    @keyframes glitch-slice-1 {
      0%, 85%, 100%  { transform: translateX(0); clip-path: inset(0 0 100% 0); }
      86%            { transform: translateX(-10px); clip-path: inset(20% 0 60% 0); opacity: 0.8; }
      87%            { transform: translateX(10px);  clip-path: inset(20% 0 60% 0); }
      88%            { transform: translateX(0);     clip-path: inset(0 0 100% 0);  }
      95%            { transform: translateX(5px);   clip-path: inset(50% 0 30% 0); opacity: 0.6; }
      96%            { transform: translateX(-5px);  clip-path: inset(50% 0 30% 0); }
      97%            { clip-path: inset(0 0 100% 0); }
    }
    @keyframes glitch-slice-2 {
      0%, 88%, 100%  { transform: translateX(0); clip-path: inset(0 0 100% 0); }
      89%            { transform: translateX(8px);  clip-path: inset(60% 0 20% 0); opacity: 0.7; }
      90%            { transform: translateX(-8px); clip-path: inset(60% 0 20% 0); }
      91%            { clip-path: inset(0 0 100% 0); }
    }
    @keyframes glitch-scanline {
      0%   { transform: translateY(-100%); }
      100% { transform: translateY(100vh); }
    }
    @keyframes glitch-rgb-r {
      0%, 90%, 100% { transform: translate(0); opacity: 0; }
      91%, 93%      { transform: translate(-3px, 0); opacity: 0.5; }
      92%           { transform: translate(3px, 0); opacity: 0.5; }
    }
    @keyframes glitch-rgb-b {
      0%, 90%, 100% { transform: translate(0); opacity: 0; }
      91%, 93%      { transform: translate(3px, 0); opacity: 0.5; }
      92%           { transform: translate(-3px, 0); opacity: 0.5; }
    }

    /* ── NEW: Underwater ── */
    @keyframes underwater-caustic {
      0%   { transform: scale(1)    rotate(0deg);   opacity: 0.3; }
      50%  { transform: scale(1.1)  rotate(180deg); opacity: 0.6; }
      100% { transform: scale(1)    rotate(360deg); opacity: 0.3; }
    }
    @keyframes underwater-bubble {
      0%   { transform: translateY(0)   translateX(0px)  scale(1);    opacity: 0.6; }
      50%  { transform: translateY(-40%) translateX(10px) scale(1.05); opacity: 0.8; }
      100% { transform: translateY(-90vh) translateX(-5px) scale(0.8); opacity: 0; }
    }
    @keyframes underwater-weed {
      0%, 100% { transform-origin: bottom center; transform: rotate(-8deg); }
      50%      { transform-origin: bottom center; transform: rotate(8deg);  }
    }
    @keyframes underwater-light-ray {
      0%   { transform: translateX(-50%) skewX(-15deg) scaleY(0.9); opacity: 0.08; }
      50%  { transform: translateX(-50%) skewX(5deg)   scaleY(1.1); opacity: 0.18; }
      100% { transform: translateX(-50%) skewX(-15deg) scaleY(0.9); opacity: 0.08; }
    }
    @keyframes underwater-float {
      0%, 100% { transform: translateY(0px)  translateX(0px); }
      33%      { transform: translateY(-12px) translateX(6px); }
      66%      { transform: translateY(8px)   translateX(-4px); }
    }
  `;
  document.head.appendChild(style);
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual background renderers (original 10)
// ─────────────────────────────────────────────────────────────────────────────

// 1. AURORA ────────────────────────────────────────────────────────────────────
function Aurora({ config }: { config: AnimatedBackground }) {
  const c1  = config.color1 ?? '#7c3aed';
  const c2  = config.color2 ?? '#2563eb';
  const c3  = config.color3 ?? '#06b6d4';
  const spd = config.speed  ?? 1;
  const dur = (8 / spd).toFixed(1);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden',
                  background: '#0a0015' }}>
      <div style={{
        position:     'absolute',
        width:        '70%', height: '70%',
        top: '-20%',  left: '-20%',
        borderRadius: '50%',
        background:   `radial-gradient(circle, ${c1}99 0%, transparent 70%)`,
        animation:    `aurora-shift ${dur}s ease-in-out infinite`,
        filter:       'blur(60px)',
      }} />
      <div style={{
        position:     'absolute',
        width:        '60%', height: '60%',
        bottom: '-15%', right: '-15%',
        borderRadius: '50%',
        background:   `radial-gradient(circle, ${c2}99 0%, transparent 70%)`,
        animation:    `aurora-shift-2 ${(parseFloat(dur) * 1.3).toFixed(1)}s ease-in-out infinite`,
        filter:       'blur(50px)',
      }} />
      <div style={{
        position:     'absolute',
        width:        '50%', height: '50%',
        top: '20%',   left: '25%',
        borderRadius: '50%',
        background:   `radial-gradient(circle, ${c3}88 0%, transparent 70%)`,
        animation:    `aurora-shift-3 ${(parseFloat(dur) * 0.7).toFixed(1)}s ease-in-out infinite`,
        filter:       'blur(70px)',
      }} />
    </div>
  );
}

// 2. WAVES ─────────────────────────────────────────────────────────────────────
function Waves({ config }: { config: AnimatedBackground }) {
  const c1  = config.color1 ?? '#1e40af';
  const c2  = config.color2 ?? '#7c3aed';
  const c3  = config.color3 ?? '#0891b2';
  const spd = config.speed  ?? 1;

  const waveStyle = (
    color: string,
    bottom: string,
    opacity: number,
    duration: number,
    delay: number,
    animName: string,
  ): React.CSSProperties => ({
    position:        'absolute',
    bottom,
    left:            '-50%',
    width:           '200%',
    height:          '200px',
    background:      color,
    borderRadius:    '43% 47% 44% 48% / 23% 24% 21% 22%',
    opacity,
    animation:       `${animName} ${(duration / spd).toFixed(1)}s linear infinite`,
    animationDelay:  `${delay}s`,
  });

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden',
                  background: `linear-gradient(180deg, ${c1}22 0%, #000 100%)` }}>
      <div style={waveStyle(c2, '-40px',  0.5, 7,   0,    'wave-move'  )} />
      <div style={waveStyle(c1, '-80px',  0.4, 9,  -2,    'wave-move-2')} />
      <div style={waveStyle(c3, '-120px', 0.3, 11, -4,    'wave-move'  )} />
      <div style={waveStyle(c2, '-160px', 0.2, 13, -6,    'wave-move-2')} />
    </div>
  );
}

// 3. NEON PULSE ────────────────────────────────────────────────────────────────
function NeonPulse({ config }: { config: AnimatedBackground }) {
  const c1  = config.color1 ?? '#f0abfc';
  const c2  = config.color2 ?? '#818cf8';
  const c3  = config.color3 ?? '#34d399';
  const spd = config.speed  ?? 1;

  const rings = [
    { size: '90%',  dur: 3.0, delay: 0,    color: c1 },
    { size: '70%',  dur: 4.0, delay: -1,   color: c2 },
    { size: '50%',  dur: 2.5, delay: -0.5, color: c3 },
    { size: '30%',  dur: 3.5, delay: -1.5, color: c1 },
  ];

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden',
                  background: '#050010',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        position:     'absolute',
        width: '110%', height: '110%',
        borderRadius: '50%',
        border:       `2px solid ${c1}44`,
        animation:    `neon-rotate ${(20 / spd).toFixed(1)}s linear infinite`,
      }} />
      {rings.map((r, i) => (
        <div key={i} style={{
          position:        'absolute',
          width:           r.size,
          height:          r.size,
          borderRadius:    '50%',
          background:      `radial-gradient(circle, ${r.color}33 0%, transparent 70%)`,
          boxShadow:       `0 0 60px ${r.color}44, inset 0 0 60px ${r.color}22`,
          animation:       `neon-pulse-${(i % 2) + 1} ${(r.dur / spd).toFixed(1)}s ease-in-out infinite`,
          animationDelay:  `${r.delay}s`,
        }} />
      ))}
      <div style={{
        position:     'absolute',
        width:        '15%', height: '15%',
        borderRadius: '50%',
        background:   `radial-gradient(circle, ${c1}cc 0%, ${c2}44 50%, transparent 100%)`,
        filter:       'blur(8px)',
        animation:    `neon-pulse-1 ${(2 / spd).toFixed(1)}s ease-in-out infinite`,
      }} />
    </div>
  );
}

// 4. GEOMETRIC ─────────────────────────────────────────────────────────────────
function Geometric({ config }: { config: AnimatedBackground }) {
  const c1  = config.color1 ?? '#6366f1';
  const c2  = config.color2 ?? '#8b5cf6';
  const c3  = config.color3 ?? '#ec4899';
  const spd = config.speed  ?? 1;

  const shapes = [
    { size: 180, x: '10%',  y: '10%', anim: 'geo-spin-cw',  dur: 20, shape: 'square', color: c1 },
    { size: 120, x: '75%',  y: '15%', anim: 'geo-spin-ccw', dur: 15, shape: 'tri',    color: c2 },
    { size: 200, x: '60%',  y: '60%', anim: 'geo-spin-cw',  dur: 25, shape: 'square', color: c3 },
    { size: 80,  x: '20%',  y: '65%', anim: 'geo-float',    dur: 4,  shape: 'circle', color: c1 },
    { size: 140, x: '85%',  y: '50%', anim: 'geo-spin-ccw', dur: 18, shape: 'square', color: c2 },
    { size: 60,  x: '45%',  y: '30%', anim: 'geo-float',    dur: 3,  shape: 'circle', color: c3 },
    { size: 100, x: '5%',   y: '45%', anim: 'geo-spin-cw',  dur: 12, shape: 'tri',    color: c1 },
  ];

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden',
                  background: '#0f0f1a' }}>
      {shapes.map((s, i) => (
        <div key={i} style={{
          position:        'absolute',
          left:            s.x,
          top:             s.y,
          width:           s.size,
          height:          s.size,
          opacity:         0.15,
          animation:       `${s.anim} ${(s.dur / spd).toFixed(1)}s linear infinite`,
          animationDelay:  `${-i * 2}s`,
          borderRadius:    s.shape === 'circle' ? '50%' : s.shape === 'tri' ? '0' : '8px',
          background:      s.shape === 'tri'
            ? 'transparent'
            : `linear-gradient(135deg, ${s.color}, transparent)`,
          border:          `2px solid ${s.color}`,
          clipPath:        s.shape === 'tri'
            ? 'polygon(50% 0%, 0% 100%, 100% 100%)'
            : undefined,
        }} />
      ))}
    </div>
  );
}

// 5. STARFIELD ─────────────────────────────────────────────────────────────────
function Starfield({ config }: { config: AnimatedBackground }) {
  const c1  = config.color1 ?? '#ffffff';
  const c2  = config.color2 ?? '#93c5fd';
  const spd = config.speed  ?? 1;

  const stars = React.useMemo(() => {
    const arr = [];
    for (let i = 0; i < 120; i++) {
      arr.push({
        x:     `${(i * 13.7 + 7) % 100}%`,
        y:     `${(i * 7.3  + 3) % 100}%`,
        size:  i % 5 === 0 ? 3 : i % 3 === 0 ? 2 : 1,
        dur:   ((i % 5) + 1.5) / spd,
        delay: -(i % 7) * 0.4,
        color: i % 7 === 0 ? c2 : c1,
      });
    }
    return arr;
  }, [c1, c2, spd]);

  const shootingStars = React.useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => ({
      x:     `${(i * 20 + 5)}%`,
      delay: i * 3,
      dur:   (1.5 / spd).toFixed(1),
    }));
  }, [spd]);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden',
                  background: 'radial-gradient(ellipse at center, #0d1b4b 0%, #000005 100%)' }}>
      {stars.map((s, i) => (
        <div key={i} style={{
          position:        'absolute',
          left:            s.x,
          top:             s.y,
          width:           s.size,
          height:          s.size,
          borderRadius:    '50%',
          background:      s.color,
          boxShadow:       s.size > 1 ? `0 0 ${s.size * 2}px ${s.color}` : undefined,
          animation:       `star-twinkle ${s.dur.toFixed(1)}s ease-in-out infinite`,
          animationDelay:  `${s.delay}s`,
        }} />
      ))}
      {shootingStars.map((s, i) => (
        <div key={`shoot-${i}`} style={{
          position:        'absolute',
          left:            s.x,
          top:             `${i * 15 + 5}%`,
          width:           '120px',
          height:          '1px',
          background:      `linear-gradient(90deg, transparent, ${c1}, transparent)`,
          opacity:         0,
          transform:       'rotate(-35deg)',
          animation:       `snow-fall ${s.dur}s ease-in infinite`,
          animationDelay:  `${s.delay}s`,
        }} />
      ))}
    </div>
  );
}

// 6. BUBBLES ───────────────────────────────────────────────────────────────────
function Bubbles({ config }: { config: AnimatedBackground }) {
  const c1  = config.color1 ?? '#3b82f6';
  const c2  = config.color2 ?? '#8b5cf6';
  const c3  = config.color3 ?? '#06b6d4';
  const spd = config.speed  ?? 1;

  const bubbles = React.useMemo(() => {
    const colors = [c1, c2, c3];
    return Array.from({ length: 18 }, (_, i) => ({
      size:   20 + (i * 11) % 60,
      x:      `${(i * 17 + 5) % 95}%`,
      dur:    (6 + (i % 5) * 2) / spd,
      delay:  -(i % 8) * 1.2,
      color:  colors[i % 3],
    }));
  }, [c1, c2, c3, spd]);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden',
                  background: `linear-gradient(180deg, #020b18 0%, #0f1b35 100%)` }}>
      {bubbles.map((b, i) => (
        <div key={i} style={{
          position:        'absolute',
          bottom:          '-80px',
          left:            b.x,
          width:           b.size,
          height:          b.size,
          borderRadius:    '50%',
          border:          `2px solid ${b.color}88`,
          background:      `radial-gradient(circle at 35% 35%, ${b.color}33, transparent 60%)`,
          boxShadow:       `inset 0 0 10px ${b.color}22, 0 0 15px ${b.color}22`,
          animation:       `fire-rise ${b.dur.toFixed(1)}s ease-in infinite`,
          animationDelay:  `${b.delay}s`,
        }} />
      ))}
    </div>
  );
}

// 7. MATRIX ────────────────────────────────────────────────────────────────────
function Matrix({ config }: { config: AnimatedBackground }) {
  const c1 = config.color1 ?? '#00ff41';
  const spd = config.speed ?? 1;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx    = canvas.getContext('2d');
    if (!ctx)    return;

    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const cols    = Math.floor(canvas.width / 16);
    const drops   = Array(cols).fill(1);
    const chars   = 'ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789';

    let raf: number;

    const draw = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = c1;
      ctx.font      = '15px monospace';

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillStyle = Math.random() > 0.95 ? '#fff' : c1;
        ctx.fillText(char, i * 16, drops[i] * 16);

        if (drops[i] * 16 > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i] += spd;
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [c1, spd]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
               background: '#000' }}
    />
  );
}

// 8. FIRE ──────────────────────────────────────────────────────────────────────
function Fire({ config }: { config: AnimatedBackground }) {
  const c1  = config.color1 ?? '#ef4444';
  const c2  = config.color2 ?? '#f97316';
  const c3  = config.color3 ?? '#fbbf24';
  const spd = config.speed  ?? 1;

  const flames = React.useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      width:  40 + (i * 13) % 80,
      height: 80 + (i * 17) % 120,
      x:      `${(i * 5.1) % 100}%`,
      dur:    (1.5 + (i % 4) * 0.5) / spd,
      delay:  -(i * 0.3),
      color:  i % 3 === 0 ? c3 : i % 2 === 0 ? c2 : c1,
      layer:  i % 3,
    }));
  }, [c1, c2, c3, spd]);

  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      background: `radial-gradient(ellipse at bottom, #1a0000 0%, #000 100%)`,
    }}>
      {flames.map((f, i) => (
        <div key={i} style={{
          position:        'absolute',
          bottom:          0,
          left:            f.x,
          width:           f.width,
          height:          f.height,
          background:      `radial-gradient(ellipse at bottom, ${f.color}cc 0%, ${f.color}44 50%, transparent 100%)`,
          borderRadius:    '50% 50% 30% 30% / 60% 60% 40% 40%',
          opacity:         0.7,
          filter:          'blur(4px)',
          transformOrigin: 'bottom center',
          animation:       [
            `fire-rise    ${f.dur.toFixed(1)}s    ease-in    infinite ${f.delay}s`,
            `fire-flicker ${(f.dur * 0.3).toFixed(1)}s ease-in-out infinite`,
          ].join(', '),
        }} />
      ))}
      <div style={{
        position:   'absolute',
        bottom:     0, left: 0, right: 0,
        height:     '30%',
        background: `linear-gradient(0deg, ${c1}88 0%, transparent 100%)`,
        filter:     'blur(20px)',
      }} />
    </div>
  );
}

// 9. SNOWFALL ──────────────────────────────────────────────────────────────────
function Snowfall({ config }: { config: AnimatedBackground }) {
  const c1  = config.color1 ?? '#ffffff';
  const c2  = config.color2 ?? '#bfdbfe';
  const spd = config.speed  ?? 1;

  const flakes = React.useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => ({
      size:    i % 7 === 0 ? 8 : i % 3 === 0 ? 5 : 3,
      x:       `${(i * 1.667) % 100}%`,
      dur:     (8 + (i % 7) * 2) / spd,
      delay:   -(i % 10) * 1.5,
      opacity: 0.4 + (i % 5) * 0.12,
      color:   i % 5 === 0 ? c2 : c1,
      blur:    i % 4 === 0 ? 1 : 0,
    }));
  }, [c1, c2, spd]);

  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      background: `linear-gradient(180deg, #0a1628 0%, #162040 50%, #0a0f1e 100%)`,
    }}>
      <div style={{
        position:     'absolute',
        top: '20%',   left: '30%',
        width: '40%', height: '40%',
        borderRadius: '50%',
        background:   `radial-gradient(circle, ${c2}11 0%, transparent 70%)`,
        filter:       'blur(40px)',
      }} />
      {flakes.map((f, i) => (
        <div key={i} style={{
          position:        'absolute',
          top:             '-10px',
          left:            f.x,
          width:           f.size,
          height:          f.size,
          borderRadius:    '50%',
          background:      f.color,
          opacity:         f.opacity,
          filter:          f.blur ? `blur(${f.blur}px)` : undefined,
          boxShadow:       f.size > 4 ? `0 0 ${f.size}px ${f.color}88` : undefined,
          animation:       `snow-fall ${f.dur.toFixed(1)}s linear infinite`,
          animationDelay:  `${f.delay}s`,
        }} />
      ))}
    </div>
  );
}

// 10. PARTICLES ────────────────────────────────────────────────────────────────
function Particles({ config }: { config: AnimatedBackground }) {
  const c1  = config.color1 ?? '#6366f1';
  const c2  = config.color2 ?? '#8b5cf6';
  const c3  = config.color3 ?? '#06b6d4';
  const spd = config.speed  ?? 1;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colors  = [c1, c2, c3];
    const COUNT   = 60;
    const CONNECT = 120;

    const particles = Array.from({ length: COUNT }, (_, i) => ({
      x:     Math.random() * canvas.width,
      y:     Math.random() * canvas.height,
      vx:    (Math.random() - 0.5) * spd,
      vy:    (Math.random() - 0.5) * spd,
      r:     1.5 + Math.random() * 2,
      color: colors[i % 3],
    }));

    let raf: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx   = particles[i].x - particles[j].x;
          const dy   = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT) {
            ctx.strokeStyle = particles[i].color;
            ctx.globalAlpha = (1 - dist / CONNECT) * 0.5;
            ctx.lineWidth   = 0.5;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      ctx.globalAlpha = 1;
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle   = p.color;
        ctx.shadowBlur  = 6;
        ctx.shadowColor = p.color;
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [c1, c2, c3, spd]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:   'absolute', inset: 0,
        width:      '100%',     height: '100%',
        background: '#050510',
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW BACKGROUNDS (11-20)
// ─────────────────────────────────────────────────────────────────────────────

// 11. LAVA LAMP ────────────────────────────────────────────────────────────────
function LavaLamp({ config }: { config: AnimatedBackground }) {
  const c1  = config.color1 ?? '#ff6b6b';
  const c2  = config.color2 ?? '#ffd93d';
  const c3  = config.color3 ?? '#ff8e53';
  const spd = config.speed  ?? 1;

  const blobs = React.useMemo(() => [
    { w: '55%', h: '55%', top: '-15%', left: '-10%', color: c1, anim: 'lava-blob-1', dur: 12 / spd },
    { w: '50%', h: '50%', top: '40%',  left: '50%',  color: c2, anim: 'lava-blob-2', dur: 15 / spd },
    { w: '45%', h: '45%', top: '20%',  left: '20%',  color: c3, anim: 'lava-blob-3', dur: 10 / spd },
    { w: '40%', h: '40%', top: '55%',  left: '-5%',  color: c2, anim: 'lava-blob-1', dur: 18 / spd },
    { w: '35%', h: '35%', top: '-5%',  left: '60%',  color: c1, anim: 'lava-blob-2', dur: 14 / spd },
  ], [c1, c2, c3, spd]);

  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      background: '#1a0a00',
    }}>
      {/* Dark tinted glass overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.25)',
        zIndex: 1,
      }} />
      {blobs.map((b, i) => (
        <div key={i} style={{
          position:        'absolute',
          width:           b.w,
          height:          b.h,
          top:             b.top,
          left:            b.left,
          background:      `radial-gradient(circle at 40% 40%, ${b.color}ee 0%, ${b.color}77 50%, transparent 80%)`,
          filter:          'blur(30px)',
          animation:       `${b.anim} ${b.dur.toFixed(1)}s ease-in-out infinite`,
          animationDelay:  `${-i * 2.5}s`,
          mixBlendMode:    'screen',
        }} />
      ))}
      {/* Highlight sheen */}
      <div style={{
        position:   'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.06) 0%, transparent 60%)',
        zIndex:     2,
      }} />
    </div>
  );
}

// 12. LIGHTNING ────────────────────────────────────────────────────────────────
function Lightning({ config }: { config: AnimatedBackground }) {
  const c1  = config.color1 ?? '#a78bfa';
  const c2  = config.color2 ?? '#e879f9';
  const c3  = config.color3 ?? '#38bdf8';
  const spd = config.speed  ?? 1;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const colors = [c1, c2, c3];

    const _canvas = canvas;
    const _ctx    = ctx;

    // Recursive lightning bolt drawing
    function drawBolt(
      x1: number, y1: number, x2: number, y2: number,
      depth: number, color: string,
    ) {
      if (depth === 0) {
        _ctx.beginPath();
        _ctx.moveTo(x1, y1);
        _ctx.lineTo(x2, y2);
        _ctx.strokeStyle = color;
        _ctx.lineWidth   = 1;
        _ctx.globalAlpha = 0.9;
        _ctx.shadowBlur  = 12;
        _ctx.shadowColor = color;
        _ctx.stroke();
        return;
      }
      const mx   = (x1 + x2) / 2 + (Math.random() - 0.5) * (_canvas.height / (depth * 2));
      const my   = (y1 + y2) / 2 + (Math.random() - 0.5) * 20;
      drawBolt(x1, y1, mx, my, depth - 1, color);
      drawBolt(mx, my, x2, y2, depth - 1, color);
      // Branch
      if (depth === 2 && Math.random() > 0.5) {
        const bx = mx + (Math.random() - 0.5) * _canvas.width * 0.3;
        const by = my + _canvas.height * 0.2 * Math.random();
        _ctx.globalAlpha = 0.4;
        drawBolt(mx, my, bx, by, depth - 1, color);
      }
    }

    let raf: number;
    let frameCount = 0;
    const INTERVAL = Math.round(60 / spd);

    const animate = () => {
      frameCount++;

      // Clear with dark overlay
      _ctx.fillStyle = 'rgba(0,0,5,0.4)';
      _ctx.fillRect(0, 0, _canvas.width, _canvas.height);

      // Strike on interval
      if (frameCount % INTERVAL === 0) {
        _ctx.clearRect(0, 0, _canvas.width, _canvas.height);
        _ctx.fillStyle = '#000005';
        _ctx.fillRect(0, 0, _canvas.width, _canvas.height);

        const numBolts = 1 + Math.floor(Math.random() * 3);
        for (let b = 0; b < numBolts; b++) {
          const x     = Math.random() * _canvas.width;
          const color = colors[Math.floor(Math.random() * colors.length)];
          _ctx.shadowBlur  = 20;
          _ctx.shadowColor = color;
          _ctx.globalAlpha = 1;
          drawBolt(x, 0, x + (Math.random() - 0.5) * 200, _canvas.height, 4, color);
        }
        _ctx.shadowBlur  = 0;
        _ctx.globalAlpha = 1;
      }

      raf = requestAnimationFrame(animate);
    };

    // Initial dark background
    _ctx.fillStyle = '#000005';
    _ctx.fillRect(0, 0, _canvas.width, _canvas.height);

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [c1, c2, c3, spd]);

  return (
    <>
      <div style={{
        position:   'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 0%, #1a0a2e 0%, #000005 60%)',
      }} />
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />
      {/* Ambient glow flashes */}
      <div style={{
        position:   'absolute', inset: 0,
        background: `radial-gradient(ellipse at 50% 20%, ${c1}22 0%, transparent 60%)`,
        animation:  `lightning-glow ${(3 / spd).toFixed(1)}s ease-in-out infinite`,
      }} />
    </>
  );
}

// 13. GALAXY ───────────────────────────────────────────────────────────────────
function Galaxy({ config }: { config: AnimatedBackground }) {
  const c1  = config.color1 ?? '#818cf8';
  const c2  = config.color2 ?? '#f472b6';
  const c3  = config.color3 ?? '#fde68a';
  const spd = config.speed  ?? 1;

  // Spiral arm stars
  const stars = React.useMemo(() => {
    const arr = [];
    for (let i = 0; i < 200; i++) {
      const arm    = i % 3;
      const angle  = (i / 15) + (arm * Math.PI * 2 / 3);
      const radius = 5 + (i % 45) * 1.1;
      const spread = (Math.random() - 0.5) * 18;
      arr.push({
        angle,
        radius,
        spread,
        size:   i % 10 === 0 ? 3 : i % 4 === 0 ? 2 : 1,
        color:  arm === 0 ? c1 : arm === 1 ? c2 : c3,
        dur:    (1.5 + (i % 5) * 0.6) / spd,
        delay:  -(i % 9) * 0.3,
        opacity: 0.3 + (i % 7) * 0.1,
      });
    }
    return arr;
  }, [c1, c2, c3, spd]);

  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      background: 'radial-gradient(ellipse at center, #06010f 0%, #000 100%)',
    }}>
      {/* Central core */}
      <div style={{
        position:     'absolute',
        top: '50%',   left: '50%',
        width:        '120px', height: '120px',
        transform:    'translate(-50%, -50%)',
        borderRadius: '50%',
        background:   `radial-gradient(circle, ${c3}ff 0%, ${c1}88 30%, ${c2}33 60%, transparent 100%)`,
        filter:       'blur(8px)',
        animation:    `neon-pulse-1 ${(3 / spd).toFixed(1)}s ease-in-out infinite`,
      }} />
      {/* Rotating spiral container */}
      <div style={{
        position:  'absolute',
        top:       '50%',
        left:      '50%',
        width:     '100%',
        height:    '100%',
        animation: `galaxy-rotate ${(40 / spd).toFixed(1)}s linear infinite`,
      }}>
        {stars.map((s, i) => {
          const x = Math.cos(s.angle) * (s.radius + s.spread);
          const y = Math.sin(s.angle) * (s.radius + s.spread) * 0.4;
          return (
            <div key={i} style={{
              position:        'absolute',
              left:            `calc(50% + ${x}%)`,
              top:             `calc(50% + ${y}%)`,
              width:           s.size,
              height:          s.size,
              borderRadius:    '50%',
              background:      s.color,
              opacity:         s.opacity,
              boxShadow:       s.size > 1 ? `0 0 ${s.size * 3}px ${s.color}` : undefined,
              animation:       `star-twinkle ${s.dur.toFixed(1)}s ease-in-out infinite`,
              animationDelay:  `${s.delay}s`,
            }} />
          );
        })}
      </div>
      {/* Dust cloud overlay */}
      <div style={{
        position:     'absolute',
        top: '50%',   left: '50%',
        width:        '80%', height: '40%',
        transform:    'translate(-50%, -50%) rotate(-15deg)',
        borderRadius: '50%',
        background:   `radial-gradient(ellipse, ${c1}18 0%, ${c2}0a 50%, transparent 100%)`,
        filter:       'blur(20px)',
        animation:    `galaxy-rotate ${(60 / spd).toFixed(1)}s linear infinite`,
      }} />
    </div>
  );
}

// 14. CYBERPUNK GRID ───────────────────────────────────────────────────────────
function CyberpunkGrid({ config }: { config: AnimatedBackground }) {
  const c1  = config.color1 ?? '#00ffff';
  const c2  = config.color2 ?? '#ff00ff';
  const c3  = config.color3 ?? '#ffff00';
  const spd = config.speed  ?? 1;

  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      background: '#000',
    }}>
      {/* Perspective floor grid */}
      <div style={{
        position:   'absolute',
        bottom:     0, left: 0, right: 0,
        height:     '55%',
        backgroundImage: `
          linear-gradient(${c1}55 1px, transparent 1px),
          linear-gradient(90deg, ${c1}55 1px, transparent 1px)
        `,
        backgroundSize:   '60px 60px',
        transform:        'perspective(300px) rotateX(55deg)',
        transformOrigin:  'bottom center',
        animation:        `grid-flicker ${(4 / spd).toFixed(1)}s ease-in-out infinite`,
      }} />
      {/* Horizon glow */}
      <div style={{
        position:   'absolute',
        top:        '45%',
        left:       0, right: 0,
        height:     '3px',
        background: `linear-gradient(90deg, transparent, ${c1}, ${c2}, ${c1}, transparent)`,
        boxShadow:  `0 0 20px ${c1}, 0 0 40px ${c2}`,
        animation:  `grid-pulse ${(2 / spd).toFixed(1)}s ease-in-out infinite`,
      }} />
      {/* Vertical scan line */}
      <div style={{
        position:   'absolute',
        top:        0,
        left:       '50%',
        width:      '2px',
        height:     '45%',
               background: `linear-gradient(180deg, transparent, ${c2}88, ${c2}, transparent)`,
        animation:  `grid-scan ${(3 / spd).toFixed(1)}s linear infinite`,
      }} />
      {/* Top sky gradient */}
      <div style={{
        position:   'absolute',
        top: 0, left: 0, right: 0,
        height:     '45%',
        background: `linear-gradient(180deg, #000 0%, ${c1}11 70%, transparent 100%)`,
      }} />
      {/* Floating neon text lines */}
      {[c1, c2, c3].map((color, i) => (
        <div key={i} style={{
          position:        'absolute',
          top:             `${10 + i * 10}%`,
          left:            0, right: 0,
          height:          '1px',
          background:      `linear-gradient(90deg, transparent 0%, ${color}44 ${20 + i * 15}%, ${color}88 50%, ${color}44 ${80 - i * 15}%, transparent 100%)`,
          animation:       `grid-flicker ${(2.5 + i * 0.7) / spd}s ease-in-out infinite`,
          animationDelay:  `${-i * 0.8}s`,
        }} />
      ))}
      {/* Corner decorations */}
      {[
        { top: '5%',  left: '5%',  borderTop: `2px solid ${c1}`, borderLeft:  `2px solid ${c1}` },
        { top: '5%',  right: '5%', borderTop: `2px solid ${c2}`, borderRight: `2px solid ${c2}` },
        { bottom: '48%', left: '5%',  borderBottom: `2px solid ${c1}`, borderLeft:  `2px solid ${c1}` },
        { bottom: '48%', right: '5%', borderBottom: `2px solid ${c2}`, borderRight: `2px solid ${c2}` },
      ].map((s, i) => (
        <div key={i} style={{
          position: 'absolute',
          width:    '30px', height: '30px',
          ...s,
          animation: `grid-pulse ${(1.5 + i * 0.3) / spd}s ease-in-out infinite`,
          animationDelay: `${-i * 0.4}s`,
        }} />
      ))}
    </div>
  );
}

// 15. DNA HELIX ────────────────────────────────────────────────────────────────
function DNAHelix({ config }: { config: AnimatedBackground }) {
  const c1  = config.color1 ?? '#22d3ee';
  const c2  = config.color2 ?? '#a78bfa';
  const c3  = config.color3 ?? '#34d399';
  const spd = config.speed  ?? 1;

  const STRANDS = 28; // number of node pairs

  const nodes = React.useMemo(() => {
    return Array.from({ length: STRANDS }, (_, i) => {
      const phase = (i / STRANDS) * Math.PI * 2;
      return {
        i,
        phase,
        yPct:  `${(i / (STRANDS - 1)) * 100}%`,
        dur:   (3 / spd).toFixed(1),
        delay: `-${((i / STRANDS) * (3 / spd)).toFixed(2)}s`,
        colorL: i % 3 === 0 ? c3 : c1,
        colorR: i % 3 === 0 ? c3 : c2,
        // Cross-rung only when nodes are near centre (cos ≈ 0)
        showRung: Math.abs(Math.cos(phase)) < 0.4,
      };
    });
  }, [c1, c2, c3, spd]);

  return (
    <div style={{
      position:   'absolute', inset: 0, overflow: 'hidden',
      background: 'linear-gradient(180deg, #020818 0%, #050f2e 50%, #020818 100%)',
      display:    'flex', justifyContent: 'center',
    }}>
      {/* Ambient glow behind helix */}
      <div style={{
        position:     'absolute',
        top: '10%',   left: '50%',
        transform:    'translateX(-50%)',
        width:        '200px', height: '80%',
        borderRadius: '50%',
        background:   `radial-gradient(ellipse, ${c1}0d 0%, ${c2}08 50%, transparent 100%)`,
        filter:       'blur(30px)',
      }} />

      {/* Helix column */}
      <div style={{ position: 'relative', width: '160px', height: '100%' }}>
        {nodes.map((n) => (
          <div key={n.i} style={{
            position: 'absolute',
            top:      n.yPct,
            left:     0, right: 0,
            height:   '2px',
            display:  'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            {/* Left node */}
            <div style={{
              width:           '12px', height: '12px',
              borderRadius:    '50%',
              background:      n.colorL,
              boxShadow:       `0 0 8px ${n.colorL}, 0 0 16px ${n.colorL}88`,
              animation:       `dna-node-left ${n.dur}s ease-in-out infinite`,
              animationDelay:  n.delay,
              flexShrink:      0,
            }} />

            {/* Cross-rung connector */}
            {n.showRung && (
              <div style={{
                flex:       1,
                height:     '2px',
                background: `linear-gradient(90deg, ${n.colorL}88, ${c3}cc, ${n.colorR}88)`,
                boxShadow:  `0 0 4px ${c3}88`,
                margin:     '0 2px',
              }} />
            )}
            {!n.showRung && <div style={{ flex: 1 }} />}

            {/* Right node */}
            <div style={{
              width:           '12px', height: '12px',
              borderRadius:    '50%',
              background:      n.colorR,
              boxShadow:       `0 0 8px ${n.colorR}, 0 0 16px ${n.colorR}88`,
              animation:       `dna-node-right ${n.dur}s ease-in-out infinite`,
              animationDelay:  n.delay,
              flexShrink:      0,
            }} />
          </div>
        ))}
      </div>

      {/* Scrolling duplicate for seamless loop feel */}
      <div style={{
        position:   'absolute', inset: 0,
        background: `linear-gradient(180deg,
          #020818 0%, transparent 10%,
          transparent 90%, #020818 100%)`,
        pointerEvents: 'none',
      }} />
    </div>
  );
}

// 16. CONFETTI ─────────────────────────────────────────────────────────────────
function Confetti({ config }: { config: AnimatedBackground }) {
  const c1  = config.color1 ?? '#f43f5e';
  const c2  = config.color2 ?? '#facc15';
  const c3  = config.color3 ?? '#22d3ee';
  const spd = config.speed  ?? 1;

  const pieces = React.useMemo(() => {
    const colors  = [c1, c2, c3, '#a78bfa', '#34d399', '#fb923c'];
    const shapes  = ['rect', 'circle', 'strip'] as const;
    return Array.from({ length: 70 }, (_, i) => ({
      x:       `${(i * 1.43) % 100}%`,
      size:    6 + (i % 5) * 3,
      color:   colors[i % colors.length],
      shape:   shapes[i % shapes.length],
      dur:     (5 + (i % 8) * 1.2) / spd,
      delay:   -(i % 12) * 0.7,
      opacity: 0.7 + (i % 4) * 0.075,
    }));
  }, [c1, c2, c3, spd]);

  return (
    <div style={{
      position:   'absolute', inset: 0, overflow: 'hidden',
      background: 'linear-gradient(135deg, #0f0c29 0%, #1a1a2e 50%, #16213e 100%)',
    }}>
      {pieces.map((p, i) => (
        <div key={i} style={{
          position:        'absolute',
          top:             '-20px',
          left:            p.x,
          width:           p.shape === 'strip' ? p.size * 0.4 : p.size,
          height:          p.shape === 'strip' ? p.size * 2.5  : p.size,
          borderRadius:    p.shape === 'circle' ? '50%' : '2px',
          background:      p.color,
          opacity:         p.opacity,
          animation:       [
            `confetti-fall ${p.dur.toFixed(1)}s ease-in infinite`,
            `confetti-sway ${(p.dur * 0.6).toFixed(1)}s ease-in-out infinite`,
          ].join(', '),
          animationDelay:  `${p.delay}s`,
        }} />
      ))}
    </div>
  );
}

// 17. PLASMA ───────────────────────────────────────────────────────────────────
function Plasma({ config }: { config: AnimatedBackground }) {
  const c1  = config.color1 ?? '#ff0080';
  const c2  = config.color2 ?? '#7928ca';
  const c3  = config.color3 ?? '#0070f3';
  const spd = config.speed  ?? 1;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use small internal resolution for performance, CSS scales it up
    const W = 120, H = 80;
    canvas.width  = W;
    canvas.height = H;

    // Parse hex to rgb
    const hexToRgb = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return { r, g, b };
    };
    const rgb1 = hexToRgb(c1.length === 7 ? c1 : '#ff0080');
    const rgb2 = hexToRgb(c2.length === 7 ? c2 : '#7928ca');
    const rgb3 = hexToRgb(c3.length === 7 ? c3 : '#0070f3');

    const imageData = ctx.createImageData(W, H);
    let t = 0;
    let raf: number;

    const draw = () => {
      t += 0.03 * spd;

      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          // Classic plasma formula
          const v1 = Math.sin(x * 0.15 + t);
          const v2 = Math.sin(y * 0.1  + t * 0.8);
          const v3 = Math.sin((x * 0.1 + y * 0.15) + t * 1.2);
          const v4 = Math.sin(Math.sqrt(
            (x - W / 2) * (x - W / 2) * 0.04 +
            (y - H / 2) * (y - H / 2) * 0.04,
          ) + t);

          const value = (v1 + v2 + v3 + v4) / 4; // -1 … 1
          const n     = (value + 1) / 2;           //  0 … 1

          // Blend between 3 colours using the plasma value
          let r, g, b;
          if (n < 0.5) {
            const f = n * 2;
            r = Math.round(rgb1.r * (1 - f) + rgb2.r * f);
            g = Math.round(rgb1.g * (1 - f) + rgb2.g * f);
            b = Math.round(rgb1.b * (1 - f) + rgb2.b * f);
          } else {
            const f = (n - 0.5) * 2;
            r = Math.round(rgb2.r * (1 - f) + rgb3.r * f);
            g = Math.round(rgb2.g * (1 - f) + rgb3.g * f);
            b = Math.round(rgb2.b * (1 - f) + rgb3.b * f);
          }

          const idx          = (y * W + x) * 4;
          imageData.data[idx]     = r;
          imageData.data[idx + 1] = g;
          imageData.data[idx + 2] = b;
          imageData.data[idx + 3] = 255;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [c1, c2, c3, spd]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:        'absolute', inset: 0,
        width:           '100%',     height: '100%',
        imageRendering:  'pixelated', // keep the blurry-smooth look
      }}
    />
  );
}

// 18. VORTEX ───────────────────────────────────────────────────────────────────
function Vortex({ config }: { config: AnimatedBackground }) {
  const c1  = config.color1 ?? '#6366f1';
  const c2  = config.color2 ?? '#ec4899';
  const c3  = config.color3 ?? '#06b6d4';
  const spd = config.speed  ?? 1;

  const rings = React.useMemo(() => [
    { size: '95%',  border: 3, color: c1, dur: 8,  ccw: false, delay: 0    },
    { size: '82%',  border: 2, color: c2, dur: 6,  ccw: true,  delay: -1   },
    { size: '68%',  border: 3, color: c3, dur: 5,  ccw: false, delay: -0.5 },
    { size: '54%',  border: 2, color: c1, dur: 4,  ccw: true,  delay: -2   },
    { size: '40%',  border: 3, color: c2, dur: 3,  ccw: false, delay: -1.5 },
    { size: '27%',  border: 2, color: c3, dur: 2.5,ccw: true,  delay: -0.8 },
    { size: '15%',  border: 3, color: c1, dur: 2,  ccw: false, delay: -0.3 },
  ], [c1, c2, c3]);

  // Spiral particles
  const particles = React.useMemo(() => {
    return Array.from({ length: 40 }, (_, i) => {
      const radius = 8 + (i % 8) * 6;
      return {
        radius,
        dur:   (3 + (i % 5)) / spd,
        delay: -(i * 0.4),
        color: i % 3 === 0 ? c1 : i % 3 === 1 ? c2 : c3,
        size:  i % 4 === 0 ? 4 : 2,
      };
    });
  }, [c1, c2, c3, spd]);

  return (
    <div style={{
      position:   'absolute', inset: 0, overflow: 'hidden',
      background: 'radial-gradient(ellipse at center, #0a0014 0%, #000 100%)',
      display:    'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Rings */}
      {rings.map((r, i) => (
        <div key={i} style={{
          position:        'absolute',
          top:             '50%', left: '50%',
          width:           r.size, height: r.size,
          borderRadius:    '50%',
          border:          `${r.border}px solid ${r.color}66`,
          boxShadow:       `0 0 15px ${r.color}44, inset 0 0 15px ${r.color}22`,
          animation:       `${r.ccw ? 'vortex-ring-ccw' : 'vortex-ring'} ${(r.dur / spd).toFixed(1)}s linear infinite`,
          animationDelay:  `${r.delay}s`,
        }} />
      ))}

      {/* Orbiting particles */}
      {particles.map((p, i) => (
        <div key={`vp-${i}`} style={{
          position:        'absolute',
          top:             '50%', left: '50%',
          width:           p.size, height: p.size,
          borderRadius:    '50%',
          background:      p.color,
          boxShadow:       `0 0 ${p.size * 3}px ${p.color}`,
          // Custom property for orbit radius
          ['--vr' as string]: `${p.radius}%`,
          animation:       `vortex-particle ${p.dur.toFixed(1)}s linear infinite`,
          animationDelay:  `${p.delay}s`,
        }} />
      ))}

      {/* Core */}
      <div style={{
        position:     'absolute',
        top: '50%', left: '50%',
        width:        '60px', height: '60px',
        borderRadius: '50%',
        background:   `radial-gradient(circle, #fff 0%, ${c1} 30%, ${c2}88 60%, transparent 100%)`,
        filter:       'blur(4px)',
        animation:    `vortex-core-pulse ${(1.5 / spd).toFixed(1)}s ease-in-out infinite`,
      }} />
    </div>
  );
}

// 19. GLITCH ───────────────────────────────────────────────────────────────────
function Glitch({ config }: { config: AnimatedBackground }) {
  const c1  = config.color1 ?? '#00ff9f';
  const c2  = config.color2 ?? '#ff003c';
  const c3  = config.color3 ?? '#0066ff';
  const spd = config.speed  ?? 1;

  const bars = React.useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      top:     `${i * 12 + 2}%`,
      height:  `${4 + (i % 3) * 3}%`,
      color:   i % 3 === 0 ? c1 : i % 3 === 1 ? c2 : c3,
      dur:     (3 + i * 0.4) / spd,
      delay:   -(i * 0.6),
    }));
  }, [c1, c2, c3, spd]);

  return (
    <div style={{
      position:   'absolute', inset: 0, overflow: 'hidden',
      background: '#000',
    }}>
      {/* Base gradient */}
      <div style={{
        position:   'absolute', inset: 0,
        background: `linear-gradient(135deg, #0a0a0a 0%, #111 40%, #0a0a0a 100%)`,
        animation:  `glitch-main ${(4 / spd).toFixed(1)}s ease-in-out infinite`,
      }} />

      {/* Grid overlay */}
      <div style={{
        position:        'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(${c1}08 1px, transparent 1px),
          linear-gradient(90deg, ${c1}08 1px, transparent 1px)
        `,
        backgroundSize:  '40px 40px',
        animation:       `glitch-main ${(4 / spd).toFixed(1)}s ease-in-out infinite`,
      }} />

      {/* Glitch colour slices */}
      <div style={{
        position:   'absolute', inset: 0,
        background: `linear-gradient(135deg, ${c3}22 0%, transparent 50%, ${c2}11 100%)`,
        animation:  `glitch-slice-1 ${(4 / spd).toFixed(1)}s steps(1) infinite`,
      }} />
      <div style={{
        position:   'absolute', inset: 0,
        background: `linear-gradient(45deg, ${c2}22 0%, transparent 60%)`,
        animation:  `glitch-slice-2 ${(4 / spd).toFixed(1)}s steps(1) infinite`,
      }} />

      {/* RGB channel separation layers */}
      <div style={{
        position:        'absolute', inset: 0,
        backgroundImage: `
          repeating-linear-gradient(0deg,
            ${c2}18 0px, ${c2}18 1px,
            transparent 1px, transparent 4px)
        `,
        animation:       `glitch-rgb-r ${(4 / spd).toFixed(1)}s steps(1) infinite`,
      }} />
      <div style={{
        position:        'absolute', inset: 0,
        backgroundImage: `
          repeating-linear-gradient(0deg,
            ${c3}18 0px, ${c3}18 1px,
            transparent 1px, transparent 4px)
        `,
        animation:       `glitch-rgb-b ${(4 / spd).toFixed(1)}s steps(1) infinite`,
      }} />

      {/* Horizontal glitch bars */}
      {bars.map((b, i) => (
        <div key={i} style={{
          position:        'absolute',
          top:             b.top,
          left:            0, right: 0,
          height:          b.height,
          background:      `linear-gradient(90deg,
            transparent 0%,
            ${b.color}22 20%,
            ${b.color}44 50%,
            ${b.color}22 80%,
            transparent 100%)`,
          borderTop:       `1px solid ${b.color}55`,
          borderBottom:    `1px solid ${b.color}33`,
          animation:       `glitch-slice-1 ${b.dur.toFixed(1)}s steps(1) infinite`,
          animationDelay:  `${b.delay}s`,
        }} />
      ))}

      {/* Scan line */}
      <div style={{
        position:   'absolute',
        top:        0, left: 0, right: 0,
        height:     '3px',
        background: `linear-gradient(90deg, transparent, ${c1}cc, transparent)`,
        boxShadow:  `0 0 10px ${c1}`,
        animation:  `glitch-scanline ${(6 / spd).toFixed(1)}s linear infinite`,
      }} />

      {/* Corner text decoration */}
      <div style={{
        position:   'absolute',
        top:        '8px', left: '12px',
        color:      `${c1}88`,
        fontFamily: 'monospace',
        fontSize:   '10px',
        letterSpacing: '2px',
        animation:  `glitch-main ${(4 / spd).toFixed(1)}s ease-in-out infinite`,
      }}>
        SYS_ERR::0x{Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase().padStart(4, '0')}
      </div>
    </div>
  );
}

// 20. UNDERWATER ───────────────────────────────────────────────────────────────
function Underwater({ config }: { config: AnimatedBackground }) {
  const c1  = config.color1 ?? '#0ea5e9';
  const c2  = config.color2 ?? '#06b6d4';
  const c3  = config.color3 ?? '#34d399';
  const spd = config.speed  ?? 1;

  const bubbles = React.useMemo(() => {
    return Array.from({ length: 25 }, (_, i) => ({
      size:   4 + (i * 7) % 20,
      x:      `${(i * 4.1) % 95}%`,
      dur:    (6 + (i % 6) * 2) / spd,
      delay:  -(i % 9) * 1.3,
      color:  i % 3 === 0 ? c3 : i % 2 === 0 ? c2 : c1,
    }));
  }, [c1, c2, c3, spd]);

  const weeds = React.useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      x:      `${(i * 8.5) % 96}%`,
      height: 60 + (i * 23) % 100,
      color:  i % 3 === 0 ? c3 : i % 2 === 0 ? c2 : c1,
      dur:    (2 + (i % 4) * 0.5) / spd,
      delay:  -(i % 5) * 0.6,
      width:  6 + (i % 3) * 4,
    }));
  }, [c1, c2, c3, spd]);

  const caustics = React.useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      x:     `${(i * 13 + 5) % 90}%`,
      y:     `${(i * 9  + 5) % 60}%`,
      size:  60 + (i % 4) * 40,
      dur:   (4 + (i % 3) * 2) / spd,
      delay: -(i % 6) * 1.1,
      color: i % 2 === 0 ? c1 : c2,
    }));
  }, [c1, c2, spd]);

  const lightRays = React.useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => ({
      x:     `${10 + i * 16}%`,
      dur:   (4 + (i % 3)) / spd,
      delay: -(i * 0.8),
      width: 30 + (i % 3) * 20,
    }));
  }, [spd]);

  return (
    <div style={{
      position:   'absolute', inset: 0, overflow: 'hidden',
      background: `linear-gradient(180deg,
        ${c1}55 0%,
        ${c2}44 25%,
        #003355 60%,
        #001a2e 100%)`,
    }}>
      {/* Light rays from surface */}
      {lightRays.map((r, i) => (
        <div key={`ray-${i}`} style={{
          position:        'absolute',
          top:             0,
          left:            r.x,
          width:           `${r.width}px`,
          height:          '70%',
          background:      `linear-gradient(180deg, ${c1}22 0%, transparent 100%)`,
          clipPath:        'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
          animation:       `underwater-light-ray ${r.dur.toFixed(1)}s ease-in-out infinite`,
          animationDelay:  `${r.delay}s`,
          transformOrigin: 'top center',
        }} />
      ))}

      {/* Caustic light patterns */}
      {caustics.map((c, i) => (
        <div key={`caust-${i}`} style={{
          position:        'absolute',
          left:            c.x,
          top:             c.y,
          width:           c.size,
          height:          c.size,
          borderRadius:    '50%',
          border:          `2px solid ${c.color}33`,
          background:      `radial-gradient(circle, ${c.color}18 0%, transparent 70%)`,
          animation:       `underwater-caustic ${c.dur.toFixed(1)}s ease-in-out infinite`,
          animationDelay:  `${c.delay}s`,
        }} />
      ))}

      {/* Rising bubbles */}
      {bubbles.map((b, i) => (
        <div key={`ub-${i}`} style={{
          position:        'absolute',
          bottom:          '5%',
          left:            b.x,
          width:           b.size,
          height:          b.size,
          borderRadius:    '50%',
          border:          `1px solid ${b.color}88`,
          background:      `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.4), ${b.color}22)`,
          animation:       `underwater-bubble ${b.dur.toFixed(1)}s ease-in infinite`,
          animationDelay:  `${b.delay}s`,
        }} />
      ))}

      {/* Sea floor */}
      <div style={{
        position:   'absolute',
        bottom:     0, left: 0, right: 0,
        height:     '18%',
        background: `linear-gradient(180deg, transparent 0%, #001020 60%, #000810 100%)`,
      }} />

      {/* Sea weeds */}
      {weeds.map((w, i) => (
        <div key={`weed-${i}`} style={{
          position:        'absolute',
          bottom:          '15%',
          left:            w.x,
          width:           w.width,
          height:          w.height,
          borderRadius:    '40% 60% 60% 40% / 60% 40% 60% 40%',
          background:      `linear-gradient(180deg, ${w.color}cc 0%, ${w.color}66 100%)`,
          transformOrigin: 'bottom center',
          animation:       `underwater-weed ${w.dur.toFixed(1)}s ease-in-out infinite`,
          animationDelay:  `${w.delay}s`,
        }} />
      ))}

      {/* Floating particles / plankton */}
      {Array.from({ length: 30 }, (_, i) => (
        <div key={`plank-${i}`} style={{
          position:        'absolute',
          left:            `${(i * 3.3) % 100}%`,
          top:             `${(i * 7.1) % 80}%`,
          width:           2,
          height:          2,
          borderRadius:    '50%',
          background:      i % 2 === 0 ? c3 : c1,
          opacity:         0.4,
          animation:       `underwater-float ${((3 + i % 4) / spd).toFixed(1)}s ease-in-out infinite`,
          animationDelay:  `${-(i % 6) * 0.5}s`,
        }} />
      ))}

      {/* Water surface shimmer at top */}
      <div style={{
        position:   'absolute',
        top: 0, left: 0, right: 0,
        height:     '6px',
        background: `linear-gradient(90deg,
          transparent, ${c1}88, ${c2}cc,
          ${c1}88, transparent)`,
        filter:     'blur(2px)',
        animation:  `wave-move ${(3 / spd).toFixed(1)}s linear infinite`,
      }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRY (original 10 + new 10)
// ─────────────────────────────────────────────────────────────────────────────
const RENDERERS: Record<AnimatedBgType, React.FC<{ config: AnimatedBackground }>> = {
  aurora:           Aurora,
  waves:            Waves,
  'neon-pulse':     NeonPulse,
  geometric:        Geometric,
  starfield:        Starfield,
  bubbles:          Bubbles,
  matrix:           Matrix,
  fire:             Fire,
  snowfall:         Snowfall,
  particles:        Particles,
  'lava-lamp':      LavaLamp,
  lightning:        Lightning,
  galaxy:           Galaxy,
  'cyberpunk-grid': CyberpunkGrid,
  'dna-helix':      DNAHelix,
  confetti:         Confetti,
  plasma:           Plasma,
  vortex:           Vortex,
  glitch:           Glitch,
  underwater:       Underwater,
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────
const AnimatedBackgroundComponent: React.FC<AnimatedBackgroundProps> = ({
  config,
  style,
}) => {
  useEffect(() => { injectKeyframes(); }, []);

  const Renderer = RENDERERS[config.type];
  if (!Renderer) return null;

  return (
    <div style={{
      position:  'absolute',
      inset:     0,
      overflow:  'hidden',
      opacity:   config.opacity ?? 1,
      ...style,
    }}>
      <Renderer config={config} />
    </div>
  );
};

export default React.memo(AnimatedBackgroundComponent);

// ── Metadata for the UI picker ────────────────────────────────────────────────
export const ANIMATED_BG_OPTIONS: Array<{
  type:        AnimatedBgType;
  label:       string;
  emoji:       string;
  description: string;
  defaults:    Partial<AnimatedBackground>;
}> = [
  // ── Original 10 ──────────────────────────────────────────────────────────
  {
    type: 'aurora',       label: 'Aurora',
    emoji: '🌌',          description: 'Northern lights colour blobs',
    defaults: { color1: '#7c3aed', color2: '#2563eb', color3: '#06b6d4', speed: 1 },
  },
  {
    type: 'waves',        label: 'Waves',
    emoji: '🌊',          description: 'Layered flowing waves',
    defaults: { color1: '#1e40af', color2: '#7c3aed', color3: '#0891b2', speed: 1 },
  },
  {
    type: 'neon-pulse',   label: 'Neon Pulse',
    emoji: '💜',          description: 'Pulsing neon ring glow',
    defaults: { color1: '#f0abfc', color2: '#818cf8', color3: '#34d399', speed: 1 },
  },
  {
    type: 'geometric',    label: 'Geometric',
    emoji: '🔷',          description: 'Rotating geometric shapes',
    defaults: { color1: '#6366f1', color2: '#8b5cf6', color3: '#ec4899', speed: 1 },
  },
  {
    type: 'starfield',    label: 'Starfield',
    emoji: '✨',          description: 'Twinkling stars in deep space',
    defaults: { color1: '#ffffff', color2: '#93c5fd', speed: 1 },
  },
  {
    type: 'bubbles',      label: 'Bubbles',
    emoji: '🫧',          description: 'Rising transparent bubbles',
    defaults: { color1: '#3b82f6', color2: '#8b5cf6', color3: '#06b6d4', speed: 1 },
  },
  {
    type: 'matrix',       label: 'Matrix',
    emoji: '💻',          description: 'Falling digital rain',
    defaults: { color1: '#00ff41', speed: 1 },
  },
  {
    type: 'fire',         label: 'Fire',
    emoji: '🔥',          description: 'Animated flame effect',
    defaults: { color1: '#ef4444', color2: '#f97316', color3: '#fbbf24', speed: 1 },
  },
  {
    type: 'snowfall',     label: 'Snowfall',
    emoji: '❄️',          description: 'Gentle falling snowflakes',
    defaults: { color1: '#ffffff', color2: '#bfdbfe', speed: 0.7 },
  },
  {
    type: 'particles',    label: 'Particles',
    emoji: '🔵',          description: 'Connected floating particles',
    defaults: { color1: '#6366f1', color2: '#8b5cf6', color3: '#06b6d4', speed: 1 },
  },
  // ── New 10 ───────────────────────────────────────────────────────────────
  {
    type: 'lava-lamp',    label: 'Lava Lamp',
    emoji: '🫠',          description: 'Morphing blobs floating in oil',
    defaults: { color1: '#ff6b6b', color2: '#ffd93d', color3: '#ff8e53', speed: 1 },
  },
  {
    type: 'lightning',    label: 'Lightning',
    emoji: '⚡',          description: 'Branching electric lightning bolts',
    defaults: { color1: '#a78bfa', color2: '#e879f9', color3: '#38bdf8', speed: 1 },
  },
  {
    type: 'galaxy',       label: 'Galaxy',
    emoji: '🌀',          description: 'Rotating spiral galaxy with star arms',
    defaults: { color1: '#818cf8', color2: '#f472b6', color3: '#fde68a', speed: 0.5 },
  },
  {
    type: 'cyberpunk-grid', label: 'Cyberpunk Grid',
    emoji: '🕹️',           description: 'Neon perspective grid with scan lines',
    defaults: { color1: '#00ffff', color2: '#ff00ff', color3: '#ffff00', speed: 1 },
  },
  {
    type: 'dna-helix',    label: 'DNA Helix',
    emoji: '🧬',          description: 'Animated double-helix strand',
    defaults: { color1: '#22d3ee', color2: '#a78bfa', color3: '#34d399', speed: 1 },
  },
  {
    type: 'confetti',     label: 'Confetti',
    emoji: '🎊',          description: 'Colourful falling confetti pieces',
    defaults: { color1: '#f43f5e', color2: '#facc15', color3: '#22d3ee', speed: 1 },
  },
  {
    type: 'plasma',       label: 'Plasma',
    emoji: '🌈',          description: 'Smooth flowing plasma colour field',
    defaults: { color1: '#ff0080', color2: '#7928ca', color3: '#0070f3', speed: 1 },
  },
  {
    type: 'vortex',       label: 'Vortex',
    emoji: '🌪️',          description: 'Concentric spinning rings pulling inward',
    defaults: { color1: '#6366f1', color2: '#ec4899', color3: '#06b6d4', speed: 1 },
  },
  {
    type: 'glitch',       label: 'Glitch',
    emoji: '📺',          description: 'Digital corruption and RGB glitch artefacts',
    defaults: { color1: '#00ff9f', color2: '#ff003c', color3: '#0066ff', speed: 1 },
  },
  {
    type: 'underwater',   label: 'Underwater',
    emoji: '🌊',          description: 'Deep sea with caustics, rays and sea weeds',
    defaults: { color1: '#0ea5e9', color2: '#06b6d4', color3: '#34d399', speed: 0.8 },
  },
];