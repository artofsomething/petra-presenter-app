// src/renderer/components/Editor/AnimatedBgPicker.tsx
import React, { useState } from 'react';
import { ANIMATED_BG_OPTIONS } from './AnimatedBackground';
import AnimatedBackgroundComponent from './AnimatedBackground';
import type { AnimatedBackground, AnimatedBgType } from '../../../server/types';
import usePresentationStore from '../../store/usePresentation';
import  AuroraControls from './AnimatedBackgrounds/Aurora/AuroraControls';
import WavesControls from './AnimatedBackgrounds/Waves/WavesControls';
import NeonPulseControls from './AnimatedBackgrounds/NeonPulse/NeonPulseControls';
import GeometricControls from './AnimatedBackgrounds/Geometric/GeometricControls';
import BubblesControls from './AnimatedBackgrounds/Bubbles/BubblesControls';
import LavaLampControls from './AnimatedBackgrounds/LavaLamp/LavaLampControls';
import PlasmaControls from './AnimatedBackgrounds/Plasma/PlasmaControls';
import ParticlesControls from './AnimatedBackgrounds/Particles/ParticlesControls';
import VortexControls from './AnimatedBackgrounds/Vortex/VortexControls';
import FireControls from './AnimatedBackgrounds/Fire/FireControls';
import GenericBgControls from './AnimatedBackgrounds/GenericBgControls';
import BokehControls from './AnimatedBackgrounds/Bokeh/BokehControls';

