// Maps the `Api` (src/shared/ipc.ts) onto the services and registers one IPC handler per
// method. The channel list comes from API_SHAPE, the same table the preload uses, so the
// two sides cannot drift.
//
// This file does not import Electron. src/main/index.ts passes in `ipcMain` and a function
// that sends to the window, which also makes the registration testable with a fake.

import { APP_NAME, BACKUP_EXTENSION } from '@shared/constants';
import { API_SHAPE, channelName, type Api, type ApiGroup, type ChannelKind } from '@shared/ipc';
import type { AppInfo, Unsub } from '@shared/types';
import type { Logger } from './logger';
import type { Dialogs, Services } from './services';

/** What buildApi needs besides the services. */
export interface ApiHost {
  appInfo(): AppInfo;
  openDataFolder(): Promise<void>;
  dialogs: Dialogs;
}

/** The whole `Api`, implemented in main-process terms. */
export function buildApi(services: Services, host: ApiHost): Api {
  const { profiles, settings, lessons, progress, backup, practice, python, checks, terminal, ai, tutor } = services;
  const backupFilter = [{ name: `${APP_NAME} backup`, extensions: [BACKUP_EXTENSION] }];

  return {
    app: {
      info: async () => host.appInfo(),
      openDataFolder: () => host.openDataFolder(),
      exportBackup: async () => {
        const stamp = new Date().toISOString().slice(0, 10);
        const file = await host.dialogs.saveFile({
          title: 'Save a backup',
          defaultName: `py-learn-backup-${stamp}.${BACKUP_EXTENSION}`,
          filters: backupFilter,
        });
        if (!file) return null;
        await backup.exportTo(file);
        return file;
      },
      importBackup: async () => {
        const file = await host.dialogs.pickFile({ title: 'Choose a backup to restore', filters: backupFilter });
        return file ? backup.importFrom(file) : false;
      },
    },
    settings: {
      get: () => settings.get(),
      set: (patch) => settings.set(patch),
      onChanged: (cb) => settings.onChanged(cb),
    },
    profiles: {
      list: () => profiles.list(),
      create: (name) => profiles.create(name),
      switchTo: (id) => profiles.switchTo(id),
      rename: (id, name) => profiles.rename(id, name),
      remove: (id) => profiles.remove(id),
    },
    lessons: {
      list: () => lessons.list(),
      get: (id) => lessons.get(id),
      solution: (id) => lessons.solution(id),
      dataFile: (id, name) => lessons.dataFile(id, name),
      ideas: () => lessons.ideaList(),
    },
    progress: {
      all: () => progress.all(),
      get: (id) => progress.get(id),
      update: (id, patch) => progress.update(id, patch),
      reset: (id) => progress.reset(id),
    },
    python: {
      run: (req) => python.run(req),
      sendInput: (runId, text) => python.sendInput(runId, text),
      stop: (runId) => python.stop(runId),
      onEvent: (cb) => python.onEvent(cb),
      analyse: (code, lessonId) => python.analyse(code, lessonId),
      trace: (req, inputs) => python.trace(req, inputs),
      runTests: (lessonId, files) => python.runTests(lessonId, files),
    },
    terminal: {
      run: (lessonId, commandLine) => terminal.run(lessonId, commandLine),
      stop: (id) => terminal.stop(id),
      cwd: (lessonId) => terminal.cwd(lessonId),
      reset: (lessonId) => terminal.reset(lessonId),
      onEvent: (cb) => terminal.onEvent(cb),
    },
    practice: {
      status: () => practice.status(),
      setMode: (mode) => practice.setMode(mode),
      onStatus: (cb) => practice.onStatus(cb),
    },
    checks: {
      run: (lessonId, checkId, files) => checks.run(lessonId, checkId, files),
    },
    tutor: {
      notifyEdit: (s) => tutor.notifyEdit(s),
      notifyRun: (lessonId, e) => tutor.notifyRun(lessonId, e),
      notifyCheck: (lessonId, r) => tutor.notifyCheck(lessonId, r),
      ask: (lessonId, question, s) => tutor.ask(lessonId, question, s),
      hint: (lessonId, stepId, size, s) => tutor.hint(lessonId, stepId, size, s),
      onMessage: (cb) => tutor.onMessage(cb),
      onMessageDelta: (cb) => tutor.onMessageDelta(cb),
      rate: (id, good) => tutor.rate(id, good),
      clear: () => tutor.clear(),
    },
    ai: {
      hardware: () => ai.hardware(),
      catalogue: () => ai.catalogue(),
      status: () => ai.status(),
      onStatus: (cb) => ai.onStatus(cb),
      useLocal: (modelId) => ai.useLocal(modelId),
      useOwnFile: () => ai.useOwnFile(),
      cancelDownload: () => ai.cancelDownload(),
      useCloud: (provider, key, opts) => ai.useCloud(provider, key, opts),
      useNone: () => ai.useNone(),
      removeModel: (modelId) => ai.removeModel(modelId),
    },
  };
}

/** The parts of Electron's ipcMain that registerApi uses. */
export interface IpcMainLike {
  handle(channel: string, listener: (event: unknown, ...args: unknown[]) => unknown): void;
  on(channel: string, listener: (event: unknown, ...args: unknown[]) => void): void;
  removeHandler(channel: string): void;
  removeAllListeners(channel: string): void;
}

export interface RegisterOptions {
  ipcMain: IpcMainLike;
  api: Api;
  /** Push an event to the renderer. Must do nothing if there is no window. */
  send(channel: string, ...args: unknown[]): void;
  /** Return false to refuse a call (for example, one that did not come from our window). */
  accept?(event: unknown): boolean;
  logger: Logger;
}

type AnyMethod = (...args: unknown[]) => unknown;

/** Registers a handler for every invoke and send channel and subscribes to every event
 *  channel. Returns a function that undoes all of it. */
export function registerApi(options: RegisterOptions): Unsub {
  const { ipcMain, api, send, logger } = options;
  const accept = options.accept ?? (() => true);
  const undo: Unsub[] = [];

  for (const group of Object.keys(API_SHAPE) as ApiGroup[]) {
    const methods = API_SHAPE[group] as Record<string, ChannelKind>;
    const implementation = api[group] as unknown as Record<string, AnyMethod>;

    for (const [method, kind] of Object.entries(methods)) {
      const channel = channelName(group, method);
      const call = implementation[method];
      if (typeof call !== 'function') throw new Error(`Api method ${group}.${method} is not implemented`);

      if (kind === 'invoke') {
        ipcMain.handle(channel, async (event, ...args) => {
          if (!accept(event)) throw new Error('Refused');
          try {
            return await call(...args);
          } catch (error) {
            logger.error(`${group}.${method} failed`, error);
            throw error;
          }
        });
        undo.push(() => ipcMain.removeHandler(channel));
      } else if (kind === 'send') {
        ipcMain.on(channel, (event, ...args) => {
          if (!accept(event)) return;
          try {
            call(...args);
          } catch (error) {
            logger.error(`${group}.${method} failed`, error);
          }
        });
        undo.push(() => ipcMain.removeAllListeners(channel));
      } else {
        const off = call((...args: unknown[]) => send(channel, ...args));
        if (typeof off === 'function') undo.push(off as Unsub);
      }
    }
  }

  return () => {
    for (const off of undo.splice(0)) {
      try {
        off();
      } catch (error) {
        logger.error('ipc clean-up failed', error);
      }
    }
  };
}
