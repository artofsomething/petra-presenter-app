
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createServer, Server as HTTPServer } from 'http';
import express, { type Request, type Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import crypto from 'crypto';
import { createServer as createDebugServer } from 'http';
import { networkInterfaces } from 'os';

// ── Asset Directory Setup ─────────────────────────────────────────────────────
function getAssetsDir(): string {
  const base = (global as any).__appDataPath
    ?? process.env.APPDATA
    ?? process.env.HOME
    ?? process.cwd();
  const dir = path.join(base, 'presenter-assets');
  ['images', 'videos'].forEach((sub) => {
    const p = path.join(dir, sub);
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  });
  return dir;
}

export function registerAssetRoutes(app: express.Express, port: number) {
  const assetsDir = getAssetsDir();

  const storage = multer.diskStorage({
    destination: (req, _file, cb) => {
      const type    = req.params.type as string ?? 'images';
      const destDir = path.join(assetsDir, type);
      if (type !== 'images' && type !== 'videos') {
        cb(new Error(`Invalid type: ${type}`), '');
        return;
      }
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      cb(null, destDir);
    },
    filename: (_req, file, cb) => {
      const ext  = path.extname(file.originalname).toLowerCase() || '.bin';
      const hash = crypto.randomBytes(8).toString('hex');
      const ts   = Date.now();
      cb(null, `${ts}_${hash}${ext}`);
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: 500 * 1024 * 1024 },
  });

  app.use('/assets', express.static(assetsDir, {
    maxAge:       '1d',
    etag:         true,
    lastModified: true,
  }));

  app.delete('/assets/:type/:filename', (req: Request, res: Response) => {
    const type     = req.params.type     as string;
    const filename = req.params.filename as string;
    if (type !== 'images' && type !== 'videos') {
      res.status(400).json({ error: 'Invalid type' });
      return;
    }
    const safe = path.basename(filename);
    if (!safe || safe === '.' || safe === '..') {
      res.status(400).json({ error: 'Invalid filename' });
      return;
    }
    const fp = path.join(assetsDir, type, safe);
    if (!fs.existsSync(fp)) {
      res.status(404).json({ error: 'File not found' });
      return;
    }
    try {
      fs.unlinkSync(fp);
      console.log(`🗑️  Deleted: ${type}/${safe}`);
      res.json({ success: true });
    } catch (err) {
      console.error('[assets] Delete error:', err);
      res.status(500).json({ error: 'Failed to delete file' });
    }
  });

  app.post('/upload/:type', upload.single('file'), (req: Request, res: Response) => {
    const type = req.params.type as string;
    if (type !== 'images' && type !== 'videos') {
      res.status(400).json({ error: 'Invalid type' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    const fileUrl = `http://${getLocalIP()}:${port}/assets/${type}/${req.file.filename}`;
    console.log(`📎 Uploaded: ${fileUrl}`);
    res.json({ url: fileUrl, filename: req.file.filename });
  });

  app.get('/assets-list', (_req: Request, res: Response) => {
    const getFiles = (sub: string) => {
      const dir = path.join(assetsDir, sub);
      if (!fs.existsSync(dir)) return [];
      return fs.readdirSync(dir)
        .filter(f => !f.startsWith('.'))
        .map((filename) => {
          const fp   = path.join(dir, filename);
          const stat = fs.statSync(fp);
          return { filename, size: stat.size, uploadedAt: stat.mtimeMs };
        })
        .sort((a, b) => b.uploadedAt - a.uploadedAt);
    };
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ images: getFiles('images'), videos: getFiles('videos') }, null, 2));
  });

  console.log(`📁 Assets dir: ${assetsDir}`);
  console.log(`🌐 Assets URL: http://${getLocalIP()}:${port}/assets/`);
}

export function getLocalIP(): string {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]!) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

// ── State ─────────────────────────────────────────────────────────────────────
let io:         SocketIOServer | null = null;
let httpServer: HTTPServer     | null = null;

