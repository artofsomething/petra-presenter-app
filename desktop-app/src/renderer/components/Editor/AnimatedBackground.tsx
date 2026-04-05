// src/renderer/components/Editor/AnimatedBackground.tsx
import React, { useEffect, useRef } from 'react';
import type { AnimatedBackground, AnimatedBgType } from '../../../server/types';
import Aurora from './AnimatedBackgrounds/Aurora/Aurora';
import Waves from './AnimatedBackgrounds/Waves/Waves';
import NeonPulse from './AnimatedBackgrounds/NeonPulse/NeonPulse';
import Geometric from './AnimatedBackgrounds/Geometric/Geometric';
import Bubbles from './AnimatedBackgrounds/Bubbles/Bubbles';
import LavaLamp from './AnimatedBackgrounds/LavaLamp/LavaLamp';
import Plasma from './AnimatedBackgrounds/Plasma/Plasma';
import Particles from './AnimatedBackgrounds/Particles/Particles';
import Vortex from './AnimatedBackgrounds/Vortex/Vortex';
import Starfield from './AnimatedBackgrounds/Starfield/Starfield';
import Matrix from './AnimatedBackgrounds/Matrix/Matrix';
import Fire from './AnimatedBackgrounds/Fire/Fire';
import CyberpunkGrid from './AnimatedBackgrounds/Cyberpunk/Cyberpunk';
import Galaxy from './AnimatedBackgrounds/Galaxy/Galaxy';
import DNAHelix from './AnimatedBackgrounds/DNAHelix/DNAHelix';
import Glitch from './AnimatedBackgrounds/Glitch/Glitch';
import Lightning from './AnimatedBackgrounds/Lightning/Lightning';
import Confetti from './AnimatedBackgrounds/Confetti/Confetti';
import Underwater from './AnimatedBackgrounds/Underwater/Underwater';
import Snowfall from './AnimatedBackgrounds/Snowfall/Snowfall';
import MeteorShower from './AnimatedBackgrounds/MeteorShower/MeteorShower';
import NorthernLights from './AnimatedBackgrounds/NorthenLights/NorthenLights';
import SandStorm from './AnimatedBackgrounds/SandStorm/SandStorm';
import NeonRain from './AnimatedBackgrounds/NeonRain/NeonRain';
import Bokeh from './AnimatedBackgrounds/Bokeh/Bokeh';
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
      0%   { transform: translateX(0);    }
      50%  { transform: translateX(-15%); }
      100% { transform: translateX(-30%); }
    }

    @keyframes wave-move-2 {
      0%   { transform: translateX(0);    }
      50%  { transform: translateX(15%);  }
      100% { transform: translateX(30%);  }
    }

    /* ✅ Add a gentle bob on top of the horizontal move */
    @keyframes wave-bob {
      0%,  100% { transform: translateY(0);   }
      50%        { transform: translateY(-8%); }
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

    /* ─── Bubbles ────────────────────────────────────────────────── */

    @keyframes bubble-rise {
      0% {
        transform:  translateY(0)      translateX(0)    scale(0.8);
        opacity:    0;
      }
      10% {
        opacity:    0.8;               /* ✅ quick fade in */
      }
      /* gentle left drift */
      30% {
        transform:  translateY(-30vh)  translateX(-15px) scale(1);
      }
      /* drift back right */
      60% {
        transform:  translateY(-60vh)  translateX(15px)  scale(1.05);
        opacity:    0.6;
      }
      /* drift left again */
      85% {
        transform:  translateY(-85vh)  translateX(-10px) scale(1.1);
        opacity:    0.3;
      }
      100% {
        transform:  translateY(-105vh) translateX(0)     scale(1.15);
        opacity:    0;                 /* ✅ fade out at top */
      }
    }

    /* ✅ wobble — makes each bubble slightly deform like a real bubble */
    @keyframes bubble-wobble {
      0%,  100% { border-radius: 50%; }
      25%        { border-radius: 48% 52% 51% 49% / 51% 49% 52% 48%; }
      50%        { border-radius: 52% 48% 49% 51% / 49% 51% 48% 52%; }
      75%        { border-radius: 49% 51% 52% 48% / 52% 48% 51% 49%; }
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
      /* ── Northern Lights ─────────────────────────────────────────── */
    @keyframes nl-curtain {
      0%   { transform: skewX(var(--skew, -8deg)) scaleX(1)    translateY(0%);   opacity: 0.6; }
      25%  { transform: skewX(calc(var(--skew, -8deg) * -0.5)) scaleX(1.1) translateY(-5%);  opacity: 1;   }
      50%  { transform: skewX(calc(var(--skew, -8deg) * 1.2))  scaleX(0.9) translateY(3%);   opacity: 0.7; }
      75%  { transform: skewX(calc(var(--skew, -8deg) * -0.8)) scaleX(1.05) translateY(-2%); opacity: 0.9; }
      100% { transform: skewX(var(--skew, -8deg)) scaleX(1)    translateY(0%);   opacity: 0.6; }
    }
    @keyframes nl-star-twinkle {
      0%, 100% { opacity: 0.2; transform: scale(1);   }
      50%      { opacity: 0.9; transform: scale(1.3); }
    }

    /* ── Meteor Shower ───────────────────────────────────────────── */
    @keyframes meteor-streak {
      0%   { transform: rotate(-35deg) translateX(0)     scaleX(0); opacity: 0;   }
      5%   { transform: rotate(-35deg) translateX(0)     scaleX(1); opacity: 1;   }
      70%  { opacity: 0.8; }
      100% { transform: rotate(-35deg) translateX(-130vw) scaleX(1); opacity: 0; }
    }
    @keyframes meteor-star-twinkle {
      0%, 100% { opacity: 0.2; }
      50%      { opacity: 0.8; }
    }

    /* ── Sand Storm ──────────────────────────────────────────────── */
    @keyframes sandstorm-particle {
      0%   { transform: translateX(0)     translateY(0px);   }
      50%  { transform: translateX(60vw)  translateY(-8px);  }
      100% { transform: translateX(110vw) translateY(4px);   }
    }
    @keyframes sandstorm-streak {
      0%   { transform: translateX(0);    opacity: 0;   }
      10%  { opacity: 1; }
      90%  { opacity: 1; }
      100% { transform: translateX(120vw); opacity: 0;  }
    }
    @keyframes sandstorm-cloud {
      0%   { transform: translateX(-10%) scaleX(1);   opacity: 0.4; }
      50%  { transform: translateX(5%)   scaleX(1.1); opacity: 0.7; }
      100% { transform: translateX(-10%) scaleX(1);   opacity: 0.4; }
    }

    /* ── Neon Rain ───────────────────────────────────────────────── */
    @keyframes neon-rain-drop {
      0%   { transform: translateY(-10vh);  opacity: 0;   }
      5%   { opacity: 1; }
      95%  { opacity: 1; }
      100% { transform: translateY(110vh);  opacity: 0;   }
    }
    @keyframes neon-rain-ripple {
      0%   { width: 0px;  height: 0px;  opacity: 0.8; }
      100% { width: 40px; height: 10px; opacity: 0;   transform: translate(-20px, -5px); }
    }
    @keyframes neon-rain-glow {
      0%, 100% { opacity: 0.4; transform: scale(1);    }
      50%      { opacity: 0.8; transform: scale(1.1);  }
    }
      /* ── Bokeh ───────────────────────────────────────────────────── */

    /* vertical float — each circle bobs up and down independently */
    @keyframes bokeh-float {
      0%   { transform: translateY(0px)   scale(1);    }
      25%  { transform: translateY(-18px) scale(1.03); }
      50%  { transform: translateY(-8px)  scale(0.97); }
      75%  { transform: translateY(-22px) scale(1.02); }
      100% { transform: translateY(0px)   scale(1);    }
    }

    /* horizontal drift — slow lazy side-to-side */
    @keyframes bokeh-drift {
      0%   { margin-left: 0px;   }
      33%  { margin-left: 20px;  }
      66%  { margin-left: -14px; }
      100% { margin-left: 0px;   }
    }

    /* background depth blobs pulse slowly */
    @keyframes bokeh-blob {
      0%   { transform: scale(1)    translate(0px,   0px);   opacity: 1; }
      33%  { transform: scale(1.15) translate(20px, -15px);  opacity: 0.7; }
      66%  { transform: scale(0.9)  translate(-10px, 20px);  opacity: 0.9; }
      100% { transform: scale(1)    translate(0px,   0px);   opacity: 1; }
    }
  `;
  document.head.appendChild(style);
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
  "northern-lights":NorthernLights,
  'meteor-shower':  MeteorShower,
  'sand-storm':     SandStorm,
  'neon-rain':      NeonRain,
  bokeh:            Bokeh
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
  {
    type: 'northern-lights', label: 'Northern Lights',
    emoji: '🌠',             description: 'Shimmering aurora curtains with stars',
    defaults: { color1: '#00ff87', color2: '#60efff', color3: '#9b5de5', speed: 1 },
  },
  {
    type: 'meteor-shower',   label: 'Meteor Shower',
    emoji: '☄️',             description: 'Streaking meteors across a starfield',
    defaults: { color1: '#ffffff', color2: '#93c5fd', color3: '#fde68a', speed: 1 },
  },
  {
    type: 'sand-storm',      label: 'Sand Storm',
    emoji: '🌪️',             description: 'Swirling desert sand particles',
    defaults: { color1: '#d97706', color2: '#92400e', color3: '#fbbf24', speed: 1 },
  },
  {
    type: 'neon-rain',       label: 'Neon Rain',
    emoji: '🌧️',             description: 'Cyberpunk neon rain with puddle reflections',
    defaults: { color1: '#ff00ff', color2: '#00ffff', color3: '#ff3366', speed: 1 },
  },
  {
    type:        'bokeh',
    label:       'Bokeh',
    emoji:       '💡',
    description: 'Soft out-of-focus light circles like a camera bokeh effect',
    defaults: {
      color1:           '#ff9ff3',
      color2:           '#ffeaa7',
      color3:           '#74b9ff',
      backgroundColor:  '#0a0a0f',
      backgroundColor2: '#0f0a1a',
      speed:             1,
    },
  },
];