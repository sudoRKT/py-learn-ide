// Lessons area: LessonStore, ProgressStore, SettingsStore, profiles and backup.
// Owner: the "lessons" agent. See README.md in this folder.
//
// These are WORKING STUBS: simple, synchronous, re-reading JSON from disk on most calls.
// They are correct enough to run the app today. Replace the bodies; keep the factory
// names and signatures (src/main/compose.ts and the tests call them).

import { existsSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { customAlphabet } from 'nanoid';
import {
  BACKUP_FORMAT, BACKUP_VERSION, DEFAULT_PROFILE_ID, DEFAULT_PROFILE_NAME, LESSON_FOLDER_PATTERN, LIMITS,
} from '@shared/constants';
import type { ProgressPatch } from '@shared/ipc';
import {
  hintsFileSchema, ideasFileSchema, lessonIndexSchema, lessonJsonSchema, parseLessonFile, stepsFileSchema,
  tutorFileSchema, type HintsFile, type IdeasFile, type LessonJson, type TutorRule,
} from '@shared/lesson-schema';
import {
  DEFAULT_SETTINGS, deepMerge, emptyProgress,
  type CodeFile, type DeepPartial, type Idea, type Lesson, type LessonProgress, type LessonSummary,
  type Profile, type Settings, type Unsub,
} from '@shared/types';
import { Emitter } from '../emitter';
import { readJsonFile, readJsonFileStrict, writeJsonFileAtomic } from '../fs-util';
import type {
  BackupService, LessonService, ProfileService, ProgressService, ServiceDeps, SettingsService,
} from '../services';

// ================================================================ profiles

interface ProfilesFile {
  currentId: string;
  profiles: Profile[];
}

const newProfileSuffix = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 8);

function cleanName(name: string): string {
  const trimmed = name.replace(/\s+/g, ' ').trim().slice(0, 40);
  if (!trimmed) throw new Error('A profile needs a name.');
  return trimmed;
}

export function createProfileService(deps: ServiceDeps['profiles']): ProfileService {
  const { paths } = deps;
  const logger = deps.logger.child('profiles');
  const switched = new Emitter<[Profile]>();

  function load(): ProfilesFile {
    const stored = readJsonFile<ProfilesFile | null>(paths.profilesFile, null);
    if (stored && Array.isArray(stored.profiles) && stored.profiles.length > 0) {
      if (!stored.profiles.some((p) => p.id === stored.currentId)) stored.currentId = stored.profiles[0]!.id;
      return stored;
    }
    const now = Date.now();
    const fresh: ProfilesFile = {
      currentId: DEFAULT_PROFILE_ID,
      profiles: [{ id: DEFAULT_PROFILE_ID, name: DEFAULT_PROFILE_NAME, createdAt: now, lastUsedAt: now }],
    };
    save(fresh);
    return fresh;
  }

  function save(file: ProfilesFile): void {
    writeJsonFileAtomic(paths.profilesFile, file);
  }

  function find(file: ProfilesFile, id: string): Profile {
    const profile = file.profiles.find((p) => p.id === id);
    if (!profile) throw new Error(`No such profile: ${id}`);
    return profile;
  }

  return {
    async list() {
      return load().profiles;
    },
    async create(name) {
      const file = load();
      const now = Date.now();
      const profile: Profile = { id: `p-${newProfileSuffix()}`, name: cleanName(name), createdAt: now, lastUsedAt: now };
      file.profiles.push(profile);
      save(file);
      logger.info(`created profile ${profile.id}`);
      return profile;
    },
    async switchTo(id) {
      const file = load();
      const profile = find(file, id);
      profile.lastUsedAt = Date.now();
      file.currentId = id;
      save(file);
      switched.emit(profile);
    },
    async rename(id, name) {
      const file = load();
      find(file, id).name = cleanName(name);
      save(file);
    },
    async remove(id) {
      const file = load();
      find(file, id);
      if (file.profiles.length <= 1) throw new Error('The last profile cannot be removed.');
      file.profiles = file.profiles.filter((p) => p.id !== id);
      const wasCurrent = file.currentId === id;
      if (wasCurrent) file.currentId = file.profiles[0]!.id;
      save(file);
      rmSync(paths.profileDir(id), { recursive: true, force: true });
      rmSync(paths.profileScratchDir(id), { recursive: true, force: true });
      logger.info(`removed profile ${id}`);
      if (wasCurrent) switched.emit(file.profiles[0]!);
    },
    current() {
      const file = load();
      return find(file, file.currentId);
    },
    onSwitched(cb): Unsub {
      return switched.on(cb);
    },
    async dispose() {
      switched.clear();
    },
  };
}

