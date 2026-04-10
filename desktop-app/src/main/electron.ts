
import { app, BrowserWindow, screen, ipcMain } from 'electron';
import path from 'path';
import os from 'os';
import { startWebSocketServer, getIO } from '../server/websocket-server';

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

app.whenReady().then(async () => {
  const wsPort = 8765;

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