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