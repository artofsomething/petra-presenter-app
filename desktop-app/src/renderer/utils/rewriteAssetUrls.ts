// src/renderer/utils/rewriteAssetUrls.ts
import { getServerUrl } from '../store/useAssetStore';

/**
 * Rewrites ALL asset server URLs (port 8765) in a presentation object
 * to use the correct host for the CURRENT client:
 *
 * - Electron Desktop:  http://<any-ip>:8765/... → http://localhost:8765/...
 * - Mobile browser:    http://localhost:8765/... → http://<real-ip>:8765/...
 *
 * Safe to call on any client — no-op when URLs are already correct.
 */
export function rewriteAssetUrls<T extends object>(data: T): T {
  try {
    const json = JSON.stringify(data);

    // Regex matches: http://  (any chars except " and /)  :8765
    // Covers IPs, hostnames, localhost — anything on port 8765
    const ASSET_URL_RE = /http:\/\/[^"\\\/]+:8765/g;

    let rewritten: string;

    if ((window as any).electronAPI) {
      // ── Electron Desktop ─────────────────────────────────────────────────
      // Rewrite http://<anything>:8765 → http://localhost:8765
      rewritten = json.replace(ASSET_URL_RE, 'http://localhost:8765');

    } else {
      // ── Mobile browser ───────────────────────────────────────────────────
      const serverUrl = getServerUrl(); // e.g. http://192.168.1.5:8765
      if (serverUrl === 'http://localhost:8765') {
        return data; // dev mode — already correct
      }
      // Rewrite http://localhost:8765 → http://192.168.1.5:8765
      // (only rewrite localhost, not other IPs that may already be correct)
      rewritten = json.replace(
        /http:\/\/localhost:8765/g,
        serverUrl,
      );
    }

    if (rewritten === json) return data; // nothing changed — skip parse

    return JSON.parse(rewritten) as T;

  } catch (err) {
    console.error('[rewriteAssetUrls] Failed:', err);
    return data;
  }
}

/**
 * Rewrite a single URL for the current client.
 */
export function rewriteSingleUrl(url: string): string {
  if (!url) return url;
  try {
    if ((window as any).electronAPI) {
      return url.replace(/http:\/\/[^\/]+:8765/g, 'http://localhost:8765');
    }
    const serverUrl = getServerUrl();
    if (serverUrl === 'http://localhost:8765') return url;
    return url.replace(/http:\/\/localhost:8765/g, serverUrl);
  } catch {
    return url;
  }
}

/**
 * Converts a full asset URL to a server-relative path.
 * e.g. http://localhost:8765/assets/images/foo.png → /assets/images/foo.png
 */
export function toRelativeAssetUrl(url: string): string {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (parsed.port === '8765' && parsed.pathname.startsWith('/assets/')) {
      return parsed.pathname;
    }
  } catch { /* not a valid URL */ }
  return url;
}

/**
 * Resolves a relative or absolute asset URL to a full URL
 * for the current client. Use when RENDERING images/videos.
 */
export function resolveAssetUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('/assets/')) {
    return `${getServerUrl()}${url}`;
  }
  if (url.startsWith('http')) {
    return rewriteSingleUrl(url);
  }
  return url;
}