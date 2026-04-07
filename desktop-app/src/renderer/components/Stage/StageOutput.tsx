// src/renderer/components/Stage/StageOutput.tsx
import React, { useEffect, useRef, useState } from 'react';
import type { Slide } from '../../../server/types';
import StageSlideCanvas from './StageSlideCanvas';

interface StageOutputProps {
  slide: Slide;
}

const StageOutput: React.FC<StageOutputProps> = ({ slide }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 960, height: 540 });

  // ── Responsive: fill container maintaining 16:9 ───────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const containerW = entry.contentRect.width;
      const containerH = entry.contentRect.height;

      // Fit 16:9 inside container
      const aspectW = containerW;
      const aspectH = containerW * (9 / 16);

      if (aspectH <= containerH) {
        setDims({ width: Math.floor(aspectW), height: Math.floor(aspectH) });
      } else {
        const h = containerH;
        const w = containerH * (16 / 9);
        setDims({ width: Math.floor(w), height: Math.floor(h) });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        flex:           1,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        background:     '#000',
        borderRadius:   8,
        overflow:       'hidden',
        minHeight:      0,
      }}
    >
      <div style={{
        width:     dims.width,
        height:    dims.height,
        flexShrink: 0,
        boxShadow: '0 0 40px rgba(0,0,0,0.8)',
      }}>
        <StageSlideCanvas
          slide={slide}
          width={dims.width}
          height={dims.height}
        />
      </div>
    </div>
  );
};

export default StageOutput;