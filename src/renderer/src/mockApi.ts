// A complete in-memory implementation of `Api` (SPEC section 4), for running the renderer
// in a plain browser and for Playwright. Nothing here touches disk, Python or the network.
//
// What it simulates:
//   python.run      pretends to run simple code: print(...) lines appear, input(...) asks
//                   and waits for sendInput, "pritn" ends in a NameError, `while True`
//                   without a break prints for ever until stop()
//   python.analyse  one Diagnostic for every "pritn" in the code
//   python.trace    a fixed six-step trace
//   python.runTests three tests, one failing
//   checks.run      fails on the first call for a (lesson, check) pair, passes on the next
//   terminal.run    plausible output for git status, git log, python, pytest, pip list, ls, cd
//   tutor           speaks after the idle time from settings; every third comment streams
//   ai.useLocal     downloading -> starting -> ready
//
// Tests can shape the starting state before the page loads:
//   await page.addInitScript(() => { window.__PYLEARN_MOCK_INIT__ = { speed: 0, settings: { theme: 'dark' } }; });
// and drive it afterwards through `window.__pylearnMock` (see MockControls).

import { nanoid } from 'nanoid';
import { APP_NAME, BACKUP_EXTENSION, DEFAULT_PROFILE_ID, DEFAULT_PROFILE_NAME } from '@shared/constants';
import type { Api } from '@shared/ipc';
import {
  DEFAULT_SETTINGS, deepMerge, emptyProgress,
  type CheckResult, type DeepPartial, type Diagnostic, type EditorSnapshot, type LessonProgress, type ModelStatus,
  type PracticeServiceStatus, type Profile, type PythonError, type RunEvent, type RunRequest, type Settings,
  type TerminalEvent, type TraceResult, type TutorMessage, type TutorTrigger, type Unsub,
} from '@shared/types';
import {
  buildMockLesson, buildMockProgress, buildMockSolution, MOCK_CATALOGUE, MOCK_DATA_FILES, MOCK_HARDWARE,
  MOCK_IDEAS, MOCK_LESSONS, MOCK_TUTOR_LINES,
} from './mockData';

// ---------------------------------------------------------------- options and controls

export interface MockInit {
  /** Time multiplier for every simulated delay. 1 = lifelike (default), 0 = instant. */
  speed?: number;
  /** Merged over the mock's starting settings. */
  settings?: DeepPartial<Settings>;
  /** True: a brand-new install (no progress, onboarding not done). Default false. */
  fresh?: boolean;
  /** Start with a local model already 'ready'. Default false ('not-set-up'). */
  aiReady?: boolean;
}

export interface MockControls {
  /** Make the tutor say something now. */
  say(text: string, options?: { trigger?: TutorTrigger; source?: TutorMessage['source']; line?: number; stream?: boolean }): void;
  setAiStatus(status: ModelStatus): void;
  setSpeed(speed: number): void;
  /** Every call the interface has made, newest last: "group.method". */
  calls: string[];
}

declare global {
  interface Window {
    __PYLEARN_MOCK_INIT__?: MockInit;
    __pylearnMock?: { api: Api; controls: MockControls };
  }
}

// ---------------------------------------------------------------- small helpers