// ================================================================ settings

function clamp(value: number, min: number, max: number, fallback: number): number {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

function tidySettings(settings: Settings, profileId: string): Settings {
  const d = DEFAULT_SETTINGS;
  return {
    ...settings,
    theme: ['light', 'dark', 'system'].includes(settings.theme) ? settings.theme : d.theme,
    editorFontSize: clamp(settings.editorFontSize, LIMITS.editorFontSizeMin, LIMITS.editorFontSizeMax, d.editorFontSize),
    uiScale: clamp(settings.uiScale, LIMITS.uiScaleMin, LIMITS.uiScaleMax, d.uiScale),
    tutor: {
      ...settings.tutor,
      idleSeconds: clamp(settings.tutor.idleSeconds, LIMITS.tutorIdleSecondsMin, LIMITS.tutorIdleSecondsMax, d.tutor.idleSeconds),
      minGapSeconds: clamp(
        settings.tutor.minGapSeconds, LIMITS.tutorMinGapSecondsMin, LIMITS.tutorMinGapSecondsMax, d.tutor.minGapSeconds,
      ),
    },
    profileId,
  };
}

export function createSettingsService(deps: ServiceDeps['settings']): SettingsService {
  const { paths, profiles } = deps;
  const changed = new Emitter<[Settings]>();

  function read(): Settings {
    const profileId = profiles.current().id;
    const stored = readJsonFile<DeepPartial<Settings>>(paths.settingsFile(profileId), {});
    return tidySettings(deepMerge(DEFAULT_SETTINGS, stored), profileId);
  }

  const offSwitch = profiles.onSwitched(() => changed.emit(read()));

  return {
    async get() {
      return read();
    },
    current() {
      return read();
    },
    async set(patch) {
      const profileId = profiles.current().id;
      const next = tidySettings(deepMerge(read(), patch), profileId);
      writeJsonFileAtomic(paths.settingsFile(profileId), next);
      changed.emit(next);
      return next;
    },
    onChanged(cb): Unsub {
      return changed.on(cb);
    },
    async dispose() {
      offSwitch();
      changed.clear();
    },
  };
}

// ================================================================ lessons

interface LoadedLesson {
  summary: LessonSummary;
  meta: LessonJson;
  dir: string;
}

function listFilesRecursive(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const full = join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else out.push(relative(dir, full).split(sep).join('/'));
    }
  };
  walk(dir);
  return out.sort();
}

