// src/renderer/components/Editor/BackgroundImageLayer.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Image as KonvaImage } from 'react-konva';
import Konva from 'konva';

interface BackgroundImageLayerProps {
  src:    string;
  width:  number;
  height: number;
}

// ✅ Full src as cache key — no substring truncation
const imageCache = new Map<string, HTMLImageElement>();

const BackgroundImageLayer: React.FC<BackgroundImageLayerProps> = ({
  src, width, height,
}) => {
  const imageRef                  = useRef<Konva.Image>(null);
  const [image, setImage]         = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) {
      setImage(null);
      return;
    }

    // ✅ Full src string as cache key
    if (imageCache.has(src)) {
      setImage(imageCache.get(src)!);
      return;
    }

    // Cache miss — load fresh
    setImage(null);

    const img       = new window.Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      imageCache.set(src, img);
      setImage(img);
    };

    img.onerror = () => {
      console.error('[BackgroundImageLayer] Failed to load:', src.slice(0, 60));
    };

    img.src = src;

    return () => {
      img.onload  = null;
      img.onerror = null;
    };
  }, [src]); // ✅ Re-runs whenever src changes

  // ✅ Force Konva redraw when image object changes
  useEffect(() => {
    if (imageRef.current && image) {
      imageRef.current.image(image);
      imageRef.current.getLayer()?.batchDraw();
    }
  }, [image]);

  if (!image) return null;

  return (
    <KonvaImage
      ref={imageRef}
      x={0} y={0}
      width={width}
      height={height}
      image={image}
      listening={false}
    />
  );
};

// ✅ Custom memo — re-render when src or dimensions change
export default React.memo(
  BackgroundImageLayer,
  (prev, next) =>
    prev.src    === next.src    &&
    prev.width  === next.width  &&
    prev.height === next.height,
);