function createEmitter<Args extends unknown[]>(): { on(cb: (...args: Args) => void): Unsub; emit(...args: Args): void } {
  const listeners = new Set<(...args: Args) => void>();
  return {
    on(cb) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    emit(...args) {
      for (const listener of [...listeners]) listener(...args);
    },
  };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function splitArgs(inner: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let current = '';
  for (const ch of inner) {
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
    } else if (ch === '(' || ch === '[' || ch === '{') {
      depth += 1;
      current += ch;
    } else if (ch === ')' || ch === ']' || ch === '}') {
      depth -= 1;
      current += ch;
    } else if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function evalAtom(atom: string, variables: Map<string, string>): string {
  const fString = /^f(["'])(.*)\1$/.exec(atom);
  if (fString) return fString[2]!.replace(/\{([^}:]+)(?::[^}]*)?\}/g, (_m, name: string) => variables.get(name.trim()) ?? '?');
  const literal = /^(["'])(.*)\1$/.exec(atom);
  if (literal) return literal[2]!.replace(/\\n/g, '\n');
  if (/^-?\d+(\.\d+)?$/.test(atom)) return atom;
  if (/^[A-Za-z_]\w*$/.test(atom)) return variables.get(atom) ?? '?';
  const sum = /^(-?\d+)\s*([+\-*])\s*(-?\d+)$/.exec(atom);
  if (sum) {
    const a = Number(sum[1]);
    const b = Number(sum[3]);
    return String(sum[2] === '+' ? a + b : sum[2] === '-' ? a - b : a * b);
  }
  return '...';
}

// ---------------------------------------------------------------- the mock

export function createMockApi(init: MockInit = {}): { api: Api; controls: MockControls } {
  let speed = init.speed ?? 1;
  const calls: string[] = [];
  const wait = (ms: number): Promise<void> =>
    speed <= 0 ? Promise.resolve() : new Promise((resolve) => setTimeout(resolve, ms * speed));
  /** A short pause before every answer, so loading states are exercised. */
  const answer = async <T>(name: string, value: () => T | Promise<T>): Promise<T> => {
    calls.push(name);
    await wait(20);
    return clone(await value());
  };

  // ---- profiles, settings, progress
  const now = Date.now();
  let profiles: Profile[] = [
    { id: DEFAULT_PROFILE_ID, name: DEFAULT_PROFILE_NAME, createdAt: now - 30 * 86_400_000, lastUsedAt: now },
    { id: 'p-sam', name: 'Sam', createdAt: now - 3 * 86_400_000, lastUsedAt: now - 86_400_000 },
  ];
  let currentProfile = DEFAULT_PROFILE_ID;
  const settingsByProfile = new Map<string, Settings>();
  const progressByProfile = new Map<string, Record<string, LessonProgress>>();
  const settingsChanged = createEmitter<[Settings]>();

  const startingSettings = (profileId: string): Settings =>
    deepMerge(
      deepMerge(DEFAULT_SETTINGS, { onboardingDone: !init.fresh, profileId }),
      profileId === DEFAULT_PROFILE_ID ? (init.settings ?? {}) : {},
    );
  const settingsOf = (profileId: string): Settings => {
    let settings = settingsByProfile.get(profileId);
    if (!settings) {
      settings = startingSettings(profileId);
      settingsByProfile.set(profileId, settings);
    }
    return { ...settings, profileId };
  };
  const progressOf = (profileId: string): Record<string, LessonProgress> => {
    let progress = progressByProfile.get(profileId);
    if (!progress) {
      progress = profileId === DEFAULT_PROFILE_ID && !init.fresh ? buildMockProgress() : {};
      progressByProfile.set(profileId, progress);
    }
    return progress;
  };
  const findLesson = (id: string) => {
    const lesson = MOCK_LESSONS.find((l) => l.id === id);
    if (!lesson) throw new Error(`No such lesson: ${id}`);
    return lesson;
  };

  // ---- python
  const runEvents = createEmitter<[RunEvent]>();
  interface MockRun {
    stopped: boolean;
    resolveInput: ((text: string) => void) | null;
  }
  const runs = new Map<string, MockRun>();

  async function simulateRun(runId: string, req: RunRequest): Promise<void> {
    const run = runs.get(runId)!;
    const started = Date.now();
    const code = req.files.find((f) => f.name === req.entry)?.content ?? '';
    const lines = code.split('\n');
    const variables = new Map<string, string>();
    const finish = (exitCode: number | null, signal: string | null, error?: PythonError): void => {
      runs.delete(runId);
      runEvents.emit({ type: 'exit', runId, code: exitCode, signal, durationMs: Date.now() - started, ...(error ? { error } : {}) });
    };

    await wait(30);
    runEvents.emit({ type: 'started', runId });

    const endless = /while\s+True\s*:/.test(code) && !/\bbreak\b/.test(code) && !/input\s*\(/.test(code);

    // Unroll `while name < N:` loops (the only loop shape the mock understands) so that a
    // counting loop asks and prints the right number of times.
    const indentOf = (text: string): number => text.length - text.trimStart().length;
    const program: { text: string; no: number }[] = [];
    for (let i = 0; i < lines.length; i += 1) {
      const counted = /^\s*while\s+[A-Za-z_]\w*\s*<\s*(\d+)\s*:/.exec(lines[i]!);
      if (!counted) {
        program.push({ text: lines[i]!, no: i + 1 });
        continue;
      }
      const body: { text: string; no: number }[] = [];
      let j = i + 1;
      while (j < lines.length && (lines[j]!.trim() === '' || indentOf(lines[j]!) > indentOf(lines[i]!))) {
        body.push({ text: lines[j]!, no: j + 1 });
        j += 1;
      }
      const turns = Math.min(20, Number(counted[1]));
      for (let turn = 0; turn < turns; turn += 1) program.push(...body);
      i = j - 1;
    }

    for (const step of program) {
      if (run.stopped) return finish(null, 'SIGTERM');
      const line = step.text.trim();
      const i = step.no - 1;
      if (!line || line.startsWith('#')) continue;

      const typo = /\bpritn\b/.exec(line);
      if (typo) {
        const traceback = `Traceback (most recent call last):\n  File "${req.entry}", line ${i + 1}, in <module>\n    ${line}\nNameError: name 'pritn' is not defined. Did you mean: 'print'?\n`;
        await wait(60);
        runEvents.emit({ type: 'stderr', runId, text: traceback });
        return finish(1, null, {
          type: 'NameError',
          message: "name 'pritn' is not defined. Did you mean: 'print'?",
          line: i + 1,
          file: req.entry,
          traceback,
          friendly: `Python does not know the word "pritn" on line ${i + 1}. Check the spelling: did you mean print?`,
        });
      }

      const ask = /^(?:([A-Za-z_]\w*)\s*=\s*)?(?:int|float|str)?\(?\s*input\(\s*(?:(["'])(.*?)\2)?\s*\)\s*\)?/.exec(line);
      if (ask) {
        if (ask[3]) runEvents.emit({ type: 'stdout', runId, text: ask[3] });
        await wait(40);
        runEvents.emit({ type: 'input-requested', runId });
        const typed = await new Promise<string>((resolve) => {
          run.resolveInput = resolve;
        });
        run.resolveInput = null;
        if (run.stopped) return finish(null, 'SIGTERM');
        if (ask[1]) variables.set(ask[1], typed);
        continue;
      }

      const augmented = /^([A-Za-z_]\w*)\s*([+\-*])=\s*(.+)$/.exec(line);
      if (augmented) {
        const before = Number(variables.get(augmented[1]!) ?? 0);
        const amount = Number(evalAtom(augmented[3]!.trim(), variables));
        const after = augmented[2] === '+' ? before + amount : augmented[2] === '-' ? before - amount : before * amount;
        variables.set(augmented[1]!, Number.isFinite(after) ? String(after) : '?');
        continue;
      }

      const assign = /^([A-Za-z_]\w*)\s*=\s*(.+)$/.exec(line);
      if (assign && !line.startsWith('print')) {
        variables.set(assign[1]!, evalAtom(assign[2]!.trim(), variables));
        continue;
      }

      const print = /^print\((.*)\)$/.exec(line);
      if (print) {
        await wait(45);
        const text = splitArgs(print[1]!)
          .filter((part) => !/^(end|sep)\s*=/.test(part))
          .map((part) => evalAtom(part, variables))
          .join(' ');
        runEvents.emit({ type: 'stdout', runId, text: text + '\n' });
      }
    }

    if (endless) {
      let n = 0;
      while (!run.stopped) {
        n += 1;
        runEvents.emit({ type: 'stdout', runId, text: `still going... ${n}\n` });
        await new Promise((resolve) => setTimeout(resolve, 60));
      }
      return finish(null, 'SIGTERM');
    }
    await wait(30);
    finish(0, null);
  }

  function analyse(code: string): Diagnostic[] {
    const out: Diagnostic[] = [];
    code.split('\n').forEach((line, index) => {
      const column = line.indexOf('pritn');
      if (column >= 0) {
        out.push({
          line: index + 1,
          column: column + 1,
          endLine: index + 1,
          endColumn: column + 6,
          severity: 'error',
          code: 'undefined-name',
          message: "name 'pritn' is not defined",
          friendly: 'Python does not know the word "pritn". Did you mean print?',
        });
      }
    });
    return out;
  }

  const MOCK_TRACE: TraceResult = {
    truncated: false,
    steps: [
      { line: 1, file: 'starter.py', event: 'line', variables: {}, stdout: '', depth: 0 },
      { line: 2, file: 'starter.py', event: 'line', variables: { total: '0' }, stdout: '', depth: 0 },
      { line: 3, file: 'starter.py', event: 'line', variables: { total: '0', count: '0' }, stdout: '', depth: 0 },
      { line: 4, file: 'starter.py', event: 'line', variables: { total: '0', count: '0' }, stdout: '', depth: 0 },
      { line: 5, file: 'starter.py', event: 'line', variables: { total: '10', count: '0' }, stdout: '', depth: 0 },
      { line: 6, file: 'starter.py', event: 'line', variables: { total: '10', count: '1' }, stdout: 'Total so far: 10\n', depth: 0 },
    ],
  };

  // ---- checks
  const checkCalls = new Map<string, number>();

  // ---- terminal
  const terminalEvents = createEmitter<[TerminalEvent]>();
  const terminalCwd = new Map<string, string>();
  const cwdKey = (lessonId: string | null): string => lessonId ?? 'playground';

  function terminalOutput(lessonId: string | null, commandLine: string): { text: string; code: number } {
    const words = commandLine.trim().split(/\s+/);
    const command = (words[0] ?? '').toLowerCase();
    const rest = words.slice(1).join(' ');
    switch (command) {
      case '':
        return { text: '', code: 0 };
      case 'git':
        if (rest === 'status') {
          return {
            text: 'On branch main\nChanges not staged for commit:\n  (use "git add <file>..." to update what will be committed)\n\tmodified:   arcade.py\n\nUntracked files:\n  (use "git add <file>..." to include in what will be committed)\n\tscores.txt\n\nno changes added to commit (use "git add" and/or "git commit -a")\n',
            code: 0,
          };
        }
        if (rest.startsWith('log')) {
          return { text: 'a1b2c3d (HEAD -> main) Add the dice game\n9f8e7d6 Add the menu\n4c5b6a7 First snapshot\n', code: 0 };
        }
        if (rest.startsWith('add')) return { text: '', code: 0 };
        if (rest.startsWith('commit')) return { text: '[main 7d6e5f4] Save my work\n 2 files changed, 14 insertions(+), 3 deletions(-)\n', code: 0 };
        if (rest === 'init') return { text: 'Initialized empty Git repository in .git/\n', code: 0 };
        return { text: `git: '${rest.split(' ')[0] ?? ''}' is not something the mock knows.\n`, code: 1 };
      case 'python':
        return rest ? { text: 'Hello from the mock terminal\n', code: 0 } : { text: 'Type the name of a file after python, for example: python main.py\n', code: 1 };
      case 'pytest':
        return { text: '...F                                                                     [100%]\n1 failed, 3 passed in 0.12s\n', code: 1 };
      case 'pip':
        return rest === 'list'
          ? { text: 'Package    Version\n---------- -------\npytest     9.1.1\nrequests   2.34.2\n', code: 0 }
          : { text: 'Only "pip list" is available here.\n', code: 1 };
      case 'ls':
      case 'dir':
        return { text: 'arcade.py\nhelpers.py\nscores.txt\ntests\n', code: 0 };
      case 'cd': {
        const key = cwdKey(lessonId);
        const current = terminalCwd.get(key) ?? '.';
        if (!rest || rest === '.') return { text: '', code: 0 };
        if (rest === '..') {
          if (current === '.') return { text: 'You cannot leave the lesson folder.\n', code: 1 };
          const parent = current.split('/').slice(0, -1).join('/');
          terminalCwd.set(key, parent || '.');
          return { text: '', code: 0 };
        }
        if (rest === 'tests') {
          terminalCwd.set(key, current === '.' ? 'tests' : `${current}/tests`);
          return { text: '', code: 0 };
        }
        return { text: `There is no folder called ${rest} here.\n`, code: 1 };
      }
      case 'cls':
      case 'clear':
        return { text: '', code: 0 };
      case 'type':
      case 'cat':
        return rest ? { text: 'Asha,120\nBen,95\n', code: 0 } : { text: 'Type the name of a file after the command.\n', code: 1 };
      default:
        return {
          text: `That command isn't available here. You can use: python, pytest, git, pip list, cd, dir, cls and type.\n`,
          code: 1,
        };
    }
  }

  // ---- practice
  const practiceChanged = createEmitter<[PracticeServiceStatus]>();
  let practice: PracticeServiceStatus = { running: true, baseUrl: 'http://127.0.0.1:8765', mode: 'normal' };

  // ---- ai
  const aiChanged = createEmitter<[ModelStatus]>();
  let installed: string[] = init.aiReady ? ['tutor-small'] : [];
  let aiStatus: ModelStatus = init.aiReady
    ? { provider: 'local', modelId: 'tutor-small', state: 'ready', installed }
    : { provider: 'none', modelId: null, state: 'not-set-up', installed };
  let aiJob = 0;
  const setAi = (next: ModelStatus): void => {
    aiStatus = { ...next, installed: [...installed] };
    aiChanged.emit(clone(aiStatus));
  };
  const rememberAi = (provider: Settings['ai']['provider'], modelId: string | null, extra: Partial<Settings['ai']> = {}): void => {
    const next = deepMerge(settingsOf(currentProfile), { ai: { provider, modelId, ...extra } });
    settingsByProfile.set(currentProfile, next);
    settingsChanged.emit(clone(next));
  };

  async function startLocal(modelId: string): Promise<void> {
    const entry = MOCK_CATALOGUE.find((m) => m.id === modelId);
    if (!entry) throw new Error(`No such model: ${modelId}`);
    const job = (aiJob += 1);
    if (!installed.includes(modelId)) {
      const total = entry.sizeBytes;
      const ticks = 12;
      for (let i = 0; i <= ticks; i += 1) {
        if (job !== aiJob) return;
        setAi({
          provider: 'local',
          modelId,
          state: 'downloading',
          download: { receivedBytes: Math.round((total * i) / ticks), totalBytes: total, bytesPerSecond: 14_500_000 },
        });
        await wait(250);
      }
      if (job !== aiJob) return;
      installed = [...installed, modelId];
    }
    setAi({ provider: 'local', modelId, state: 'starting' });
    await wait(900);
    if (job !== aiJob) return;
    setAi({ provider: 'local', modelId, state: 'ready' });
    rememberAi('local', modelId);
  }

  // ---- tutor
  const tutorMessages = createEmitter<[TutorMessage]>();
  const tutorDeltas = createEmitter<[string, string]>();
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let lastSpokeAt = 0;
  let lastCommentedCode = '';
  let spoken = 0;
  let streamJob = 0;

  async function say(
    text: string,
    options: { trigger?: TutorTrigger; source?: TutorMessage['source']; line?: number; stream?: boolean } = {},
  ): Promise<void> {
    const trigger = options.trigger ?? 'idle';
    const source = options.source ?? 'prepared';
    const id = nanoid(10);
    const base = { id, at: Date.now(), trigger, source, ...(options.line ? { line: options.line } : {}) };
    lastSpokeAt = Date.now();
    spoken += 1;
    if (!options.stream || speed <= 0) {
      tutorMessages.emit({ ...base, text });
      return;
    }
    const job = (streamJob += 1);
    tutorMessages.emit({ ...base, text: '', streaming: true });
    let sent = '';
    for (const word of text.split(/(?<=\s)/)) {
      await wait(55);
      if (job !== streamJob) break; // the learner started typing: cancel the reply
      sent += word;
      tutorDeltas.emit(id, word);
    }
    tutorMessages.emit({ ...base, text: job === streamJob ? text : sent, streaming: false });
  }

  function onEdit(snapshot: EditorSnapshot): void {
    streamJob += 1; // never speak while keys are being pressed
    if (idleTimer) clearTimeout(idleTimer);
    const settings = settingsOf(currentProfile);
    if (!settings.tutor.enabled) return;
    idleTimer = setTimeout(() => {
      idleTimer = null;
      if (snapshot.code === lastCommentedCode) return;
      if (Date.now() - lastSpokeAt < settings.tutor.minGapSeconds * 1000 * speed) return;
      lastCommentedCode = snapshot.code;
      const typo = analyse(snapshot.code)[0];
      if (typo) {
        void say(`Have another look at line ${typo.line}. One word there is not spelt the way Python expects.`, {
          source: 'analysis',
          line: typo.line,
        });
        return;
      }
      const line = MOCK_TUTOR_LINES[spoken % MOCK_TUTOR_LINES.length]!;
      const useAi = aiStatus.state === 'ready' && spoken % 3 === 2;
      void say(line, { source: useAi ? 'ai' : 'prepared', stream: useAi, line: Math.max(1, snapshot.cursorLine) });
    }, Math.max(0, settings.tutor.idleSeconds * 1000 * speed));
  }

  // ---- the Api
  const api: Api = {
    app: {
      info: () =>
        answer('app.info', () => ({
          name: APP_NAME,
          version: '1.0.0',
          platform: 'browser' as const,
          arch: 'mock',
          packaged: false,
          mock: true,
          dataDir: 'C:\\Users\\learner\\Py Learn\\data',
          versions: { electron: '', chrome: '', node: '' },
        })),
      openDataFolder: () => answer('app.openDataFolder', () => undefined),
      exportBackup: () => answer('app.exportBackup', () => `C:\\Users\\learner\\Documents\\py-learn-backup.${BACKUP_EXTENSION}`),
      importBackup: () => answer('app.importBackup', () => true),
    },

    settings: {
      get: () => answer('settings.get', () => settingsOf(currentProfile)),
      set: (patch) =>
        answer('settings.set', () => {
          const next = { ...deepMerge(settingsOf(currentProfile), patch), profileId: currentProfile };
          settingsByProfile.set(currentProfile, next);
          settingsChanged.emit(clone(next));
          return next;
        }),
      onChanged: (cb) => settingsChanged.on(cb),
    },

    profiles: {
      list: () => answer('profiles.list', () => profiles),
      create: (name) =>
        answer('profiles.create', () => {
          const trimmed = name.trim();
          if (!trimmed) throw new Error('A profile needs a name.');
          const profile: Profile = { id: `p-${nanoid(8).toLowerCase().replace(/[^a-z0-9]/g, 'x')}`, name: trimmed, createdAt: Date.now(), lastUsedAt: Date.now() };
          profiles = [...profiles, profile];
          return profile;
        }),
      switchTo: (id) =>
        answer('profiles.switchTo', () => {
          if (!profiles.some((p) => p.id === id)) throw new Error(`No such profile: ${id}`);
          currentProfile = id;
          profiles = profiles.map((p) => (p.id === id ? { ...p, lastUsedAt: Date.now() } : p));
          settingsChanged.emit(clone(settingsOf(id)));
        }),
      rename: (id, name) =>
        answer('profiles.rename', () => {
          if (!name.trim()) throw new Error('A profile needs a name.');
          profiles = profiles.map((p) => (p.id === id ? { ...p, name: name.trim() } : p));
        }),
      remove: (id) =>
        answer('profiles.remove', () => {
          if (profiles.length <= 1) throw new Error('The last profile cannot be removed.');
          profiles = profiles.filter((p) => p.id !== id);
          settingsByProfile.delete(id);
          progressByProfile.delete(id);
          if (currentProfile === id) {
            currentProfile = profiles[0]!.id;
            settingsChanged.emit(clone(settingsOf(currentProfile)));
          }
        }),
    },

    lessons: {
      list: () => answer('lessons.list', () => MOCK_LESSONS),
      get: (id) => answer('lessons.get', () => buildMockLesson(findLesson(id))),
      solution: (id) => answer('lessons.solution', () => buildMockSolution(findLesson(id))),
      dataFile: (id, name) =>
        answer('lessons.dataFile', () => {
          findLesson(id);
          const content = MOCK_DATA_FILES[name];
          if (content === undefined) throw new Error(`No such file: ${name}`);
          return content;
        }),
      ideas: () => answer('lessons.ideas', () => MOCK_IDEAS),
    },

    progress: {
      all: () => answer('progress.all', () => Object.values(progressOf(currentProfile))),
      get: (id) => answer('progress.get', () => progressOf(currentProfile)[id] ?? emptyProgress(id)),
      update: (id, patch) =>
        answer('progress.update', () => {
          const store = progressOf(currentProfile);
          const next: LessonProgress = { ...(store[id] ?? emptyProgress(id)), ...patch, lessonId: id };
          store[id] = next;
          return next;
        }),
      reset: (id) =>
        answer('progress.reset', () => {
          delete progressOf(currentProfile)[id];
          return emptyProgress(id);
        }),
    },

    python: {
      run: (req) =>
        answer('python.run', () => {
          if (!req.files.some((f) => f.name === req.entry)) throw new Error(`The entry file "${req.entry}" is not among the files of this run.`);
          const runId = nanoid(10);
          runs.set(runId, { stopped: false, resolveInput: null });
          void simulateRun(runId, clone(req));
          return runId;
        }),
      sendInput: (runId, text) =>
        answer('python.sendInput', () => {
          runs.get(runId)?.resolveInput?.(text);
        }),
      stop: (runId) =>
        answer('python.stop', () => {
          const run = runs.get(runId);
          if (!run) return;
          run.stopped = true;
          run.resolveInput?.('');
        }),
      onEvent: (cb) => runEvents.on(cb),
      analyse: (code) => answer('python.analyse', () => analyse(code)),
      trace: (req) =>
        answer('python.trace', async () => {
          await wait(200);
          const file = req.entry;
          return { ...MOCK_TRACE, steps: MOCK_TRACE.steps.map((step) => ({ ...step, file })) };
        }),
      runTests: () =>
        answer('python.runTests', async () => {
          await wait(400);
          return {
            durationMs: 120,
            raw: '..F                                                                      [100%]\n=================================== FAILURES ===================================\n    def test_empty_list():\n>       assert count_tasks([]) == 0\nE       assert 1 == 0\n\ntest_todo.py:14: AssertionError\n1 failed, 2 passed in 0.12s\n',
            tests: [
              { name: 'test_add_task', outcome: 'passed' as const, message: '', line: 4 },
              { name: 'test_remove_task', outcome: 'passed' as const, message: '', line: 9 },
              { name: 'test_empty_list', outcome: 'failed' as const, message: 'assert count_tasks([]) == 0\nassert 1 == 0', line: 14 },
            ],
          };
        }),
    },

    terminal: {
      run: (lessonId, commandLine) =>
        answer('terminal.run', () => {
          const id = nanoid(10);
          void (async () => {
            await wait(120);
            const result = terminalOutput(lessonId, commandLine);
            if (result.text) terminalEvents.emit({ type: 'output', id, text: result.text });
            await wait(40);
            terminalEvents.emit({ type: 'exit', id, code: result.code, cwd: terminalCwd.get(cwdKey(lessonId)) ?? '.' });
          })();
          return id;
        }),
      stop: () => answer('terminal.stop', () => undefined),
      cwd: (lessonId) => answer('terminal.cwd', () => terminalCwd.get(cwdKey(lessonId)) ?? '.'),
      reset: (lessonId) =>
        answer('terminal.reset', () => {
          terminalCwd.delete(cwdKey(lessonId));
        }),
      onEvent: (cb) => terminalEvents.on(cb),
    },

    practice: {
      status: () => answer('practice.status', () => practice),
      setMode: (mode) =>
        answer('practice.setMode', () => {
          practice = { ...practice, mode };
          practiceChanged.emit(clone(practice));
          return practice;
        }),
      onStatus: (cb) => practiceChanged.on(cb),
    },

    checks: {
      run: (lessonId, checkId) =>
        answer('checks.run', async (): Promise<CheckResult> => {
          await wait(500);
          const key = `${lessonId}/${checkId}`;
          const count = (checkCalls.get(key) ?? 0) + 1;
          checkCalls.set(key, count);
          const passing = count % 2 === 0;
          return {
            passed: passing,
            checkId,
            durationMs: 480,
            tests: [
              { name: 'Your program runs without an error', passed: true, message: '' },
              { name: 'It asks for numbers until 0 is typed', passed: true, message: '' },
              passing
                ? { name: 'It prints the total', passed: true, message: '' }
                : { name: 'It prints the total', passed: false, message: 'With 4, 5 and 0 typed in, the total should be 9. Check the line that updates your total.' },
            ],
          };
        }),
    },

    tutor: {
      notifyEdit: (snapshot) => {
        calls.push('tutor.notifyEdit');
        onEdit(snapshot);
      },
      notifyRun: (_lessonId, event) => {
        calls.push('tutor.notifyRun');
        const settings = settingsOf(currentProfile);
        if (event.type === 'exit' && event.error && settings.tutor.enabled && settings.tutor.speakOnRunFailure) {
          void say(event.error.friendly, { trigger: 'run-failed', source: 'analysis', ...(event.error.line ? { line: event.error.line } : {}) });
        }
      },
      notifyCheck: (_lessonId, result) => {
        calls.push('tutor.notifyCheck');
        if (!settingsOf(currentProfile).tutor.enabled) return;
        if (result.passed) void say('That passes every check.', { trigger: 'check-passed' });
        else void say(result.tests.find((t) => !t.passed)?.message ?? 'One of the checks did not pass yet.', { trigger: 'check-failed' });
      },
      ask: (_lessonId, question) =>
        answer('tutor.ask', async () => {
          const offTopic = !/\b(code|loop|line|error|total|count|print|input|why|how|what|while|variable)\b/i.test(question);
          if (offTopic) {
            await say('I can only help with this lesson and your code. What part of it are you stuck on?', { trigger: 'question' });
          } else {
            const ready = aiStatus.state === 'ready';
            await say(
              'Think about what your variable holds just before the loop starts, and what it should hold after one turn. Which line makes that change?',
              { trigger: 'question', source: ready ? 'ai' : 'prepared', stream: ready },
            );
          }
        }),
      hint: (_lessonId, _stepId, size) =>
        answer('tutor.hint', async () => {
          await say(
            size === 'small'
              ? 'You need two variables: one for the total and one for the count.'
              : 'Start both variables at 0 before the loop. Inside the loop, add the number to the total and add 1 to the count. Ask for the next number as the last line inside the loop.',
            { trigger: size === 'small' ? 'hint-small' : 'hint-big' },
          );
        }),
      onMessage: (cb) => tutorMessages.on(cb),
      onMessageDelta: (cb) => tutorDeltas.on(cb),
      rate: () => {
        calls.push('tutor.rate');
      },
      clear: () => {
        calls.push('tutor.clear');
        streamJob += 1;
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = null;
        lastCommentedCode = '';
        lastSpokeAt = 0;
      },
    },

    ai: {
      hardware: () => answer('ai.hardware', () => MOCK_HARDWARE),
      catalogue: () => answer('ai.catalogue', () => MOCK_CATALOGUE),
      status: () => answer('ai.status', () => aiStatus),
      onStatus: (cb) => aiChanged.on(cb),
      useLocal: (modelId) =>
        answer('ai.useLocal', () => {
          void startLocal(modelId).catch((error: unknown) => {
            setAi({ provider: 'local', modelId, state: 'error', message: String(error) });
          });
        }),
      useOwnFile: () =>
        answer('ai.useOwnFile', () => {
          const job = (aiJob += 1);
          void (async () => {
            setAi({ provider: 'local', modelId: 'own-file', state: 'starting' });
            await wait(900);
            if (job !== aiJob) return;
            setAi({ provider: 'local', modelId: 'own-file', state: 'ready' });
            rememberAi('local', 'own-file');
          })();
          return true;
        }),
      cancelDownload: () =>
        answer('ai.cancelDownload', () => {
          aiJob += 1;
          setAi({ provider: 'none', modelId: null, state: 'not-set-up' });
        }),
      useCloud: (provider, key, opts) =>
        answer('ai.useCloud', async () => {
          await wait(600);
          if (!key.trim() || key.trim().toLowerCase() === 'bad') {
            return { ok: false, message: 'That key was not accepted. Check it and try again.' };
          }
          aiJob += 1;
          setAi({ provider, modelId: opts?.model ?? null, state: 'ready' });
          rememberAi(provider, null, { apiKeyStored: true, ...(opts?.baseUrl ? { baseUrl: opts.baseUrl } : {}), ...(opts?.model ? { cloudModel: opts.model } : {}) });
          return { ok: true, message: 'Connected.' };
        }),
      useNone: () =>
        answer('ai.useNone', () => {
          aiJob += 1;
          setAi({ provider: 'none', modelId: null, state: 'not-set-up' });
          rememberAi('none', null, { apiKeyStored: false });
        }),
      removeModel: (modelId) =>
        answer('ai.removeModel', () => {
          installed = installed.filter((id) => id !== modelId);
          if (aiStatus.modelId === modelId) {
            aiJob += 1;
            setAi({ provider: 'none', modelId: null, state: 'not-set-up' });
            rememberAi('none', null);
          } else {
            setAi(aiStatus);
          }
        }),
    },
  };

  const controls: MockControls = {
    say: (text, options) => void say(text, options),
    setAiStatus: (status) => setAi(status),
    setSpeed: (value) => {
      speed = value;
    },
    calls,
  };

  return { api, controls };
}