// ── main picker ───────────────────────────────────────────────────────────────
const AnimatedBgPicker: React.FC = () => {
  const { presentation, currentSlideIndex, updateSlideBackground } = usePresentationStore();
  const slide = presentation?.slides[currentSlideIndex];

  const current = (slide as any)?.animatedBackground as AnimatedBackground | undefined;
  const [preview, setPreview] = useState<AnimatedBgType | null>(null);

  // ── apply a new type ───────────────────────────────────────────────────────
  const apply = (type: AnimatedBgType) => {
    const opt = ANIMATED_BG_OPTIONS.find(o => o.type === type)!;
    updateSlideBackground({
      animatedBackground: {
        type,
        ...opt.defaults,
      } as AnimatedBackground,
      backgroundColor:    undefined,
      backgroundGradient: undefined,
      backgroundImage:    undefined,
    });
  };

  // ── remove animated bg ─────────────────────────────────────────────────────
  const remove = () => {
    updateSlideBackground({ animatedBackground: undefined });
  };

  // ── patch current animated bg ──────────────────────────────────────────────
  const patch = (updated: Partial<AnimatedBackground>) => {
    if (!current) return;
    updateSlideBackground({
      animatedBackground: { ...current, ...updated },
    });
  };

  return (
    <div style={{ padding: 12 }}>

      {/* ── Header ── */}
      <div style={{
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'center',
        marginBottom:   10,
      }}>
        <span style={{ fontSize: 12, fontWeight: 'bold', color: '#e2e8f0' }}>
          🎨 Animated Background
        </span>
        {current && (
          <button
            onClick={remove}
            style={{
              fontSize:     10,
              padding:      '2px 8px',
              background:   '#7f1d1d',
              color:        '#fca5a5',
              border:       'none',
              borderRadius: 4,
              cursor:       'pointer',
            }}
          >
            ✕ Remove
          </button>
        )}
      </div>

      {/* ── Type grid ── */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: '1fr 1fr',
        gap:                 6,
      }}>
        {ANIMATED_BG_OPTIONS.map(opt => {
          const isActive = current?.type === opt.type;

          return (
            <div
              key={opt.type}
              onClick={() => apply(opt.type)}
              onMouseEnter={() => setPreview(opt.type)}
              onMouseLeave={() => setPreview(null)}
              style={{
                position:     'relative',
                height:       64,
                borderRadius: 8,
                cursor:       'pointer',
                overflow:     'hidden',
                border:       isActive
                  ? '2px solid #3b82f6'
                  : '2px solid transparent',
                outline:      preview === opt.type && !isActive
                  ? '1px solid #475569'
                  : undefined,
              }}
            >
              {/* live mini preview */}
              <div style={{ position: 'absolute', inset: 0 }}>
                <AnimatedBackgroundComponent
                  config={{ type: opt.type, ...opt.defaults } as AnimatedBackground}
                />
              </div>

              {/* label overlay */}
              <div style={{
                position:       'absolute',
                inset:          0,
                display:        'flex',
                flexDirection:  'column',
                alignItems:     'center',
                justifyContent: 'center',
                background:     'rgba(0,0,0,0.45)',
                fontSize:       11,
                color:          '#fff',
                fontWeight:     isActive ? 'bold' : 'normal',
                gap:            2,
              }}>
                <span style={{ fontSize: 16 }}>{opt.emoji}</span>
                <span>{opt.label}</span>
              </div>

              {/* active checkmark */}
              {isActive && (
                <div style={{
                  position:       'absolute',
                  top:            4,
                  right:          4,
                  background:     '#3b82f6',
                  borderRadius:   '50%',
                  width:          14,
                  height:         14,
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  fontSize:       9,
                  color:          '#fff',
                }}>✓</div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Active animation controls ── */}
      {current && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>

          {/* Speed */}
          <label style={{ fontSize: 11, color: '#94a3b8' }}>
            Speed: {current.speed ?? 1}×
            <input
              type="range" min="0.2" max="3" step="0.1"
              value={current.speed ?? 1}
              onChange={(e) => patch({ speed: parseFloat(e.target.value) })}
              style={{ width: '100%', marginTop: 2 }}
            />
          </label>

          {/* Opacity */}
          <label style={{ fontSize: 11, color: '#94a3b8' }}>
            Opacity: {Math.round((current.opacity ?? 1) * 100)}%
            <input
              type="range" min="0.1" max="1" step="0.05"
              value={current.opacity ?? 1}
              onChange={(e) => patch({ opacity: parseFloat(e.target.value) })}
              style={{ width: '100%', marginTop: 2 }}
            />
          </label>

          {/* ✅ Aurora-specific color controls */}
          {current.type === 'aurora' && (
            <AuroraControls
              config={current}
              onChange={patch}
            />
          )}
          {current.type ==='waves' &&(
            <WavesControls
              current ={current}
              onChange={patch}/>
          )}
          {current.type ==='neon-pulse' &&(
            <NeonPulseControls
              config ={current}
              onChange={patch}/>
          )}

          {current.type ==='geometric' &&(
            <GeometricControls
              current ={current}
              onChange={patch}/>
          )}

          {current.type ==='bubbles' &&(
            <BubblesControls
            current={current}
            onChange={patch}/>
          )}
          {current.type ==='lava-lamp' &&(
            <LavaLampControls
            current={current}
            onChange={patch}/>
          )}
          {current.type ==='plasma' &&(
            <PlasmaControls
            current={current}
            onChange={patch}/>
          )}
          {current.type ==='particles' &&(
            <ParticlesControls
            current={current}
            onChange={patch}/>
          )}
          {current.type ==='vortex' &&(
            <VortexControls
            current={current}
            onChange={patch}/>
          )}
          {current.type ==='fire' &&(
            <FireControls
            current={current}
            onChange={patch}/>
          )}
          {current.type === 'northern-lights' && (
          <GenericBgControls
            current={current}
            onChange={patch}
            labels={['Curtain 1', 'Curtain 2', 'Curtain 3']}
            defaults={{ color1: '#00ff87', color2: '#60efff', color3: '#9b5de5', backgroundColor: '#000511' }}
          />
        )}
        {current.type === 'meteor-shower' && (
          <GenericBgControls
            current={current}
            onChange={patch}
            labels={['Meteor 1', 'Meteor 2', 'Meteor 3']}
            defaults={{ color1: '#ffffff', color2: '#93c5fd', color3: '#fde68a', backgroundColor: '#020817' }}
          />
        )}
        {current.type === 'sand-storm' && (
          <GenericBgControls
            current={current}
            onChange={patch}
            labels={['Sand 1', 'Sand 2', 'Sand 3']}
            defaults={{ color1: '#d97706', color2: '#92400e', color3: '#fbbf24', backgroundColor: '#1a0f00' }}
          />
        )}
        {current.type === 'neon-rain' && (
          <GenericBgControls
            current={current}
            onChange={patch}
            labels={['Neon 1', 'Neon 2', 'Neon 3']}
            defaults={{ color1: '#ff00ff', color2: '#00ffff', color3: '#ff3366', backgroundColor: '#020012' }}
          />
        )}
        {current.type === 'bokeh' && (
          <BokehControls current={current} onChange={patch} />
        )}
        </div>
      )}
    </div>
  );
};

export default AnimatedBgPicker;