
import { app, BrowserWindow, screen, ipcMain,desktopCapturer, dialog } from 'electron';
import path from 'path';
import os from 'os';
import fs from 'fs';
import * as fsp from 'fs/promises';
import { startWebSocketServer, getIO } from '../server/websocket-server';
import { registerBibleIpc } from './bibleHandlers';

let mainWindow: BrowserWindow | null = null;
const presentationWindows = new Map<number, BrowserWindow>();

let selectedDisplayIds: number[] = [];
let slideWidth  = 1920;
let slideHeight = 1080;

const isDev = !app.isPackaged;

function getLocalIP(): string {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]!) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

function getAllDisplays() {
  return screen.getAllDisplays().map((d, i) => ({
    id:          d.id,
    index:       i,
    label:       d.label || `Display ${i + 1}`,
    bounds:      d.bounds,
    workArea:    d.workArea,
    isPrimary:   d.bounds.x === 0 && d.bounds.y === 0,
    scaleFactor: d.scaleFactor,
  }));
}

function createPresentationWindowOnDisplay(display: Electron.Display): BrowserWindow {
  const { x, y, width, height } = display.bounds;

  console.log(`🖥️  Creating presentation window on display ${display.id}`);
  console.log(`   Bounds: x=${x} y=${y} w=${width} h=${height}`);

  const win = new BrowserWindow({
    x,
    y,
    width,
    height,
    fullscreen:      false,   // ✅ Never set in constructor
    frame:           false,
    alwaysOnTop:     true,
    skipTaskbar:     true,
    backgroundColor: '#000000',
    show:            false,   // ✅ Don't show until ready
    title:           `Presentation — Display ${display.id}`,
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
    },
  });

  // ── Load correct URL ───────────────────────────────────────
  if (isDev) {
    // ✅ Use query param instead of hash — more reliable in Electron + Vite
    win.loadURL('http://localhost:5173/index.html#/presentation');
    win.webContents.openDevTools();
  } else {
    win.loadFile(
      path.join(__dirname, '../renderer/index.html'),
      { hash: '/presentation' }
    );
  }

  // ── Debug loading ──────────────────────────────────────────
  win.webContents.on('did-finish-load', () => {
    console.log(`✅ Presentation window ${display.id} loaded`);
    console.log(`   URL: ${win.webContents.getURL()}`);
  });

  win.webContents.on('did-fail-load', (_e, code, desc) => {
    console.error(`❌ Presentation window ${display.id} failed:`, code, desc);
  });

  // Console logs from renderer → main terminal
  win.webContents.on('console-message', (_e, level, message) => {
    console.log(`[Presentation ${display.id}]`, message);
  });

  // ── Show + fullscreen after load ───────────────────────────
  win.webContents.once('did-finish-load', () => {
    // Step 1: position and show
    win.setBounds({ x, y, width, height });
    win.show();

    console.log(`   Window shown at (${x}, ${y})`);

    // Step 2: go fullscreen after a reliable delay
    setTimeout(() => {
      if (win.isDestroyed()) return;

      win.setPosition(x, y);
      win.setFullScreen(true);

      console.log(`   Fullscreen set for display ${display.id}`);

      // Step 3: send display info to renderer AFTER fullscreen
      setTimeout(() => {
        if (win.isDestroyed()) return;
        win.webContents.send('display-info', {
          displayId:   display.id,
          displayW:    width,
          displayH:    height,
          slideWidth,
          slideHeight,
        });
        console.log(`   display-info sent to display ${display.id}`);
      }, 200);

    }, 300);
  });

  win.on('closed', () => {
    presentationWindows.delete(display.id);
    mainWindow?.webContents.send('presentation-closed', { displayId: display.id });
  });

  return win;
}

function openPresentationWindows() {
  const allDisplays = screen.getAllDisplays();

  const targets = selectedDisplayIds.length > 0
    ? allDisplays.filter((d) => selectedDisplayIds.includes(d.id))
    : [
        allDisplays.find((d) => d.bounds.x !== 0 || d.bounds.y !== 0)
        ?? allDisplays[0]
      ];

  console.log(`🖥️  Opening presentation on ${targets.length} display(s)`);

  for (const display of targets) {
    if (presentationWindows.has(display.id)) {
      console.log(`   Display ${display.id} already has a window`);
      continue;
    }
    const win = createPresentationWindowOnDisplay(display);
    presentationWindows.set(display.id, win);
  }
}

function closeAllPresentationWindows() {
  for (const [id, win] of presentationWindows) {
    if (!win.isDestroyed()) win.destroy();
    presentationWindows.delete(id);
  }
  console.log('🖥️  All presentation windows closed');
}

