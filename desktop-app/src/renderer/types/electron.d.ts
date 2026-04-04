// src/renderer/types/electron.d.ts
export interface ElectronAPI {
  getDisplays: () => Promise<any[]>;
  openPresentation: (displayId?: number) => Promise<boolean>;
  closePresentation: () => Promise<boolean>;
  getLocalIP: () => Promise<string>;
  onSlideChange: (callback: (slideIndex: number) => void) => void;
  onPresentationClosed: (callback: () => void) => void;
  onRemotePresentationStarted: (callback: () => void) => void;
  onRemotePresentationStopped: (callback: () => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}