// src/renderer/utils/assetSerializer.ts

/**
 * Convert a blob: URL to base64 data: URL
 * Returns original if already data: or not blob:
 */
export async function blobUrlToDataUrl(url: string): Promise<string> {
  if (!url || !url.startsWith('blob:')) return url;

  try {
    const response = await fetch(url);
    const blob     = await response.blob();

    return new Promise((resolve) => {
      const reader   = new FileReader();
      reader.onload  = () => resolve(reader.result as string);
      reader.onerror = () => {
        console.warn('[assetSerializer] FileReader error for:', url);
        resolve('');   // empty = skip rendering, better than crash
      };
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('[assetSerializer] blobUrlToDataUrl failed:', err);
    return '';
  }
}

/**
 * Convert data: URL back to a local blob: URL
 * Returns original if not a data: URL
 */
export function dataUrlToBlobUrl(dataUrl: string): string {
  if (!dataUrl || !dataUrl.startsWith('data:')) return dataUrl;

  try {
    const [header, base64] = dataUrl.split(',');
    const mime             = header.match(/:(.*?);/)?.[1] ?? 'application/octet-stream';
    const binary           = atob(base64);
    const array            = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
    const blob = new Blob([array], { type: mime });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.warn('[assetSerializer] dataUrlToBlobUrl failed:', err);
    return dataUrl;
  }
}

/**
 * Convert blob: URL to ArrayBuffer (for videos — too large for base64)
 */
export async function blobUrlToArrayBuffer(url: string): Promise<{
  buffer:   ArrayBuffer;
  mimeType: string;
} | null> {
  if (!url || !url.startsWith('blob:')) return null;

  try {
    const response = await fetch(url);
    const blob     = await response.blob();
    const buffer   = await blob.arrayBuffer();
    return { buffer, mimeType: blob.type || 'video/mp4' };
  } catch (err) {
    console.warn('[assetSerializer] blobUrlToArrayBuffer failed:', err);
    return null;
  }
}

/**
 * Convert ArrayBuffer back to blob: URL
 */
export function arrayBufferToBlobUrl(buffer: ArrayBuffer, mimeType: string): string {
  try {
    const blob = new Blob([buffer], { type: mimeType });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.warn('[assetSerializer] arrayBufferToBlobUrl failed:', err);
    return '';
  }
}

// ── Video asset map ───────────────────────────────────────────────────────────
// We tag videos with a stable ID so we can transfer them separately
// and reconstruct them on the other side

export interface VideoAsset {
  id:       string;   // stable identifier
  buffer:   ArrayBuffer;
  mimeType: string;
}

/**
 * Serialize a full presentation:
 * - Images:  blob: → data: URL (inline)
 * - Videos:  blob: → extracted into separate VideoAsset[], replaced with __VIDEO__:{id}
 */
export async function serializePresentation(presentation: any): Promise<{
  presentation: any;
  videoAssets:  VideoAsset[];
}> {
  if (!presentation) return { presentation, videoAssets: [] };

  const videoAssets: VideoAsset[] = [];
  let   videoCounter = 0;

  const processVideoUrl = async (url: string): Promise<string> => {
    if (!url) return url;

    // Already a tagged placeholder — keep as-is (idempotent)
    if (url.startsWith('__VIDEO__:')) return url;

    // Not a blob — it's http: or data: (already serialized) — keep as-is
    if (!url.startsWith('blob:')) return url;

    const result = await blobUrlToArrayBuffer(url);
    if (!result) return '';

    const id = `video_${Date.now()}_${videoCounter++}`;
    videoAssets.push({ id, buffer: result.buffer, mimeType: result.mimeType });
    return `__VIDEO__:${id}`;
  };

  const slides = await Promise.all(
    (presentation.slides ?? []).map(async (slide: any) => {

      // Slide background image
      const backgroundImage = slide.backgroundImage
        ? await blobUrlToDataUrl(slide.backgroundImage)
        : slide.backgroundImage;

      // Slide background video
      const backgroundVideo = slide.backgroundVideo
        ? await processVideoUrl(slide.backgroundVideo)
        : slide.backgroundVideo;

      // Elements
      const elements = await Promise.all(
        (slide.elements ?? []).map(async (el: any) => {
          // Image element
          const src = el.type === 'image' && el.src
            ? await blobUrlToDataUrl(el.src)
            : el.src;

          // Video element
          const videoSrc = el.type === 'video' && el.videoSrc
            ? await processVideoUrl(el.videoSrc)
            : el.videoSrc;

          return { ...el, src, videoSrc };
        }),
      );

      return { ...slide, backgroundImage, backgroundVideo, elements };
    }),
  );

  return {
    presentation: { ...presentation, slides },
    videoAssets,
  };
}

/**
 * Deserialize a received presentation:
 * - data: URLs  → local blob: URLs
 * - __VIDEO__:{id} → blob: URL from provided videoAssets map
 */
export function deserializePresentation(
  presentation: any,
  videoAssets:  VideoAsset[] = [],
): any {
  if (!presentation) return presentation;

  // Build lookup map
  const videoMap = new Map<string, VideoAsset>();
  for (const asset of videoAssets) videoMap.set(asset.id, asset);

  const resolveVideo = (url: string): string => {
    if (!url) return url;
    if (url.startsWith('__VIDEO__:')) {
      const id    = url.replace('__VIDEO__:', '');
      const asset = videoMap.get(id);
      if (!asset) {
        console.warn('[assetSerializer] Video asset not found:', id);
        return '';
      }
      return arrayBufferToBlobUrl(asset.buffer, asset.mimeType);
    }
    // data: URL video (small enough) — convert to blob
    if (url.startsWith('data:')) return dataUrlToBlobUrl(url);
    return url;
  };

  const slides = (presentation.slides ?? []).map((slide: any) => {
    const backgroundImage = slide.backgroundImage?.startsWith('data:')
      ? dataUrlToBlobUrl(slide.backgroundImage)
      : slide.backgroundImage;

    const backgroundVideo = slide.backgroundVideo
      ? resolveVideo(slide.backgroundVideo)
      : slide.backgroundVideo;

    const elements = (slide.elements ?? []).map((el: any) => ({
      ...el,
      src: el.src?.startsWith('data:')
        ? dataUrlToBlobUrl(el.src)
        : el.src,
      videoSrc: el.videoSrc
        ? resolveVideo(el.videoSrc)
        : el.videoSrc,
    }));

    return { ...slide, backgroundImage, backgroundVideo, elements };
  });

  return { ...presentation, slides };
}