interface CachedState {
  presentation:      any;
  currentSlideIndex: number;
  isPresenting:      boolean;
  isBlackScreen:     boolean;
}

let cachedState: CachedState = {
  presentation:      null,
  currentSlideIndex: 0,
  isPresenting:      false,
  isBlackScreen:     false,
};

export function getIO():          SocketIOServer | null { return io; }
export function getCachedState()                        { return cachedState; }

function buildClientList(): any[] {
  if (!io) return [];
  return Array.from(io.sockets.sockets.values())
    .filter((s: any) => s.data?.role)
    .map((s: any) => ({
      id:          s.id,
      name:        s.data.name        ?? 'Unknown',
      role:        s.data.role        ?? 'unknown',
      connectedAt: s.data.connectedAt ?? Date.now(),
    }));
}

// ── Sanitise helpers ──────────────────────────────────────────────────────────

function sanitizeForBrowser(presentation: any): any {
  if (!presentation) return null;
  try {
    return {
      ...presentation,
      slides: (presentation.slides ?? []).map((slide: any) => ({
        ...slide,
        backgroundGradient: slide.backgroundGradient ?? null,
        backgroundColor:    slide.backgroundColor    ?? '#ffffff',
        backgroundImage: slide.backgroundImage?.startsWith('blob:')
          ? null : (slide.backgroundImage ?? null),
        backgroundVideo: slide.backgroundVideo?.startsWith('blob:')
          ? null : (slide.backgroundVideo ?? null),
        elements: (slide.elements ?? []).map((el: any) => ({
          ...el,
          src:      el.src?.startsWith('blob:')      ? null : (el.src      ?? null),
          videoSrc: el.videoSrc?.startsWith('blob:') ? null : (el.videoSrc ?? null),
        })),
      })),
    };
  } catch (e) {
    console.error('sanitizeForBrowser error:', e);
    return presentation;
  }
}

function stripAssetsForEditor(presentation: any): any {
  if (!presentation) return null;
  try {
    return {
      ...presentation,
      slides: (presentation.slides ?? []).map((slide: any) => ({
        ...slide,
        backgroundImage: slide.backgroundImage ? '__ASSET_PRESENT__' : null,
        backgroundVideo: slide.backgroundVideo ? '__ASSET_PRESENT__' : null,
        elements: (slide.elements ?? []).map((el: any) => ({
          ...el,
          src:      el.src      ? '__ASSET_PRESENT__' : null,
          videoSrc: el.videoSrc ? '__ASSET_PRESENT__' : null,
        })),
      })),
    };
  } catch (e) {
    console.error('stripAssetsForEditor error:', e);
    return presentation;
  }
}

/**
 * Returns the correct presentation payload for a recipient.
 *
 * @param presentation  Full presentation from cachedState
 * @param role          RECIPIENT's role
 * @param source        WHO sent the original update
 */
function sanitizeForRole(
  presentation: any,
  role:         string,
  source        = 'editor',
): any {
  if (!presentation) return null;

  if (role === 'editor') {
    if (source === 'mobile-editor') {
      // ✅ Desktop does NOT have mobile's newly added assets — send full URLs
      console.log('[sanitizeForRole] editor ← mobile: FULL (new assets from mobile)');
      return presentation;
    }
    // Editor receiving its own echo — strip (it already has these assets)
    console.log('[sanitizeForRole] editor ← editor: STRIPPED (own echo)');
    return stripAssetsForEditor(presentation);
  }

  if (role === 'display') {
    // Display needs everything to render
    return presentation;
  }

  // Controllers / mobile-editor / others — remove blob: only
  return sanitizeForBrowser(presentation);
}

// ── Broadcast helpers ─────────────────────────────────────────────────────────

function sendStateTo(socket: Socket, source = 'editor') {
  const role     = (socket as any).data?.role ?? 'unknown';
  const presData = sanitizeForRole(cachedState.presentation, role, source);

  socket.emit('sync-state', {
    presentation:      presData,
    currentSlideIndex: cachedState.currentSlideIndex,
    isPresenting:      cachedState.isPresenting,
    isBlackScreen:     cachedState.isBlackScreen,
    clients:           buildClientList(),
  });
}

