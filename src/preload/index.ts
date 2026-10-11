// The bridge: exposes one object, `window.api`, typed as `Api` (SPEC section 4).
//
// The window is sandboxed, so this file may only import 'electron' and code that gets
// bundled into it (src/shared/ipc.ts and constants.ts). It is built from API_SHAPE, the
// same table src/main/ipc.ts registers its handlers from. Adding a method to `Api` and to
// API_SHAPE is all it takes; nothing here needs editing.

import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { API_SHAPE, channelName, type Api, type ChannelKind } from '@shared/ipc';

type Listener = (...args: unknown[]) => void;

function makeMethod(kind: ChannelKind, channel: string): (...args: unknown[]) => unknown {
  switch (kind) {
    case 'invoke':
      return (...args) => ipcRenderer.invoke(channel, ...args);
    case 'send':
      return (...args) => {
        ipcRenderer.send(channel, ...args);
      };
    case 'event':
      return (callback) => {
        if (typeof callback !== 'function') throw new TypeError(`${channel}: a callback is required`);
        const listener = (_event: IpcRendererEvent, ...args: unknown[]): void => (callback as Listener)(...args);
        ipcRenderer.on(channel, listener);
        return () => {
          ipcRenderer.removeListener(channel, listener);
        };
      };
  }
}

const api: Record<string, Record<string, unknown>> = {};
for (const [group, methods] of Object.entries(API_SHAPE)) {
  const built: Record<string, unknown> = {};
  for (const [method, kind] of Object.entries(methods as Record<string, ChannelKind>)) {
    built[method] = makeMethod(kind, channelName(group, method));
  }
  api[group] = built;
}

contextBridge.exposeInMainWorld('api', api as unknown as Api);
