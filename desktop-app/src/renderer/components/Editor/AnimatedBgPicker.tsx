// src/renderer/components/Editor/AnimatedBgPicker.tsx
import React, { useState } from 'react';
import { ANIMATED_BG_OPTIONS } from './AnimatedBackground';
import AnimatedBackgroundComponent from './AnimatedBackground';
import type { AnimatedBackground, AnimatedBgType } from '../../../server/types';
import usePresentationStore from '../../store/usePresentation';

const AnimatedBgPicker: React.FC = () => {
  const { presentation, currentSlideIndex, updateSlideBackground } = usePresentationStore();
  const slide = presentation?.slides[currentSlideIndex];

  const current = (slide as any)?.animatedBackground as AnimatedBackground | undefined;
  const [preview, setPreview] = useState<AnimatedBgType | null>(null);

  const apply = (type: AnimatedBgType) => {
    const opt = ANIMATED_BG_OPTIONS.find(o => o.type === type)!;
    updateSlideBackground({
      animatedBackground: {
        type,
        ...opt.defaults,
      } as AnimatedBackground,
      // Clear static backgrounds when animated is set
      backgroundColor:    undefined,
      backgroundGradient: undefined,
      backgroundImage:    undefined,
    });
  };

  const remove = () => {
    updateSlideBackground({ animatedBackground: undefined });
  };

  return (
    <div style={{ padding: 12 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 10,
      }}>
        <span style={{ fontSize: 12, fontWeight: 'bold', color: '#e2e8f0' }}>
          🎨 Animated Background
        </span>
        {current && (
          <button
            onClick={remove}
            style={{
              fontSize: 10, padding: '2px 8px',
              background: '#7f1d1d', color: '#fca5a5',
              border: 'none', borderRadius: 4, cursor: 'pointer',
            }}
          >
            ✕ Remove
          </button>
        )}
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 6,
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
              {/* Live mini preview */}
              <div style={{
                position: 'absolute', inset: 0,
                transform: 'scale(1)',
              }}>
                <AnimatedBackgroundComponent
                  config={{ type: opt.type, ...opt.defaults } as AnimatedBackground}
                />
              </div>

              {/* Label overlay */}
              <div style={{
                position:   'absolute', inset: 0,
                display:    'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.45)',
                fontSize:   11, color: '#fff',
                fontWeight: isActive ? 'bold' : 'normal',
                gap:        2,
              }}>
                <span style={{ fontSize: 16 }}>{opt.emoji}</span>
                <span>{opt.label}</span>
              </div>

              {/* Active checkmark */}
              {isActive && (
                <div style={{
                  position:   'absolute', top: 4, right: 4,
                  background: '#3b82f6',
                  borderRadius: '50%',
                  width: 14, height: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, color: '#fff',
                }}>✓</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Speed + opacity controls for active animation */}
      {current && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 11, color: '#94a3b8' }}>
            Speed: {current.speed ?? 1}×
            <input
              type="range" min="0.2" max="3" step="0.1"
              value={current.speed ?? 1}
              onChange={e => updateSlideBackground({
                animatedBackground: {
                  ...current,
                  speed: parseFloat(e.target.value),
                },
              })}
              style={{ width: '100%', marginTop: 2 }}
            />
          </label>
          <label style={{ fontSize: 11, color: '#94a3b8' }}>
            Opacity: {Math.round((current.opacity ?? 1) * 100)}%
            <input
              type="range" min="0.1" max="1" step="0.05"
              value={current.opacity ?? 1}
              onChange={e => updateSlideBackground({
                animatedBackground: {
                  ...current,
                  opacity: parseFloat(e.target.value),
                },
              })}
              style={{ width: '100%', marginTop: 2 }}
            />
          </label>
        </div>
      )}
    </div>
  );
};

export default AnimatedBgPicker;