function broadcastPresentationUpdate(
  excludeSocketId: string,
  source          = 'editor',
) {
  if (!io) return;

  let count = 0;
  for (const [, socket] of io.sockets.sockets) {
    if (socket.id === excludeSocketId) continue;
    if (!(socket as any).data?.role)   continue;

    const role     = (socket as any).data.role;
    // ✅ Pass source so editor gets full URLs when update came from mobile
    const presData = sanitizeForRole(cachedState.presentation, role, source);

    socket.emit('presentation-updated', {
      presentation:      presData,
      currentSlideIndex: cachedState.currentSlideIndex,
      source,
    });

    const label =
      source === 'mobile-editor' && role === 'editor' ? 'FULL (mobile→desktop)' :
      role === 'editor'                               ? 'STRIPPED (own echo)'   :
      'SANITIZED';

    console.log(`   → ${role} (${socket.id.slice(0, 6)}): ${label}`);
    count++;
  }

  console.log(
    `📡 Broadcast to ${count} clients —`,
    `${cachedState.presentation?.slides?.length ?? 0} slides`,
    `(source: ${source})`,
  );
}

function broadcastSlideChange(excludeSocketId?: string) {
  if (!io) return;
  for (const [, socket] of io.sockets.sockets) {
    if (socket.id === excludeSocketId) continue;
    socket.emit('slide-changed', { index: cachedState.currentSlideIndex });
  }
}

