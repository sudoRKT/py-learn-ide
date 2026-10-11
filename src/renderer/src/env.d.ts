/// <reference types="vite/client" />

import type { Api } from '@shared/ipc';

declare global {
  interface Window {
    /** The bridge from the preload. Missing in a plain browser; use `api` from ./api instead. */
    api?: Api;
  }
}

export {};
