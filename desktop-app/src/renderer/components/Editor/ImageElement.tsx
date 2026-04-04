// src/renderer/components/Editor/ImageElement.tsx
import React, { useRef, useEffect, useState } from 'react';
import { Image as KonvaImage, Group, Rect, Text } from 'react-konva';
import Konva from 'konva';
import type { SlideElement } from '../../../server/types';

interface ImageElementProps {
  element:        SlideElement;
  scale:          number;
  editable:       boolean;
  onSelect:       (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onDragEnd:      (e: Konva.KonvaEventObject<DragEvent>)  => void;
  onDragMove?:     (e: Konva.KonvaEventObject<DragEvent>)  => void;
  onTransformEnd: (e: Konva.KonvaEventObject<Event>)      => void;
}

// ✅ Cache keyed by FULL src — no element.id mixed in
//    so the same image shared across elements hits the cache,
//    but changing src on an element always results in a cache miss → fresh load
const imageCache = new Map<string, HTMLImageElement>();

const ImageElement: React.FC<ImageElementProps> = ({
  element,
  scale,
  editable,
  onSelect,
  onDragEnd,
  onDragMove,
  onTransformEnd,
}) => {
  const imageRef = useRef<Konva.Image>(null);
  const [image,  setImage]  = useState<HTMLImageElement | null>(null);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  useEffect(() => {
    if (!element.src) {
      setImage(null);
      setStatus('error');
      return;
    }

    // ✅ Cache key is the full src string — guarantees a different src = different entry
    const cacheKey = element.src;

    if (imageCache.has(cacheKey)) {
      const cached = imageCache.get(cacheKey)!;
      setImage(cached);
      setStatus('loaded');
      return;
    }

    // Not cached — load fresh
    setImage(null);
    setStatus('loading');

    const img       = new window.Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      imageCache.set(cacheKey, img);
      setImage(img);
      setStatus('loaded');
    };

    img.onerror = () => {
      console.error('[ImageElement] Failed to load image for element:', element.id);
      setStatus('error');
    };

    img.src = element.src;

    return () => {
      img.onload  = null;
      img.onerror = null;
      // Don't clear img.src here — it would cancel an in-flight load
      // that another element sharing the same src might need
    };
  }, [element.src]); // ✅ Only element.src — element.id must NOT be here

  // ✅ Force Konva layer redraw whenever the image object changes
  useEffect(() => {
    if (imageRef.current && image) {
      imageRef.current.image(image);
      imageRef.current.getLayer()?.batchDraw();
    }
  }, [image]);

  const x = element.x      * scale;
  const y = element.y      * scale;
  const w = element.width  * scale;
  const h = element.height * scale;

  if (status !== 'loaded' || !image) {
    return (
      <Group
        id={element.id}
        x={x} y={y}
        rotation={element.rotation || 0}
        draggable={editable}
        onClick={onSelect}
        onDragEnd={onDragEnd}
      >
        <Rect
          width={w} height={h}
          fill={status === 'error' ? '#2a1a1a' : '#1a1a2e'}
          stroke={status === 'error' ? '#ff4444' : '#444'}
          strokeWidth={1}
          cornerRadius={4}
        />
        <Text
          width={w} height={h}
          text={status === 'loading' ? '⏳ Loading...' : '❌ Failed to load'}
          align="center"
          verticalAlign="middle"
          fill={status === 'error' ? '#ff6666' : '#888'}
          fontSize={Math.max(12, 14 * scale)}
        />
      </Group>
    );
  }

  return (
    <KonvaImage
      ref={imageRef}
      id={element.id}
      x={x} y={y}
      width={w} height={h}
      image={image}
      rotation={element.rotation  || 0}
      opacity={element.opacity    ?? 1}
      draggable={editable && !(element.isLocked ?? false)}
      onClick={onSelect}
      onTap={(e)=> onSelect(e as any)}
      onDragEnd={onDragEnd}
      onDragMove={onDragMove}
      onTransformEnd={onTransformEnd}
    />
  );
};

// ✅ Custom memo comparator — re-render when src OR any visual property changes
export default React.memo(
  ImageElement,
  (prev, next) =>
    prev.element.src      === next.element.src      &&
    prev.element.x        === next.element.x        &&
    prev.element.y        === next.element.y        &&
    prev.element.width    === next.element.width    &&
    prev.element.height   === next.element.height   &&
    prev.element.rotation === next.element.rotation &&
    prev.element.opacity  === next.element.opacity  &&
    prev.element.isLocked === next.element.isLocked &&
    prev.scale            === next.scale            &&
    prev.editable         === next.editable,
);