function broadcastToPresentation(event: string, data?: any) {
  for (const [, win] of presentationWindows) {
    if (!win.isDestroyed()) {
      win.webContents.send(event, data);
    }
  }
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width:  1400,
    height: 900,
    title:  'Presenter App - Editor',
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    closeAllPresentationWindows();
  });
}

// ── IPC ───────────────────────────────────────────────────────────────────────

ipcMain.handle('get-displays', () => getAllDisplays());

ipcMain.handle('get-presentation-settings', () => ({
  selectedDisplayIds,
  slideWidth,
  slideHeight,
}));

ipcMain.handle('set-selected-displays', (_e, ids: number[]) => {
  selectedDisplayIds = ids;
  console.log('🖥️  Selected displays updated:', ids);

  // Close windows no longer in selection
  for (const [id, win] of presentationWindows) {
    if (!ids.includes(id)) {
      if (!win.isDestroyed()) win.destroy();
      presentationWindows.delete(id);
    }
  }

  // Open new windows if presentation is running
  if (presentationWindows.size > 0) {
    const allDisplays = screen.getAllDisplays();
    for (const id of ids) {
      if (!presentationWindows.has(id)) {
        const display = allDisplays.find((d) => d.id === id);
        if (display) {
          const win = createPresentationWindowOnDisplay(display);
          presentationWindows.set(id, win);
        }
      }
    }
  }
  return true;
});
ipcMain.handle('get-desktop-sources', async (_event, types) => {
  const sources = await desktopCapturer.getSources({
    types,
    thumbnailSize: { width: 320, height: 180 }, // preview thumbnails
    fetchWindowIcons: true,
  });

  // ✅ Return serializable data only
  return sources.map(source => ({
    id:        source.id,
    name:      source.name,
    thumbnail: source.thumbnail.toDataURL(), // base64 preview
    appIcon:   source.appIcon?.toDataURL() ?? null,
  }));
});


ipcMain.handle('set-presentation-resolution', (_e, w: number, h: number) => {
  slideWidth  = w;
  slideHeight = h;
  broadcastToPresentation('resolution-changed', { width: w, height: h });
  return true;
});

ipcMain.handle('open-presentation', () => {
  openPresentationWindows();
  return true;
});

ipcMain.handle('close-presentation', () => {
  closeAllPresentationWindows();
  return true;
});

ipcMain.handle('get-local-ip', () => getLocalIP());

function setupWebSocketBridge() {
  const io = getIO();
  if (!io) return;

  io.on('connection', (socket) => {
    socket.on('start-presentation', () => {
      openPresentationWindows();
      mainWindow?.webContents.send('remote-presentation-started');
    });
    socket.on('stop-presentation', () => {
      closeAllPresentationWindows();
      mainWindow?.webContents.send('remote-presentation-stopped');
    });
  });
}

ipcMain.handle('dialog:openFile', async (_e, filters?: Electron.FileFilter[]) => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters:    filters ?? [
      { name: 'Presentation', extensions: ['json', 'petra'] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) return null;

  const filePath = result.filePaths[0];
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return {
      filePath,
      fileName: path.basename(filePath),
      content,
    };
  } catch (err: any) {
    console.error('[main] openFile error:', err);
    return { error: err.message };
  }
});

// ── File: Save (overwrite OR save-as) ────────────────────────────────────
ipcMain.handle('dialog:saveFile', async (_e, {
  filePath,
  content,
  defaultName,
}: {
  filePath?:    string;
  content:      string;
  defaultName?: string;
}) => {
  try {
    // ✅ filePath provided → overwrite directly, no dialog
    if (filePath) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log('[main] Saved:', filePath);
      return { success: true, filePath };
    }

    // ✅ No filePath → show Save As dialog
    const result = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: defaultName ?? 'presentation.json',
      filters:     [
        { name: 'Presentation', extensions: ['json'] },
      ],
    });

    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }

    fs.writeFileSync(result.filePath, content, 'utf-8');
    console.log('[main] Saved As:', result.filePath);
    return { success: true, filePath: result.filePath };

  } catch (err: any) {
    console.error('[main] saveFile error:', err);
    return { error: err.message };
  }
});

ipcMain.handle('read-file-as-base64', async (_event, filePath: string) => {
  try {
    const buffer = await fsp.readFile(filePath);
    return { content: buffer.toString('base64') };
  } catch (err: any) {
    return { error: err.message };
  }
});

// ── File: Read content ────────────────────────────────────────────────────
ipcMain.handle('file:read', (_e, filePath: string) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { content };
  } catch (err: any) {
    console.error('[main] file:read error:', err);
    return { error: err.message };
  }
});

