import { describe, expect, it } from 'vitest';
import { CHANNELS } from '@shared/ipc';
import { stepsFileSchema } from '@shared/lesson-schema';
import type { ModelStatus, RunEvent, TerminalEvent, TutorMessage } from '@shared/types';
import { createMockApi } from './mockApi';
import { RICH_LESSON_ID } from './mockData';

const { api, controls } = createMockApi({ speed: 0 });
const tick = (ms = 20): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

describe('mockApi', () => {
  it('implements every method of the Api', () => {
    for (const { group, method } of CHANNELS) {
      expect(typeof (api[group] as Record<string, unknown>)[method], `${group}.${method}`).toBe('function');
    }
  });

  it('has at least 24 lessons across at least 4 stages, with varied types and progress', async () => {
    const lessons = await api.lessons.list();
    expect(lessons.length).toBeGreaterThanOrEqual(24);
    expect(new Set(lessons.map((l) => l.stage)).size).toBeGreaterThanOrEqual(4);
    expect(new Set(lessons.map((l) => l.type))).toEqual(new Set(['learn', 'skill', 'fix', 'read', 'build']));
    expect(new Set(lessons.map((l) => l.id)).size).toBe(lessons.length);
    const progress = await api.progress.all();
    expect(progress.some((p) => p.passed)).toBe(true);
    expect(progress.some((p) => p.started && !p.passed)).toBe(true);
    expect(progress.some((p) => p.bookmarked)).toBe(true);
    expect(lessons.some((l) => !progress.some((p) => p.lessonId === l.id))).toBe(true);
  });

  it('has one lesson with all six step kinds and every question kind, valid against the schema', async () => {
    const lesson = await api.lessons.get(RICH_LESSON_ID);
    expect(new Set(lesson.steps.map((s) => s.kind))).toEqual(new Set(['recall', 'predict', 'run', 'investigate', 'modify', 'make']));
    expect(new Set(lesson.steps.map((s) => s.question.kind))).toEqual(new Set(['choice', 'order', 'text', 'none', 'trace', 'spot', 'code']));
    expect(() => stepsFileSchema.parse(lesson.steps)).not.toThrow();
    for (const summary of await api.lessons.list()) {
      const full = await api.lessons.get(summary.id);
      expect(() => stepsFileSchema.parse(full.steps), summary.id).not.toThrow();
      expect(full.starterFiles.length, summary.id).toBeGreaterThan(0);
    }
    expect((await api.lessons.solution(RICH_LESSON_ID))[0]?.content).toContain('total');
    expect((await api.lessons.ideas()).length).toBeGreaterThan(10);
  });

  it('simulates a run with output and an input request', async () => {
    const events: RunEvent[] = [];
    const off = api.python.onEvent((e) => {
      events.push(e);
      if (e.type === 'input-requested') void api.python.sendInput(e.runId, '7');
    });
    const lesson = await api.lessons.get(RICH_LESSON_ID);
    const runId = await api.python.run({ lessonId: lesson.id, files: lesson.starterFiles, entry: lesson.starterFiles[0]!.name });
    await expect.poll(() => events.some((e) => e.type === 'exit')).toBe(true);
    off();
    expect(events[0]).toEqual({ type: 'started', runId });
    expect(events.filter((e) => e.type === 'input-requested')).toHaveLength(3);
    expect(events.map((e) => (e.type === 'stdout' ? e.text : '')).join('')).toContain('Total: 21');
    expect(events.at(-1)).toMatchObject({ type: 'exit', code: 0 });
  });

  it('fails a run and reports a diagnostic when the code contains "pritn"', async () => {
    const code = 'print("ok")\npritn("oops")\n';
    expect(await api.python.analyse('print("fine")', null)).toEqual([]);
    expect(await api.python.analyse(code, null)).toMatchObject([{ line: 2, column: 1, endColumn: 6, severity: 'error', code: 'undefined-name' }]);

    const events: RunEvent[] = [];
    const off = api.python.onEvent((e) => events.push(e));
    await api.python.run({ lessonId: null, files: [{ name: 'main.py', content: code }], entry: 'main.py' });
    await expect.poll(() => events.some((e) => e.type === 'exit')).toBe(true);
    off();
    const exit = events.at(-1);
    expect(exit).toMatchObject({ type: 'exit', code: 1, error: { type: 'NameError', line: 2 } });
  });

  it('stops an endless loop', async () => {
    const events: RunEvent[] = [];
    const off = api.python.onEvent((e) => events.push(e));
    const runId = await api.python.run({ lessonId: null, files: [{ name: 'main.py', content: 'while True:\n    print("again")\n' }], entry: 'main.py' });
    await expect.poll(() => events.filter((e) => e.type === 'stdout').length > 2).toBe(true);
    await api.python.stop(runId);
    await expect.poll(() => events.some((e) => e.type === 'exit')).toBe(true);
    off();
    expect(events.at(-1)).toMatchObject({ type: 'exit', code: null, signal: 'SIGTERM' });
  });

  it('returns a six-step trace and three tests with one failing', async () => {
    const trace = await api.python.trace({ lessonId: null, files: [], entry: 'main.py' }, []);
    expect(trace.steps).toHaveLength(6);
    expect(trace.steps.every((s) => s.file === 'main.py')).toBe(true);
    const tests = await api.python.runTests(null, []);
    expect(tests.tests.map((t) => t.outcome)).toEqual(['passed', 'passed', 'failed']);
  });

  it('fails a check, then passes it on the next call', async () => {
    expect((await api.checks.run('x', 'make', [])).passed).toBe(false);
    expect((await api.checks.run('x', 'make', [])).passed).toBe(true);
    expect((await api.checks.run('x', 'modify', [])).passed).toBe(false);
  });

  it('answers git status in the terminal and refuses unknown commands', async () => {
    const events: TerminalEvent[] = [];
    const off = api.terminal.onEvent((e) => events.push(e));
    const id = await api.terminal.run(null, 'git status');
    await expect.poll(() => events.some((e) => e.type === 'exit' && e.id === id)).toBe(true);
    expect(events.find((e) => e.type === 'output')).toMatchObject({ id, text: expect.stringContaining('On branch main') });
    const bad = await api.terminal.run(null, 'format c:');
    await expect.poll(() => events.some((e) => e.type === 'exit' && e.id === bad)).toBe(true);
    off();
    expect(events.find((e) => e.type === 'exit' && e.id === bad)).toMatchObject({ code: 1 });
    expect(await api.terminal.cwd(null)).toBe('.');
  });

  it('reports and changes the practice service mode', async () => {
    expect(await api.practice.status()).toMatchObject({ running: true, mode: 'normal' });
    const seen: string[] = [];
    const off = api.practice.onStatus((s) => seen.push(s.mode));
    expect((await api.practice.setMode('slow')).mode).toBe('slow');
    off();
    expect(seen).toEqual(['slow']);
  });

  it('walks ai.status through downloading, starting and ready', async () => {
    const states: ModelStatus['state'][] = [];
    const off = api.ai.onStatus((s) => states.push(s.state));
    expect((await api.ai.status()).state).toBe('not-set-up');
    expect(await api.ai.catalogue()).toHaveLength(3);
    await api.ai.useLocal('tutor-small');
    await expect.poll(() => states.at(-1)).toBe('ready');
    off();
    expect([...new Set(states)]).toEqual(['downloading', 'starting', 'ready']);
    expect((await api.ai.status()).installed).toEqual(['tutor-small']);
    expect((await api.settings.get()).ai).toMatchObject({ provider: 'local', modelId: 'tutor-small' });
    expect((await api.ai.useCloud('openai-compatible', 'bad')).ok).toBe(false);
  });

  it('delivers tutor messages: idle comments, hints, and a streamed one', async () => {
    const messages: TutorMessage[] = [];
    const deltas: string[] = [];
    const offMessage = api.tutor.onMessage((m) => messages.push(m));
    const offDelta = api.tutor.onMessageDelta((_id, text) => deltas.push(text));

    api.tutor.notifyEdit({ lessonId: null, stepId: null, file: 'main.py', code: 'pritn("x")', cursorLine: 1, recentEdits: [] });
    await expect.poll(() => messages.length).toBe(1);
    expect(messages[0]).toMatchObject({ trigger: 'idle', source: 'analysis', line: 1 });

    await api.tutor.hint('x', 'make', 'small', { lessonId: 'x', stepId: 'make', file: 'main.py', code: '', cursorLine: 1, recentEdits: [] });
    expect(messages.at(-1)).toMatchObject({ trigger: 'hint-small', source: 'prepared' });

    controls.setSpeed(0.01);
    controls.say('one two three', { stream: true, source: 'ai' });
    await expect.poll(() => messages.at(-1)?.streaming === false && messages.at(-1)?.text === 'one two three').toBe(true);
    controls.setSpeed(0);
    expect(messages.some((m) => m.streaming === true && m.text === '')).toBe(true);
    expect(deltas.join('')).toBe('one two three');
    await tick();
    offMessage();
    offDelta();
  });

  it('keeps settings and progress per profile', async () => {
    await api.settings.set({ theme: 'dark', layout: { tutorCollapsed: true } });
    expect(await api.settings.get()).toMatchObject({ theme: 'dark', layout: { tutorCollapsed: true, consolePosition: 'right' } });
    const other = (await api.profiles.list()).find((p) => p.id !== 'default')!;
    await api.profiles.switchTo(other.id);
    expect(await api.settings.get()).toMatchObject({ theme: 'system', profileId: other.id });
    expect(await api.progress.all()).toEqual([]);
    await api.profiles.switchTo('default');
    expect((await api.app.info()).mock).toBe(true);
  });
});