// ── Server startup ────────────────────────────────────────────────────────────
export function startWebSocketServer(port: number = 8765): SocketIOServer {
  if (io) {
    console.log('⚠️  WS server already running');
    return io;
  }

  const app = express();

  app.use((_req: Request, res: Response, next: () => void) => {
    res.header('Access-Control-Allow-Origin',  '*');
    res.header('Access-Control-Allow-Headers', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,DELETE');
    next();
  });

  registerAssetRoutes(app, port);

  app.get('/debug', (_req: Request, res: Response) => {
    const sockets = io
      ? Array.from(io.sockets.sockets.values()).map((s: any) => ({
          id:        s.id,
          role:      s.data?.role ?? 'none',
          name:      s.data?.name ?? 'none',
          connected: s.connected,
        }))
      : [];
    const payload = {
      cachedPresentation: cachedState.presentation
        ? { name: cachedState.presentation.name,
            slides: cachedState.presentation.slides?.length ?? 0 }
        : null,
      currentSlideIndex: cachedState.currentSlideIndex,
      isPresenting:      cachedState.isPresenting,
      isBlackScreen:     cachedState.isBlackScreen,
      connectedSockets:  sockets,
    };
    res.setHeader('Content-Type', 'application/json');
    res.status(200).end(JSON.stringify(payload, null, 2));
  });

  const possiblePaths = [
    path.join(__dirname, '../renderer'),
    path.join(__dirname, '../../dist/renderer'),
    path.join(process.cwd(), 'dist/renderer'),
  ];
  const rendererPath = possiblePaths.find((p) => fs.existsSync(p));

  if (rendererPath) {
    console.log(`📂 Serving renderer from: ${rendererPath}`);
    app.use(express.static(rendererPath, { redirect: false }));
    app.use((_req: Request, res: Response) => {
      const idx = path.join(rendererPath, 'index.html');
      if (fs.existsSync(idx)) res.sendFile(idx);
      else res.status(404).send('Run npm run build first.');
    });
  } else {
    app.get('/', (_req: Request, res: Response) => {
      res.send(`<html><body style="background:#111;color:#fff;font-family:sans-serif;padding:40px">
        <h2>🎤 Presenter App Server</h2><p>Port: ${port} | Dev mode</p>
      </body></html>`);
    });
  }

  httpServer = createServer(app);

  io = new SocketIOServer(httpServer, {
    cors:              { origin: '*', methods: ['GET', 'POST'] },
    transports:        ['websocket', 'polling'],
    pingTimeout:       60000,
    pingInterval:      25000,
    upgradeTimeout:    30000,
    maxHttpBufferSize: 1e8,
    allowEIO3:         true,
  });

  (io.engine as any).on('connection_error', (err: any) => {
    console.error('[engine] connection_error:', err.code, err.message);
  });

  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Connected: ${socket.id}`);

    // ── Register ─────────────────────────────────────────────────────────
    socket.on('register', (data: { name?: string; role?: string } = {}) => {
      (socket as any).data = {
        name:        data.name || 'Unknown',
        role:        data.role || 'unknown',
        connectedAt: Date.now(),
      };
      console.log(`📋 Registered: "${data.name}" as ${data.role} (${socket.id})`);
      io!.emit('clients-updated', buildClientList());

      if (data.role === 'mobile-editor' && io) {
        const editorSocket = Array.from(io.sockets.sockets.values()).find(
          (s: any) => s.data?.role === 'editor'
        );
        if (editorSocket) {
          console.log(`   → Asking editor to push fresh data for mobile-editor`);
          editorSocket.emit('push-presentation-request');
        }
      }

      sendStateTo(socket);
    });

    // ── Request sync ──────────────────────────────────────────────────────
    socket.on('request-sync', () => {
      const role = (socket as any).data?.role ?? 'unknown';
      console.log(`🔄 Sync request from ${role} (${socket.id})`);
      sendStateTo(socket);
    });

    // ── Navigation ────────────────────────────────────────────────────────
    socket.on('next-slide', () => {
      if (!cachedState.presentation) return;
      const max = cachedState.presentation.slides.length - 1;
      if (cachedState.currentSlideIndex < max) {
        cachedState.currentSlideIndex++;
        io!.emit('slide-changed', { index: cachedState.currentSlideIndex });
        console.log(`▶ Next: ${cachedState.currentSlideIndex}`);
      }
    });

    socket.on('prev-slide', () => {
      if (cachedState.currentSlideIndex > 0) {
        cachedState.currentSlideIndex--;
        io!.emit('slide-changed', { index: cachedState.currentSlideIndex });
        console.log(`◀ Prev: ${cachedState.currentSlideIndex}`);
      }
    });

    socket.on('go-to-slide', (index: number) => {
      if (!cachedState.presentation) return;
      const max = cachedState.presentation.slides.length - 1;
      cachedState.currentSlideIndex = Math.max(0, Math.min(index, max));
      io!.emit('slide-changed', { index: cachedState.currentSlideIndex });
      console.log(`🎯 Go to: ${cachedState.currentSlideIndex}`);
    });

    // ── Presentation control ──────────────────────────────────────────────
    socket.on('start-presentation', () => {
      cachedState.isPresenting = true;
      io!.emit('presentation-started', { index: cachedState.currentSlideIndex });
      console.log('▶️  Presentation started');
    });

    socket.on('stop-presentation', () => {
      cachedState.isPresenting = false;
      io!.emit('presentation-stopped');
      console.log('⏹️  Presentation stopped');
    });

    socket.on('toggle-black-screen', () => {
      cachedState.isBlackScreen = !cachedState.isBlackScreen;
      io!.emit('black-screen-toggled', cachedState.isBlackScreen);
      console.log(`🖤 Black screen: ${cachedState.isBlackScreen}`);
    });

    // ── Update presentation ───────────────────────────────────────────────
    socket.on('update-presentation', (data: any) => {
      const slideCount = data.presentation?.slides?.length ?? 0;
      const source     = data.source ?? 'editor';
      console.log(
        `📥 update-presentation: ${slideCount} slides`,
        `from ${(socket as any).data?.role ?? socket.id}`,
        `(source: ${source})`,
      );

      if (data.presentation !== undefined) {
        cachedState.presentation = data.presentation;
      }
      if (data.currentSlideIndex != null) {
        cachedState.currentSlideIndex = data.currentSlideIndex;
      }

      // ✅ Pass source so recipients get correct sanitization
      broadcastPresentationUpdate(socket.id, source);
    });

    // ── Update slide index only ───────────────────────────────────────────
    socket.on('update-slide-index', (index: number) => {
      cachedState.currentSlideIndex = index;
      broadcastSlideChange(socket.id);
      console.log(`📍 Slide index: ${index}`);
    });

    // ── Pull presentation ─────────────────────────────────────────────────
    socket.on('pull-presentation', () => {
      const requesterRole = (socket as any).data?.role ?? 'unknown';
      const requesterName = (socket as any).data?.name ?? socket.id;
      console.log(`📥 pull-presentation from "${requesterName}" (${requesterRole})`);

      if (cachedState.presentation) {
        console.log(`   ✅ Serving from cache: "${cachedState.presentation.name}"`);
        // ✅ Never strip for pull — requester needs full URLs
        socket.emit('presentation-pulled', {
          presentation: cachedState.presentation,
        });
        return;
      }

      const editorSocket = Array.from(io!.sockets.sockets.values()).find(
        (s: any) => s.data?.role === 'editor' && s.id !== socket.id
      );

      if (!editorSocket) {
        socket.emit('presentation-pulled', {
          error: 'No Desktop Editor is connected',
        });
        return;
      }

      editorSocket.emit('pull-presentation', { requesterId: socket.id });
    });

    // ── Editor responds to pull request ───────────────────────────────────
    socket.on('presentation-pulled-response', (data: {
      presentation: any;
      requesterId:  string;
    }) => {
      const senderRole = (socket as any).data?.role ?? 'unknown';
      console.log(
        `📤 presentation-pulled-response from "${senderRole}"`,
        `→ relaying to ${data.requesterId}`,
      );

      if (!io || !data.requesterId) return;

      const requesterSocket = io.sockets.sockets.get(data.requesterId);
      if (!requesterSocket) {
        console.warn(`   ⚠️  Requester ${data.requesterId} no longer connected`);
        return;
      }

      // ✅ Full presentation — no sanitization for pull responses
      requesterSocket.emit('presentation-pulled', {
        presentation: data.presentation,
      });

      console.log(
        `   ✓ Relayed "${data.presentation?.name}"`,
        `(${data.presentation?.slides?.length ?? 0} slides)`,
        `to ${data.requesterId}`,
      );
    });

    // ── Disconnect ────────────────────────────────────────────────────────
    socket.on('disconnect', (reason: string) => {
      console.log(`🔌 Disconnected: ${socket.id} — ${reason}`);
      setTimeout(() => { io?.emit('clients-updated', buildClientList()); }, 200);
    });

    socket.on('error', (err: Error) => {
      console.error(`[socket] Error on ${socket.id}:`, err.message);
    });
  });

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server on port ${port}`);
    console.log(`📡 Local IP: ${getLocalIP()}`);
  });

  const debugApp = express();
  debugApp.get('/debug', (_req: Request, res: Response) => {
    const sockets = io
      ? Array.from(io.sockets.sockets.values()).map((s: any) => ({
          id:        s.id,
          role:      s.data?.role ?? 'none',
          name:      s.data?.name ?? 'none',
          connected: s.connected,
        }))
      : [];
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      cachedPresentation: cachedState.presentation
        ? { name: cachedState.presentation.name,
            slides: cachedState.presentation.slides?.length ?? 0 }
        : null,
      currentSlideIndex: cachedState.currentSlideIndex,
      connectedSockets:  sockets,
    }, null, 2));
  });
  createDebugServer(debugApp).listen(8766, '0.0.0.0', () => {
    console.log(`🔍 Debug server on port 8766`);
  });

  httpServer.timeout          = 0;
  httpServer.keepAliveTimeout = 65000;
  httpServer.headersTimeout   = 66000;

  httpServer.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') console.error(`❌ Port ${port} in use`);
    else console.error('❌ Server error:', err.message);
  });

  return io;
}