// ── File: Watch for changes ───────────────────────────────────────────────
const fileWatchers = new Map<string, fs.FSWatcher>();

ipcMain.handle('file:watch', (_e, filePath: string) => {
  // ✅ Don't duplicate watchers
  if (fileWatchers.has(filePath)) return true;

  try {
    // ✅ Debounce — fs.watch fires twice on some OS
    let debounceTimer: NodeJS.Timeout | null = null;

    const watcher = fs.watch(filePath, (eventType) => {
      if (eventType !== 'change') return;
      if (debounceTimer) return;

      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        // ✅ Notify ALL renderer windows
        BrowserWindow.getAllWindows().forEach(win => {
          if (!win.isDestroyed()) {
            win.webContents.send('file:changed', filePath);
          }
        });
        console.log('[main] File changed:', filePath);
      }, 300);
    });

    watcher.on('error', (err) => {
      console.error('[main] Watcher error:', err);
      fileWatchers.delete(filePath);
    });

    fileWatchers.set(filePath, watcher);
    console.log('[main] Watching:', filePath);
    return true;
  } catch (err: any) {
    console.error('[main] file:watch error:', err);
    return false;
  }
});

ipcMain.handle('file:unwatch', (_e, filePath: string) => {
  const watcher = fileWatchers.get(filePath);
  if (watcher) {
    watcher.close();
    fileWatchers.delete(filePath);
    console.log('[main] Unwatched:', filePath);
  }
  return true;
});

// In your main process handlers file

ipcMain.handle('import-presentation-file', async (_event, filePath: string) => {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const buffer = await fsp.readFile(filePath);

    if (ext === '.pdf') {
      // ── PDF ─────────────────────────────────────────────────────────────
      const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

      const uint8 = new Uint8Array(buffer);
      const loadingTask = pdfjsLib.getDocument({
        data: uint8,
        useSystemFonts: true,
      });
      const pdfDoc = await loadingTask.promise;
      const pages: string[] = [];

      console.log(`[import] PDF loaded: ${pdfDoc.numPages} pages`);

      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const strings: string[] = [];
        let lastY: number | null = null;

        for (const item of textContent.items) {
          const textItem = item as any;
          if (!textItem.str && !textItem.str?.trim()) continue;

          if (lastY !== null && Math.abs(textItem.transform[5] - lastY) > 2) {
            strings.push('\n');
          }
          strings.push(textItem.str);
          lastY = textItem.transform[5];
        }

        const pageText = strings.join('').trim();
        if (pageText) pages.push(pageText);
        console.log(`[import] Page ${i}: ${pageText.length} chars`);
      }

      return { success: true, fileType: 'pdf', pages };

    } else if (ext === '.docx') {
      // ── DOCX ────────────────────────────────────────────────────────────
      let mammoth: any;
      try {
        const mod = require('mammoth');
        mammoth = mod.default || mod;
      } catch (e) {
        console.error('[import] Failed to load mammoth:', e);
        return { success: false, error: 'mammoth module not found' };
      }

      const result = await mammoth.convertToHtml(
        { buffer },
        {
          styleMap: [
            "p[style-name='Title'] => h1:fresh",
            "p[style-name='Heading 1'] => h1:fresh",
            "p[style-name='Heading 2'] => h2:fresh",
            "p[style-name='Heading 3'] => h3:fresh",
            "p[style-name='Subtitle'] => h2:fresh",
          ],
        },
      );

      console.log(`[import] DOCX converted: ${result.value.length} chars of HTML`);
      return { success: true, fileType: 'docx', html: result.value };

    } else if (ext === '.doc') {
      // ── DOC (legacy binary format) ──────────────────────────────────────
      const WordExtractor = require('word-extractor');
      const extractor = new WordExtractor();
      const doc = await extractor.extract(buffer);

      // Get the main body text
      const body = doc.getBody() || '';
      // Get headers if available
      const headers = doc.getHeaders({ includeFooters: false }) || '';

      console.log(`[import] DOC extracted: ${body.length} chars`);

      // Split into paragraphs and build simple HTML-like structure
      // so we can reuse the same DOCX→markup pipeline
      const paragraphs = body
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0);

      // Heuristic: try to detect headings
      // Short lines that are ALL CAPS or end with no period → likely headings
      const htmlParts: string[] = [];

      for (const para of paragraphs) {
        const isLikelyHeading =
          (para.length < 80 && para === para.toUpperCase() && para.length > 3) ||
          (para.length < 60 && !para.endsWith('.') && !para.endsWith(',') && !para.includes('. '));

        if (isLikelyHeading && para.length < 40) {
          htmlParts.push(`<h1>${escapeHtml(para)}</h1>`);
        } else if (isLikelyHeading) {
          htmlParts.push(`<h2>${escapeHtml(para)}</h2>`);
        } else {
          htmlParts.push(`<p>${escapeHtml(para)}</p>`);
        }
      }

      const html = htmlParts.join('\n');
      console.log(`[import] DOC → HTML: ${html.length} chars`);

      // Return as 'docx' fileType so renderer uses the same HTML→markup pipeline
      return { success: true, fileType: 'docx', html };

    } else {
      return { success: false, error: `Unsupported file type: ${ext}` };
    }
  } catch (err: any) {
    console.error('[import-presentation-file] Error:', err);
    return { success: false, error: err.message };
  }
});

