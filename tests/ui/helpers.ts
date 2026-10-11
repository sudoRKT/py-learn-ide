// Shared helpers for the Playwright tests. The renderer runs in a plain browser against
// the in-memory mock bridge (src/renderer/src/mockApi.ts).

import type { Page } from '@playwright/test';
import type { MockInit } from '../../src/renderer/src/mockApi';

/** Folder that holds the screenshots a person (or agent) looks at before a release. */
export const SCREENSHOT_DIR = 'tests/screenshots';

/** Open the app with the mock shaped by `init`. `speed: 0` (the default here) removes every
 *  simulated delay so tests are fast and steady. */
export async function openApp(page: Page, init: MockInit = {}, path = '/'): Promise<void> {
  await page.addInitScript((value) => {
    window.__PYLEARN_MOCK_INIT__ = value;
  }, { speed: 0, ...init } satisfies MockInit);
  await page.goto(path);
}

/** Save a full-window screenshot as tests/screenshots/<name>.png. */
export async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `${SCREENSHOT_DIR}/${name}.png`, animations: 'disabled' });
}
