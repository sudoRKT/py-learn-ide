// The shared data contract (SPEC section 5). Authoritative: if this file and SPEC.md
// disagree, fix one of them in the same change.
//
// Frozen during the parallel build. Ask the lead before changing anything here.
// Rules: no `any`, no Node or Electron imports, everything must survive structured clone
// (plain objects, arrays, strings, numbers, booleans, null) because it crosses IPC.
//
// Three members go beyond the summary in SPEC section 5. Each is marked "SPEC-EXT" and
// exists because a version 1 feature in SPEC section 12 cannot be built without it.

import {
  DEFAULT_PROFILE_ID,
  TUTOR_DEFAULT_IDLE_SECONDS,
  TUTOR_DEFAULT_MIN_GAP_SECONDS,
} from './constants';

// ---------------------------------------------------------------- helpers

/** Returned by every `on...` subscription. Call it to stop listening. */
export type Unsub = () => void;

/** A patch: any subset of T, at any depth. Arrays are replaced whole, never merged. */
export type DeepPartial<T> = T extends readonly unknown[]
  ? T
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

// ---------------------------------------------------------------- app and profiles

export interface AppInfo {
  /** APP_NAME. */
  name: string;
  /** package.json version. */
  version: string;
  platform: 'win32' | 'linux' | 'darwin' | 'browser';
  arch: string;
  /** False in development and in the browser mock. */
  packaged: boolean;
  /** True when the renderer is talking to mockApi.ts instead of the real bridge. */
  mock: boolean;
  /** Absolute path of the data folder (SPEC section 10). */
  dataDir: string;
  versions: { electron: string; chrome: string; node: string };
}

export interface Profile {
  /** Safe to use as a folder name: lower-case letters, digits and hyphens. */
  id: string;
  name: string;
  createdAt: number;
  lastUsedAt: number;
}

// ---------------------------------------------------------------- lessons

export type LessonType = 'learn' | 'skill' | 'fix' | 'read' | 'build';
export type StepKind = 'recall' | 'predict' | 'run' | 'investigate' | 'modify' | 'make' | 'info';
export type QuestionKind = 'choice' | 'text' | 'order' | 'trace' | 'spot' | 'code' | 'terminal' | 'none';

export interface LessonSummary {
  /** The lesson's folder name, for example "001-hello-world". */
  id: string;
  /** 1 to 100. */
  number: number;
  /** The folder name without the number, for example "hello-world". */
  slug: string;
  title: string;
  stage: number;
  stageTitle: string;
  type: LessonType;
  minutes: number;
  newIdea: string;
  /** True only for the lessons that need the internet (91 and 92). */
  online: boolean;
  optional: boolean;
}

export interface Lesson extends LessonSummary {
  guideMarkdown: string;
  steps: Step[];
  /** The first one opens in the editor and is the default `RunRequest.entry`. */
  starterFiles: CodeFile[];
  /** Names under the lesson's files/ folder. Read one with `lessons.dataFile`. */
  dataFiles: string[];
  /** Idea keys the learner has met, including this lesson's. */
  taught: string[];
  /** Idea keys the tutor must not use. */
  notYetTaught: string[];
}

export interface Step {
  id: string;
  kind: StepKind;
  title: string;
  bodyMarkdown: string;
  question: Question;
  /** A group in the lesson's checks.py. */
  checkId?: string;
}

export interface ChoiceOption {
  id: string;
  text: string;
  feedback: string;
}

/** One row of a "fill in the variable table" question: the expected values after `line` runs. */
export interface TraceRow {
  line: number;
  values: Record<string, string>;
}

export type Question =
  | { kind: 'none' }
  | { kind: 'choice'; prompt: string; options: ChoiceOption[]; correctId: string }
  | { kind: 'text'; prompt: string; accept: string[]; caseSensitive?: boolean; feedbackWrong: string }
  /** Put the lines in order. `lines` is the shuffled order shown to the learner;
   *  `solution` lists indexes into `lines` in the correct order. */
  | { kind: 'order'; prompt: string; lines: string[]; solution: number[] }
  /** Fill in a variable table. */
  | { kind: 'trace'; prompt: string; code: string; variables: string[]; rows: TraceRow[] }
  /** Click the faulty line. Line numbers are 1-based. */
  | { kind: 'spot'; prompt: string; code: string; faultyLines: number[]; feedback: string }
  /** Write code, judged by checks. */
  | { kind: 'code'; prompt: string }
  /** Type commands in the terminal panel, judged by checks. */
  | { kind: 'terminal'; prompt: string };

export interface CodeFile {
  name: string;
  content: string;
}

/** SPEC-EXT. One entry of lessons/ideas.json, for the "What I've learned" cheat sheet
 *  (SPEC section 12). Delivered by `lessons.ideas()`. */
