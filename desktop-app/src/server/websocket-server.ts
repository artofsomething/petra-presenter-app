
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

  if (role === 'display' || role==='stage-display') {
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
        io!.emit('slide-changed', {
          index:    cachedState.currentSlideIndex,
          senderId: socket.id,
        });
        console.log(`▶ Next: ${cachedState.currentSlideIndex}`);
      }
    });

    socket.on('prev-slide', () => {
      if (cachedState.currentSlideIndex > 0) {
        cachedState.currentSlideIndex--;
        io!.emit('slide-changed', {
          index:    cachedState.currentSlideIndex,
          senderId: socket.id,
        });
        console.log(`◀ Prev: ${cachedState.currentSlideIndex}`);
      }
    });

    socket.on('go-to-slide', (index: number) => {
      if (!cachedState.presentation) return;
      const max = cachedState.presentation.slides.length - 1;
      cachedState.currentSlideIndex = Math.max(0, Math.min(index, max));

      // ✅ Send to ALL — Flutter filters self via senderId
      io!.emit('slide-changed', {
        index:    cachedState.currentSlideIndex,
        senderId: socket.id,
      });

      console.log(`🎯 Go to: ${cachedState.currentSlideIndex}`);
    });

    socket.on('start-presentation', () => {
      cachedState.isPresenting = true;

      // ✅ FIX: broadcast to others, ack to sender
      socket.broadcast.emit('presentation-started', {
        index: cachedState.currentSlideIndex,
      });
      socket.emit('presentation-started-ack', {
        index: cachedState.currentSlideIndex,
      });

      console.log('▶️  Presentation started');
    });

    socket.on('stop-presentation', () => {
      cachedState.isPresenting = false;

      // ✅ FIX: broadcast to others, ack to sender
      socket.broadcast.emit('presentation-stopped');
      socket.emit('presentation-stopped-ack');

      console.log('⏹️  Presentation stopped');
    });

    socket.on('toggle-black-screen', () => {
      cachedState.isBlackScreen = !cachedState.isBlackScreen;

      // ✅ FIX: broadcast to others, ack to sender
      socket.broadcast.emit('black-screen-toggled', cachedState.isBlackScreen);
      socket.emit('black-screen-toggled-ack', cachedState.isBlackScreen);

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