import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Multi-page: the TV app (React) and the two phone pages.
// base './' keeps asset URLs relative, so the build also runs from
// file:// inside the Android TV (Capacitor) WebView.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        tv: resolve(import.meta.dirname, 'tv.html'),
        index: resolve(import.meta.dirname, 'index.html'),
        settings: resolve(import.meta.dirname, 'settings.html'),
        preview: resolve(import.meta.dirname, 'preview.html'),   // test page: every TV state at once
      },
    },
  },
  test: { environment: 'node' },
});