export interface Idea {
  key: string;
  label: string;
  /** One-line reminder in plain words. Empty if none has been written. */
  reminder: string;
  /** A tiny code example. Empty if none has been written. */
  example: string;
  /** Number of the first lesson that introduces the idea, or null if no lesson does yet. */
  lesson: number | null;
}

// ---------------------------------------------------------------- running code

export interface RunRequest {
  /** null in the playground. */
  lessonId: string | null;
  /** Every file the learner has open. They are written to the scratch folder before the run. */
  files: CodeFile[];
  /** Name of the file to run. Must be one of `files`. */
  entry: string;
  args?: string[];
  env?: Record<string, string>;
}

export type RunEvent =
  | { type: 'started'; runId: string }
  | { type: 'stdout' | 'stderr'; runId: string; text: string }
  /** The program is waiting inside input(). The prompt text has already arrived on stdout. */
  | { type: 'input-requested'; runId: string }
  | { type: 'exit'; runId: string; code: number | null; signal: string | null; durationMs: number; error?: PythonError };

export interface PythonError {
  /** The exception class name, for example "NameError". */
  type: string;
  message: string;
  /** 1-based line in the learner's file, or null if it could not be worked out. */
  line: number | null;
  file: string | null;
  /** The original traceback, unchanged. */
  traceback: string;
  /** The plain-words explanation shown above the error. */
  friendly: string;
}

// ---------------------------------------------------------------- line-by-line runner

export interface TraceStep {
  line: number;
  file: string;
  event: 'line' | 'call' | 'return' | 'exception';
  /** Variable name to its repr, at this step. */
  variables: Record<string, string>;
  /** Text printed while this step ran (not cumulative). Join the steps up to the current
   *  one to show the console as it stood at that point. */
  stdout: string;
  /** Call depth: 0 at module level. */
  depth: number;
}

export interface TraceResult {
  steps: TraceStep[];
  /** True if the run was cut off at LIMITS.traceMaxSteps. */
  truncated: boolean;
  error?: PythonError;
}

// ---------------------------------------------------------------- tests panel

export interface TestOutcome {
  name: string;
  outcome: 'passed' | 'failed' | 'error';
  message: string;
  line: number | null;
}

export interface TestRunResult {
  tests: TestOutcome[];
  durationMs: number;
  /** The raw pytest output. */
  raw: string;
}

// ---------------------------------------------------------------- terminal panel

/** A controlled command runner, not a full shell (SPEC section 9a). */
export type TerminalEvent =
  | { type: 'output'; id: string; text: string }
  /** `cwd` is the folder after the command, shown relative to the lesson folder ("." at its root). */
  | { type: 'exit'; id: string; code: number | null; cwd: string };

// ---------------------------------------------------------------- practice service

export type PracticeMode = 'normal' | 'slow' | 'off' | 'needs-key';

export interface PracticeServiceStatus {
  running: boolean;
  baseUrl: string | null;
  mode: PracticeMode;
}

// ---------------------------------------------------------------- instant analysis (no AI)

export interface Diagnostic {
  /** All four positions are 1-based, like Monaco's. The end is exclusive. */
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  severity: 'error' | 'warning' | 'hint';
  /** A stable identifier, for example "syntax-error" or "undefined-name". tutor.json matches on it. */
  code: string;
  /** The technical message. */
  message: string;
  /** The plain-words explanation shown on hover. */
  friendly: string;
}

// ---------------------------------------------------------------- checks

export interface CheckTest {
  name: string;
  passed: boolean;
  message: string;
}

export interface CheckResult {
  passed: boolean;
  checkId: string;
  tests: CheckTest[];
  durationMs: number;
  /** Set when the check itself could not run (time limit, missing group, crash in checks.py). */
  error?: string;
}

// ---------------------------------------------------------------- tutor

export type TutorTrigger =
  | 'idle' | 'run-failed' | 'run-ok' | 'check-failed' | 'check-passed'
  | 'question' | 'hint-small' | 'hint-big';

export interface TutorMessage {
  id: string;
  /** Milliseconds since the epoch. */
  at: number;
  trigger: TutorTrigger;
  source: 'ai' | 'prepared' | 'analysis';
  /** The full text so far. While `streaming` is true more arrives through onMessageDelta;
   *  a final onMessage with the same id and `streaming: false` carries the finished text. */
  text: string;
  /** 1-based editor line the comment is about, if any. */
  line?: number;
  streaming?: boolean;
}

export interface EditorSnapshot {
  lessonId: string | null;
  stepId: string | null;
  file: string;
  code: string;
  cursorLine: number;
  /** Oldest first. The renderer keeps the last 50 or so. */
  recentEdits: EditEvent[];
}

export interface EditEvent {
  at: number;
  kind: 'insert' | 'delete';
  line: number;
  text: string;
}

// ---------------------------------------------------------------- AI

export type ProviderId = 'none' | 'local' | 'openai' | 'anthropic' | 'gemini' | 'openai-compatible' | 'mock';
export type CloudProviderId = Extract<ProviderId, 'openai' | 'anthropic' | 'gemini' | 'openai-compatible'>;
export type ModelTier = 'small' | 'medium' | 'large';

