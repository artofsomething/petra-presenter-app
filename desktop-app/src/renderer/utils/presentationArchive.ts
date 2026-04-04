
import jszip from 'jszip';
import type { Presentation } from '../../server/types';
import { uploadPresentationAssets } from './assetUploader';

const MANIFEST_FILE = 'presentation.json';
const ASSETS_FOLDER = 'assets/';

// ── Helpers ───────────────────────────────────────────────────────────────────

function collectAssets(presentation: Presentation): Map<string, string> {
  const assets = new Map<string, string>();

  presentation.slides.forEach((slide, si) => {
    if (slide.backgroundImage && isEmbeddedAsset(slide.backgroundImage)) {
      const ext      = extensionFromUrl(slide.backgroundImage);
      const filename = `slide_${si}_bg_image.${ext}`;
      assets.set(filename, slide.backgroundImage);
    }

    if (slide.backgroundVideo && isEmbeddedAsset(slide.backgroundVideo)) {
      const ext      = extensionFromUrl(slide.backgroundVideo);
      const filename = `slide_${si}_bg_video.${ext || 'mp4'}`;
      assets.set(filename, slide.backgroundVideo);
    }

    slide.elements.forEach((el: any, ei: number) => {
      if (el.type === 'image' && el.src && isEmbeddedAsset(el.src)) {
        const ext      = extensionFromUrl(el.src);
        const filename = `slide_${si}_el_${ei}_image.${ext}`;
        assets.set(filename, el.src);
      }
      if (el.type === 'video' && el.src && isEmbeddedAsset(el.src)) {
        const ext      = extensionFromUrl(el.src);
        const filename = `slide_${si}_el_${ei}_video.${ext || 'mp4'}`;
        assets.set(filename, el.src);
      }
    });
  });

  return assets;
}

function isEmbeddedAsset(url: string): boolean {
  return url.startsWith('data:') || url.startsWith('blob:');
}

function isVideoFilename(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return ['mp4', 'webm', 'ogg', 'mov'].includes(ext);
}

function extensionFromUrl(url: string): string {
  if (url.startsWith('data:')) {
    const match = url.match(/^data:([^;]+);/);
    if (!match) return 'bin';
    return extensionFromMime(match[1]);
  }
  return 'bin';
}

function extensionFromMime(mime: string): string {
  const map: Record<string, string> = {
    'image/png':  'png',
    'image/jpeg': 'jpg',
    'image/gif':  'gif',
    'image/webp': 'webp',
    'video/mp4':  'mp4',
    'video/webm': 'webm',
    'video/ogg':  'ogg',
  };
  return map[mime] ?? 'bin';
}

function mimeFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    png:  'image/png',
    jpg:  'image/jpeg',
    jpeg: 'image/jpeg',
    gif:  'image/gif',
    webp: 'image/webp',
    mp4:  'video/mp4',
    webm: 'video/webm',
    ogg:  'video/ogg',
  };
  return map[ext] ?? 'application/octet-stream';
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  const binary  = atob(base64);
  const bytes   = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function blobUrlToBytes(
  blobUrl: string,
): Promise<{ bytes: Uint8Array; mime: string }> {
  const response = await fetch(blobUrl);
  const blob     = await response.blob();
  const mime     = blob.type || 'application/octet-stream';
  const buffer   = await blob.arrayBuffer();
  return { bytes: new Uint8Array(buffer), mime };
}

function uint8ArrayToDataUrl(bytes: Uint8Array, mime: string): string {
  const CHUNK = 8192;
  let binary  = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + CHUNK)));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

// ✅ Fix 1 — cast .buffer to ArrayBuffer to avoid SharedArrayBuffer conflict
function uint8ArrayToBlobUrl(bytes: Uint8Array, mime: string): string {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mime });
  return URL.createObjectURL(blob);
}

// ── SAVE ─────────────────────────────────────────────────────────────────────

