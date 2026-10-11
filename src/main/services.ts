// The services the main process is built from (SPEC section 4), as interfaces.
//
// Each area exports factories that return these (see the README in each folder):
//
//   src/main/lessons/  createProfileService, createSettingsService, createLessonService,
//                      createProgressService, createBackupService
//   src/main/python/   createPracticeService, createPythonService, createChecksService,
//                      createTerminalService
//   src/main/ai/       createAiService
//   src/main/tutor/    createTutorService
//
// src/main/compose.ts calls the factories in dependency order and src/main/ipc.ts maps the
// `Api` in src/shared/ipc.ts onto the result. Method names mirror the Api groups on purpose.
//
// Rules for every service:
//   - A plain object or class built from its deps. No singletons, no globals.
//   - Never import 'electron'. What a service needs from Electron arrives through `deps`
//     (SecretStore, Dialogs), so every service can be unit tested with plain Node.
//   - Every path comes from `deps.paths`.
//   - `dispose()` stops every child process, timer and open handle. It must be safe to call
//     twice and must not throw.

import type { ProgressPatch, CloudOptions, OkMessage } from '@shared/ipc';
import type { HintsFile, IdeasFile, TutorRule } from '@shared/lesson-schema';
import type {
  CheckResult, CodeFile, DeepPartial, Diagnostic, EditorSnapshot, HardwareInfo, Idea, Lesson,
  LessonProgress, LessonSummary, ModelEntry, ModelStatus, PracticeMode, PracticeServiceStatus,
  Profile, ProviderId, RunEvent, RunRequest, Settings, TerminalEvent, TestRunResult,
  TraceResult, TutorMessage, Unsub,
} from '@shared/types';
import type { Logger } from './logger';
import type { Paths } from './paths';

// ================================================================ lessons area

export interface ProfileService {
  list(): Promise<Profile[]>;
  create(name: string): Promise<Profile>;
  /** Makes `id` the active profile, then fires onSwitched. */
  switchTo(id: string): Promise<void>;
  rename(id: string, name: string): Promise<void>;
  /** Deletes the profile, its settings, progress and scratch folder. Rejects for the last
   *  profile. Removing the active profile switches to another one first. */
  remove(id: string): Promise<void>;
  /** The active profile. Synchronous: other services call it on every operation. */
  current(): Profile;
  onSwitched(cb: (profile: Profile) => void): Unsub;
  dispose(): Promise<void>;
}

export interface SettingsService {
  /** The active profile's settings. `profileId` always names the active profile. */
  get(): Promise<Settings>;
  /** Synchronous view of the same thing, for services that need a value on a hot path. */
  current(): Settings;
  /** Merges the patch (deepMerge in types.ts), clamps values to LIMITS, saves, fires onChanged.
   *  `profileId` in a patch is ignored. */
  set(patch: DeepPartial<Settings>): Promise<Settings>;
  /** Fires after every set and after a profile switch. */
  onChanged(cb: (settings: Settings) => void): Unsub;
  dispose(): Promise<void>;
}

export interface LessonService {
  /** Every lesson, sorted by number. A lesson folder that fails validation is logged and left out. */
  list(): Promise<LessonSummary[]>;
  /** Rejects if the id is unknown. */
  get(id: string): Promise<Lesson>;
  solution(id: string): Promise<CodeFile[]>;
  /** Text content of `files/<name>` in the lesson folder. Rejects if `name` leaves that folder. */
  dataFile(id: string, name: string): Promise<string>;
  /** Absolute path of the lesson's folder (read-only). Throws if the id is unknown. */
  lessonDir(id: string): string;
  /** lessons/ideas.json, validated. */
  ideas(): Promise<IdeasFile>;
  /** The same vocabulary shaped for the renderer (Api `lessons.ideas`). */
  ideaList(): Promise<Idea[]>;
  /** hints.json of a lesson, validated. */
  hints(id: string): Promise<HintsFile>;
  /** tutor.json of a lesson, validated. */
  tutorRules(id: string): Promise<TutorRule[]>;
  dispose(): Promise<void>;
}

