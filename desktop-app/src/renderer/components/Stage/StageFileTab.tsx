// src/renderer/components/Stage/StageFileTab.tsx
import React from 'react';
import type { StageFile } from '../../../server/types';

interface StageFileTabProps {
  file:     StageFile;
  isActive: boolean;
  isLive?:boolean;
  onSelect: () => void;
  onRemove: () => void;
}

const StageFileTab: React.FC<StageFileTabProps> = ({
  file, isActive,isLive=false, onSelect, onRemove,
}) => (
  <div
    onClick={onSelect}
    style={{
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'space-between',
      padding:         '7px 10px',
      borderRadius:    6,
      cursor:          'pointer',
      background:      isActive ? '#3d5afe22' : 'transparent',
      border:          isActive ? '1px solid #3d5afe66' : '1px solid transparent',
      transition:      'all 0.15s',
    }}
  >
    {/* icon + name */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
      <span style={{ fontSize: 14, flexShrink: 0 }}>📄</span>
      <span style={{
        fontSize:     12,
        color:        isActive ? '#93c5fd' : '#94a3b8',
        fontWeight:   isActive ? 700 : 400,
        whiteSpace:   'nowrap',
        overflow:     'hidden',
        textOverflow: 'ellipsis',
      }}>
        {file.name}
      </span>
      {isLive && (
        <span style={{
            fontSize:9,fontWeight:700, color:'#4ade80',background: '#14532d',padding:'1px 6px',borderRadius:3,marginLeft:6
        }}> ● LIVE </span>
      )}
    </div>

    {/* slide count + remove */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
      <span style={{
        fontSize:     10,
        color:        '#475569',
        background:   '#1e293b',
        borderRadius: 4,
        padding:      '1px 5px',
      }}>
        {file.presentation.slides.length} slides
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        style={{
          background:   'none',
          border:       'none',
          color:        '#475569',
          cursor:       'pointer',
          fontSize:     12,
          padding:      '0 2px',
          lineHeight:   1,
        }}
        title="Remove from stage"
      >
        ✕
      </button>
    </div>
  </div>
);

export default StageFileTab;