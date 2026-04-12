// src/renderer/components/Presenter/PresentationScreenCapture.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Image as KonvaImage } from 'react-konva';
import Konva                   from 'konva';
import type { SlideElement }   from '../../../server/types';

interface Props {
  element: SlideElement;
}

const PresentationScreenCapture: React.FC<Props> = ({ element }) => {
  const imgRef     = useRef<Konva.Image | null>(null);
  const mountedRef = useRef(true);
  const videoRef   = useRef<HTMLVideoElement | null>(null);
  const animRef    = useRef<Konva.Animation | null>(null);

  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      animRef.current?.stop();
    };
  }, []);

  // ── Capture stream ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!element.sourceId) { setError('No source ID'); return; }

    let stream: MediaStream | null = null;

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            // @ts-ignore
            mandatory: {
              chromeMediaSource:   'desktop',
              chromeMediaSourceId: element.sourceId,
              minWidth:  1280, maxWidth:  4096,
              minHeight:  720, maxHeight: 2160,
              minFrameRate: 30,
            },
          },
        });

        if (!mountedRef.current) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        const video       = document.createElement('video');
        video.srcObject   = stream;
        video.muted       = true;
        video.playsInline = true;
        video.autoplay    = true;

        await new Promise<void>((resolve, reject) => {
          video.onloadeddata = () => resolve();
          video.onerror      = () => reject(new Error('Load failed'));
          video.play().catch(reject);
        });

        if (!mountedRef.current) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        videoRef.current = video;
        setVideoEl(video);
        setError(null);

      } catch (err: any) {
        console.error('[PresentationScreenCapture]', err);
        if (mountedRef.current) setError(err.message ?? 'Capture failed');
      }
    };

    start();

    return () => {
      animRef.current?.stop();
      animRef.current = null;
      stream?.getTracks().forEach(t => t.stop());
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current = null;
      }
      if (mountedRef.current) setVideoEl(null);
    };
  }, [element.sourceId]);

  // ── Start Konva.Animation once video + node are both ready ───────────────
  useEffect(() => {
    if (!videoEl) return;

    // ✅ Poll until KonvaImage is mounted and attached to a layer
    let attempts = 0;
    const maxAttempts = 20; // 20 × 100ms = 2s timeout

    const tryStartAnimation = () => {
      attempts++;
      const node  = imgRef.current;
      const layer = node?.getLayer();

      if (layer) {
        // ✅ Konva.Animation redraws the layer every frame automatically
        // The empty callback tells Konva "yes redraw every frame"
        const anim = new Konva.Animation(() => {
          // ✅ Return undefined/void = redraw every frame
          // Konva checks if video frame changed internally via the image ref
        }, layer);

        anim.start();
        animRef.current = anim;
        console.log('[PresentationScreenCapture] ✅ Animation started');
        return;
      }

      if (attempts < maxAttempts) {
        setTimeout(tryStartAnimation, 100);
      } else {
        console.warn('[PresentationScreenCapture] ⚠️ Layer never became available');
      }
    };

    const timer = setTimeout(tryStartAnimation, 50);
    return () => {
      clearTimeout(timer);
      animRef.current?.stop();
      animRef.current = null;
    };
  }, [videoEl]);

  if (error || !videoEl) return null;

  return (
    <KonvaImage
      ref={imgRef}
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      image={videoEl}
      rotation={element.rotation ?? 0}
      opacity={element.opacity   ?? 1}
      listening={false}
    />
  );
};

export default PresentationScreenCapture;