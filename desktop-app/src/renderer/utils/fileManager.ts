// src/renderer/utils/fileManager.ts
/**
 * Manages blob URLs for video files.
 * Blob URLs work for runtime playback but don't persist in JSON saves.
 */
const blobUrlMap = new Map<string, string>();

export function createBlobUrl(file: File): string {
  const url = URL.createObjectURL(file);
  blobUrlMap.set(url, file.name);
  return url;
}

export function revokeBlobUrl(url: string) {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
    blobUrlMap.delete(url);
  }
}

export function isBlobUrl(url: string): boolean {
  return url.startsWith('blob:');
}

export function pickFile(
  accept: string,
  maxSizeMB: number = 100
): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        alert(`File too large. Max ${maxSizeMB}MB.`);
        resolve(null);
        return;
      }
      resolve(file);
    };

    input.click();
  });
}

export function readFileAsDataUrl(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}



export function readFileAsText(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader    = new FileReader();
    reader.onload   = (e) => resolve(e.target?.result as string);
    reader.onerror  = ()  => resolve(null);
    reader.readAsText(file);
  });
}
// ── ✅ readFileAsJson — used by StageDisplay to load .petra/.json files ───────

export async function readFileAsJson<T = unknown>(
  file: File,
): Promise<T | null> {
  try {
    const text = await readFileAsText(file);
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch (err) {
    console.error('[fileManager] Failed to parse JSON file:', file.name, err);
    return null;
  }
}

// ── ✅ readFileAsArrayBuffer — useful for binary formats ──────────────────────

export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer | null> {
  return new Promise((resolve) => {
    const reader    = new FileReader();
    reader.onload   = (e) => resolve(e.target?.result as ArrayBuffer);
    reader.onerror  = ()  => resolve(null);
    reader.readAsArrayBuffer(file);
  });
}

// ── ✅ File type guards ────────────────────────────────────────────────────────

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/');
}

export function isJsonFile(file: File): boolean {
  return (
    file.type === 'application/json' ||
    file.name.endsWith('.json')      ||
    file.name.endsWith('.petra')
  );
}

// ── ✅ Format file size helper ────────────────────────────────────────────────

export function formatFileSize(bytes: number): string {
  if (bytes === 0)              return '0 B';
  if (bytes < 1024)             return `${bytes} B`;
  if (bytes < 1024 * 1024)      return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}