// src/renderer/store/useAssetStore.ts
import { create } from 'zustand';

export interface AssetItem {
  filename:    string;
  url:         string;
  type:        'images' | 'videos';
  size?:       number;
  uploadedAt?: number;
}

export function getServerUrl(): string {
  if ((window as any).electronAPI) return 'http://localhost:8765';
  return `http://${window.location.hostname}:8765`;
}

interface AssetStore {
  images:       AssetItem[];
  videos:       AssetItem[];
  loading:      boolean;
  error:        string | null;
  // Internal: tracks in-flight fetch to prevent concurrent calls
  _fetching:    boolean;
  _fetchCount:  number;

  fetchAssets:  () => Promise<void>;
  deleteAsset:  (asset: AssetItem) => Promise<void>;
  allAssets:    () => AssetItem[];
}

const useAssetStore = create<AssetStore>((set, get) => ({
  images:      [],
  videos:      [],
  loading:     false,
  error:       null,
  _fetching:   false,
  _fetchCount: 0,

  // ── Derived ─────────────────────────────────────────────────────────────
  allAssets: () => [...get().images, ...get().videos],

  // ── Fetch — singleton: only one in-flight call at a time ────────────────
  fetchAssets: async () => {
    // Already fetching → skip, prevents duplicate accumulation
    if (get()._fetching) {
      console.log('[AssetStore] fetchAssets skipped — already in progress');
      return;
    }

    const thisFetch = get()._fetchCount + 1;
    set({ _fetching: true, _fetchCount: thisFetch, loading: true, error: null });

    try {
      const base = getServerUrl();
      const res  = await fetch(`${base}/assets-list`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const data = await res.json();

      // Discard stale response (another fetch completed after this one started)
      if (get()._fetchCount !== thisFetch) {
        console.log('[AssetStore] Discarding stale fetch');
        return;
      }

      // ── Deduplicate by filename (server should not return dupes, but guard anyway)
      const dedup = (items: AssetItem[]): AssetItem[] => {
        const seen = new Map<string, AssetItem>();
        for (const item of items) seen.set(item.filename, item);
        return Array.from(seen.values());
      };

      set({
        // Replace entirely — never accumulate / spread old state
        images: dedup(
          (data.images ?? []).map((f: any) => ({
            filename:   f.filename ?? f,
            url:        `${base}/assets/images/${f.filename ?? f}`,
            type:       'images' as const,
            size:       f.size,
            uploadedAt: f.uploadedAt,
          }))
        ),
        videos: dedup(
          (data.videos ?? []).map((f: any) => ({
            filename:   f.filename ?? f,
            url:        `${base}/assets/videos/${f.filename ?? f}`,
            type:       'videos' as const,
            size:       f.size,
            uploadedAt: f.uploadedAt,
          }))
        ),
      });

    } catch (err: any) {
      if (get()._fetchCount === thisFetch) {
        set({ error: err.message ?? 'Failed to fetch assets' });
      }
    } finally {
      if (get()._fetchCount === thisFetch) {
        set({ loading: false, _fetching: false });
      }
    }
  },

  // ── Delete then refresh ──────────────────────────────────────────────────
  deleteAsset: async (asset: AssetItem) => {
    try {
      const base = getServerUrl();
      const res  = await fetch(
        `${base}/assets/${asset.type}/${asset.filename}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      await get().fetchAssets();
    } catch (err) {
      console.error('[AssetStore] Delete failed:', err);
    }
  },
}));

export default useAssetStore;