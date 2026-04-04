// src/main/preload.ts — REPLACE ENTIRE FILE

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // ── Display info ──────────────────────────────────────
  getDisplays: () => ipcRenderer.invoke('get-displays'),

  // ── Presentation window control ───────────────────────
  openPresentation:  () => ipcRenderer.invoke('open-presentation'),
  closePresentation: () => ipcRenderer.invoke('close-presentation'),

  // ── Settings ──────────────────────────────────────────
  getPresentationSettings:   ()                     => ipcRenderer.invoke('get-presentation-settings'),
  setSelectedDisplays:       (ids: number[])        => ipcRenderer.invoke('set-selected-displays', ids),
  setPresentationResolution: (w: number, h: number) => ipcRenderer.invoke('set-presentation-resolution', w, h),

  // ── Network ───────────────────────────────────────────
  getLocalIP: () => ipcRenderer.invoke('get-local-ip'),

  // ── Events pushed FROM main → renderer ────────────────
  onDisplayInfo: (cb: (data: {
    displayId:   number;
    displayW:    number;
    displayH:    number;
    slideWidth:  number;
    slideHeight: number;
  }) => void) => {
    const handler = (_e: any, data: any) => cb(data);
    ipcRenderer.on('display-info', handler);
    return () => ipcRenderer.removeListener('display-info', handler);
  },

  onResolutionChanged: (cb: (data: { width: number; height: number }) => void) => {
    const handler = (_e: any, data: any) => cb(data);
    ipcRenderer.on('resolution-changed', handler);
    return () => ipcRenderer.removeListener('resolution-changed', handler);
  },

  onPresentationClosed: (cb: (data: { displayId: number }) => void) => {
    const handler = (_e: any, data: any) => cb(data);
    ipcRenderer.on('presentation-closed', handler);
    return () => ipcRenderer.removeListener('presentation-closed', handler);
  },

  onRemoteStarted: (cb: () => void) => {
    ipcRenderer.on('remote-presentation-started', cb);
  },

  onRemoteStopped: (cb: () => void) => {
    ipcRenderer.on('remote-presentation-stopped', cb);
  },
});