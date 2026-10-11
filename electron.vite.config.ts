import { resolve } from 'node:path';
import { defineConfig } from 'electron-vite';
import { aliases, rendererConfig } from './vite.renderer.config';

// Every npm package is a devDependency on purpose: electron-vite only leaves `dependencies`
// external, so everything the main process imports (zod, nanoid, ...) is bundled into
// out/main and the packaged app needs no node_modules folder.
export default defineConfig({
  main: {
    resolve: { alias: aliases },
    build: {
      outDir: resolve(__dirname, 'out/main'),
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/main/index.ts') },
        // zod ships comments that Rollup warns about on every build. They are harmless.
        onwarn(warning, warn) {
          if (warning.code === 'INVALID_ANNOTATION' && warning.id?.includes('node_modules')) return;
          warn(warning);
        },
      },
    },
  },
  preload: {
    resolve: { alias: aliases },
    build: {
      outDir: resolve(__dirname, 'out/preload'),
      // The window is sandboxed, so the preload must be one self-contained CommonJS file:
      // a sandboxed preload can only `require('electron')`.
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/preload/index.ts') },
        output: { format: 'cjs', entryFileNames: '[name].js', inlineDynamicImports: true },
      },
    },
  },
  renderer: rendererConfig(),
});
