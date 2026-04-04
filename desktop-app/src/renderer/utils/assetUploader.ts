// src/renderer/utils/assetUploader.ts

function getServerUrl(): string {
  if ((window as any).electronAPI) return 'http://localhost:8765';
  const host = window.location.hostname;
  return `http://${host}:8765`;
}

// ── NEW: Check if a URL points to OUR asset server (any host, port 8765) ──────
function isOurAssetUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.port === '8765' && parsed.pathname.startsWith('/assets/');
  } catch {
    return false;
  }
}

// ── NEW: Normalize an asset server URL to use the CURRENT client's host ───────
// e.g. http://192.168.1.5:8765/assets/images/foo.png
//   → http://localhost:8765/assets/images/foo.png    (on Electron)
//   → http://192.168.1.5:8765/assets/images/foo.png  (on mobile, same host)
function normalizeAssetUrl(url: string): string {
  if (!url) return url;
  try {
    const parsed  = new URL(url);
    const current = new URL(getServerUrl());
    // Replace host+port with current client's server host
    parsed.hostname = current.hostname;
    parsed.port     = current.port;
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Upload a blob: or data: URL to the server asset folder.
 * Returns the public http:// URL normalized for the current client.
 *
 * If the URL is already an asset server URL (http://*:8765/assets/...),
 * normalize it to use the current client's host instead of uploading again.
 */
export async function uploadAsset(
  url:  string,
  type: 'images' | 'videos',
): Promise<string> {
  if (!url) return url;

  // ✅ FIX: Asset server URL from any host → normalize to current client's host
  // This handles: http://192.168.x.x:8765/assets/... received on Desktop
  // and:          http://localhost:8765/assets/...   received on Mobile
  if (isOurAssetUrl(url)) {
    const normalized = normalizeAssetUrl(url);
    if (normalized !== url) {
      console.log(`[assetUploader] Normalized asset URL: ${url} → ${normalized}`);
    }
    return normalized;
  }

  // Already a non-asset public http URL — leave as-is
  if (url.startsWith('http:') || url.startsWith('https:')) return url;

  // blob: or data: → upload to server
  try {
    let blob: Blob;

    if (url.startsWith('blob:')) {
      const response = await fetch(url);
      blob           = await response.blob();
    } else if (url.startsWith('data:')) {
      blob = dataUrlToBlob(url);
    } else {
      return url; // unknown — leave as-is
    }

    const ext      = mimeToExt(blob.type);
    const formData = new FormData();
    formData.append('file', blob, `asset.${ext}`);

    const response = await fetch(`${getServerUrl()}/upload/${type}`, {
      method: 'POST',
      body:   formData,
    });

    if (!response.ok) throw new Error(`Upload failed: ${response.status}`);

    const { url: publicUrl } = await response.json();
    console.log(`[assetUploader] ✅ Uploaded → ${publicUrl}`);
    return publicUrl;

  } catch (err) {
    console.error('[assetUploader] Upload failed:', err);
    return url; // fallback to original
  }
}

/**
 * Upload ALL blob/data assets in a presentation.
 * Also normalizes existing asset server URLs to the current client's host.
 * Returns new presentation with all assets as correct http:// URLs.
 */
export async function uploadPresentationAssets(presentation: any): Promise<any> {
  if (!presentation) return presentation;

  console.log('[assetUploader] Processing all assets...');
  let uploaded   = 0;
  let normalized = 0;

  const slides = await Promise.all(
    (presentation.slides ?? []).map(async (slide: any) => {

      // Slide background image
      let backgroundImage = slide.backgroundImage;
      if (needsProcessing(backgroundImage)) {
        const before    = backgroundImage;
        backgroundImage = await uploadAsset(backgroundImage, 'images');
        if (backgroundImage !== before) {
          isOurAssetUrl(before) ? normalized++ : uploaded++;
        }
      }

      // Slide background video
      let backgroundVideo = slide.backgroundVideo;
      if (needsProcessing(backgroundVideo)) {
        const before    = backgroundVideo;
        backgroundVideo = await uploadAsset(backgroundVideo, 'videos');
        if (backgroundVideo !== before) {
          isOurAssetUrl(before) ? normalized++ : uploaded++;
        }
      }

      // Elements
      const elements = await Promise.all(
        (slide.elements ?? []).map(async (el: any) => {
          let src      = el.src;
          let videoSrc = el.videoSrc;

          if (el.type === 'image' && needsProcessing(src)) {
            const before = src;
            src          = await uploadAsset(src, 'images');
            if (src !== before) isOurAssetUrl(before) ? normalized++ : uploaded++;
          }

          if (el.type === 'video' && needsProcessing(videoSrc)) {
            const before = videoSrc;
            videoSrc     = await uploadAsset(videoSrc, 'videos');
            if (videoSrc !== before) isOurAssetUrl(before) ? normalized++ : uploaded++;
          }

          return { ...el, src, videoSrc };
        }),
      );

      return { ...slide, backgroundImage, backgroundVideo, elements };
    }),
  );

  console.log(
    `[assetUploader] ✅ Done —`,
    `${uploaded} uploaded,`,
    `${normalized} normalized`,
  );

  return { ...presentation, slides };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns true if the URL needs processing:
 * - blob:/data: → needs uploading
 * - http://*:8765/assets/... → needs host normalization
 */
function needsProcessing(url: string): boolean {
  if (!url) return false;
  if (url.startsWith('blob:') || url.startsWith('data:')) return true;
  if (isOurAssetUrl(url)) return true;  // ✅ normalize cross-host asset URLs
  return false;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime             = header.match(/:(.*?);/)?.[1] ?? 'application/octet-stream';
  const binary           = atob(base64);
  const array            = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
  return new Blob([array], { type: mime });
}

function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    'image/png':       'png',
    'image/jpeg':      'jpg',
    'image/gif':       'gif',
    'image/webp':      'webp',
    'video/mp4':       'mp4',
    'video/webm':      'webm',
    'video/ogg':       'ogv',
    'video/quicktime': 'mov',
  };
  return map[mime] ?? 'bin';
}