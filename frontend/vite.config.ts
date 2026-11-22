import react from '@vitejs/plugin-react';
import os from 'node:os';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // Vite's dependency cache lives in the system temp folder, not inside the project. When the project sits in a
  // OneDrive folder, OneDrive locks files in node_modules/.vite while syncing, and Vite then crashes on startup
  // with "EPERM: operation not permitted, rmdir ...\.vite\deps". It is only a cache, so this is safe.
  cacheDir: path.join(os.tmpdir(), 'careertrack-vite-cache'),
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:5000', changeOrigin: true } },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('recharts') || id.includes('d3-')) return 'charts';
          if (/node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id))
            return 'react';
          return undefined;
        },
      },
    },
  },
});
