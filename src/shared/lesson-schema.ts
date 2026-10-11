// Zod schemas for the files in a lesson folder (SPEC sections 6 and 8).
//
//   lessons/index.json            lessonIndexSchema
//   lessons/ideas.json            ideasFileSchema
//   lessons/NNN-slug/lesson.json  lessonJsonSchema
//   lessons/NNN-slug/steps.json   stepsFileSchema
//   lessons/NNN-slug/hints.json   hintsFileSchema
//   lessons/NNN-slug/tutor.json   tutorFileSchema
//
// Every object is strict: an unknown key is an error, so a typo in a lesson file is caught
// by lesson QA instead of being silently ignored.
//
// Frozen during the parallel build. Ask the lead before changing anything here.

import { z } from 'zod';
import { LESSON_COUNT } from './constants';
import type { Question, Step } from './types';

// ---------------------------------------------------------------- small pieces

const text = z.string().trim().min(1);

/** An idea key from ideas.json, for example "for-loop". */
export const ideaKeySchema = z
  .string()
  .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/, 'idea keys are lower-case words joined by hyphens');

/** A step id, unique inside one lesson, for example "predict" or "recall-2". */
export const stepIdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/, 'step ids are lower-case words joined by hyphens');

/** A check group id: the name given to @group("...") in checks.py. */
export const checkIdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9_-]*$/, 'check ids are lower-case letters, digits, hyphens and underscores');

/** A file name inside a lesson folder. Forward slashes allowed for sub-folders; no "..",
 *  no leading slash, no backslashes. */
export const lessonFileNameSchema = z
  .string()
  .regex(/^[A-Za-z0-9_][A-Za-z0-9_.\-/]*$/, 'use letters, digits, "_", "-", "." and "/" only')
  .refine((name) => !name.split('/').some((part) => part === '' || part === '.' || part === '..'), {
    message: 'file names may not contain empty, "." or ".." parts',
  });

/** Compile a `sourceRegex` / `outputRegex` from tutor.json. One place, so the schema and the
 *  tutor engine agree: JavaScript syntax, multiline flag only. For "ignore case" write an
 *  inline group such as `(?i:print)`. */
export function compileTutorRegex(source: string): RegExp {
  return new RegExp(source, 'm');
}

const regexSourceSchema = z.string().min(1).refine(
  (source) => {
    try {
      compileTutorRegex(source);
      return true;
    } catch {
      return false;
    }
  },
  { message: 'not a valid regular expression' },
);

function duplicates(values: readonly (string | number)[]): (string | number)[] {
  const seen = new Set<string | number>();
  const dupes = new Set<string | number>();
  for (const value of values) (seen.has(value) ? dupes : seen).add(value);
  return [...dupes];
}

// ---------------------------------------------------------------- index.json

export const lessonTypeSchema = z.enum(['learn', 'skill', 'fix', 'read', 'build']);
export const stepKindSchema = z.enum(['recall', 'predict', 'run', 'investigate', 'modify', 'make', 'info']);

export const stageSchema = z.strictObject({
  number: z.number().int().min(1),
  title: text,
  /** Optional one-line "by the end you can ..." shown on the lesson map. */
  summary: text.optional(),
});

export const lessonIndexSchema = z
  .strictObject({ stages: z.array(stageSchema).min(1) })
  .superRefine((index, ctx) => {
    for (const number of duplicates(index.stages.map((s) => s.number))) {
      ctx.addIssue({ code: 'custom', path: ['stages'], message: `stage ${number} is listed twice` });
    }
  });

export type Stage = z.infer<typeof stageSchema>;
export type LessonIndex = z.infer<typeof lessonIndexSchema>;

// ---------------------------------------------------------------- ideas.json

/** One idea in the course vocabulary. Code "uses" the idea if ANY of the listed things
 *  appears in it. The Python side (pylearn_checks `t.uses()`, lesson QA) and the tutor guard
 *  both read this file, so the meanings are fixed here:
 *    ast      Python `ast` node class names, e.g. "For", "FunctionDef", "JoinedStr", "FloorDiv"
 *    names    bare names when read or called, e.g. "range", "len", "input"
 *    attrs    attribute or method names, e.g. "lower", "append"
 *    modules  imported module names, e.g. "random"
 *  `reminder` and `example` feed the "What I've learned" cheat sheet. */
export const ideaSchema = z.strictObject({
  label: text,
  ast: z.array(text).default([]),
  names: z.array(text).default([]),
  attrs: z.array(text).default([]),
  modules: z.array(text).default([]),
  reminder: z.string().default(''),
  example: z.string().default(''),
});

/** Keys are idea keys, in the order they are taught. */
export const ideasFileSchema = z.record(ideaKeySchema, ideaSchema);

export type IdeaDefinition = z.infer<typeof ideaSchema>;
export type IdeasFile = z.infer<typeof ideasFileSchema>;