export function createLessonService(deps: ServiceDeps['lessons']): LessonService {
  const { paths } = deps;
  const logger = deps.logger.child('lessons');
  let cache: LoadedLesson[] | null = null;

  function loadIdeas(): IdeasFile {
    return parseLessonFile(ideasFileSchema, readJsonFileStrict(paths.ideasFile), 'lessons/ideas.json');
  }

  function loadAll(): LoadedLesson[] {
    if (cache) return cache;
    const index = parseLessonFile(lessonIndexSchema, readJsonFileStrict(paths.lessonIndexFile), 'lessons/index.json');
    const stageTitle = new Map(index.stages.map((s) => [s.number, s.title]));
    const loaded: LoadedLesson[] = [];
    for (const entry of readdirSync(paths.lessonsDir, { withFileTypes: true })) {
      const match = LESSON_FOLDER_PATTERN.exec(entry.name);
      if (!entry.isDirectory() || !match) continue;
      const dir = join(paths.lessonsDir, entry.name);
      try {
        const meta = parseLessonFile(lessonJsonSchema, readJsonFileStrict(join(dir, 'lesson.json')), `${entry.name}/lesson.json`);
        if (meta.number !== Number(match[1])) {
          throw new Error(`${entry.name}/lesson.json says number ${meta.number}, which does not match the folder name`);
        }
        loaded.push({
          dir,
          meta,
          summary: {
            id: entry.name,
            number: meta.number,
            slug: match[2]!,
            title: meta.title,
            stage: meta.stage,
            stageTitle: stageTitle.get(meta.stage) ?? `Stage ${meta.stage}`,
            type: meta.type,
            minutes: meta.minutes,
            newIdea: meta.newIdea,
            online: meta.online,
            optional: meta.optional,
          },
        });
      } catch (error) {
        logger.error(`skipping lesson folder ${entry.name}`, error);
      }
    }
    loaded.sort((a, b) => a.summary.number - b.summary.number);
    cache = loaded;
    return loaded;
  }

  function find(id: string): LoadedLesson {
    const lesson = loadAll().find((l) => l.summary.id === id);
    if (!lesson) throw new Error(`No such lesson: ${id}`);
    return lesson;
  }

  function readFiles(dir: string, names: readonly string[]): CodeFile[] {
    return names.map((name) => ({ name, content: readFileSync(paths.resolveInside(dir, name), 'utf8') }));
  }

  return {
    async list() {
      return loadAll().map((l) => l.summary);
    },
    async get(id) {
      const lesson = find(id);
      const ideaKeys = Object.keys(loadIdeas());
      const taught = new Set<string>();
      for (const other of loadAll()) {
        if (other.summary.number <= lesson.summary.number) other.meta.introduces.forEach((key) => taught.add(key));
      }
      const notYetTaught =
        lesson.meta.notYetTaught === 'auto' ? ideaKeys.filter((key) => !taught.has(key)) : lesson.meta.notYetTaught;
      const steps = parseLessonFile(stepsFileSchema, readJsonFileStrict(join(lesson.dir, 'steps.json')), `${id}/steps.json`);
      const full: Lesson = {
        ...lesson.summary,
        guideMarkdown: readFileSync(join(lesson.dir, 'guide.md'), 'utf8'),
        steps,
        starterFiles: readFiles(lesson.dir, lesson.meta.starterFiles),
        dataFiles: listFilesRecursive(paths.lessonDataDir(id)),
        taught: ideaKeys.filter((key) => taught.has(key)),
        notYetTaught,
      };
      return full;
    },
    async solution(id) {
      const lesson = find(id);
      return readFiles(lesson.dir, lesson.meta.solutionFiles);
    },
    async dataFile(id, name) {
      find(id);
      return readFileSync(paths.resolveInside(paths.lessonDataDir(id), name), 'utf8');
    },
    lessonDir(id) {
      return find(id).dir;
    },
    async ideas() {
      return loadIdeas();
    },
    async ideaList() {
      const firstLesson = new Map<string, number>();
      for (const lesson of loadAll()) {
        for (const key of lesson.meta.introduces) {
          if (!firstLesson.has(key)) firstLesson.set(key, lesson.summary.number);
        }
      }
      return Object.entries(loadIdeas()).map(
        ([key, idea]): Idea => ({
          key,
          label: idea.label,
          reminder: idea.reminder,
          example: idea.example,
          lesson: firstLesson.get(key) ?? null,
        }),
      );
    },
    async hints(id): Promise<HintsFile> {
      const lesson = find(id);
      return parseLessonFile(hintsFileSchema, readJsonFileStrict(join(lesson.dir, 'hints.json')), `${id}/hints.json`);
    },
    async tutorRules(id): Promise<TutorRule[]> {
      const lesson = find(id);
      return parseLessonFile(tutorFileSchema, readJsonFileStrict(join(lesson.dir, 'tutor.json')), `${id}/tutor.json`);
    },
    async dispose() {
      cache = null;
    },
  };
}