export function stopWebSocketServer() {
  io?.close();
  httpServer?.close();
  io         = null;
  httpServer = null;
}
// import http from 'http';
// import { Server as SocketIOServer, Socket } from 'socket.io';
// import { v4 as uuidv4 } from 'uuid';

// let io: SocketIOServer | null = null;
// let httpServer: http.Server | null = null;

// const connectedClients = new Map();
// let currentPresentation: any = null;
// let currentSlideIndex = 0;
// let isPresenting = false;
// let isBlackScreen = false;

// export function startWebSocketServer(port: number) {
//   httpServer = http.createServer((req, res) => {
//     // Simple health check endpoint
//     if (req.url === '/health') {
//       res.writeHead(200, { 'Content-Type': 'application/json' });
//       res.end(JSON.stringify({
//         status: 'ok',
//         hasPresentation: !!currentPresentation,
//         slideCount: currentPresentation?.slides?.length || 0,
//         currentSlideIndex,
//         clients: connectedClients.size,
//       }));
//       return;
//     }
//     res.writeHead(404);
//     res.end();
//   });

//   io = new SocketIOServer(httpServer, {
//     cors: {
//       origin: '*',
//       methods: ['GET', 'POST'],
//     },
//     transports: ['websocket', 'polling'],
//     // *** KEY FIX: Increase max payload to 50MB for base64 images ***
//     maxHttpBufferSize: 50 * 1024 * 1024,
//     pingTimeout: 30000,
//     pingInterval: 10000,
//   });

