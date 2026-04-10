// src/renderer/components/Editor/AnimatedBgPicker.tsx

import React, { useState, useRef, useCallback } from 'react';
import { ANIMATED_BG_OPTIONS } from './AnimatedBackground';
import AnimatedBackgroundComponent from './AnimatedBackground';
import type { AnimatedBackground, AnimatedBgType } from '../../../server/types';
import usePresentationStore from '../../store/usePresentation';
import DropdownPortal from '../Shared/DropdownPortal';
import AuroraControls from './AnimatedBackgrounds/Aurora/AuroraControls';
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

// ── Single option row ─────────────────────────────────────────────────────────
const OptionRow: React.FC<{
  label:    string;
  emoji:    string;
  type:     AnimatedBgType;
  defaults: Record<string, any>;
  isActive: boolean;
  onClick:  () => void;
}> = ({ label, emoji, type, defaults, isActive, onClick }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      // ✅ Use onMouseDown instead of onClick to fire BEFORE portal's mousedown listener
      onMouseDown={(e) => {
        e.stopPropagation(); // ✅ prevent portal close handler from firing
        onClick();
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:      'flex',
        alignItems:   'center',
        gap:          10,
        padding:      '7px 12px',
        cursor:       'pointer',
        background:   isActive
          ? '#1a2a6e'
          : hovered
          ? '#1e2330'
          : 'transparent',
        transition:   'background 0.1s',
        borderBottom: '1px solid #1a1f2e',
        userSelect:   'none',
      }}
    >
      {/* Thumbnail */}
      <div style={{
        width:    44,
        height:   28,
        borderRadius: 5,
        overflow: 'hidden',
        flexShrink: 0,
        position: 'relative',
        border:   isActive ? '1px solid #3d5afe' : '1px solid #2e3447',
        // ✅ Pointer events none on thumbnail so clicks go to parent
        pointerEvents: 'none',
      }}>
        <AnimatedBackgroundComponent
          config={{ type, ...defaults } as AnimatedBackground}
        />
      </div>

      {/* Label */}
      <div style={{ flex: 1, pointerEvents: 'none' }}>
        <div style={{
          fontSize:   12,
          color:      isActive ? '#ffffff' : '#e2e8f0',
          fontWeight: isActive ? 600 : 400,
          display:    'flex',
          alignItems: 'center',
          gap:        5,
        }}>
          <span>{emoji}</span>
          <span>{label}</span>
        </div>
      </div>

      {isActive && (
        <span style={{
          color: '#3d5afe', fontSize: 14, flexShrink: 0,
          pointerEvents: 'none',
        }}>
          ✓
        </span>
      )}
    </div>
  );
};

