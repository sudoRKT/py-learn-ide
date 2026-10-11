// Tests for the STUB lesson, settings, progress, profile and backup services.
// The lessons agent extends or replaces these.

import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { DEFAULT_PROFILE_ID } from '@shared/constants';
import { DEFAULT_SETTINGS, type Settings } from '@shared/types';
import { createTestCore } from '../testing';
import {
  createBackupService, createLessonService, createProfileService, createProgressService, createSettingsService,
} from './index';

const core = createTestCore();
const profiles = createProfileService(core.deps);
const settings = createSettingsService({ ...core.deps, profiles });
const lessons = createLessonService(core.deps);
const progress = createProgressService({ ...core.deps, profiles });
const backup = createBackupService({ ...core.deps, profiles, settings, progress });

afterAll(() => core.cleanup());

describe('stub LessonService', () => {
  it('lists the placeholder lesson and loads it in full', async () => {
    const list = await lessons.list();
    expect(list[0]).toMatchObject({ id: '001-hello-world', number: 1, slug: 'hello-world', stage: 1, stageTitle: 'First programs', type: 'learn' });

    const lesson = await lessons.get('001-hello-world');
    expect(lesson.guideMarkdown).toContain('# Hello, world');
    expect(lesson.steps.map((s) => s.kind)).toEqual(['predict', 'run', 'investigate', 'modify', 'make']);
    expect(lesson.starterFiles[0]?.name).toBe('starter.py');
    expect(lesson.starterFiles[0]?.content).toContain('print(');
    expect(lesson.taught).toEqual(['print']);
    expect(lesson.notYetTaught).toContain('input');
    expect(lesson.notYetTaught).not.toContain('print');
    expect(lesson.dataFiles).toEqual([]);
  });

  it('serves the solution, hints, tutor rules and ideas', async () => {
    expect((await lessons.solution('001-hello-world'))[0]?.name).toBe('solution.py');
    expect(Object.keys(await lessons.hints('001-hello-world'))).toEqual(['modify', 'make']);
    expect((await lessons.tutorRules('001-hello-world')).length).toBeGreaterThan(0);
    const ideas = await lessons.ideaList();
    expect(ideas.find((i) => i.key === 'print')).toMatchObject({ label: 'print()', lesson: 1 });
    expect(ideas.find((i) => i.key === 'input')?.lesson).toBeNull();
    expect(lessons.lessonDir('001-hello-world')).toBe(join(core.paths.lessonsDir, '001-hello-world'));
  });

  it('rejects unknown lessons and data files outside files/', async () => {
    await expect(lessons.get('999-nope')).rejects.toThrow();
    await expect(lessons.dataFile('001-hello-world', '../lesson.json')).rejects.toThrow();
  });
});

describe('stub SettingsService and ProfileService', () => {
  it('starts with the defaults for the default profile', async () => {
    expect(await settings.get()).toEqual({ ...DEFAULT_SETTINGS, profileId: DEFAULT_PROFILE_ID });
    expect(DEFAULT_SETTINGS.theme).toBe('system');
    expect(DEFAULT_SETTINGS.tutor.idleSeconds).toBe(2);
    expect(DEFAULT_SETTINGS.tutor.minGapSeconds).toBe(10);
  });

  it('merges a deep patch, clamps, saves, and announces the change', async () => {
    const seen: Settings[] = [];
    const off = settings.onChanged((s) => seen.push(s));
    const next = await settings.set({ theme: 'dark', tutor: { idleSeconds: 5 }, editorFontSize: 999 });
    off();
    expect(next.theme).toBe('dark');
    expect(next.tutor).toEqual({ ...DEFAULT_SETTINGS.tutor, idleSeconds: 5 });
    expect(next.editorFontSize).toBe(32);
    expect(seen).toEqual([next]);
    expect(settings.current()).toEqual(next);
  });

  it('gives each profile its own settings and progress', async () => {
    await progress.update('001-hello-world', { started: true, code: { 'starter.py': 'print("mine")' } });
    const sam = await profiles.create('  Sam  ');
    expect(sam.name).toBe('Sam');

    const seen: Settings[] = [];
    const off = settings.onChanged((s) => seen.push(s));
    await profiles.switchTo(sam.id);
    off();
    expect(profiles.current().id).toBe(sam.id);
    expect(seen[0]).toMatchObject({ profileId: sam.id, theme: 'system' });
    expect(await progress.all()).toEqual([]);

    await profiles.switchTo(DEFAULT_PROFILE_ID);
    expect((await settings.get()).theme).toBe('dark');
    expect((await progress.get('001-hello-world')).code).toEqual({ 'starter.py': 'print("mine")' });

    await profiles.remove(sam.id);
    expect((await profiles.list()).map((p) => p.id)).toEqual([DEFAULT_PROFILE_ID]);
    await expect(profiles.remove(DEFAULT_PROFILE_ID)).rejects.toThrow();
  });
});

describe('stub ProgressService', () => {
  it('returns an empty record for a lesson never opened, and resets', async () => {
    expect(await progress.get('002-text')).toMatchObject({ lessonId: '002-text', started: false, passed: false, code: {} });
    await progress.update('002-text', { passed: true, stepsDone: ['a', 'b'] });
    expect(await progress.get('002-text')).toMatchObject({ passed: true, stepsDone: ['a', 'b'] });
    expect(await progress.reset('002-text')).toMatchObject({ passed: false, stepsDone: [] });
    expect((await progress.all()).map((p) => p.lessonId)).not.toContain('002-text');
  });
});

describe('stub BackupService', () => {
  it('round-trips settings and progress through one file', async () => {
    const file = join(core.paths.dataDir, 'backup-test.pylearn');
    await progress.update('003-numbers', { passed: true, notes: 'remember //' });
    await backup.exportTo(file);

    await progress.reset('003-numbers');
    await settings.set({ theme: 'light' });
    expect(await backup.importFrom(file)).toBe(true);
    expect(await progress.get('003-numbers')).toMatchObject({ passed: true, notes: 'remember //' });
    expect((await settings.get()).theme).toBe('dark');
  });

  it('refuses a file that is not a backup', async () => {
    expect(await backup.importFrom(core.paths.profilesFile)).toBe(false);
    expect(await backup.importFrom(join(core.paths.dataDir, 'missing.pylearn'))).toBe(false);
  });
});