//   io.on('connection', (socket: Socket) => {
//     console.log(`✅ Client connected: ${socket.id}`);

//     // ===== REGISTRATION =====
//     socket.on('register', (data: any) => {
//       const client = {
//         id: socket.id,
//         name: data?.name || 'Unknown',
//         role: data?.role || 'controller',
//         connectedAt: Date.now(),
//       };
//       connectedClients.set(socket.id, client);

//       console.log(`📋 Registered: "${client.name}" as ${client.role}`);
//       console.log(`   Server has presentation: ${!!currentPresentation}`);
//       console.log(`   Slide count: ${currentPresentation?.slides?.length || 0}`);
//       console.log(`   Current slide: ${currentSlideIndex}`);

//       // Send current state to newly connected client
//       const syncData = {
//         presentation: currentPresentation,
//         currentSlideIndex,
//         isPresenting,
//         isBlackScreen,
//         clients: Array.from(connectedClients.values()),
//       };

//       socket.emit('sync-state', syncData);
//       io!.emit('client-list', Array.from(connectedClients.values()));
//     });

//     // ===== REQUEST SYNC (client asks for full state) =====
//     socket.on('request-sync', () => {
//       console.log(`🔄 Sync requested by ${socket.id}`);
//       console.log(`   Has presentation: ${!!currentPresentation}`);

//       socket.emit('sync-state', {
//         presentation: currentPresentation,
//         currentSlideIndex,
//         isPresenting,
//         isBlackScreen,
//         clients: Array.from(connectedClients.values()),
//       });
//     });

//     // ===== NAVIGATION =====
//     socket.on('go-to-slide', (index: number) => {
//       if (currentPresentation && index >= 0 && index < currentPresentation.slides.length) {
//         currentSlideIndex = index;
//         // Broadcast to ALL clients including sender
//         io!.emit('slide-changed', {
//           index: currentSlideIndex,
//           slide: currentPresentation.slides[currentSlideIndex],
//         });
//         console.log(`📄 Slide → ${currentSlideIndex + 1}`);
//       }
//     });

//     socket.on('next-slide', () => {
//       if (currentPresentation && currentSlideIndex < currentPresentation.slides.length - 1) {
//         currentSlideIndex++;
//         io!.emit('slide-changed', {
//           index: currentSlideIndex,
//           slide: currentPresentation.slides[currentSlideIndex],
//         });
//         console.log(`📄 Slide → ${currentSlideIndex + 1}`);
//       }
//     });

