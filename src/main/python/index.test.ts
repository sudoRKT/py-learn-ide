// Tests for the STUB Python service. The python agent replaces these with the real ones;
// the first test (print, stdout, exit 0) should keep passing unchanged.

import { afterAll, describe, expect, it } from 'vitest';
import type { RunEvent, RunRequest } from '@shared/types';
import { createLessonService, createProfileService, createSettingsService } from '../lessons';
import { createTestCore } from '../testing';
import { createChecksService, createPracticeService, createPythonService } from './index';

const core = createTestCore();
const profiles = createProfileService(core.deps);
const settings = createSettingsService({ ...core.deps, profiles });
const lessons = createLessonService(core.deps);
const practice = createPracticeService(core.deps);
const python = createPythonService({ ...core.deps, profiles, settings, lessons, practice });

afterAll(async () => {
  await python.dispose();
  core.cleanup();
});

/** Start a run and collect its events until it exits. */
function runToEnd(req: RunRequest, onEvent?: (event: RunEvent, runId: string) => void): Promise<RunEvent[]> {
  return new Promise((resolve, reject) => {
    const events: RunEvent[] = [];
    const off = python.onEvent((event) => {
      events.push(event);
      onEvent?.(event, event.runId);
      if (event.type === 'exit') {
        off();
        resolve(events);
      }
    });
    python.run(req).catch((error: unknown) => {
      off();
      reject(error);
    });
  });
}

const textOf = (events: RunEvent[], type: 'stdout' | 'stderr'): string =>
  events.map((e) => (e.type === type ? e.text : '')).join('');

describe('stub PythonService', () => {
  it('runs print("hi") and reports stdout and exit code 0', async () => {
    const events = await runToEnd({ lessonId: null, files: [{ name: 'main.py', content: 'print("hi")\n' }], entry: 'main.py' });
    expect(events[0]?.type).toBe('started');
    expect(textOf(events, 'stdout')).toBe('hi\n');
    const exit = events.at(-1);
    expect(exit).toMatchObject({ type: 'exit', code: 0, signal: null });
    expect(new Set(events.map((e) => e.runId)).size).toBe(1);
  });

  it('reports stderr and a non-zero exit code for a program that fails', async () => {
    const events = await runToEnd({ lessonId: null, files: [{ name: 'main.py', content: 'pritn("hi")\n' }], entry: 'main.py' });
    expect(textOf(events, 'stderr')).toContain('NameError');
    expect(events.at(-1)).toMatchObject({ type: 'exit', code: 1 });
  });

  it('passes typed input to the program', async () => {
    let sent = false;
    const events = await runToEnd(
      { lessonId: null, files: [{ name: 'main.py', content: 'name = input("Name? ")\nprint("Hello,", name)\n' }], entry: 'main.py' },
      (event, runId) => {
        if (!sent && event.type === 'stdout' && event.text.includes('Name?')) {
          sent = true;
          void python.sendInput(runId, 'Sam');
        }
      },
    );
    expect(textOf(events, 'stdout')).toContain('Hello, Sam');
  });

  it('stops a program that never ends', async () => {
    const events = await runToEnd(
      { lessonId: null, files: [{ name: 'main.py', content: 'import time\nprint("go")\nwhile True:\n    time.sleep(0.05)\n' }], entry: 'main.py' },
      (event, runId) => {
        if (event.type === 'stdout') void python.stop(runId);
      },
    );
    const exit = events.at(-1);
    expect(exit?.type).toBe('exit');
    expect(exit?.type === 'exit' && exit.code).not.toBe(0);
  });

  it('runs files from other modules and passes args and env', async () => {
    const events = await runToEnd({
      lessonId: null,
      files: [
        { name: 'main.py', content: 'import os, sys\nfrom helpers import shout\nprint(shout(sys.argv[1]), os.environ["GREETING"])\n' },
        { name: 'helpers.py', content: 'def shout(text):\n    return text.upper()\n' },
      ],
      entry: 'main.py',
      args: ['hello'],
      env: { GREETING: 'there' },
    });
    expect(textOf(events, 'stdout')).toBe('HELLO there\n');
  });

  it('rejects a run whose entry file is missing or whose file names leave the folder', async () => {
    await expect(python.run({ lessonId: null, files: [], entry: 'main.py' })).rejects.toThrow();
    await expect(
      python.run({ lessonId: null, files: [{ name: '../escape.py', content: '' }], entry: '../escape.py' }),
    ).rejects.toThrow();
  });

  it('answers the not-yet-built calls with empty results', async () => {
    expect(await python.analyse('print("hi")', null)).toEqual([]);
    expect(await python.trace({ lessonId: null, files: [], entry: 'main.py' }, [])).toEqual({ steps: [], truncated: false });
    expect(await python.runTests(null, [])).toMatchObject({ tests: [] });
    const checks = createChecksService({ ...core.deps, profiles, lessons, practice });
    expect(await checks.run('001-hello-world', 'make', [])).toMatchObject({ passed: false, checkId: 'make', error: 'not implemented' });
  });
});