export interface ProgressService {
  /** Stored records of the active profile. */
  all(): Promise<LessonProgress[]>;
  /** An empty record (emptyProgress) if nothing is stored yet. */
  get(id: string): Promise<LessonProgress>;
  /** Each top-level field in the patch replaces the stored one. */
  update(id: string, patch: ProgressPatch): Promise<LessonProgress>;
  reset(id: string): Promise<LessonProgress>;
  /** Writes anything still pending to disk. */
  dispose(): Promise<void>;
}

/** Backup and restore of every profile's settings and progress as one file (SPEC section 12).
 *  src/main/ipc.ts shows the file dialogs and passes the chosen path in. */
export interface BackupService {
  exportTo(filePath: string): Promise<void>;
  /** Resolves to false if the file is not a valid backup. Nothing is changed in that case. */
  importFrom(filePath: string): Promise<boolean>;
}

// ================================================================ python area

export interface PracticeService {
  status(): Promise<PracticeServiceStatus>;
  setMode(mode: PracticeMode): Promise<PracticeServiceStatus>;
  onStatus(cb: (status: PracticeServiceStatus) => void): Unsub;
  /** Starts the practice service if it is not running and resolves to its base URL,
   *  for example "http://127.0.0.1:53124". Bound to 127.0.0.1 only. */
  ensureStarted(): Promise<string>;
  dispose(): Promise<void>;
}

export interface PythonService {
  /** Writes the files to the lesson's scratch folder and starts the entry file.
   *  Resolves to the runId as soon as the process has been started. */
  run(req: RunRequest): Promise<string>;
  /** One line for input(), without the trailing newline. Ignored for an unknown runId. */
  sendInput(runId: string, text: string): Promise<void>;
  /** Kills the run. The 'exit' event follows. Ignored for an unknown runId. */
  stop(runId: string): Promise<void>;
  onEvent(cb: (event: RunEvent) => void): Unsub;
  /** Instant analysis, no AI. Must not throw for any input: resolves to [] on failure. */
  analyse(code: string, lessonId: string | null): Promise<Diagnostic[]>;
  trace(req: RunRequest, inputs: string[]): Promise<TraceResult>;
  runTests(lessonId: string | null, files: CodeFile[]): Promise<TestRunResult>;
  dispose(): Promise<void>;
}

export interface ChecksService {
  /** Runs one group of the lesson's checks.py against the learner's files.
   *  Never rejects: a crash or the time limit comes back as `passed: false` with `error`. */
  run(lessonId: string, checkId: string, files: CodeFile[]): Promise<CheckResult>;
  dispose(): Promise<void>;
}

export interface TerminalService {
  /** Starts a command and resolves to its id. Output and exit arrive through onEvent.
   *  A refused command still gets an id, one 'output' with the friendly message, and an 'exit'. */
  run(lessonId: string | null, commandLine: string): Promise<string>;
  stop(id: string): Promise<void>;
  /** Current folder relative to the lesson's working folder ("." at its root). */
  cwd(lessonId: string | null): Promise<string>;
  /** Puts the working folder back to how the lesson supplies it and returns to its root. */
  reset(lessonId: string | null): Promise<void>;
  onEvent(cb: (event: TerminalEvent) => void): Unsub;
  dispose(): Promise<void>;
}

// ================================================================ ai area

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  maxTokens: number;
  temperature: number;
  /** Abort to cancel a reply that is still streaming. */
  signal?: AbortSignal;
}

/** One way of getting text out of a model (SPEC section 9). */
export interface Provider {
  readonly id: ProviderId;
  /** Yields the reply piece by piece. Throws on failure; ends quietly if aborted. */
  chat(messages: ChatMessage[], options: ChatOptions): AsyncIterable<string>;
  /** A cheap round trip that proves the provider works (key valid, server up). */
  test(): Promise<OkMessage>;
}

