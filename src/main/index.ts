// App start-up: paths, single-instance lock, services, the window, and shutdown.
// This file, host.ts, electron-paths.ts and window-state.ts are the only ones in
// src/main that import 'electron'.

import { join } from 'node:path';
import {
  app, BrowserWindow, ipcMain, Menu, nativeTheme, screen, session, shell,
  type IpcMainEvent, type IpcMainInvokeEvent,
} from 'electron';
import { APP_ID, APP_NAME } from '@shared/constants';
import type { AppInfo, Settings } from '@shared/types';
import { createServices, disposeServices } from './compose';
import { setupElectronPaths } from './electron-paths';
import { createDialogs, createSecretStore } from './host';
import { buildApi, registerApi } from './ipc';
import { createLogger } from './logger';
import type { Services } from './services';
import { loadWindowState, MIN_WINDOW_SIZE, trackWindowState } from './window-state';

/** Set by tests/electron-smoke.mjs: boot, prove the bridge works, print BOOT_OK, quit. */
const SMOKE = process.env.PYLEARN_SMOKE === '1';

// ---- before the app is ready -------------------------------------------------------------

app.setName(APP_NAME);
// Paths first: userData and the session cache must point into the data folder before
// anything (including the single-instance lock) touches them.
const paths = setupElectronPaths(app);
const logger = createLogger({ dir: paths.logsDir });
const core = { paths, logger };

if (process.platform === 'win32') app.setAppUserModelId(APP_ID);
if (SMOKE) app.disableHardwareAcceleration();

let mainWindow: BrowserWindow | null = null;
let services: Services | null = null;
let unregisterApi: (() => void) | null = null;
let shuttingDown = false;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });
  app.on('window-all-closed', () => void shutdown(0));
  app.on('before-quit', (event) => {
    if (shuttingDown) return;
    event.preventDefault();
    void shutdown(0);
  });
  process.on('uncaughtException', (error) => {
    logger.error('uncaught exception', error);
    if (SMOKE) smokeFail(`uncaught exception: ${error.message}`);
  });
  process.on('unhandledRejection', (reason) => {
    logger.error('unhandled rejection', reason);
  });

  app
    .whenReady()
    .then(start)
    .catch((error: unknown) => {
      logger.error('start-up failed', error);
      if (SMOKE) smokeFail(`start-up failed: ${String(error)}`);
      else void shutdown(1);
    });
}

// ---- start-up ----------------------------------------------------------------------------

async function start(): Promise<void> {
  logger.info(`${APP_NAME} ${app.getVersion()} starting`, { packaged: app.isPackaged, dataDir: paths.dataDir });

  // The interface has its own shortcuts (Ctrl+Enter, Ctrl+ and Ctrl- for font size, ...),
  // so the default menu and its accelerators are removed.
  Menu.setApplicationMenu(null);

  // The app asks for no web permissions (camera, location, notifications, ...).
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));

  const dialogs = createDialogs(() => mainWindow);
  services = createServices(core, { secrets: createSecretStore(paths, logger), dialogs });

  const api = buildApi(services, {
    appInfo,
    openDataFolder: async () => {
      const problem = await shell.openPath(paths.dataDir);
      if (problem) throw new Error(problem);
    },
    dialogs,
  });

  unregisterApi = registerApi({
    ipcMain,
    api,
    logger: logger.child('ipc'),
    send: (channel, ...args) => {
      if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
        mainWindow.webContents.send(channel, ...args);
      }
    },
    // Only our own window's top frame may call in.
    accept: (event) => {
      const e = event as IpcMainEvent | IpcMainInvokeEvent;
      return mainWindow !== null && e.sender === mainWindow.webContents && e.senderFrame?.parent === null;
    },
  });

  // Keep the native side (scroll bars, dialogs, prefers-color-scheme) in step with the theme setting.
  const applyTheme = (settings: Settings): void => {
    nativeTheme.themeSource = settings.theme;
  };
  applyTheme(await services.settings.get());
  services.settings.onChanged(applyTheme);

  createWindow();
}

function appInfo(): AppInfo {
  const platform = process.platform;
  return {
    name: APP_NAME,
    version: app.getVersion(),
    platform: platform === 'win32' || platform === 'darwin' ? platform : 'linux',
    arch: process.arch,
    packaged: app.isPackaged,
    mock: false,
    dataDir: paths.dataDir,
    versions: {
      electron: process.versions.electron ?? '',
      chrome: process.versions.chrome ?? '',
      node: process.versions.node,
    },
  };
}

// ---- the window --------------------------------------------------------------------------

