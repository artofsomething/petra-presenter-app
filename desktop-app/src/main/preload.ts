// src/main/preload.ts — REPLACE ENTIRE FILE

import { contextBridge, ipcRenderer, desktopCapturer } from 'electron';

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

  getDesktopSources: async (types: Array<'window' | 'screen'>) => {
    return await ipcRenderer.invoke('get-desktop-sources', types);
  },
    openFileDialog: (filters?: { name: string; extensions: string[] }[]) =>
    ipcRenderer.invoke('dialog:openFile', filters),

  saveFileDialog: (args: {
    filePath?:    string;
    content:      string;
    defaultName?: string;
  }) => ipcRenderer.invoke('dialog:saveFile', args),

  readFile: (filePath: string) =>
    ipcRenderer.invoke('file:read', filePath),

  watchFile: (filePath: string) =>
    ipcRenderer.invoke('file:watch', filePath),

  unwatchFile: (filePath: string) =>
    ipcRenderer.invoke('file:unwatch', filePath),

  // ✅ Listen for file changes from main process
  onFileChanged: (callback: (filePath: string) => void) => {
    const handler = (_e: any, filePath: string) => callback(filePath);
    ipcRenderer.on('file:changed', handler);
    // ✅ Return unsubscribe function
    return () => ipcRenderer.removeListener('file:changed', handler);
  },
  openEditorWindow: (args: {
  filePath?: string;
  fileName?: string;
  content:   string;
}) => ipcRenderer.invoke('open-editor-window', args),

// ✅ Listen for file load request from main
onLoadFileInEditor: (callback: (data: {
  filePath?: string;
  fileName?: string;
  content:   string;
}) => void) => {
  const handler = (_e: any, data: any) => callback(data);
  ipcRenderer.on('load-file-in-editor', handler);
  return () => ipcRenderer.removeListener('load-file-in-editor', handler);
},
getPendingEditorFile: () =>
  ipcRenderer.invoke('get-pending-editor-file'),
readFileAsBase64: (filePath: string) =>
    ipcRenderer.invoke('read-file-as-base64', filePath),

importPresentationFile: (filePath: string) =>
  ipcRenderer.invoke('import-presentation-file', filePath),

//Bible section

// Bible methods
  bibleGetBooks: () => ipcRenderer.invoke('bible-get-books'),
  bibleGetChapter: (bookId: number, chapter: number) =>
    ipcRenderer.invoke('bible-get-chapter', bookId, chapter),
  bibleLookup: (reference: string) =>
    ipcRenderer.invoke('bible-lookup', reference),
  bibleSearch: (query: string, limit?: number) =>
    ipcRenderer.invoke('bible-search', query, limit || 30),
});