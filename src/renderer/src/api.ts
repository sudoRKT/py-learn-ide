// The one way the renderer reaches the rest of the app.
//
//   import { api } from './api';
//
// In the Electron app `window.api` is the real bridge from the preload. In a plain browser
// (npm run dev:web, Playwright) there is no preload, so the in-memory mock stands in.
// Never import from src/main here or anywhere else in the renderer.

import type { Api } from '@shared/ipc';
import { createMockApi } from './mockApi';

const bridge: Api | undefined = typeof window !== 'undefined' ? window.api : undefined;

function startMock(): Api {
  const init = typeof window !== 'undefined' ? window.__PYLEARN_MOCK_INIT__ : undefined;
  const mock = createMockApi(init);
  if (typeof window !== 'undefined') window.__pylearnMock = mock;
  return mock.api;
}

/** True when the renderer is running against the mock instead of the real bridge. */
export const isMock = bridge === undefined;

export const api: Api = bridge ?? startMock();