function createWindow(): void {
  const state = loadWindowState(paths, screen);
  const window = new BrowserWindow({
    title: APP_NAME,
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: MIN_WINDOW_SIZE.width,
    minHeight: MIN_WINDOW_SIZE.height,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#15171c' : '#f5f6f8',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
      devTools: !app.isPackaged || process.env.PYLEARN_DEVTOOLS === '1',
    },
  });
  mainWindow = window;
  if (state.maximised) window.maximize();
  trackWindowState(window, paths);

  window.once('ready-to-show', () => {
    if (!SMOKE) window.show();
  });
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null;
  });

  // The window only ever shows the app itself. Links open in the learner's browser.
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (url !== window.webContents.getURL()) event.preventDefault();
  });
  window.webContents.on('render-process-gone', (_event, details) => {
    logger.error('renderer process gone', details);
    if (SMOKE) smokeFail(`renderer gone: ${details.reason}`);
  });

  if (!app.isPackaged) {
    // No menu, so give development its own way into the tools.
    window.webContents.on('before-input-event', (_event, input) => {
      const toggle = input.type === 'keyDown' && (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i'));
      if (toggle) window.webContents.toggleDevTools();
    });
  }

  if (SMOKE) {
    window.webContents.once('did-finish-load', () => void runSmokeProbe(window));
    window.webContents.once('did-fail-load', (_event, code, description) => smokeFail(`did-fail-load ${code} ${description}`));
  }

  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (!app.isPackaged && devUrl) void window.loadURL(devUrl);
  else void window.loadFile(join(__dirname, '../renderer/index.html'));
}

// ---- shutdown ----------------------------------------------------------------------------

async function shutdown(exitCode: number): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    unregisterApi?.();
    if (services) await disposeServices(services, core);
  } catch (error) {
    logger.error('shutdown failed', error);
  }
  logger.info('bye');
  app.exit(exitCode);
}

// ---- smoke test --------------------------------------------------------------------------

/** Runs inside the page: proves window.api exists, answers, pushes events, and that the
 *  interface rendered something. Returns a plain object. */
const SMOKE_PROBE = `(async () => {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const api = window.api;
  if (!api) return { ok: false, why: 'window.api is missing' };
  if (typeof window.require !== 'undefined' || typeof window.process !== 'undefined') {
    return { ok: false, why: 'Node leaked into the renderer' };
  }
  const info = await api.app.info();
  const lessons = await api.lessons.list();
  if (!lessons.length) return { ok: false, why: 'lessons.list() is empty' };
  const lesson = await api.lessons.get(lessons[0].id);
  const settings = await api.settings.get();

  const events = [];
  const off = api.python.onEvent((e) => events.push(e));
  const runId = await api.python.run({ lessonId: null, files: [{ name: 'main.py', content: 'print("smoke")' }], entry: 'main.py' });
  const deadline = Date.now() + 20000;
  while (!events.some((e) => e.type === 'exit' && e.runId === runId) && Date.now() < deadline) await wait(50);
  off();
  const exit = events.find((e) => e.type === 'exit' && e.runId === runId);
  const out = events.filter((e) => e.type === 'stdout' && e.runId === runId).map((e) => e.text).join('');
  if (!exit) return { ok: false, why: 'python run did not finish', events };
  if (exit.code !== 0 || !out.includes('smoke')) return { ok: false, why: 'python run gave the wrong result', events };

  const root = document.getElementById('root');
  const until = Date.now() + 10000;
  while ((!root || root.childElementCount === 0) && Date.now() < until) await wait(50);
  if (!root || root.childElementCount === 0) return { ok: false, why: 'nothing rendered in #root' };

  return { ok: true, version: info.version, mock: info.mock, lessons: lessons.length, steps: lesson.steps.length, theme: settings.theme };
})()`;

async function runSmokeProbe(window: BrowserWindow): Promise<void> {
  const timeout = setTimeout(() => smokeFail('probe timed out'), 45_000);
  try {
    const result = (await window.webContents.executeJavaScript(SMOKE_PROBE, true)) as { ok: boolean; why?: string };
    clearTimeout(timeout);
    if (!result.ok) return smokeFail(`${result.why ?? 'probe failed'} ${JSON.stringify(result)}`);
    process.stdout.write(`BOOT_OK ${JSON.stringify(result)}\n`);
    await shutdown(0);
  } catch (error) {
    clearTimeout(timeout);
    smokeFail(`probe threw: ${String(error)}`);
  }
}

function smokeFail(reason: string): void {
  process.stdout.write(`BOOT_FAIL ${reason}\n`);
  logger.error(`smoke test failed: ${reason}`);
  shuttingDown = true;
  app.exit(1);
}