// ---------------------------------------------------------------- lesson.json

export const lessonJsonSchema = z
  .strictObject({
    number: z.number().int().min(1).max(LESSON_COUNT),
    title: text,
    stage: z.number().int().min(1),
    type: lessonTypeSchema,
    minutes: z.number().int().min(1).max(240),
    newIdea: text,
    online: z.boolean(),
    optional: z.boolean(),
    /** The first one opens in the editor and is the file that Run runs. */
    starterFiles: z.array(lessonFileNameSchema).min(1),
    /** The model answer. One file for most lessons. */
    solutionFiles: z.array(lessonFileNameSchema).min(1).default(['solution.py']),
    /** Idea keys from ideas.json that this lesson teaches. May be empty (fix, build lessons). */
    introduces: z.array(ideaKeySchema),
    /** "auto" means every idea in ideas.json that has not been introduced yet. */
    notYetTaught: z.union([z.literal('auto'), z.array(ideaKeySchema)]),
    /** Lesson QA normally fails a lesson whose starter or solution uses an idea outside
     *  `taught`. Lessons 49 and 94 are the planned exceptions and set this to true. */
    allowUntaught: z.boolean().default(false),
  })
  .superRefine((lesson, ctx) => {
    for (const name of duplicates(lesson.starterFiles)) {
      ctx.addIssue({ code: 'custom', path: ['starterFiles'], message: `"${name}" is listed twice` });
    }
    for (const key of duplicates(lesson.introduces)) {
      ctx.addIssue({ code: 'custom', path: ['introduces'], message: `"${key}" is listed twice` });
    }
  });

export type LessonJson = z.infer<typeof lessonJsonSchema>;

// ---------------------------------------------------------------- steps.json

const choiceOptionSchema = z.strictObject({ id: text, text, feedback: z.string() });

const traceRowSchema = z.strictObject({
  line: z.number().int().min(1),
  values: z.record(z.string(), z.string()),
});

export const questionSchema = z
  .discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('none') }),
    z.strictObject({
      kind: z.literal('choice'),
      prompt: text,
      options: z.array(choiceOptionSchema).min(2),
      correctId: text,
    }),
    z.strictObject({
      kind: z.literal('text'),
      prompt: text,
      accept: z.array(z.string()).min(1),
      caseSensitive: z.boolean().optional(),
      feedbackWrong: text,
    }),
    z.strictObject({
      kind: z.literal('order'),
      prompt: text,
      lines: z.array(z.string()).min(2),
      solution: z.array(z.number().int().min(0)).min(2),
    }),
    z.strictObject({
      kind: z.literal('trace'),
      prompt: text,
      code: text,
      variables: z.array(text).min(1),
      rows: z.array(traceRowSchema).min(1),
    }),
    z.strictObject({
      kind: z.literal('spot'),
      prompt: text,
      code: text,
      faultyLines: z.array(z.number().int().min(1)).min(1),
      feedback: text,
    }),
    z.strictObject({ kind: z.literal('code'), prompt: text }),
    z.strictObject({ kind: z.literal('terminal'), prompt: text }),
  ])
  .superRefine((q, ctx) => {
    if (q.kind === 'choice') {
      const ids = q.options.map((o) => o.id);
      for (const id of duplicates(ids)) {
        ctx.addIssue({ code: 'custom', path: ['options'], message: `option id "${id}" is used twice` });
      }
      if (!ids.includes(q.correctId)) {
        ctx.addIssue({ code: 'custom', path: ['correctId'], message: 'correctId must be the id of one of the options' });
      }
    }
    if (q.kind === 'order') {
      const sorted = [...q.solution].sort((a, b) => a - b);
      const isPermutation = sorted.length === q.lines.length && sorted.every((value, i) => value === i);
      if (!isPermutation) {
        ctx.addIssue({
          code: 'custom',
          path: ['solution'],
          message: 'solution must use every index of lines exactly once (0-based)',
        });
      }
    }
    if (q.kind === 'trace') {
      const lineCount = q.code.split('\n').length;
      q.rows.forEach((row, i) => {
        if (row.line > lineCount) {
          ctx.addIssue({ code: 'custom', path: ['rows', i, 'line'], message: `the code has only ${lineCount} lines` });
        }
        for (const name of Object.keys(row.values)) {
          if (!q.variables.includes(name)) {
            ctx.addIssue({ code: 'custom', path: ['rows', i, 'values'], message: `"${name}" is not in variables` });
          }
        }
      });
    }
    if (q.kind === 'spot') {
      const lineCount = q.code.split('\n').length;
      q.faultyLines.forEach((line, i) => {
        if (line > lineCount) {
          ctx.addIssue({ code: 'custom', path: ['faultyLines', i], message: `the code has only ${lineCount} lines` });
        }
      });
    }
  });

