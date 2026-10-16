import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  // Preserve the wrapper's relative worker module URL in development.
  optimizeDeps: { exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'] },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    proxy: { '/api': 'http://127.0.0.1:3001' },
  },
});
