// The pieces of Electron that services are handed through their deps: encrypted secret
// storage and native file dialogs. Services never import 'electron' themselves.

import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dialog, safeStorage, type BrowserWindow } from 'electron';
import type { Logger } from './logger';
import type { Paths } from './paths';
import type { Dialogs, SecretStore } from './services';

/** API keys, encrypted with the operating system's key store (DPAPI on Windows) and kept
 *  in <data>/secrets.bin. The file holds one encrypted JSON object of name to value. */
export function createSecretStore(paths: Paths, logger: Logger): SecretStore {
  const log = logger.child('secrets');

  function readAll(): Record<string, string> {
    if (!existsSync(paths.secretsFile)) return {};
    try {
      const parsed: unknown = JSON.parse(safeStorage.decryptString(readFileSync(paths.secretsFile)));
      return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, string>) : {};
    } catch (error) {
      log.warn('could not read the secret store; treating it as empty', (error as Error).message);
      return {};
    }
  }

  function writeAll(values: Record<string, string>): void {
    if (Object.keys(values).length === 0) {
      rmSync(paths.secretsFile, { force: true });
      return;
    }
    writeFileSync(paths.secretsFile, safeStorage.encryptString(JSON.stringify(values)));
  }

  return {
    isAvailable: () => safeStorage.isEncryptionAvailable(),
    async get(name) {
      if (!safeStorage.isEncryptionAvailable()) return null;
      return readAll()[name] ?? null;
    },
    async set(name, value) {
      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('This computer cannot store a key safely, so the key was not saved.');
      }
      writeAll({ ...readAll(), [name]: value });
    },
    async remove(name) {
      if (!safeStorage.isEncryptionAvailable()) return;
      const values = readAll();
      delete values[name];
      writeAll(values);
    },
  };
}

export function createDialogs(getWindow: () => BrowserWindow | null): Dialogs {
  return {
    async pickFile({ title, filters }) {
      const window = getWindow();
      const options = { title, filters, properties: ['openFile' as const] };
      const result = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options);
      return result.canceled ? null : (result.filePaths[0] ?? null);
    },
    async saveFile({ title, defaultName, filters }) {
      const window = getWindow();
      const options = { title, defaultPath: defaultName, filters };
      const result = window ? await dialog.showSaveDialog(window, options) : await dialog.showSaveDialog(options);
      return result.canceled || !result.filePath ? null : result.filePath;
    },
  };
}
