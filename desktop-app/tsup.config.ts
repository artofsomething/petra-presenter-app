// desktop-app/tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'main/electron': 'src/main/electron.ts',
    'main/preload': 'src/main/preload.ts',
    'server/websocket-server': 'src/server/websocket-server.ts',
  },
  outDir: 'dist',
  format: ['cjs'],           // Electron uses CommonJS
  platform: 'node',
  target: 'node18',
  splitting: false,
  sourcemap: true,
  clean: false,               // Don't clean (Vite also outputs to dist/)
  external: ['electron'],     // Don't bundle electron
  noExternal: ['socket.io', 'uuid'],  // Bundle these
});