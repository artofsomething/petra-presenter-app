import React, { useEffect, useRef, useState } from 'react';
import { Image as KonvaImage, Rect, Group } from 'react-konva';
import Konva from 'konva';
import type { SlideElement } from '../../../server/types';

const CANVAS_WIDTH  = 960;
const CANVAS_HEIGHT = 540;
const SCALE         = CANVAS_WIDTH / 1920;

interface ScreenCaptureElementProps {
  element:          SlideElement;
  scale?:           number;
  isEditor?:        boolean;
  onSelect?:        (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onDragEnd?:       (e: Konva.KonvaEventObject<DragEvent>)  => void;
  onDragMove?:      (e: Konva.KonvaEventObject<DragEvent>)  => void;
  onTransformEnd?:  (e: Konva.KonvaEventObject<Event>)      => void;
}

const ScreenCaptureElement: React.FC<ScreenCaptureElementProps> = ({
  element,
  scale       = SCALE,
  isEditor    = false,
  onSelect,
  onDragEnd,
  onDragMove,
  onTransformEnd,
}) => {
  const imgRef     = useRef<Konva.Image>(null);
  const animRef    = useRef<number>(0);
  const mountedRef = useRef(true);

  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  const x = element.x      * scale;
  const y = element.y      * scale;
  const w = element.width  * scale;
  const h = element.height * scale;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  // ── Start capture stream ──────────────────────────────────────────────────
  useEffect(() => {
    if (!element.sourceId) return;

    let video: HTMLVideoElement | null = null;
    let stream: MediaStream | null     = null;

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            // @ts-ignore — Electron-specific
            mandatory: {
              chromeMediaSource:   'desktop',
              chromeMediaSourceId: element.sourceId,
              minWidth:            1280,
              maxWidth:            4096,
              minHeight:           720,
              maxHeight:           2160,
              minFrameRate:        30,
            },
          },
        });

        if (!mountedRef.current) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        video             = document.createElement('video');
        video.srcObject   = stream;
        video.muted       = true;
        video.playsInline = true;
        video.autoplay    = true;
        await video.play();

        if (!mountedRef.current) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        setVideoEl(video);
        setError(null);
      } catch (err: any) {
        console.error('[ScreenCapture] Failed:', err);
        if (mountedRef.current) {
          setError(err.message ?? 'Capture failed');
        }
      }
    };

    start();

    return () => {
      stream?.getTracks().forEach(t => t.stop());
      if (video) {
        video.srcObject = null;
      }
      if (mountedRef.current) setVideoEl(null);
    };
  }, [element.sourceId]);

  // ── RAF draw loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!videoEl) return;

    const draw = () => {
      if (!videoEl.paused && !videoEl.ended) {
        imgRef.current?.getLayer()?.batchDraw();
      }
      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [videoEl]);

  const isLocked = element.isLocked ?? false;

  // ── Error state ───────────────────────────────────────────────────────────
  if (error || !videoEl) {
    return (
      <Group
        id={element.id}
        x={x} y={y}
        rotation={element.rotation ?? 0}
        opacity={element.opacity   ?? 1}
        draggable={isEditor && !isLocked}
        onClick={onSelect}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
        onTransformEnd={onTransformEnd}
      >
        {/* ✅ Placeholder rect — still selectable/resizable even without stream */}
        <Rect
          width={w}
          height={h}
          fill="#0f172a"
          stroke="#3d5afe"
          strokeWidth={2}
          cornerRadius={4}
        />
        {/* ✅ Hit area for transformer */}
        <Rect
          width={w}
          height={h}
          fill="transparent"
        />
      </Group>
    );
  }

  // ── Live capture ──────────────────────────────────────────────────────────
  return (
    <KonvaImage
      ref={imgRef}
      id={element.id}
      x={x}
      y={y}
      width={w}
      height={h}
      image={videoEl}
      rotation={element.rotation ?? 0}
      opacity={element.opacity   ?? 1}
      // ✅ Draggable + selectable + transformable
      draggable={isEditor && !isLocked}
      onClick={onSelect}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
    />
  );
};

export default ScreenCaptureElement;