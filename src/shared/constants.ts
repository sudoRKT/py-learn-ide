// Constants shared by the main process, the preload and the renderer.
// Nothing in this file may import Node or Electron: it is bundled into all three.

/** The product name. Rename the app here and nowhere else. */
export const APP_NAME = 'Py Learn';

/** Windows application id (taskbar grouping, notifications, installer). */
export const APP_ID = 'com.pylearn.ide';

/** Every IPC channel is `${IPC_PREFIX}:${group}.${method}`. See src/shared/ipc.ts. */
export const IPC_PREFIX = 'pylearn';

/** The profile that exists on a fresh install. */
export const DEFAULT_PROFILE_ID = 'default';
export const DEFAULT_PROFILE_NAME = 'Learner';

/** Folder name used under scratch/ when no lesson is open (the playground). */
export const PLAYGROUND_ID = 'playground';

/** The course size. Lesson folders are `NNN-slug` with NNN from 001 to 100. */
export const LESSON_COUNT = 100;
export const LESSON_FOLDER_PATTERN = /^(\d{3})-([a-z0-9]+(?:-[a-z0-9]+)*)$/;

/** Accent colours the learner can pick. `Settings.accent` holds one of these keys;
 *  the actual colours for light and dark live in the renderer's tokens.css. */
export const ACCENT_KEYS = ['blue', 'teal', 'green', 'purple', 'pink', 'orange'] as const;
export type AccentKey = (typeof ACCENT_KEYS)[number];

/** Limits that more than one part of the app must agree on. */
export const LIMITS = {
  /** Editor analysis debounce (SPEC section 8). */
  analyseDebounceMs: 300,
  /** Hard time limit for one check group (SPEC section 7). */
  checkTimeoutMs: 20_000,
  /** The line-by-line runner stops after this many steps (SPEC section 9a). */
  traceMaxSteps: 2_000,
  /** Console output is capped so a runaway loop cannot freeze the app (SPEC section 12).
   *  The Python service stops forwarding output for a run after this many characters and
   *  the renderer keeps at most this many characters on screen. */
  consoleMaxChars: 200_000,
  /** Largest chunk of text carried by one stdout/stderr RunEvent. */
  runEventMaxChars: 8_192,
  /** Wall-clock limit for the tests panel (pytest) run. */
  testRunTimeoutMs: 60_000,
  /** Wall-clock limit for one terminal command. */
  terminalTimeoutMs: 120_000,
  editorFontSizeMin: 10,
  editorFontSizeMax: 32,
  uiScaleMin: 0.8,
  uiScaleMax: 1.5,
  tutorIdleSecondsMin: 1,
  tutorIdleSecondsMax: 30,
  tutorMinGapSecondsMin: 5,
  tutorMinGapSecondsMax: 120,
} as const;

/** Defaults named by the spec (section 8). DEFAULT_SETTINGS in types.ts uses them. */
export const TUTOR_DEFAULT_IDLE_SECONDS = 2;
export const TUTOR_DEFAULT_MIN_GAP_SECONDS = 10;

/** The `Diagnostic.code` values the instant analysis produces (SPEC section 8). The Python
 *  analysis server emits exactly these strings and tutor.json matches on them with
 *  `diagnosticCode`. The analysis may add more codes; these eight always exist. */
export const DIAGNOSTIC_CODES = [
  'syntax-error',
  'unclosed-bracket',
  'unclosed-quote',
  'bad-indent',
  'undefined-name',
  'assign-in-condition',
  'missing-call-brackets',
  'print-none',
] as const;
export type DiagnosticCode = (typeof DIAGNOSTIC_CODES)[number];

/** Environment variable learner code reads to find the practice service (SPEC section 9a). */
export const PRACTICE_URL_ENV = 'PRACTICE_URL';

/** Commands the terminal panel accepts (SPEC section 9a). Anything else is refused. */
export const TERMINAL_COMMANDS = [
  'python', 'pytest', 'git', 'pip', 'cd', 'dir', 'ls', 'cls', 'clear', 'type', 'cat',
] as const;

/** File format marker written into backups (app.exportBackup). */
export const BACKUP_FORMAT = 'pylearn-backup';
export const BACKUP_VERSION = 1;
export const BACKUP_EXTENSION = 'pylearn';