// Helper to escape HTML special characters
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const editorWindows = new Map<string, BrowserWindow>();

const pendingEditorFilesByWindow = new Map<number, {
  filePath?: string;
  fileName?: string;
  content:   string;
}>();

ipcMain.handle('open-editor-window', async (_e, args: {
  filePath?: string;
  fileName?: string;
  content:   string;
}) => {
  // ✅ If already open for this file → just focus it
  if (args.filePath && editorWindows.has(args.filePath)) {
    const existing = editorWindows.get(args.filePath)!;
    if (!existing.isDestroyed()) {
      existing.focus();
      return { success: true, reused: true };
    }
    editorWindows.delete(args.filePath);
  }

  const win = new BrowserWindow({
    width:  1400,
    height: 900,
    title:  `Editor — ${args.fileName ?? 'Presentation'}`,
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
    },
  });

  // ✅ FIX 1: Store BEFORE loadURL so it's ready when renderer requests it
  // did-finish-load is too late — store immediately after window creation
  pendingEditorFilesByWindow.set(win.webContents.id, args);

  // ✅ FIX 2: Also inject via sessionStorage as backup
  // dom-ready fires before React mounts, so sessionStorage will be ready
  win.webContents.on('dom-ready', () => {
    // ✅ FIX 3: Proper JSON escaping — use JSON.stringify inside the script
    // instead of string interpolation which breaks on special chars
    const safeData = JSON.stringify(JSON.stringify(args)); // double stringify
    win.webContents.executeJavaScript(`
      try {
        sessionStorage.setItem('pendingEditorFile', ${safeData});
        console.log('[Main] pendingEditorFile injected to sessionStorage');
      } catch(e) {
        console.error('[Main] sessionStorage inject failed:', e);
      }
    `).catch(console.error);
  });

  if (isDev) {
    win.loadURL('http://localhost:5173/index.html#/editor');
    win.webContents.openDevTools();
  } else {
    win.loadFile(
      path.join(__dirname, '../renderer/index.html'),
      { hash: '/editor' }
    );
  }

  win.webContents.on('console-message', (_e, _level, msg) => {
    console.log('[EditorWindow]', msg);
  });

  // ✅ FIX 4: Track window + cleanup pending data on close
  if (args.filePath) {
    editorWindows.set(args.filePath, win);
  }

  win.on('closed', () => {
    // ✅ FIX 5: Clean up by webContents.id (not transferId which doesn't exist)
    pendingEditorFilesByWindow.delete(win.webContents.id);
    if (args.filePath) {
      editorWindows.delete(args.filePath);
    }
  });

  return { success: true, reused: false };
});

// ✅ FIX 6: Use correct parameter name 'event' not '_e'
ipcMain.handle('get-pending-editor-file', (event) => {
  const id   = event.sender.id;
  const data = pendingEditorFilesByWindow.get(id);

  if (data) {
    pendingEditorFilesByWindow.delete(id); // ✅ consume once
    console.log('[Main] Served pending file to window:', id);
    return data;
  }

  console.log('[Main] No pending file for window:', id);
  return null;
});

app.whenReady().then(async () => {
  const wsPort = 8765;
   registerBibleIpc();

  // ✅ Start WS server FIRST, wait for it to be ready
  startWebSocketServer(wsPort);

  // ✅ Small delay before creating window so WS is listening
  await new Promise((resolve) => setTimeout(resolve, 500));

  createMainWindow();
  setupWebSocketBridge();

  const ip = getLocalIP();
  console.log('========================================');
  console.log('  🎤 Presenter App Started!');
  console.log(`  📡 WebSocket: ws://${ip}:${wsPort}`);
  console.log(`  🎮 Controller: http://${ip}:${wsPort}/#/controller`);
  console.log(`  👁️  Viewer:     http://${ip}:${wsPort}/#/viewer`);
  console.log('========================================');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});
