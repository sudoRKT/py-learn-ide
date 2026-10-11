// AI area: providers, ModelManager, downloader, llama process.
// Owner: the "ai" agent. See README.md in this folder.
//
// This is a WORKING STUB so the app boots today: no model, no provider, status
// 'not-set-up'. Replace the body; keep the factory name and signature.

import { cpus, totalmem } from 'node:os';
import type { ModelEntry, ModelStatus, Unsub } from '@shared/types';
import { Emitter } from '../emitter';
import { readJsonFile } from '../fs-util';
import type { AiService, ServiceDeps } from '../services';

const NOT_YET = 'The AI tutor is not available yet.';

export function createAiService(deps: ServiceDeps['ai']): AiService {
  const { paths } = deps;
  const logger = deps.logger.child('ai');
  const changed = new Emitter<[ModelStatus]>();
  let status: ModelStatus = { provider: 'none', modelId: null, state: 'not-set-up', installed: [] };

  function setStatus(next: ModelStatus): void {
    status = next;
    changed.emit(status);
  }

  return {
    async hardware() {
      return {
        gpus: [],
        ramMb: Math.round(totalmem() / (1024 * 1024)),
        cpu: cpus()[0]?.model ?? 'Unknown processor',
        recommendedTier: 'none',
      };
    },
    async catalogue() {
      const entries = readJsonFile<ModelEntry[]>(paths.modelCatalogueFile, []);
      return Array.isArray(entries) ? entries : [];
    },
    async status() {
      return status;
    },
    onStatus(cb): Unsub {
      return changed.on(cb);
    },
    async useLocal(modelId) {
      logger.warn(`useLocal(${modelId}) called on the stub`);
      setStatus({ ...status, provider: 'local', modelId, state: 'error', message: NOT_YET });
    },
    async useOwnFile() {
      return false;
    },
    async cancelDownload() {},
    async useCloud() {
      return { ok: false, message: NOT_YET };
    },
    async useNone() {
      setStatus({ provider: 'none', modelId: null, state: 'not-set-up', installed: [] });
    },
    async removeModel() {},
    getProvider() {
      return null;
    },
    async dispose() {
      changed.clear();
    },
  };
}
