// The renderer's Vite settings, in one place.
//
// Used two ways:
//   1. electron.vite.config.ts imports `rendererConfig()` for the real app.
//   2. `vite --config vite.renderer.config.ts --mode mock` serves the renderer on its own
//      in a plain browser. There is no preload there, so `src/renderer/src/api.ts` falls
//      back to the in-memory mock. Playwright (tests/ui) and `npm run dev:web` use this.
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin, type UserConfig } from 'vite';

const root = __dirname;

export const aliases = {
  '@shared': resolve(root, 'src/shared'),
  '@renderer': resolve(root, 'src/renderer/src'),
};

/** Fixed port for the mock-mode server. Playwright reads the same value. */
export const MOCK_PORT = Number(process.env.PYLEARN_WEB_PORT ?? 5179);

/** The Content-Security-Policy of the built app. It is added at build time only, because
 *  the development server needs inline scripts and a websocket for hot reloading.
 *  - style-src 'unsafe-inline': Monaco injects <style> elements at run time.
 *  - worker-src blob: and font-src data: are also for Monaco.
 *  - connect-src 'self': the renderer makes no network requests of its own. */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function cspPlugin(): Plugin {
  return {
    name: 'pylearn-csp',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}

export function rendererConfig(): UserConfig {
  return {
    root: resolve(root, 'src/renderer'),
    base: './',
    resolve: { alias: aliases },
    plugins: [react(), cspPlugin()],
    build: {
      outDir: resolve(root, 'out/renderer'),
      emptyOutDir: true,
      target: 'chrome140',
      chunkSizeWarningLimit: 8000,
      rollupOptions: { input: resolve(root, 'src/renderer/index.html') },
    },
    worker: { format: 'es' },
  };
}

export default defineConfig({
  ...rendererConfig(),
  server: { host: '127.0.0.1', port: MOCK_PORT, strictPort: true },
  preview: { host: '127.0.0.1', port: MOCK_PORT, strictPort: true },
});