// ================================================================ progress

type ProgressFile = Record<string, LessonProgress>;

export function createProgressService(deps: ServiceDeps['progress']): ProgressService {
  const { paths, profiles } = deps;

  const file = (): string => paths.progressFile(profiles.current().id);
  const load = (): ProgressFile => readJsonFile<ProgressFile>(file(), {});
  const withDefaults = (id: string, stored: LessonProgress | undefined): LessonProgress => ({
    ...emptyProgress(id),
    ...stored,
    lessonId: id,
  });

  return {
    async all() {
      return Object.entries(load()).map(([id, stored]) => withDefaults(id, stored));
    },
    async get(id) {
      return withDefaults(id, load()[id]);
    },
    async update(id, patch: ProgressPatch) {
      const all = load();
      const next = withDefaults(id, { ...withDefaults(id, all[id]), ...patch, lessonId: id });
      all[id] = next;
      writeJsonFileAtomic(file(), all);
      return next;
    },
    async reset(id) {
      const all = load();
      delete all[id];
      writeJsonFileAtomic(file(), all);
      return emptyProgress(id);
    },
    async dispose() {
      // Nothing is buffered in the stub.
    },
  };
}

// ================================================================ backup

interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: number;
  profiles: ProfilesFile;
  data: Record<string, { settings: unknown; progress: unknown }>;
}

function isBackupFile(value: unknown): value is BackupFile {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<BackupFile>;
  return (
    v.format === BACKUP_FORMAT &&
    v.version === BACKUP_VERSION &&
    typeof v.profiles === 'object' && v.profiles !== null &&
    Array.isArray(v.profiles.profiles) && v.profiles.profiles.length > 0 &&
    v.profiles.profiles.every((p) => typeof p?.id === 'string' && /^[a-z0-9][a-z0-9-]{0,40}$/.test(p.id) && typeof p.name === 'string') &&
    typeof v.data === 'object' && v.data !== null
  );
}

export function createBackupService(deps: ServiceDeps['backup']): BackupService {
  const { paths, profiles } = deps;
  const logger = deps.logger.child('backup');

  return {
    async exportTo(filePath) {
      const list = await profiles.list();
      const backup: BackupFile = {
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        exportedAt: Date.now(),
        profiles: { currentId: profiles.current().id, profiles: list },
        data: Object.fromEntries(
          list.map((p) => [
            p.id,
            {
              settings: readJsonFile<unknown>(paths.settingsFile(p.id), {}),
              progress: readJsonFile<unknown>(paths.progressFile(p.id), {}),
            },
          ]),
        ),
      };
      // The one place the app writes outside its data folder: a file the learner chose in a save dialog.
      writeJsonFileAtomic(filePath, backup);
      logger.info(`exported ${list.length} profile(s)`);
    },
    async importFrom(filePath) {
      if (!existsSync(filePath) || statSync(filePath).size > 200 * 1024 * 1024) return false;
      const backup = readJsonFile<unknown>(filePath, null);
      if (!isBackupFile(backup)) return false;
      for (const profile of backup.profiles.profiles) {
        const entry = backup.data[profile.id];
        writeJsonFileAtomic(paths.settingsFile(profile.id), entry?.settings ?? {});
        writeJsonFileAtomic(paths.progressFile(profile.id), entry?.progress ?? {});
      }
      const currentId = backup.profiles.profiles.some((p) => p.id === backup.profiles.currentId)
        ? backup.profiles.currentId
        : backup.profiles.profiles[0]!.id;
      writeJsonFileAtomic(paths.profilesFile, { currentId, profiles: backup.profiles.profiles });
      // Re-announce the active profile so settings and the renderer reload.
      await profiles.switchTo(currentId);
      logger.info(`imported ${backup.profiles.profiles.length} profile(s)`);
      return true;
    },
  };
}
