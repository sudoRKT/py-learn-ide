import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LESSON_FOLDER_PATTERN } from './constants';
import {
  hintsFileSchema, ideasFileSchema, lessonIndexSchema, lessonJsonSchema, questionSchema, stepsFileSchema,
  tutorFileSchema, tutorWhenSchema,
} from './lesson-schema';

const LESSONS_DIR = join(process.cwd(), 'lessons');
const readJson = (...parts: string[]): unknown => JSON.parse(readFileSync(join(LESSONS_DIR, ...parts), 'utf8'));

describe('the lesson files on disk', () => {
  const ideas = ideasFileSchema.parse(readJson('ideas.json'));
  const index = lessonIndexSchema.parse(readJson('index.json'));
  const folders = readdirSync(LESSONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && LESSON_FOLDER_PATTERN.test(entry.name))
    .map((entry) => entry.name);

  it('index.json and ideas.json are valid', () => {
    expect(index.stages.length).toBeGreaterThan(0);
    expect(Object.keys(ideas)).toContain('print');
    expect(ideas.print?.names).toEqual(['print']);
    expect(ideas.print?.ast).toEqual([]);
  });

  it('there is at least the placeholder lesson', () => {
    expect(folders).toContain('001-hello-world');
  });

  it.each(folders)('%s validates against every schema', (folder) => {
    const lesson = lessonJsonSchema.parse(readJson(folder, 'lesson.json'));
    const steps = stepsFileSchema.parse(readJson(folder, 'steps.json'));
    const hints = hintsFileSchema.parse(readJson(folder, 'hints.json'));
    const tutor = tutorFileSchema.parse(readJson(folder, 'tutor.json'));

    expect(lesson.number).toBe(Number(folder.slice(0, 3)));
    expect(index.stages.map((s) => s.number)).toContain(lesson.stage);
    expect(lesson.solutionFiles).toEqual(['solution.py']);
    for (const key of lesson.introduces) expect(Object.keys(ideas), key).toContain(key);
    for (const name of [...lesson.starterFiles, ...lesson.solutionFiles, 'guide.md', 'checks.py']) {
      expect(() => readFileSync(join(LESSONS_DIR, folder, name)), name).not.toThrow();
    }

    const stepIds = steps.map((s) => s.id);
    for (const stepId of Object.keys(hints)) expect(stepIds, `hint for ${stepId}`).toContain(stepId);
    const checks = readFileSync(join(LESSONS_DIR, folder, 'checks.py'), 'utf8');
    for (const step of steps) {
      if (step.checkId) expect(checks, `check group ${step.checkId}`).toContain(`@group("${step.checkId}")`);
    }
    expect(tutor.length).toBeGreaterThan(0);
  });
});

describe('questionSchema', () => {
  it('rejects a choice whose correctId is not an option', () => {
    const result = questionSchema.safeParse({
      kind: 'choice', prompt: 'Pick one', correctId: 'z',
      options: [{ id: 'a', text: 'A', feedback: '' }, { id: 'b', text: 'B', feedback: '' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an order question whose solution is not a permutation', () => {
    expect(questionSchema.safeParse({ kind: 'order', prompt: 'Sort', lines: ['a', 'b', 'c'], solution: [0, 0, 2] }).success).toBe(false);
    expect(questionSchema.safeParse({ kind: 'order', prompt: 'Sort', lines: ['a', 'b', 'c'], solution: [2, 0, 1] }).success).toBe(true);
  });

  it('accepts trace, spot and terminal questions and checks their line numbers', () => {
    expect(
      questionSchema.safeParse({
        kind: 'trace', prompt: 'Fill in', code: 'x = 1\nx = x + 1', variables: ['x'],
        rows: [{ line: 1, values: { x: '1' } }, { line: 2, values: { x: '2' } }],
      }).success,
    ).toBe(true);
    expect(
      questionSchema.safeParse({
        kind: 'trace', prompt: 'Fill in', code: 'x = 1', variables: ['x'], rows: [{ line: 1, values: { y: '1' } }],
      }).success,
    ).toBe(false);
    expect(questionSchema.safeParse({ kind: 'spot', prompt: 'Find it', code: 'a\nb', faultyLines: [2], feedback: 'Line 2' }).success).toBe(true);
    expect(questionSchema.safeParse({ kind: 'spot', prompt: 'Find it', code: 'a\nb', faultyLines: [3], feedback: 'Line 3' }).success).toBe(false);
    expect(questionSchema.safeParse({ kind: 'terminal', prompt: 'Run git status' }).success).toBe(true);
  });

  it('rejects unknown keys', () => {
    expect(questionSchema.safeParse({ kind: 'code', prompt: 'Write it', extra: 1 }).success).toBe(false);
  });
});

describe('stepsFileSchema', () => {
  const step = (over: Record<string, unknown>) => ({
    id: 'make', kind: 'make', title: 'Make', bodyMarkdown: '', question: { kind: 'code', prompt: 'Go' }, checkId: 'make', ...over,
  });

  it('needs a checkId on code questions and on the last step', () => {
    expect(stepsFileSchema.safeParse([step({})]).success).toBe(true);
    expect(stepsFileSchema.safeParse([step({ checkId: undefined })]).success).toBe(false);
    expect(stepsFileSchema.safeParse([step({}), step({ id: 'end', kind: 'info', question: { kind: 'none' }, checkId: undefined })]).success).toBe(false);
  });

  it('rejects duplicate step ids', () => {
    expect(stepsFileSchema.safeParse([step({}), step({})]).success).toBe(false);
  });
});

describe('tutorWhenSchema', () => {
  it('accepts nested all / any / not', () => {
    const when = {
      all: [
        { errorType: 'NameError' },
        { any: [{ diagnosticCode: 'undefined-name' }, { sourceRegex: '\\bpritn\\b' }] },
        { not: { usesIdea: 'for-loop', all: [{ missingIdea: 'print' }, { not: { outputRegex: '^Total' } }] } },
      ],
      checkFailed: '*',
    };
    expect(tutorWhenSchema.parse(when)).toEqual(when);
  });

  it('rejects an empty matcher, at any depth', () => {
    expect(tutorWhenSchema.safeParse({}).success).toBe(false);
    expect(tutorWhenSchema.safeParse({ all: [] }).success).toBe(false);
    expect(tutorWhenSchema.safeParse({ any: [{ not: {} }] }).success).toBe(false);
  });

  it('rejects unknown keys and bad regular expressions', () => {
    expect(tutorWhenSchema.safeParse({ errorTypo: 'NameError' }).success).toBe(false);
    expect(tutorWhenSchema.safeParse({ sourceRegex: '(' }).success).toBe(false);
    expect(tutorWhenSchema.safeParse({ not: { outputRegex: '[' } }).success).toBe(false);
  });
});
