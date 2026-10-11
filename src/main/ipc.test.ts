import { afterAll, describe, expect, it } from 'vitest';
import { IPC_PREFIX } from '@shared/constants';
import { API_SHAPE, CHANNELS, EVENT_CHANNELS, INVOKE_CHANNELS, SEND_CHANNELS, channelName } from '@shared/ipc';
import type { AppInfo, RunEvent } from '@shared/types';
import { createServices, disposeServices } from './compose';
import { buildApi, registerApi, type IpcMainLike } from './ipc';
import { createFakeDialogs, createMemorySecretStore, createTestCore } from './testing';

type Handler = (event: unknown, ...args: unknown[]) => unknown;

class FakeIpcMain implements IpcMainLike {
  readonly handlers = new Map<string, Handler>();
  readonly listeners = new Map<string, Handler>();
  handle(channel: string, listener: Handler): void {
    if (this.handlers.has(channel)) throw new Error(`second handler for ${channel}`);
    this.handlers.set(channel, listener);
  }
  on(channel: string, listener: Handler): void {
    this.listeners.set(channel, listener);
  }
  removeHandler(channel: string): void {
    this.handlers.delete(channel);
  }
  removeAllListeners(channel: string): void {
    this.listeners.delete(channel);
  }
}

const core = createTestCore();
const services = createServices(core.deps, { secrets: createMemorySecretStore(), dialogs: createFakeDialogs() });
const info: AppInfo = {
  name: 'Test', version: '0.0.0', platform: 'linux', arch: 'x64', packaged: false, mock: false,
  dataDir: core.paths.dataDir, versions: { electron: '', chrome: '', node: process.versions.node },
};
const api = buildApi(services, { appInfo: () => info, openDataFolder: async () => {}, dialogs: createFakeDialogs() });

afterAll(async () => {
  await disposeServices(services, core.deps);
  core.cleanup();
});

describe('the channel table', () => {
  it('names every channel with the prefix and has no duplicates', () => {
    const names = CHANNELS.map((c) => c.channel);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) expect(name.startsWith(`${IPC_PREFIX}:`)).toBe(true);
    expect(INVOKE_CHANNELS.length + SEND_CHANNELS.length + EVENT_CHANNELS.length).toBe(names.length);
    expect(channelName('python', 'run')).toBe('pylearn:python.run');
  });

  it('classifies the fire-and-forget tutor calls and the subscriptions', () => {
    expect(API_SHAPE.tutor.notifyEdit).toBe('send');
    expect(API_SHAPE.tutor.rate).toBe('send');
    expect(API_SHAPE.tutor.ask).toBe('invoke');
    expect(EVENT_CHANNELS).toEqual(
      expect.arrayContaining([
        'pylearn:settings.onChanged', 'pylearn:python.onEvent', 'pylearn:terminal.onEvent', 'pylearn:practice.onStatus',
        'pylearn:tutor.onMessage', 'pylearn:tutor.onMessageDelta', 'pylearn:ai.onStatus',
      ]),
    );
    expect(EVENT_CHANNELS).toHaveLength(7);
  });

  it('is fully implemented by buildApi', () => {
    for (const { group, method } of CHANNELS) {
      expect(typeof (api[group] as Record<string, unknown>)[method], `${group}.${method}`).toBe('function');
    }
  });
});

describe('registerApi', () => {
  it('registers every invoke and send channel, forwards events, and cleans up', async () => {
    const ipcMain = new FakeIpcMain();
    const sent: { channel: string; args: unknown[] }[] = [];
    const unregister = registerApi({ ipcMain, api, logger: core.logger, send: (channel, ...args) => sent.push({ channel, args }) });

    expect([...ipcMain.handlers.keys()].sort()).toEqual([...INVOKE_CHANNELS].sort());
    expect([...ipcMain.listeners.keys()].sort()).toEqual([...SEND_CHANNELS].sort());

    // invoke: a real round trip through the services
    const lessons = (await ipcMain.handlers.get('pylearn:lessons.list')!({})) as { id: string }[];
    expect(lessons[0]?.id).toBe('001-hello-world');

    // event: a run started over IPC pushes RunEvents to the renderer side
    const runId = (await ipcMain.handlers.get('pylearn:python.run')!({}, {
      lessonId: null, files: [{ name: 'main.py', content: 'print("over ipc")' }], entry: 'main.py',
    })) as string;
    await expect
      .poll(() => sent.some((s) => s.channel === 'pylearn:python.onEvent' && (s.args[0] as RunEvent).type === 'exit'), { timeout: 15_000 })
      .toBe(true);
    const runEvents = sent.filter((s) => s.channel === 'pylearn:python.onEvent').map((s) => s.args[0] as RunEvent);
    expect(runEvents.every((e) => e.runId === runId)).toBe(true);
    expect(runEvents.map((e) => (e.type === 'stdout' ? e.text : '')).join('')).toBe('over ipc\n');

    // send: the stub tutor answers the first edit with one prepared message
    ipcMain.listeners.get('pylearn:tutor.notifyEdit')!({}, { lessonId: null, stepId: null, file: 'main.py', code: 'x', cursorLine: 1, recentEdits: [] });
    const tutor = sent.filter((s) => s.channel === 'pylearn:tutor.onMessage');
    expect(tutor).toHaveLength(1);
    expect(tutor[0]?.args[0]).toMatchObject({ trigger: 'idle', source: 'prepared' });

    unregister();
    expect(ipcMain.handlers.size).toBe(0);
    expect(ipcMain.listeners.size).toBe(0);
  });

  it('refuses calls that `accept` turns down', async () => {
    const ipcMain = new FakeIpcMain();
    const unregister = registerApi({ ipcMain, api, logger: core.logger, send: () => {}, accept: () => false });
    await expect(ipcMain.handlers.get('pylearn:lessons.list')!({})).rejects.toThrow('Refused');
    unregister();
  });
});
