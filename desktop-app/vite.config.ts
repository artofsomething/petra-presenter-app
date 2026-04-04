import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // ✅ React core
          if (id.includes('node_modules/react/') || 
              id.includes('node_modules/react-dom/')) {
            return 'react-vendor';
          }

          // ✅ React Router
          if (id.includes('node_modules/react-router')) {
            return 'router-vendor';
          }

          // ✅ Socket.IO client
          if (id.includes('node_modules/socket.io')) {
            return 'socket-vendor';
          }

          // ✅ Tailwind / PostCSS (usually handled by plugin, just in case)
          if (id.includes('node_modules/@tailwindcss') ||
              id.includes('node_modules/tailwindcss')) {
            return 'tailwind-vendor';
          }

          // ✅ All other node_modules → split by package name
          if (id.includes('node_modules')) {
            const parts = id.split('node_modules/');
            const packageName = parts[parts.length - 1]
              .split('/')[0]
              .replace('@', ''); // remove @ from scoped packages
            return `vendor-${packageName}`;
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    strictPort: true,
  },
});