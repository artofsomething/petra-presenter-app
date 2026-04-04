// src/renderer/hooks/useAssets.ts
// Re-exports from the store so existing imports keep working
export type { AssetItem } from '../store/useAssetStore';
export { default as useAssetStore } from '../store/useAssetStore';

import useAssetStore from '../store/useAssetStore';
import { useEffect } from 'react';

/**
 * Drop-in replacement for the old hook.
 * All callers share the same Zustand state — no more duplicate fetches.
 */
export function useAssets() {
  const store = useAssetStore();

  // Fetch on first mount of the FIRST subscriber.
  // Zustand guarantees this effect only runs once across all consumers
  // because the store itself tracks whether data has been loaded.
  useEffect(() => {
    // Only fetch if we have no data yet (avoids refetch on every mount)
    if (store.images.length === 0 && store.videos.length === 0 && !store.loading) {
      store.fetchAssets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    images:     store.images,
    videos:     store.videos,
    loading:    store.loading,
    error:      store.error,
    fetchAssets: store.fetchAssets,
    deleteAsset: store.deleteAsset,
    allAssets:  [...store.images, ...store.videos],
  };
}