export const stepSchema = z
  .strictObject({
    id: stepIdSchema,
    kind: stepKindSchema,
    title: text,
    bodyMarkdown: z.string(),
    question: questionSchema,
    checkId: checkIdSchema.optional(),
  })
  .superRefine((step, ctx) => {
    if ((step.question.kind === 'code' || step.question.kind === 'terminal') && !step.checkId) {
      ctx.addIssue({
        code: 'custom',
        path: ['checkId'],
        message: `a "${step.question.kind}" question is judged by checks, so the step needs a checkId`,
      });
    }
  });

/** steps.json: the steps in order. The last one must have a checkId (it earns the tick). */
export const stepsFileSchema = z
  .array(stepSchema)
  .min(1)
  .superRefine((steps, ctx) => {
    for (const id of duplicates(steps.map((s) => s.id))) {
      ctx.addIssue({ code: 'custom', message: `step id "${id}" is used twice` });
    }
    if (!steps[steps.length - 1]?.checkId) {
      ctx.addIssue({ code: 'custom', path: [steps.length - 1, 'checkId'], message: 'the last step must have a checkId' });
    }
  });

export type StepsFile = z.infer<typeof stepsFileSchema>;

// ---------------------------------------------------------------- hints.json

export const hintSchema = z.strictObject({ small: text, big: text });

/** hints.json: { "<stepId>": { "small": "...", "big": "..." } } */
export const hintsFileSchema = z.record(stepIdSchema, hintSchema);

export type Hint = z.infer<typeof hintSchema>;
export type HintsFile = z.infer<typeof hintsFileSchema>;

// ---------------------------------------------------------------- tutor.json

/** The matcher in a prepared tutor message (SPEC section 8).
 *
 *  Leaf keys:
 *    diagnosticCode  a Diagnostic with this `code` is present
 *    errorType       the last run ended with this exception type, e.g. "NameError"
 *    sourceRegex     matches the learner's code
 *    usesIdea        the code uses this idea key (per ideas.json)
 *    missingIdea     the code does not use this idea key
 *    outputRegex     matches the last run's stdout
 *    checkFailed     the last check of this group id failed ("*" for any group)
 *  Combinators: `all` (every one matches), `any` (at least one matches), `not`.
 *  Several keys in one object must ALL match. An object with no keys is invalid. */
export interface TutorWhen {
  diagnosticCode?: string;
  errorType?: string;
  sourceRegex?: string;
  usesIdea?: string;
  missingIdea?: string;
  outputRegex?: string;
  checkFailed?: string;
  all?: TutorWhen[];
  any?: TutorWhen[];
  not?: TutorWhen;
}

export const tutorWhenSchema: z.ZodType<TutorWhen> = z.lazy(() =>
  z
    .strictObject({
      diagnosticCode: text.optional(),
      errorType: text.optional(),
      sourceRegex: regexSourceSchema.optional(),
      usesIdea: ideaKeySchema.optional(),
      missingIdea: ideaKeySchema.optional(),
      outputRegex: regexSourceSchema.optional(),
      checkFailed: z.union([z.literal('*'), checkIdSchema]).optional(),
      all: z.array(tutorWhenSchema).min(1).optional(),
      any: z.array(tutorWhenSchema).min(1).optional(),
      not: tutorWhenSchema.optional(),
    })
    .refine((when) => Object.values(when).some((value) => value !== undefined), {
      message: 'a matcher needs at least one condition',
    }),
);

export const tutorRuleSchema = z.strictObject({
  id: text,
  when: tutorWhenSchema,
  /** Said the first time the rule matches. Never contains the solution. */
  say: text,
  /** Said the second time. After that the tutor stays quiet on this point until the code changes. */
  sayAgain: text,
});

/** tutor.json: the lesson's common mistakes, most specific first. First match wins. */
export const tutorFileSchema = z.array(tutorRuleSchema).superRefine((rules, ctx) => {
  for (const id of duplicates(rules.map((r) => r.id))) {
    ctx.addIssue({ code: 'custom', message: `rule id "${id}" is used twice` });
  }
});

export type TutorRule = z.infer<typeof tutorRuleSchema>;
export type TutorFile = z.infer<typeof tutorFileSchema>;

// ---------------------------------------------------------------- helpers

/** Parse and validate, or throw an Error whose message names the file and every problem. */
export function parseLessonFile<T>(schema: z.ZodType<T>, data: unknown, fileLabel: string): T {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  throw new Error(`${fileLabel} is not valid:\n${z.prettifyError(result.error)}`);
}

// Compile-time proof that the schemas and the shared types describe the same shapes.
// If either side changes without the other, one of these assignments stops compiling.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const stepMatches: Same<z.infer<typeof stepSchema>, Step> = true;
const questionMatches: Same<z.infer<typeof questionSchema>, Question> = true;
void stepMatches;
void questionMatches;
