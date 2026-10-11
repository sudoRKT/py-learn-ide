// The bridge contract (SPEC section 5): the `Api` the renderer sees as `window.api`, and the
// single list of IPC channels that the preload and the main process are both built from.
//
// Frozen during the parallel build. Ask the lead before changing anything here.
// This file is bundled into the sandboxed preload: type-only imports and constants.ts only.

import { IPC_PREFIX } from './constants';
import type {
  AppInfo, CheckResult, CodeFile, DeepPartial, Diagnostic, EditorSnapshot, HardwareInfo, Idea,
  Lesson, LessonProgress, LessonSummary, ModelEntry, ModelStatus, PracticeMode,
  PracticeServiceStatus, Profile, ProviderId, RunEvent, RunRequest, Settings, TerminalEvent,
  TestRunResult, TraceResult, TutorMessage, Unsub,
} from './types';

/** What `progress.update` accepts. Each top-level field given replaces the stored one whole
 *  (so send the complete `code`, `stepsDone` or `hintsUsed`, not a fragment). */
export type ProgressPatch = Partial<Omit<LessonProgress, 'lessonId'>>;

export interface CloudOptions {
  baseUrl?: string;
  model?: string;
}

export interface OkMessage {
  ok: boolean;
  message: string;
}

export interface Api {
  app: {
    info(): Promise<AppInfo>;
    openDataFolder(): Promise<void>;
    /** Asks where to save, writes one backup file. Resolves to its path, or null if cancelled. */
    exportBackup(): Promise<string | null>;
    /** Asks for a backup file and restores it. Resolves to false if cancelled or not a valid backup. */
    importBackup(): Promise<boolean>;
  };
  settings: {
    get(): Promise<Settings>;
    set(patch: DeepPartial<Settings>): Promise<Settings>;
    /** Fires after every change, including a profile switch (the new profile's settings). */
    onChanged(cb: (settings: Settings) => void): Unsub;
  };
  profiles: {
    list(): Promise<Profile[]>;
    create(name: string): Promise<Profile>;
    /** Afterwards `settings.onChanged` fires and progress must be re-read. */
    switchTo(id: string): Promise<void>;
    rename(id: string, name: string): Promise<void>;
    /** Deletes the profile and its progress. The last profile cannot be removed (rejects). */
    remove(id: string): Promise<void>;
  };
  lessons: {
    list(): Promise<LessonSummary[]>;
    get(id: string): Promise<Lesson>;
    solution(id: string): Promise<CodeFile[]>;
    /** Text content of a file under the lesson's files/ folder. */
    dataFile(id: string, name: string): Promise<string>;
    /** SPEC-EXT: the idea vocabulary, in teaching order, for the "What I've learned" sheet. */
    ideas(): Promise<Idea[]>;
  };
  progress: {
    /** Only lessons that have a stored record. */
    all(): Promise<LessonProgress[]>;
    /** Never rejects for a lesson with no record: resolves to an empty record. */
    get(id: string): Promise<LessonProgress>;
    update(id: string, patch: ProgressPatch): Promise<LessonProgress>;
    reset(id: string): Promise<LessonProgress>;
  };
  python: {
    /** Starts a run and resolves to its runId. Events for the run can arrive before this
     *  resolves, so key on `runId` from the 'started' event rather than waiting for it. */
    run(req: RunRequest): Promise<string>;
    /** One line typed into the console, without the trailing newline. */
    sendInput(runId: string, text: string): Promise<void>;
    /** Resolves once the stop has been requested. The 'exit' event follows. */
    stop(runId: string): Promise<void>;
    onEvent(cb: (e: RunEvent) => void): Unsub;
    analyse(code: string, lessonId: string | null): Promise<Diagnostic[]>;
    /** Runs the whole program under the tracer with scripted answers for input(). */
    trace(req: RunRequest, inputs: string[]): Promise<TraceResult>;
    runTests(lessonId: string | null, files: CodeFile[]): Promise<TestRunResult>;
  };
  terminal: {
    /** Starts a command in the lesson's working folder and resolves to its id. */
    run(lessonId: string | null, commandLine: string): Promise<string>;
    stop(id: string): Promise<void>;
    /** Current folder, relative to the lesson's working folder ("." at its root). */
    cwd(lessonId: string | null): Promise<string>;
    /** Puts the lesson's working folder back to how the lesson supplies it. */
    reset(lessonId: string | null): Promise<void>;
    onEvent(cb: (e: TerminalEvent) => void): Unsub;
  };
  practice: {
    status(): Promise<PracticeServiceStatus>;
    setMode(mode: PracticeMode): Promise<PracticeServiceStatus>;
    onStatus(cb: (s: PracticeServiceStatus) => void): Unsub;
  };
  checks: {
    run(lessonId: string, checkId: string, files: CodeFile[]): Promise<CheckResult>;
  };
  tutor: {
    notifyEdit(s: EditorSnapshot): void;
    notifyRun(lessonId: string | null, e: RunEvent): void;
    notifyCheck(lessonId: string, r: CheckResult): void;
    /** The answer arrives through onMessage with trigger 'question'. */
    ask(lessonId: string | null, question: string, s: EditorSnapshot): Promise<void>;
    /** The hint arrives through onMessage with trigger 'hint-small' or 'hint-big'. */
    hint(lessonId: string, stepId: string, size: 'small' | 'big', s: EditorSnapshot): Promise<void>;
    /** A new message, or a new version of one already delivered (same id). */
    onMessage(cb: (m: TutorMessage) => void): Unsub;
    /** `text` is the piece to append to the message with this id. */
    onMessageDelta(cb: (id: string, text: string) => void): Unsub;
    rate(id: string, good: boolean): void;
    /** Forget the conversation so far and cancel any reply in flight. */
    clear(): void;
  };
  ai: {
    hardware(): Promise<HardwareInfo>;
    catalogue(): Promise<ModelEntry[]>;
    status(): Promise<ModelStatus>;
    onStatus(cb: (s: ModelStatus) => void): Unsub;
    /** Downloads the model if needed, then starts it. Resolves once that has begun;
     *  follow progress through onStatus. */
    useLocal(modelId: string): Promise<void>;
    /** Lets the learner pick their own .gguf file. Resolves to false if they cancel. */
    useOwnFile(): Promise<boolean>;
    cancelDownload(): Promise<void>;
    /** Tests the key first. It is stored only if the test passes. */
    useCloud(provider: ProviderId, key: string, opts?: CloudOptions): Promise<OkMessage>;
    useNone(): Promise<void>;
    removeModel(modelId: string): Promise<void>;
  };
}

