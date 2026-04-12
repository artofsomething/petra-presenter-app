// src/renderer/hooks/useScreenCapture.ts
import { useEffect, useRef, useState, useCallback } from 'react';

interface UseScreenCaptureOptions {
  sourceId:   string | null;
  sourceName: string | null;
}

interface CaptureState {
  stream:    MediaStream | null;
  videoEl:  HTMLVideoElement | null;
  isActive: boolean;
  error:    string | null;
}

export function useScreenCapture({ sourceId, sourceName }: UseScreenCaptureOptions) {
  const [state, setState] = useState<CaptureState>({
    stream:   null,
    videoEl:  null,
    isActive: false,
    error:    null,
  });

  const streamRef  = useRef<MediaStream | null>(null);
  const videoRef   = useRef<HTMLVideoElement | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const startCapture = useCallback(async (id: string) => {
    // ✅ Stop existing stream first
    stopCapture();

    try {
      // ✅ Use Electron's desktopCapturer stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          // @ts-ignore — Electron-specific constraint
          mandatory: {
            chromeMediaSource:   'desktop',
            chromeMediaSourceId: id,
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

      // ✅ Create video element to hold stream
      const video       = document.createElement('video');
      video.srcObject   = stream;
      video.muted       = true;
      video.playsInline = true;
      video.autoplay    = true;

      await video.play();

      streamRef.current = stream;
      videoRef.current  = video;

      if (!mountedRef.current) {
        stopCapture();
        return;
      }

      setState({
        stream,
        videoEl:  video,
        isActive: true,
        error:    null,
      });

      console.log(`[ScreenCapture] ✅ Capturing: ${sourceName}`);

    } catch (err: any) {
      console.error('[ScreenCapture] Failed:', err);
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isActive: false,
          error:    err.message ?? 'Capture failed',
        }));
      }
    }
  }, [sourceName]);

  const stopCapture = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current           = null;
    }
    streamRef.current = null;

    if (mountedRef.current) {
      setState({ stream: null, videoEl: null, isActive: false, error: null });
    }
  }, []);

  // ✅ Auto-start when sourceId changes
  useEffect(() => {
    if (sourceId) {
      startCapture(sourceId);
    } else {
      stopCapture();
    }
    return () => stopCapture();
  }, [sourceId]);

  return {
    ...state,
    videoElement: videoRef.current,
    startCapture,
    stopCapture,
  };
}