// ── None option row ───────────────────────────────────────────────────────────
const NoneRow: React.FC<{
  isActive: boolean;
  onClick:  () => void;
}> = ({ isActive, onClick }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseDown={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:      'flex',
        alignItems:   'center',
        gap:          10,
        padding:      '8px 12px',
        cursor:       'pointer',
        background:   isActive
          ? '#1a2a6e'
          : hovered
          ? '#1e2330'
          : 'transparent',
        borderBottom: '1px solid #1e2330',
        userSelect:   'none',
      }}
    >
      <div style={{
        width: 44, height: 28, borderRadius: 5,
        background: '#0d1117', border: '1px solid #2e3447',
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 10,
        color: '#4b5563', flexShrink: 0,
        pointerEvents: 'none',
      }}>
        None
      </div>
      <div style={{ flex: 1, pointerEvents: 'none' }}>
        <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 500 }}>
          ✕ No Animation
        </div>
        <div style={{ fontSize: 10, color: '#6b7280', marginTop: 1 }}>
          Use solid / gradient background
        </div>
      </div>
      {isActive && (
        <span style={{ color: '#3d5afe', fontSize: 12, pointerEvents: 'none' }}>
          ✓
        </span>
      )}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const AnimatedBgPicker: React.FC = () => {
  const { presentation, currentSlideIndex, updateSlideBackground } =
    usePresentationStore();

  const slide   = presentation?.slides[currentSlideIndex];
  const current = (slide as any)?.animatedBackground as
    | AnimatedBackground
    | undefined;

  const [isOpen, setIsOpen] = useState(false);
  const triggerRef          = useRef<HTMLButtonElement>(null);

  const apply = useCallback((type: AnimatedBgType) => {
    const opt = ANIMATED_BG_OPTIONS.find((o) => o.type === type);
    if (!opt) return;

    console.log('[AnimatedBgPicker] applying:', type, opt.defaults);

    updateSlideBackground({
      animatedBackground: { type, ...opt.defaults } as AnimatedBackground,
      backgroundColor:    undefined,
      backgroundGradient: undefined,
      backgroundImage:    undefined,
    });

    setIsOpen(false);
  }, [updateSlideBackground]);

  const remove = useCallback(() => {
    updateSlideBackground({ animatedBackground: undefined });
    setIsOpen(false);
  }, [updateSlideBackground]);

  const patch = useCallback((updated: Partial<AnimatedBackground>) => {
    if (!current) return;
    updateSlideBackground({
      animatedBackground: { ...current, ...updated },
    });
  }, [current, updateSlideBackground]);

  const currentOpt = ANIMATED_BG_OPTIONS.find((o) => o.type === current?.type);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* Label */}
      <span style={{
        fontSize: 11, fontWeight: 600, color: '#8b92a5',
        letterSpacing: '0.08em', textTransform: 'uppercase',
      }}>
        🎨 Animated Background
      </span>

      {/* Trigger */}
      <button
        ref={triggerRef}
        // ✅ Toggle on mousedown so it runs before portal's outside-click handler
        onMouseDown={(e) => {
          e.stopPropagation();
          setIsOpen((v) => !v);
        }}
        style={{
          width:          '100%',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          gap:            8,
          padding:        '7px 10px',
          background:     '#111827',
          border:         `1px solid ${isOpen ? '#3d5afe' : '#2e3447'}`,
          borderRadius:   8,
          cursor:         'pointer',
          color:          '#e2e8f0',
          fontSize:       13,
          transition:     'border-color 0.15s',
          userSelect:     'none',
        }}
      >
        {/* Current selection */}
        <div style={{
          display: 'flex', alignItems: 'center',
          gap: 8, flex: 1, minWidth: 0,
          pointerEvents: 'none',
        }}>
          {current && currentOpt ? (
            <>
              <div style={{
                width: 36, height: 22, borderRadius: 4,
                overflow: 'hidden', flexShrink: 0,
                position: 'relative', border: '1px solid #2e3447',
              }}>
                <AnimatedBackgroundComponent
                  config={{ type: current.type, ...currentOpt.defaults } as AnimatedBackground}
                />
              </div>
              <span style={{ fontSize: 13 }}>{currentOpt.emoji}</span>
              <span style={{
                fontSize: 12, color: '#e2e8f0',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {currentOpt.label}
              </span>
            </>
          ) : (
            <>
              <div style={{
                width: 36, height: 22, borderRadius: 4,
                background: '#1e2330', flexShrink: 0,
                border: '1px solid #2e3447',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 10, color: '#4b5563',
              }}>
                None
              </div>
              <span style={{ fontSize: 12, color: '#6b7280' }}>
                No animated background
              </span>
            </>
          )}
        </div>

        {/* Chevron */}
        <svg
          viewBox="0 0 24 24" width="12" height="12" fill="none"
          stroke="#6b7280" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
          style={{
            flexShrink: 0,
            transition: 'transform 0.2s',
            transform:  isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            pointerEvents: 'none',
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Portal dropdown */}
      <DropdownPortal
        anchorRef={triggerRef as React.RefObject<HTMLElement>}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        maxHeight={360}
      >
        <NoneRow
          isActive={!current}
          onClick={remove}
        />
        {ANIMATED_BG_OPTIONS.map((opt) => (
          <OptionRow
            key={opt.type}
            type={opt.type}
            label={opt.label}
            emoji={opt.emoji}
            defaults={opt.defaults}
            isActive={current?.type === opt.type}
            onClick={() => apply(opt.type)}
          />
        ))}
      </DropdownPortal>

      {/* Active controls */}
      {current && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 11, color: '#94a3b8' }}>
            Speed: {current.speed ?? 1}×
            <input
              type="range" min="0.2" max="3" step="0.1"
              value={current.speed ?? 1}
              onChange={(e) => patch({ speed: parseFloat(e.target.value) })}
              style={{ width: '100%', marginTop: 2 }}
            />
          </label>
          <label style={{ fontSize: 11, color: '#94a3b8' }}>
            Opacity: {Math.round((current.opacity ?? 1) * 100)}%
            <input
              type="range" min="0.1" max="1" step="0.05"
              value={current.opacity ?? 1}
              onChange={(e) => patch({ opacity: parseFloat(e.target.value) })}
              style={{ width: '100%', marginTop: 2 }}
            />
          </label>

          {current.type === 'aurora'          && <AuroraControls    config={current}  onChange={patch} />}
          {current.type === 'waves'           && <WavesControls     current={current} onChange={patch} />}
          {current.type === 'neon-pulse'      && <NeonPulseControls config={current}  onChange={patch} />}
          {current.type === 'geometric'       && <GeometricControls current={current} onChange={patch} />}
          {current.type === 'bubbles'         && <BubblesControls   current={current} onChange={patch} />}
          {current.type === 'lava-lamp'       && <LavaLampControls  current={current} onChange={patch} />}
          {current.type === 'plasma'          && <PlasmaControls    current={current} onChange={patch} />}
          {current.type === 'particles'       && <ParticlesControls current={current} onChange={patch} />}
          {current.type === 'vortex'          && <VortexControls    current={current} onChange={patch} />}
          {current.type === 'fire'            && <FireControls      current={current} onChange={patch} />}
          {current.type === 'bokeh'           && <BokehControls     current={current} onChange={patch} />}
          {current.type === 'northern-lights' && (
            <GenericBgControls current={current} onChange={patch}
              labels={['Curtain 1', 'Curtain 2', 'Curtain 3']}
              defaults={{ color1: '#00ff87', color2: '#60efff',
                          color3: '#9b5de5', backgroundColor: '#000511' }}
            />
          )}
          {current.type === 'meteor-shower' && (
            <GenericBgControls current={current} onChange={patch}
              labels={['Meteor 1', 'Meteor 2', 'Meteor 3']}
              defaults={{ color1: '#ffffff', color2: '#93c5fd',
                          color3: '#fde68a', backgroundColor: '#020817' }}
            />
          )}
          {current.type === 'sand-storm' && (
            <GenericBgControls current={current} onChange={patch}
              labels={['Sand 1', 'Sand 2', 'Sand 3']}
              defaults={{ color1: '#d97706', color2: '#92400e',
                          color3: '#fbbf24', backgroundColor: '#1a0f00' }}
            />
          )}
          {current.type === 'neon-rain' && (
            <GenericBgControls current={current} onChange={patch}
              labels={['Neon 1', 'Neon 2', 'Neon 3']}
              defaults={{ color1: '#ff00ff', color2: '#00ffff',
                          color3: '#ff3366', backgroundColor: '#020012' }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default AnimatedBgPicker;