// ---------------------------------------------------------------- channels

/** How a method crosses the bridge.
 *  - invoke: request and reply (`ipcRenderer.invoke` / `ipcMain.handle`)
 *  - send:   one-way from the renderer, nothing comes back (`ipcRenderer.send` / `ipcMain.on`)
 *  - event:  a subscription; the main process pushes with `webContents.send` */
export type ChannelKind = 'invoke' | 'send' | 'event';

type KindOf<F> = F extends (...args: never[]) => infer R
  ? R extends Promise<unknown>
    ? 'invoke'
    : R extends Unsub
      ? 'event'
      : 'send'
  : never;

/** The shape every channel table must have: one entry per Api method, with the right kind. */
export type ApiShape = { readonly [G in keyof Api]: { readonly [M in keyof Api[G]]: KindOf<Api[G][M]> } };

/** The single source of truth for IPC channels. The preload builds `window.api` from this
 *  table and src/main/ipc.ts registers its handlers from it, so the two cannot drift.
 *  The `satisfies` clause makes a missing or mis-typed entry a compile error. */
export const API_SHAPE = {
  app: { info: 'invoke', openDataFolder: 'invoke', exportBackup: 'invoke', importBackup: 'invoke' },
  settings: { get: 'invoke', set: 'invoke', onChanged: 'event' },
  profiles: { list: 'invoke', create: 'invoke', switchTo: 'invoke', rename: 'invoke', remove: 'invoke' },
  lessons: { list: 'invoke', get: 'invoke', solution: 'invoke', dataFile: 'invoke', ideas: 'invoke' },
  progress: { all: 'invoke', get: 'invoke', update: 'invoke', reset: 'invoke' },
  python: {
    run: 'invoke', sendInput: 'invoke', stop: 'invoke', onEvent: 'event',
    analyse: 'invoke', trace: 'invoke', runTests: 'invoke',
  },
  terminal: { run: 'invoke', stop: 'invoke', cwd: 'invoke', reset: 'invoke', onEvent: 'event' },
  practice: { status: 'invoke', setMode: 'invoke', onStatus: 'event' },
  checks: { run: 'invoke' },
  tutor: {
    notifyEdit: 'send', notifyRun: 'send', notifyCheck: 'send', ask: 'invoke', hint: 'invoke',
    onMessage: 'event', onMessageDelta: 'event', rate: 'send', clear: 'send',
  },
  ai: {
    hardware: 'invoke', catalogue: 'invoke', status: 'invoke', onStatus: 'event',
    useLocal: 'invoke', useOwnFile: 'invoke', cancelDownload: 'invoke', useCloud: 'invoke',
    useNone: 'invoke', removeModel: 'invoke',
  },
} as const satisfies ApiShape;

export type ApiGroup = keyof Api;

/** The channel name for one Api method, for example "pylearn:python.run". */
export function channelName(group: string, method: string): string {
  return `${IPC_PREFIX}:${group}.${method}`;
}

export interface ChannelInfo {
  group: ApiGroup;
  method: string;
  kind: ChannelKind;
  channel: string;
}

/** Every channel, flattened from API_SHAPE. */
export const CHANNELS: readonly ChannelInfo[] = (Object.keys(API_SHAPE) as ApiGroup[]).flatMap((group) =>
  Object.entries(API_SHAPE[group] as Record<string, ChannelKind>).map(([method, kind]) => ({
    group,
    method,
    kind,
    channel: channelName(group, method),
  })),
);

const namesOf = (kind: ChannelKind): readonly string[] =>
  CHANNELS.filter((c) => c.kind === kind).map((c) => c.channel);

/** Request-and-reply channels (renderer calls, main answers). */
export const INVOKE_CHANNELS = namesOf('invoke');
/** One-way channels from the renderer. */
export const SEND_CHANNELS = namesOf('send');
/** Subscription channels (main pushes to the renderer with the callback's arguments). */
export const EVENT_CHANNELS = namesOf('event');
