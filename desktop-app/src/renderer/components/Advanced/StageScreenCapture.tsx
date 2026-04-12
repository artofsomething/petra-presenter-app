// src/renderer/components/Advanced/StageScreenCapture.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Image as KonvaImage }               from 'react-konva';
import Konva                                  from 'konva';
import type { SlideElement }                  from '../../../server/types';

interface Props {
  element: SlideElement;
  scale:   number;
}

const StageScreenCapture: React.FC<Props> = ({ element, scale }) => {
  const imgRef     = useRef<Konva.Image | null>(null);
  const mountedRef = useRef(true);
  const videoRef   = useRef<HTMLVideoElement | null>(null);
  const animRef    = useRef<Konva.Animation | null>(null);
  const streamRef  = useRef<MediaStream | null>(null);

  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  // ── Mount / unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // ✅ Cleanup everything on unmount
      animRef.current?.stop();
      animRef.current = null;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current = null;
      }
    };
  }, []);

  // ── Start capture ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!element.sourceId) {
      setError('No source ID');
      return;
    }

    // ✅ Stop previous stream before starting new one
    animRef.current?.stop();
    animRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current = null;
    }

    let cancelled = false;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            // @ts-ignore — Electron-specific
            mandatory: {
              chromeMediaSource:   'desktop',
              chromeMediaSourceId: element.sourceId,
              minWidth:   1280, maxWidth:   4096,
              minHeight:   720, maxHeight:  2160,
              minFrameRate: 30,
            },
          },
        });

        if (cancelled || !mountedRef.current) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;

        const video       = document.createElement('video');
        video.srcObject   = stream;
        video.muted       = true;
        video.playsInline = true;
        video.autoplay    = true;

        // ✅ Wait for actual video frames before rendering
        await new Promise<void>((resolve, reject) => {
          video.onloadeddata = () => resolve();
          video.onerror      = () => reject(new Error('Video load failed'));
          video.play().catch(reject);
        });

        if (cancelled || !mountedRef.current) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        videoRef.current = video;
        setVideoEl(video);
        setError(null);
        console.log('[StageScreenCapture] ✅ Stream ready:', element.sourceName);

      } catch (err: any) {
        console.error('[StageScreenCapture] ❌ Failed:', err);
        if (!cancelled && mountedRef.current) {
          setError(err.message ?? 'Capture failed');
        }
      }
    };

    start();

    return () => {
      cancelled = true;
      // ✅ Cleanup stream when sourceId changes
      animRef.current?.stop();
      animRef.current = null;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current = null;
      }
      if (mountedRef.current) setVideoEl(null);
    };
  }, [element.sourceId]);

  // ── Start Konva.Animation once video + Konva node are both ready ──────────
  useEffect(() => {
    if (!videoEl) return;

    // ✅ Stop any existing animation first
    animRef.current?.stop();
    animRef.current = null;

    let attempts  = 0;
    let timerId: ReturnType<typeof setTimeout>;

    const tryStart = () => {
      attempts++;
      const node  = imgRef.current;
      const layer = node?.getLayer();

      if (layer) {
        // ✅ Konva.Animation redraws the layer every RAF tick
        // Empty callback = redraw every frame
        const anim = new Konva.Animation(() => {}, layer);
        anim.start();
        animRef.current = anim;
        console.log('[StageScreenCapture] ✅ Animation started on layer');
        return;
      }

      // ✅ Retry until layer is available (node might not be mounted yet)
      if (attempts < 30) {
        timerId = setTimeout(tryStart, 100);
      } else {
        console.warn('[StageScreenCapture] ⚠️ Layer never became available after 3s');
      }
    };

    // ✅ Small initial delay to let KonvaImage mount
    timerId = setTimeout(tryStart, 50);

    return () => {
      clearTimeout(timerId);
      animRef.current?.stop();
      animRef.current = null;
    };
  }, [videoEl]);

  // ── Nothing to show ───────────────────────────────────────────────────────
  if (error || !videoEl) return null;

  return (
    <KonvaImage
      ref={imgRef}
      x={element.x      * scale}
      y={element.y      * scale}
      width={element.width  * scale}
      height={element.height * scale}
      image={videoEl}
      rotation={element.rotation ?? 0}
      opacity={element.opacity   ?? 1}
      listening={false}
    />
  );
};

export default StageScreenCapture;