//     socket.on('prev-slide', () => {
//       if (currentPresentation && currentSlideIndex > 0) {
//         currentSlideIndex--;
//         io!.emit('slide-changed', {
//           index: currentSlideIndex,
//           slide: currentPresentation.slides[currentSlideIndex],
//         });
//         console.log(`📄 Slide → ${currentSlideIndex + 1}`);
//       }
//     });

//     // ===== PRESENTATION CONTROL =====
//     socket.on('start-presentation', () => {
//       isPresenting = true;
//       currentSlideIndex = 0;
//       console.log('▶ Presentation STARTED');
//       io!.emit('presentation-started', {
//         index: currentSlideIndex,
//         slide: currentPresentation?.slides?.[currentSlideIndex],
//       });
//     });

//     socket.on('stop-presentation', () => {
//       isPresenting = false;
//       console.log('⏹ Presentation STOPPED');
//       io!.emit('presentation-stopped');
//     });

//     socket.on('toggle-black-screen', () => {
//       isBlackScreen = !isBlackScreen;
//       console.log(`🖥 Black screen: ${isBlackScreen}`);
//       io!.emit('black-screen-toggled', isBlackScreen);
//     });

//     // ===== PRESENTATION DATA =====
//     socket.on('update-presentation', (presentation: any) => {
//       if (!presentation) return;
//       currentPresentation = presentation;
//       console.log(`💾 Presentation updated: "${presentation.name}" (${presentation.slides?.length || 0} slides)`);
//       // Broadcast to all OTHER clients
//       socket.broadcast.emit('presentation-updated', presentation);
//     });

//     // *** NEW: Lightweight sync - send only slide thumbnails/metadata ***
//     socket.on('sync-slide-index', (index: number) => {
//       if (currentPresentation && index >= 0 && index < currentPresentation.slides.length) {
//         currentSlideIndex = index;
//         // Only broadcast to OTHER clients (not sender)
//         socket.broadcast.emit('slide-changed', {
//           index: currentSlideIndex,
//         });
//       }
//     });

//     socket.on('update-slide', (data: any) => {
//       if (currentPresentation && data.index !== undefined) {
//         currentPresentation.slides[data.index] = data.slide;
//         socket.broadcast.emit('slide-updated', data);
//       }
//     });

//     socket.on('add-slide', (data: any) => {
//       if (currentPresentation) {
//         currentPresentation.slides.splice(data.index, 0, data.slide);
//         io!.emit('slide-added', data);
//       }
//     });

//     socket.on('delete-slide', (index: number) => {
//       if (currentPresentation) {
//         currentPresentation.slides.splice(index, 1);
//         if (currentSlideIndex >= currentPresentation.slides.length) {
//           currentSlideIndex = Math.max(0, currentPresentation.slides.length - 1);
//         }
//         io!.emit('slide-deleted', { index, currentSlideIndex });
//       }
//     });

//     socket.on('duplicate-slide', (index: number) => {
//       if (currentPresentation && currentPresentation.slides[index]) {
//         const dup = JSON.parse(JSON.stringify(currentPresentation.slides[index]));
//         dup.id = uuidv4();
//         currentPresentation.slides.splice(index + 1, 0, dup);
//         io!.emit('slide-duplicated', { index: index + 1, slide: dup });
//       }
//     });

//     // ===== PING =====
//     socket.on('ping-server', () => {
//       socket.emit('pong-server', { timestamp: Date.now() });
//     });

//     // ===== DISCONNECT =====
//     socket.on('disconnect', () => {
//       const client = connectedClients.get(socket.id);
//       connectedClients.delete(socket.id);
//       io!.emit('client-list', Array.from(connectedClients.values()));
//       console.log(`❌ Disconnected: ${client?.name || socket.id}`);
//     });
//   });

//   httpServer.listen(port, '0.0.0.0', () => {
//     console.log(`📡 WebSocket server listening on 0.0.0.0:${port}`);
//   });

//   return io;
// }

// export function getIO() { return io; }

// export function stopWebSocketServer() {
//   if (io) io.close();
//   if (httpServer) httpServer.close();
// }