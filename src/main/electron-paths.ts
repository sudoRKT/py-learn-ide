// The Electron-specific half of paths.ts: works out where the app is installed and points
// Electron's own folders into the data folder (SPEC section 10).
//
// MUST run before the app is ready and before requestSingleInstanceLock(), because both
// the lock file and Chromium's profile live under userData.

import { dirname, join } from 'node:path';
import type { App } from 'electron';
import { createPaths, type Paths } from './paths';

export function setupElectronPaths(app: App): Paths {
  const paths = app.isPackaged
    ? createPaths({
        packaged: true,
        appDir: dirname(app.getPath('exe')),
        resourcesDir: process.resourcesPath,
      })
    : createPaths({
        packaged: false,
        appDir: app.getAppPath(),
        // Development and tests only: lets the smoke test use a throw-away data folder.
        dataDir: process.env.PYLEARN_DATA_DIR || undefined,
      });

  paths.ensureDataDirs();
  app.setPath('userData', paths.electronDataDir);
  app.setPath('sessionData', paths.cacheDir);
  app.setPath('crashDumps', join(paths.electronDataDir, 'crashes'));
  app.setAppLogsPath(paths.logsDir);
  return paths;
}
