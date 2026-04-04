// src/renderer/components/Editor/VideoBackground.tsx
import React, { useRef, useEffect, useState } from 'react';

interface VideoBackgroundProps {
  videoSrc: string;
  loop?: boolean;
  muted?: boolean;
  width: number;
  height: number;
  isPlaying?: boolean;
}

const VideoBackground: React.FC<VideoBackgroundProps> = ({
  videoSrc,
  loop = true,
  muted = true,
  width,
  height,
  isPlaying = true,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;

    setLoaded(false);
    setError(false);

    video.onloadeddata = () => {
      setLoaded(true);
      if (isPlaying) {
        video.play().catch((err) => {
          console.warn('Video bg autoplay blocked:', err);
        });
      }
    };

    video.onerror = () => {
      setError(true);
    };

    video.src = videoSrc;

    return () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, [videoSrc]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !loaded) return;

    if (isPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isPlaying, loaded]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width,
        height,
        overflow: 'hidden',
        borderRadius: 6,
        zIndex: 0,
      }}
    >
      {error ? (
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#1a1a2e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ff6666',
            fontSize: 14,
          }}
        >
          ❌ Failed to load background video
        </div>
      ) : (
        <video
          ref={videoRef}
          loop={loop}
          muted={muted}
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: loaded ? 'block' : 'none',
          }}
        />
      )}

      {!loaded && !error && (
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#1a1a2e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#888',
            fontSize: 14,
          }}
        >
          🎬 Loading background video...
        </div>
      )}
    </div>
  );
};

export default VideoBackground;