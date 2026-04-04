import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Image as KonvaImage, Group, Rect, Text } from 'react-konva';
import Konva from 'konva';
import type { SlideElement } from '../../../server/types';

interface VideoElementProps {
  element:        SlideElement;
  scale:          number;
  editable:       boolean;
  onSelect:       (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onDragEnd:      (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragMove?:    (e: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
}

type VideoState = 'loading' | 'ready' | 'error';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns true if the src is a usable URL for a <video> element */
function isValidVideoSrc(src: string | null | undefined): src is string {
  if (!src || src.trim() === '') return false;
  // blob: URLs are valid only within the same session/process
  // data: URLs are always valid
  // file: and http(s): are fine
  return (
    src.startsWith('blob:')  ||
    src.startsWith('data:')  ||
    src.startsWith('file:')  ||
    src.startsWith('http:')  ||
    src.startsWith('https:')
  );
}

/** Only set crossOrigin for remote URLs — never for blob:/file:/data: */
function shouldSetCrossOrigin(src: string): boolean {
  return src.startsWith('http:') || src.startsWith('https:');
}

// ─────────────────────────────────────────────────────────────────────────────

const VideoElement: React.FC<VideoElementProps> = ({
  element, scale, editable, onSelect, onDragEnd, onTransformEnd,onDragMove
}) => {
  const imageRef  = useRef<Konva.Image>(null);
  const videoRef  = useRef<HTMLVideoElement | null>(null);
  const animRef   = useRef<number>(0);
  const mountedRef = useRef(true);

  const [videoState, setVideoState] = useState<VideoState>('loading');
  const [errorMsg,   setErrorMsg]   = useState('');

  // ── Keep mountedRef current ───────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Load video ────────────────────────────────────────────────────────────
  useEffect(() => {
    // ✅ FIX 1: Validate src before doing anything
    if (!isValidVideoSrc(element.videoSrc)) {
      console.warn(
        `[VideoElement] Invalid or missing videoSrc for element ${element.id}:`,
        element.videoSrc,
      );
      setErrorMsg(element.videoSrc ? 'Unsupported source' : 'No video source');
      setVideoState('error');
      return;
    }

    if (!mountedRef.current) return;

    setVideoState('loading');
    setErrorMsg('');

    // Cancel any previous animation frame
    cancelAnimationFrame(animRef.current);

    const src   = element.videoSrc;
    const video = document.createElement('video');

    // ✅ FIX 2: Only set crossOrigin for actual remote URLs
    // Setting it on blob: triggers CORS errors in Electron
    if (shouldSetCrossOrigin(src)) {
      video.crossOrigin = 'anonymous';
    }

    video.muted       = true;
    video.loop        = element.loop      ?? true;
    video.playsInline = true;
    video.preload     = 'auto';
    video.autoplay    = element.autoplay  ?? false;

    // ✅ FIX 3: Attach ALL listeners BEFORE setting src
    const onLoaded = () => {
      if (!mountedRef.current) return;
      console.log(`[VideoElement] Loaded: ${element.id}`);
      videoRef.current = video;
      setVideoState('ready');

      if (element.autoplay !== false) {
        video.play().catch((err) => {
          // Autoplay blocked — not fatal, video is still ready to display
          console.warn(`[VideoElement] Autoplay blocked for ${element.id}:`, err.message);
        });
      }
    };

    const onError = () => {
      if (!mountedRef.current) return;

      const err        = video.error;
      const codeLabels: Record<number, string> = {
        1: 'Aborted',
        2: 'Network error',
        3: 'Decode error',
        4: 'Source not supported',
      };
      const msg = err
        ? `${codeLabels[err.code] ?? 'Unknown'} (code ${err.code})`
        : 'Unknown error';

      console.error(
        `[VideoElement] Load error for element ${element.id}: ${msg}`,
        '\n  src:', src.substring(0, 80),
      );
      setErrorMsg(msg);
      setVideoState('error');
    };

    const onStalled = () => {
      console.warn(`[VideoElement] Stalled: ${element.id}`);
    };

    video.addEventListener('loadeddata', onLoaded);
    video.addEventListener('error',      onError);
    video.addEventListener('stalled',    onStalled);

    // ✅ FIX 4: Set src AFTER listeners
    video.src = src;

    // Trigger load explicitly (needed in some Electron versions)
    video.load();

    // ── Cleanup ─────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animRef.current);

      video.removeEventListener('loadeddata', onLoaded);
      video.removeEventListener('error',      onError);
      video.removeEventListener('stalled',    onStalled);

      video.pause();

      // ✅ FIX 5: Null src first, THEN call load() to abort network request
      // Don't call load() before removing src — it triggers another error event
      video.src = '';
      // Don't call video.load() here — it's unnecessary and noisy

      if (videoRef.current === video) {
        videoRef.current = null;
      }
    };
  }, [element.videoSrc, element.loop, element.autoplay, element.id]);

  // ── Animate frames ────────────────────────────────────────────────────────
  useEffect(() => {
    if (videoState !== 'ready' || !videoRef.current || !imageRef.current) return;

    let frameId: number;

    const animate = () => {
      // Only redraw if video is actually playing
      if (videoRef.current && !videoRef.current.paused) {
        imageRef.current?.getLayer()?.batchDraw();
      }
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    animRef.current = frameId;

    return () => cancelAnimationFrame(frameId);
  }, [videoState]);

  // ── Dimensions ────────────────────────────────────────────────────────────
  const w = element.width  * scale;
  const h = element.height * scale;
  const x = element.x      * scale;
  const y = element.y      * scale;

  // ── Placeholder (loading / error) ─────────────────────────────────────────
  if (videoState !== 'ready' || !videoRef.current) {
    const isError   = videoState === 'error';
    const labelText = isError
      ? `❌ ${errorMsg || 'Video Error'}`
      : '⏳ Loading video...';

    return (
      <Group
        id={element.id}
        x={x}
        y={y}
        rotation={element.rotation || 0}
        draggable={editable && !element.isLocked}
        onClick={onSelect}
        onDragEnd={onDragEnd}
      >
        <Rect
          width={w}
          height={h}
          fill={isError ? '#2a0a0a' : '#0a0a2a'}
          stroke={isError ? '#ff4444' : '#334155'}
          strokeWidth={1}
          cornerRadius={4}
        />
        {/* Dashed border for loading state */}
        {!isError && (
          <Rect
            width={w}
            height={h}
            stroke="#3b82f6"
            strokeWidth={1}
            dash={[6, 4]}
            cornerRadius={4}
            fill="transparent"
            listening={false}
          />
        )}
        <Text
          width={w}
          height={h}
          text={labelText}
          align="center"
          verticalAlign="middle"
          fill={isError ? '#ff6666' : '#64748b'}
          fontSize={Math.max(10, Math.min(14, 14 * scale))}
          listening={false}
        />
        {/* Retry button shown on error in editable mode */}
        {isError && editable && (
          <Text
            x={0}
            y={h - Math.max(16, 18 * scale)}
            width={w}
            text="(check console for details)"
            align="center"
            fill="#475569"
            fontSize={Math.max(8, Math.min(10, 10 * scale))}
            listening={false}
          />
        )}
      </Group>
    );
  }

  // ── Ready: render video frame ─────────────────────────────────────────────
  return (
    <Group>
      <KonvaImage
        ref={imageRef}
        id={element.id}
        x={x}
        y={y}
        width={w}
        height={h}
        image={videoRef.current}
        rotation={element.rotation    || 0}
        opacity={element.opacity      ?? 1}
        draggable={editable && !element.isLocked}
        onClick={onSelect}
        onTap={(e)=>onSelect(e as any)}
        onDragEnd={onDragEnd}
        onDragMove={onDragMove}
        onTransformEnd={onTransformEnd}
      />

      {/* Editable overlay badge */}
      {editable && (
        <Group
          x={x + 4}
          y={y + 4}
          listening={false}
        >
          <Rect
            width={Math.max(40, 55 * scale)}
            height={Math.max(14, 18 * scale)}
            fill="rgba(0,0,0,0.65)"
            cornerRadius={3}
          />
          <Text
            text="🎬 Video"
            fontSize={Math.max(7, 9 * scale)}
            fill="#fff"
            padding={Math.max(2, 2 * scale)}
          />
        </Group>
      )}
    </Group>
  );
};

export default React.memo(VideoElement, (prev, next) => {
  // ✅ Custom memo comparison — only re-render when these props change
  return (
    prev.element.videoSrc  === next.element.videoSrc  &&
    prev.element.loop      === next.element.loop      &&
    prev.element.autoplay  === next.element.autoplay  &&
    prev.element.x         === next.element.x         &&
    prev.element.y         === next.element.y         &&
    prev.element.width     === next.element.width     &&
    prev.element.height    === next.element.height    &&
    prev.element.rotation  === next.element.rotation  &&
    prev.element.opacity   === next.element.opacity   &&
    prev.element.isLocked  === next.element.isLocked  &&
    prev.scale             === next.scale             &&
    prev.editable          === next.editable
  );
});


// import React, { useRef, useEffect, useState } from 'react';
// import { Image as KonvaImage, Group, Rect, Text } from 'react-konva';
// import Konva from 'konva';
// import type { SlideElement } from '../../../server/types';

// interface VideoElementProps {
//   element: SlideElement;
//   scale: number;
//   editable: boolean;
//   onSelect: (e: Konva.KonvaEventObject<MouseEvent>) => void;
//   onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
//   onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
// }

// const VideoElement: React.FC<VideoElementProps> = ({
//   element, scale, editable, onSelect, onDragEnd, onTransformEnd,
// }) => {
//   const imageRef = useRef<Konva.Image>(null);
//   const videoRef = useRef<HTMLVideoElement | null>(null);
//   const animRef = useRef<number>(0);
//   const [ready, setReady] = useState(false);
//   const [error, setError] = useState(false);

//   useEffect(() => {
//     if (!element.videoSrc) {
//       setError(true);
//       return;
//     }

//     setReady(false);
//     setError(false);

//     const video = document.createElement('video');
//     video.crossOrigin = 'anonymous';
//     video.muted = true;
//     video.loop = element.loop ?? true;
//     video.playsInline = true;
//     video.preload = 'auto';

//     video.addEventListener('loadeddata', () => {
//       videoRef.current = video;
//       setReady(true);
//       video.play().catch(() => {});
//     });

//     video.addEventListener('error', () => {
//       console.error('Video load error for element:', element.id);
//       setError(true);
//     });

//     video.src = element.videoSrc;

//     return () => {
//       cancelAnimationFrame(animRef.current);
//       video.pause();
//       video.removeAttribute('src');
//       video.load();
//       videoRef.current = null;
//     };
//   }, [element.videoSrc, element.loop, element.id]);

//   // Animate frames
//   useEffect(() => {
//     if (!ready || !videoRef.current || !imageRef.current) return;

//     const animate = () => {
//       imageRef.current?.getLayer()?.batchDraw();
//       animRef.current = requestAnimationFrame(animate);
//     };
//     animRef.current = requestAnimationFrame(animate);

//     return () => cancelAnimationFrame(animRef.current);
//   }, [ready]);

//   const w = element.width * scale;
//   const h = element.height * scale;

//   if (!ready || error || !videoRef.current) {
//     return (
//       <Group
//         id={element.id}
//         x={element.x * scale}
//         y={element.y * scale}
//         rotation={element.rotation || 0}
//         draggable={editable}
//         onClick={onSelect}
//         onDragEnd={onDragEnd}
//       >
//         <Rect
//           width={w} height={h}
//           fill={error ? '#2a0a0a' : '#0a0a2a'}
//           stroke={error ? '#ff4444' : '#444'}
//           strokeWidth={1} cornerRadius={4}
//         />
//         <Text
//           width={w} height={h}
//           text={error ? '❌ Video Error' : '🎬 Loading...'}
//           align="center" verticalAlign="middle"
//           fill={error ? '#ff6666' : '#888'}
//           fontSize={Math.max(12, 14 * scale)}
//         />
//       </Group>
//     );
//   }

//   return (
//     <Group>
//       <KonvaImage
//         ref={imageRef}
//         id={element.id}
//         x={element.x * scale}
//         y={element.y * scale}
//         width={w} height={h}
//         image={videoRef.current}
//         rotation={element.rotation || 0}
//         opacity={element.opacity ?? 1}
//         draggable={editable}
//         onClick={onSelect}
//         onDragEnd={onDragEnd}
//         onTransformEnd={onTransformEnd}
//       />
//       {editable && (
//         <Group x={element.x * scale + 4} y={element.y * scale + 4} listening={false}>
//           <Rect width={55 * scale} height={18 * scale} fill="rgba(0,0,0,0.7)" cornerRadius={3} />
//           <Text text="🎬 Video" fontSize={9 * scale} fill="#fff" padding={2 * scale} />
//         </Group>
//       )}
//     </Group>
//   );
// };

// export default React.memo(VideoElement);