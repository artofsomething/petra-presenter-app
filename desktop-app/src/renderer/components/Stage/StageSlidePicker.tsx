// src/renderer/components/Stage/StageSlidePicker.tsx
import React from 'react';
import type { StageFile } from '../../../server/types';

interface StageSlidePickerProps {
  file:                 StageFile;
  onSelect:             (index: number) => void;
  isFilePresenting?:    boolean;
  presentingSlideIndex?: number;
  isPresenting?:        boolean;   // ✅ ADD - is ANY presentation running
  onGoLive?:            (slideIndex: number) => void; // ✅ ADD
}

const StageSlidePicker: React.FC<StageSlidePickerProps> = ({
  file,
  onSelect,
  isFilePresenting  = false,
  presentingSlideIndex = -1,
  isPresenting      = false,
  onGoLive,
}) => {
  const activeSlideIndex = file.activeSlideIndex ?? 0; // ✅ per-file

  return (
    <div style={{
      flex:          1,
      overflowY:     'auto',
      padding:       '8px',
      display:       'flex',
      flexDirection: 'column',
      gap:           4,
    }}>

      <span style={{
        fontSize:      10,
        fontWeight:    700,
        letterSpacing: '0.08em',
        color:         '#475569',
        textTransform: 'uppercase',
        padding:       '4px 4px 8px',
      }}>
        {file.name} — Slides
      </span>

      {file.presentation.slides.map((slide, i) => {
        const isActive    = i === activeSlideIndex;
        const isLive      = isFilePresenting && i === presentingSlideIndex;
        const canGoLive   = isPresenting && !isLive; // ✅ show GoLive when presenting

        return (
          <div
            key={slide.id}
            style={{
              display:      'flex',
              alignItems:   'center',
              gap:          8,
              padding:      '6px 8px',
              borderRadius: 6,
              cursor:       'pointer',
              background:   isActive ? '#3d5afe' : '#252c3b',
              border:       '1px solid',
              borderColor:  isLive
                ? '#4ade80'
                : isActive
                ? '#5c7cff'
                : 'transparent',
              transition:   'all 0.12s',
            }}
            onClick={() => onSelect(i)}
          >
            {/* Slide number */}
            <span style={{
              fontSize:   10,
              fontWeight: 700,
              color:      isActive ? '#fff' : '#475569',
              width:      18,
              flexShrink: 0,
              textAlign:  'center',
            }}>
              {i + 1}
            </span>

            {/* Thumbnail */}
            <div style={{
              width:          48,
              height:         28,
              borderRadius:   3,
              flexShrink:     0,
              background:     slide.backgroundColor || '#1e293b',
              border:         '1px solid #334155',
              overflow:       'hidden',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              fontSize:       7,
              color:          '#64748b',
            }}>
              {slide.elements.find(el => el.type === 'text')?.text?.slice(0, 20) || '—'}
            </div>

            {/* Slide name */}
            <span style={{
              fontSize:     11,
              color:        isActive ? '#fff' : '#94a3b8',
              overflow:     'hidden',
              textOverflow: 'ellipsis',
              whiteSpace:   'nowrap',
              flex:         1,
            }}>
              {slide.elements.find(el => el.type === 'text')?.text?.slice(0, 40)
                || `Slide ${i + 1}`}
            </span>

            {/* LIVE badge */}
            {isLive && (
              <span style={{
                fontSize:     9,
                fontWeight:   700,
                color:        '#4ade80',
                background:   '#14532d',
                padding:      '2px 5px',
                borderRadius: 3,
                flexShrink:   0,
              }}>
                ● LIVE
              </span>
            )}

            {/* ✅ Go Live button - shown when presenting but this slide is not live */}
            {canGoLive && onGoLive && (
              <button
                onClick={(e) => {
                  e.stopPropagation(); // don't trigger onSelect
                  onGoLive(i);
                }}
                style={{
                  fontSize:     9,
                  fontWeight:   700,
                  color:        '#94a3b8',
                  background:   '#1e293b',
                  border:       '1px solid #334155',
                  padding:      '2px 6px',
                  borderRadius: 3,
                  cursor:       'pointer',
                  flexShrink:   0,
                  whiteSpace:   'nowrap',
                  transition:   'all 0.12s',
                }}
                onMouseEnter={e => {
                  (e.target as HTMLElement).style.background = '#14532d';
                  (e.target as HTMLElement).style.color      = '#4ade80';
                  (e.target as HTMLElement).style.borderColor = '#4ade80';
                }}
                onMouseLeave={e => {
                  (e.target as HTMLElement).style.background  = '#1e293b';
                  (e.target as HTMLElement).style.color       = '#94a3b8';
                  (e.target as HTMLElement).style.borderColor = '#334155';
                }}
                title={`Make Slide ${i + 1} of "${file.name}" live`}
              >
                Go Live
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StageSlidePicker;