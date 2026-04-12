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
  onDisplayInfo: (callback: (data: {
    displayId:   number;
    displayW:    number;
    displayH:    number;
    slideWidth:  number;
    slideHeight: number;
  }) => void) => (() => void);

  onResolutionChanged: (callback: (data: {
    width:  number;
    height: number;
  }) => void) => (() => void);



  // In ElectronAPI interface
saveFileDialog: (args: {
  filePath?:    string;
  content:      string;
  defaultName?: string;
}) => Promise<{
  success:    boolean;
  canceled?:  boolean;
  filePath?:  string;
  error?:     string;
} | null>;

openFileDialog: (filters?: Array<{
  name:       string;
  extensions: string[];
}>) => Promise<{
  filePath?:  string;
  fileName?:  string;
  content?:   string;
  error?:     string;
} | null>;

readFile: (filePath: string) => Promise<{
  content?: string;
  error?:   string;
} | null>;

  watchFile:   (filePath: string) => Promise<boolean>;
  unwatchFile: (filePath: string) => Promise<boolean>;
  onFileChanged: (callback: (filePath: string) => void) => (() => void);
openEditorWindow: (args: {
    filePath?: string;
    fileName?: string;
    content:   string;
  }) => Promise<{ success: boolean; reused: boolean } | null>;

  onLoadFileInEditor: (callback: (data: {
    filePath?: string;
    fileName?: string;
    content:   string;
  }) => void) => (() => void);
  getPendingEditorFile: () => Promise<{
    filePath?: string;
    fileName?: string;
    content:   string;
  } | null>;


}



declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}