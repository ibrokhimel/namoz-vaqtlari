import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Version baked into every build: commit (CI passes GITHUB_SHA) + build time.
// The in-app updater compares these with the latest GitHub release.
const sha = (process.env.GITHUB_SHA || (() => {
  try { return execSync('git rev-parse HEAD').toString().trim(); } catch { return 'dev'; }
})()).slice(0, 7);
// Version name shown on screen (package.json, bumped with each release)
const name = JSON.parse(readFileSync(resolve(import.meta.dirname, 'package.json'), 'utf8')).version;
const builtAt = process.env.APP_BUILT_AT || new Date().toISOString();   // CI sets it; the release reuses it

// Multi-page: the TV app (React) and the two phone pages.
// base './' keeps asset URLs relative, so the build also runs from
// file:// inside the Android TV (Capacitor) WebView.
export default defineConfig({
  base: './',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(sha),
    __APP_NAME__: JSON.stringify(name),
    __APP_BUILT_AT__: JSON.stringify(builtAt),
  },
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
