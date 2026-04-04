// src/renderer/utils/getAssetDimensions.ts

export interface AssetDimensions {
  width:  number;
  height: number;
}

/**
 * Get the natural pixel dimensions of an image URL.
 * Resolves immediately if already cached by browser.
 */
export function getImageDimensions(url: string): Promise<AssetDimensions> {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };

    img.onerror = () => {
      console.warn('[getAssetDimensions] Failed to load image:', url);
      // Fallback — 16:9 default
      resolve({ width: 1280, height: 720 });
    };

    img.src = url;
  });
}

/**
 * Get the natural pixel dimensions of a video URL.
 * Uses loadedmetadata event.
 */
export function getVideoDimensions(url: string): Promise<AssetDimensions> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      const w = video.videoWidth;
      const h = video.videoHeight;
      video.src = ''; // release
      resolve({
        width:  w || 1280,
        height: h || 720,
      });
    };

    video.onerror = () => {
      console.warn('[getAssetDimensions] Failed to load video metadata:', url);
      resolve({ width: 1280, height: 720 });
    };

    video.src = url;
  });
}

/**
 * Given an asset's natural dimensions and the slide canvas size,
 * returns the best-fit element size and centered position.
 *
 * Rules:
 * - Never exceeds maxFillRatio of the slide (default 80%)
 * - Always maintains original aspect ratio
 * - Always centered on the slide
 */
export function fitToSlide(
  naturalWidth:  number,
  naturalHeight: number,
  slideWidth:    number,
  slideHeight:   number,
  maxFillRatio = 0.80,
): { x: number; y: number; width: number; height: number } {

  const maxW = slideWidth  * maxFillRatio;
  const maxH = slideHeight * maxFillRatio;

  const aspectRatio = naturalWidth / naturalHeight;

  let width:  number;
  let height: number;

  // Scale down to fit within maxW × maxH, keep aspect ratio
  if (naturalWidth <= maxW && naturalHeight <= maxH) {
    // Image is small enough — use natural size
    width  = naturalWidth;
    height = naturalHeight;
  } else if (maxW / aspectRatio <= maxH) {
    // Width is the limiting dimension
    width  = maxW;
    height = maxW / aspectRatio;
  } else {
    // Height is the limiting dimension
    height = maxH;
    width  = maxH * aspectRatio;
  }

  // Center on slide
  const x = (slideWidth  - width)  / 2;
  const y = (slideHeight - height) / 2;

  return {
    x:      Math.round(x),
    y:      Math.round(y),
    width:  Math.round(width),
    height: Math.round(height),
  };
}