export interface AiService {
  hardware(): Promise<HardwareInfo>;
  catalogue(): Promise<ModelEntry[]>;
  status(): Promise<ModelStatus>;
  onStatus(cb: (status: ModelStatus) => void): Unsub;
  useLocal(modelId: string): Promise<void>;
  useOwnFile(): Promise<boolean>;
  cancelDownload(): Promise<void>;
  useCloud(provider: ProviderId, key: string, opts?: CloudOptions): Promise<OkMessage>;
  useNone(): Promise<void>;
  removeModel(modelId: string): Promise<void>;
  /** The provider to talk to right now, or null when none is ready. The tutor calls this
   *  before every comment and falls back to prepared messages on null. */
  getProvider(): Provider | null;
  dispose(): Promise<void>;
}

// ================================================================ tutor area

export interface TutorService {
  notifyEdit(snapshot: EditorSnapshot): void;
  notifyRun(lessonId: string | null, event: RunEvent): void;
  notifyCheck(lessonId: string, result: CheckResult): void;
  ask(lessonId: string | null, question: string, snapshot: EditorSnapshot): Promise<void>;
  hint(lessonId: string, stepId: string, size: 'small' | 'big', snapshot: EditorSnapshot): Promise<void>;
  onMessage(cb: (message: TutorMessage) => void): Unsub;
  onMessageDelta(cb: (id: string, text: string) => void): Unsub;
  rate(id: string, good: boolean): void;
  clear(): void;
  dispose(): Promise<void>;
}

// ================================================================ what Electron provides

/** Encrypted storage for API keys (Electron safeStorage behind it, a Map in tests).
 *  Values never appear in settings JSON or in logs. */
export interface SecretStore {
  /** False when the operating system offers no encryption. Then `set` rejects. */
  isAvailable(): boolean;
  get(name: string): Promise<string | null>;
  set(name: string, value: string): Promise<void>;
  remove(name: string): Promise<void>;
}

export interface FileFilter {
  name: string;
  extensions: string[];
}

/** Native file dialogs. Both resolve to null if the learner cancels. */
export interface Dialogs {
  pickFile(options: { title: string; filters?: FileFilter[] }): Promise<string | null>;
  saveFile(options: { title: string; defaultName: string; filters?: FileFilter[] }): Promise<string | null>;
}

// ================================================================ wiring

/** What every service gets. */
export interface CoreDeps {
  paths: Paths;
  logger: Logger;
}

/** Everything the main process runs, in the order compose.ts creates it. */
export interface Services {
  profiles: ProfileService;
  settings: SettingsService;
  lessons: LessonService;
  progress: ProgressService;
  backup: BackupService;
  practice: PracticeService;
  python: PythonService;
  checks: ChecksService;
  terminal: TerminalService;
  ai: AiService;
  tutor: TutorService;
}

/** The dependencies each factory receives: `createPythonService(deps: ServiceDeps['python'])`.
 *  A service may only use what is listed for it here. The graph has no cycles. */
export interface ServiceDeps {
  profiles: CoreDeps;
  settings: CoreDeps & Pick<Services, 'profiles'>;
  lessons: CoreDeps;
  progress: CoreDeps & Pick<Services, 'profiles'>;
  backup: CoreDeps & Pick<Services, 'profiles' | 'settings' | 'progress'>;
  practice: CoreDeps;
  python: CoreDeps & Pick<Services, 'profiles' | 'settings' | 'lessons' | 'practice'>;
  checks: CoreDeps & Pick<Services, 'profiles' | 'lessons' | 'practice'>;
  terminal: CoreDeps & Pick<Services, 'profiles' | 'lessons' | 'practice'>;
  ai: CoreDeps & Pick<Services, 'settings'> & { secrets: SecretStore; dialogs: Dialogs };
  tutor: CoreDeps & Pick<Services, 'profiles' | 'settings' | 'lessons' | 'progress' | 'python' | 'ai'>;
}