export interface ModelEntry {
  id: string;
  name: string;
  tier: ModelTier;
  minVramMb: number;
  fileName: string;
  url: string;
  sizeBytes: number;
  sha256: string;
  licence: string;
  contextSize: number;
  chatTemplate?: string;
}

export interface GpuInfo {
  name: string;
  vramMb: number | null;
  vendor: string;
}

export interface HardwareInfo {
  gpus: GpuInfo[];
  ramMb: number;
  cpu: string;
  recommendedTier: ModelTier | 'none';
}

export interface DownloadProgress {
  receivedBytes: number;
  totalBytes: number;
  bytesPerSecond: number;
}

export interface ModelStatus {
  provider: ProviderId;
  modelId: string | null;
  state: 'not-set-up' | 'downloading' | 'starting' | 'ready' | 'error';
  message?: string;
  download?: DownloadProgress;
  /** SPEC-EXT. Ids of catalogue models whose files are on disk, so the model manager can
   *  offer "delete" and skip a download. Absent means "not known". */
  installed?: string[];
}

// ---------------------------------------------------------------- settings and progress

export interface TutorSettings {
  enabled: boolean;
  idleSeconds: number;
  minGapSeconds: number;
  speakOnRunFailure: boolean;
}

export interface AiSettings {
  provider: ProviderId;
  modelId: string | null;
  /** True when a key is held in the secret store. The key itself is never in settings. */
  apiKeyStored: boolean;
  baseUrl?: string;
  cloudModel?: string;
}

export interface LayoutSettings {
  sidebarWidth: number;
  consoleWidth: number;
  tutorWidth: number;
  sidebarCollapsed: boolean;
  tutorCollapsed: boolean;
  consolePosition: 'right' | 'bottom';
}

export interface Settings {
  theme: 'light' | 'dark' | 'system';
  /** One of ACCENT_KEYS in constants.ts. */
  accent: string;
  editorFontSize: number;
  uiScale: number;
  wordWrap: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  tutor: TutorSettings;
  ai: AiSettings;
  layout: LayoutSettings;
  /** The active profile. Read-only from the renderer: change it with `profiles.switchTo`. */
  profileId: string;
  onboardingDone: boolean;
}

export interface HintsUsed {
  small: number;
  big: number;
  answer: number;
}

export interface LessonProgress {
  lessonId: string;
  started: boolean;
  passed: boolean;
  stepsDone: string[];
  attempts: number;
  hintsUsed: HintsUsed;
  secondsSpent: number;
  /** Milliseconds since the epoch, 0 if never opened. The newest one is "continue where you left off". */
  lastOpened: number;
  /** The learner's current code, file name to content. Auto-saved on every keystroke. */
  code: Record<string, string>;
  notes: string;
  bookmarked: boolean;
  /** SPEC-EXT. The code as it was the last time the final check passed, for
   *  "Restore my last passing version" (SPEC section 12). Absent until the lesson passes. */
  passedCode?: Record<string, string>;
}

// ---------------------------------------------------------------- defaults

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  accent: 'blue',
  editorFontSize: 15,
  uiScale: 1,
  wordWrap: false,
  reducedMotion: false,
  highContrast: false,
  tutor: {
    enabled: true,
    idleSeconds: TUTOR_DEFAULT_IDLE_SECONDS,
    minGapSeconds: TUTOR_DEFAULT_MIN_GAP_SECONDS,
    speakOnRunFailure: true,
  },
  ai: { provider: 'none', modelId: null, apiKeyStored: false },
  layout: {
    sidebarWidth: 340,
    consoleWidth: 380,
    tutorWidth: 320,
    sidebarCollapsed: false,
    tutorCollapsed: false,
    consolePosition: 'right',
  },
  profileId: DEFAULT_PROFILE_ID,
  onboardingDone: false,
};

/** A fresh, never-opened progress record for a lesson. */
export function emptyProgress(lessonId: string): LessonProgress {
  return {
    lessonId,
    started: false,
    passed: false,
    stepsDone: [],
    attempts: 0,
    hintsUsed: { small: 0, big: 0, answer: 0 },
    secondsSpent: 0,
    lastOpened: 0,
    code: {},
    notes: '',
    bookmarked: false,
  };
}

/** Apply a DeepPartial patch. Objects merge key by key; arrays and scalars replace.
 *  `undefined` values in the patch are ignored. Returns a new object; inputs are not changed. */
export function deepMerge<T>(base: T, patch: NoInfer<DeepPartial<T>>): T {
  if (!isPlainObject(base) || !isPlainObject(patch)) {
    return (patch === undefined ? base : patch) as T;
  }
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    const current = out[key];
    out[key] = isPlainObject(current) && isPlainObject(value) ? deepMerge(current, value) : value;
  }
  return out as T;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
