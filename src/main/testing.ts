// Helpers for unit tests of services. Not imported by the app itself.
//
//   const core = createTestCore();
//   const python = createPythonService({ ...core.deps, ... });
//   afterAll(() => core.cleanup());
//
// The Paths it builds point at the real repository (lessons/, python/, resources/) but at a
// fresh temporary data folder, so tests never touch .devdata.

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createNullLogger, type Logger } from './logger';
import { createPaths, type Paths, type PathsOptions } from './paths';
import type { CoreDeps, Dialogs, SecretStore } from './services';

/** The repository root (two levels above src/main). */
export const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url)).replace(/[\\/]$/, '');

export interface TestCore {
  paths: Paths;
  logger: Logger;
  /** `{ paths, logger }`, ready to spread into a factory's deps. */
  deps: CoreDeps;
  /** Deletes the temporary data folder. */
  cleanup(): void;
}

export function createTestCore(overrides: Partial<PathsOptions> = {}): TestCore {
  const dataDir = mkdtempSync(join(tmpdir(), 'pylearn-test-'));
  const paths = createPaths({ packaged: false, appDir: REPO_ROOT, dataDir, ...overrides });
  paths.ensureDataDirs();
  const logger = createNullLogger();
  return {
    paths,
    logger,
    deps: { paths, logger },
    cleanup: () => rmSync(dataDir, { recursive: true, force: true, maxRetries: 3 }),
  };
}

/** A SecretStore that keeps values in memory. */
export function createMemorySecretStore(available = true): SecretStore {
  const values = new Map<string, string>();
  return {
    isAvailable: () => available,
    get: async (name) => values.get(name) ?? null,
    set: async (name, value) => {
      if (!available) throw new Error('Secret storage is not available');
      values.set(name, value);
    },
    remove: async (name) => {
      values.delete(name);
    },
  };
}

/** Dialogs that answer with fixed paths (null = the learner cancelled). */
export function createFakeDialogs(answers: { pick?: string | null; save?: string | null } = {}): Dialogs {
  return {
    pickFile: async () => answers.pick ?? null,
    saveFile: async () => answers.save ?? null,
  };
}
