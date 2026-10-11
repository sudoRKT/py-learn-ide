// Builds every service in dependency order (SPEC section 4). No Electron imports, so the
// whole set can be created in a test with createTestCore() and fake SecretStore/Dialogs.

import { createAiService } from './ai';
import {
  createBackupService, createLessonService, createProfileService, createProgressService, createSettingsService,
} from './lessons';
import {
  createChecksService, createPracticeService, createPythonService, createTerminalService,
} from './python';
import type { CoreDeps, Dialogs, SecretStore, Services } from './services';
import { createTutorService } from './tutor';

/** The pieces only Electron can provide. */
export interface HostDeps {
  secrets: SecretStore;
  dialogs: Dialogs;
}

export function createServices(core: CoreDeps, host: HostDeps): Services {
  const profiles = createProfileService(core);
  const settings = createSettingsService({ ...core, profiles });
  const lessons = createLessonService(core);
  const progress = createProgressService({ ...core, profiles });
  const backup = createBackupService({ ...core, profiles, settings, progress });
  const practice = createPracticeService(core);
  const python = createPythonService({ ...core, profiles, settings, lessons, practice });
  const checks = createChecksService({ ...core, profiles, lessons, practice });
  const terminal = createTerminalService({ ...core, profiles, lessons, practice });
  const ai = createAiService({ ...core, settings, secrets: host.secrets, dialogs: host.dialogs });
  const tutor = createTutorService({ ...core, profiles, settings, lessons, progress, python, ai });
  return { profiles, settings, lessons, progress, backup, practice, python, checks, terminal, ai, tutor };
}

/** Stops everything, in the reverse of the order it was created. Never throws. */
export async function disposeServices(services: Services, core: CoreDeps): Promise<void> {
  const order: (keyof Services)[] = [
    'tutor', 'ai', 'terminal', 'checks', 'python', 'practice', 'progress', 'lessons', 'settings', 'profiles',
  ];
  for (const name of order) {
    try {
      const service = services[name];
      if ('dispose' in service) await service.dispose();
    } catch (error) {
      core.logger.error(`dispose of ${name} failed`, error);
    }
  }
}
