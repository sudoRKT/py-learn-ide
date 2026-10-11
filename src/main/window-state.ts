// Remembers the window's size and position between launches (SPEC section 12).
// Stored in <data>/window.json.

import type { BrowserWindow, Rectangle, Screen } from 'electron';
import { readJsonFile, writeJsonFileAtomic } from './fs-util';
import type { Paths } from './paths';

export interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  maximised: boolean;
}

export const DEFAULT_WINDOW_STATE: WindowState = { width: 1360, height: 860, maximised: false };
export const MIN_WINDOW_SIZE = { width: 960, height: 600 };

function overlaps(a: Rectangle, b: Rectangle): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/** The saved state, or the default if there is none or it no longer fits any screen. */
export function loadWindowState(paths: Paths, screen: Screen): WindowState {
  const stored = readJsonFile<Partial<WindowState> | null>(paths.windowStateFile, null);
  if (!stored || typeof stored.width !== 'number' || typeof stored.height !== 'number') {
    return { ...DEFAULT_WINDOW_STATE };
  }
  const state: WindowState = {
    width: Math.max(MIN_WINDOW_SIZE.width, Math.round(stored.width)),
    height: Math.max(MIN_WINDOW_SIZE.height, Math.round(stored.height)),
    maximised: stored.maximised === true,
  };
  if (typeof stored.x === 'number' && typeof stored.y === 'number') {
    const bounds = { x: stored.x, y: stored.y, width: state.width, height: state.height };
    if (screen.getAllDisplays().some((display) => overlaps(bounds, display.workArea))) {
      state.x = Math.round(stored.x);
      state.y = Math.round(stored.y);
    }
  }
  return state;
}

/** Saves the window's state whenever it settles, and once more when it closes. */
export function trackWindowState(window: BrowserWindow, paths: Paths): void {
  let timer: NodeJS.Timeout | null = null;

  const save = (): void => {
    if (window.isDestroyed()) return;
    const bounds = window.getNormalBounds();
    const state: WindowState = { ...bounds, maximised: window.isMaximized() };
    try {
      writeJsonFileAtomic(paths.windowStateFile, state);
    } catch {
      // Losing the window position is not worth an error.
    }
  };
  const saveSoon = (): void => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(save, 400);
  };

  window.on('resize', saveSoon);
  window.on('move', saveSoon);
  window.on('maximize', saveSoon);
  window.on('unmaximize', saveSoon);
  window.on('close', () => {
    if (timer) clearTimeout(timer);
    save();
  });
}
