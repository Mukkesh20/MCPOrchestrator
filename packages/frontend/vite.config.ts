import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react(), {
    name: 'handle-html-fallback',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Return index.html for all paths except /trpc and assets
        if (req.url && !req.url.startsWith('/trpc') && !req.url.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico)$/)) {
          req.url = '/';
        }
        next();
      });
    }
  }],
  server: {
    port: 3000,
    proxy: {
      '/trpc': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  // Configure optimizeDeps to properly handle tRPC server imports
  optimizeDeps: {
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: 'globalThis',
      },
    },
  },
});