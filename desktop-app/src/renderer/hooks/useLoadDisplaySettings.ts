
import { useEffect } from 'react';
import usePresentationStore from '../store/usePresentation';

/**
 * Call once at app root — loads saved presentation resolution
 * from electron and pushes it into the Zustand store.
 */
export function useLoadDisplaySettings() {
  const setCanvasResolution = usePresentationStore(s => s.setCanvasResolution);

  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api?.getPresentationSettings) return;

    api.getPresentationSettings().then((s: {
      slideWidth: number;
      slideHeight: number;
    }) => {
      if (s?.slideWidth && s?.slideHeight) {
        setCanvasResolution(s.slideWidth, s.slideHeight);
      }
    });
  }, []);
}