function rewriteUrls(
  presentation: Presentation,
  urlToFilename: Map<string, string>,
): Presentation {
  const clone: Presentation = JSON.parse(JSON.stringify(presentation));

  clone.slides.forEach((slide: any) => {
    if (slide.backgroundImage) {
      const fn = urlToFilename.get(slide.backgroundImage);
      if (fn) slide.backgroundImage = `${ASSETS_FOLDER}${fn}`;
    }
    if (slide.backgroundVideo) {
      const fn = urlToFilename.get(slide.backgroundVideo);
      if (fn) slide.backgroundVideo = `${ASSETS_FOLDER}${fn}`;
    }
    slide.elements.forEach((el: any) => {
      if ((el.type === 'image' || el.type === 'video') && el.src) {
        const fn = urlToFilename.get(el.src);
        if (fn) el.src = `${ASSETS_FOLDER}${fn}`;
      }
    });
  });

  return clone;
}

export async function saveAsArchive(presentation: Presentation): Promise<Blob> {
  const zip           = new jszip();
  const assetMap      = collectAssets(presentation);
  const urlToFilename = new Map<string, string>();
  assetMap.forEach((url, filename) => urlToFilename.set(url, filename));

  for (const [filename, url] of assetMap.entries()) {
    let bytes: Uint8Array;
    let finalFilename = filename;

    if (url.startsWith('data:')) {
      bytes = dataUrlToBytes(url);
    } else {
      // blob: URL — fetch real bytes and mime
      const result  = await blobUrlToBytes(url);
      bytes         = result.bytes;

      // Fix up .bin extension now that we know the real mime
      const realExt = extensionFromMime(result.mime);
      if (filename.endsWith('.bin') && realExt !== 'bin') {
        finalFilename = filename.replace(/\.bin$/, `.${realExt}`);
        urlToFilename.set(url, finalFilename);
      }
    }

    zip.file(`${ASSETS_FOLDER}${finalFilename}`, bytes);
  }

  const rewritten = rewriteUrls(presentation, urlToFilename);
  zip.file(MANIFEST_FILE, JSON.stringify(rewritten, null, 2));

  return zip.generateAsync({
    type:               'blob',
    compression:        'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

// ── LOAD ─────────────────────────────────────────────────────────────────────

function restoreUrls(
  presentation: Presentation,
  pathToUrl: Map<string, string>,
): Presentation {
  const clone: Presentation = JSON.parse(JSON.stringify(presentation));

  clone.slides.forEach((slide: any) => {
    if (slide.backgroundImage) {
      const url = pathToUrl.get(slide.backgroundImage);
      if (url) slide.backgroundImage = url;
    }
    if (slide.backgroundVideo) {
      const url = pathToUrl.get(slide.backgroundVideo);
      if (url) slide.backgroundVideo = url;
    }
    slide.elements.forEach((el: any) => {
      if ((el.type === 'image' || el.type === 'video') && el.src) {
        const url = pathToUrl.get(el.src);
        if (url) el.src = url;
      }
    });
  });

  return clone;
}

export async function loadFromArchiveAndUpload(
  file: File,
  onProgress?: (pct:number)=>void,
):Promise<any>{
  const presentation = await loadFromArchive(file,onProgress);
  const uploaded = await uploadPresentationAssets(presentation);
  return uploaded;
}

export async function loadFromArchive(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<Presentation> {
  const zip = await jszip.loadAsync(file);

  const manifestFile = zip.file(MANIFEST_FILE);
  if (!manifestFile) throw new Error('Invalid archive: missing presentation.json');

  const manifestJson = await manifestFile.async('string');
  const presentation: Presentation = JSON.parse(manifestJson);

  // ✅ Fix 2 — explicitly type the forEach callback parameters
  const assetEntries: Array<{ path: string; file: jszip.JSZipObject }> = [];
  zip.forEach((relativePath: string, zipFile: jszip.JSZipObject) => {
    if (!zipFile.dir && relativePath.startsWith(ASSETS_FOLDER)) {
      assetEntries.push({ path: relativePath, file: zipFile });
    }
  });

  if (assetEntries.length === 0) return presentation;

  const pathToUrl = new Map<string, string>();
  let loaded      = 0;

  for (const { path, file: zipFile } of assetEntries) {
    const bytes = await zipFile.async('uint8array');
    const mime  = mimeFromFilename(path);

    // ✅ Videos → blob: URL,  Images → data: URL
    const url = isVideoFilename(path)
      ? uint8ArrayToBlobUrl(bytes, mime)
      : uint8ArrayToDataUrl(bytes, mime);

    pathToUrl.set(path, url);
    loaded++;
    onProgress?.(Math.round((loaded / assetEntries.length) * 100));
  }

  return restoreUrls(presentation, pathToUrl);
}