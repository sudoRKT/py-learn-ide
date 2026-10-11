# py-learn-ide: build spec

Version 1 is the complete app: all 100 lessons and every feature in this file. There is no cut-down release. This file is the contract every part of the build works to. If code and this file disagree, fix one of them in the same change.

Working product name: **Py Learn**. It lives in one constant (`APP_NAME` in `src/shared/constants.ts`) so it can be renamed in one place.

## 1. What the app is

A Windows desktop app for complete beginners (age 11 and up) to learn Python.

- 100 pre-loaded lessons (see `docs/LESSON_PLAN.md`).
- A code editor, a console, a lesson sidebar and a live AI tutor panel.
- The tutor watches the learner type and comments without being asked. It never hands over the answer.
- A local AI model runs on the learner's own PC. A cloud model with the learner's own key is an alternative.
- One installer. Python, the model runner and everything else ship inside it. The only download is the AI model on first launch.
- Everything the app writes goes into the folder the user chose at install time.

Hard rules that apply to every line of content and code:

1. Nothing branded or copyrighted in lesson content. Every name, story and dataset is invented.
2. No lesson needs the internet except lessons 91 and 92.
3. The app works with no AI model at all. The tutor then falls back to hand-written messages. Nothing may crash or block because a model is missing.
4. The app never writes outside its own folder (see section 10).

## 2. Stack

| Part | Choice |
|---|---|
| Shell | Electron, main process in TypeScript |
| Build | electron-vite, electron-builder (NSIS installer) |
| Interface | React 18 + TypeScript, plain CSS with design tokens (CSS custom properties). No CSS framework |
| State | Zustand |
| Editor | Monaco |
| Learner's Python | CPython embeddable build for Windows, shipped in `resources/python/` with `requests` and `pytest`. In development, the system `python3` |
| Git | Portable Git for Windows, shipped in `resources/git/`. In development, the system `git` |
| Model runner | llama.cpp `llama-server` (Vulkan build), shipped in `resources/llama/` |
| Tests | Vitest for TypeScript, pytest for the Python side, Playwright against the renderer with a mock bridge |

## 3. Repository layout and ownership

Each top-level area has one owner during the parallel build. Do not edit files outside your area. If you need a change elsewhere, say so in your final report.

```
docs/                         spec and plans (lead)
src/shared/                   types, IPC contract, constants (lead; frozen during the parallel build)
src/main/index.ts             app start-up, window, wiring (lead)
src/main/paths.ts             every file location the app uses (lead)
src/main/ipc.ts               registers IPC handlers by calling the services (lead)
src/main/python/              PythonRunner, AnalysisClient, CheckRunner, Tracer, TestRunner, Terminal, PracticeService (agent: python)
python/                       Python-side runtime: runner, analysis, checks, tracer, practice service (agent: python)
src/main/lessons/             LessonStore, ProgressStore, SettingsStore        (agent: lessons)
lessons/                      lesson content                                   (agent: lessons)
src/main/ai/                  providers, ModelManager, downloader, llama process (agent: ai)
src/main/tutor/               TutorEngine, prompts, guards                     (agent: ai)
resources/models/catalog.json model catalogue                                   (agent: ai)
src/preload/                  the bridge (lead)
src/renderer/                 the whole interface                              (agent: ui)
build/, scripts/, .github/    installer, fetch scripts, CI                     (agent: packaging)
tests/                        cross-cutting tests only; unit tests sit beside the code
```

## 4. Process model

- **Main process** owns everything that touches disk, processes or the network. Services are plain classes constructed in `src/main/index.ts` and handed their dependencies (no singletons, no globals), so they can be unit tested without Electron.
- **Preload** exposes one object, `window.api`, typed as `Api` from `src/shared/ipc.ts`. Context isolation on, node integration off, sandbox on.
- **Renderer** only talks to `window.api`. It never imports from `src/main`. For tests and for running in a plain browser, `src/renderer/src/mockApi.ts` provides a full in-memory `Api`.

## 5. Shared contract

The authoritative definitions are `src/shared/types.ts` and `src/shared/ipc.ts`. Summary:

```ts
// ---------- lessons
type LessonType = 'learn' | 'skill' | 'fix' | 'read' | 'build';
type StepKind = 'recall' | 'predict' | 'run' | 'investigate' | 'modify' | 'make' | 'info';
type QuestionKind = 'choice' | 'text' | 'order' | 'trace' | 'spot' | 'code' | 'terminal' | 'none';

interface LessonSummary { id: string; number: number; slug: string; title: string; stage: number;
  stageTitle: string; type: LessonType; minutes: number; newIdea: string; online: boolean; optional: boolean; }

interface Lesson extends LessonSummary {
  guideMarkdown: string;
  steps: Step[];
  starterFiles: CodeFile[];          // first one opens in the editor
  dataFiles: string[];               // names under files/
  taught: string[];                  // ideas the learner has met, including this lesson
  notYetTaught: string[];            // ideas the tutor must not use
}

interface Step { id: string; kind: StepKind; title: string; bodyMarkdown: string;
  question: Question; checkId?: string; }          // checkId -> a group in checks.py

type Question =
  | { kind: 'none' }
  | { kind: 'choice'; prompt: string; options: { id: string; text: string; feedback: string }[]; correctId: string }
  | { kind: 'text'; prompt: string; accept: string[]; caseSensitive?: boolean; feedbackWrong: string }
  | { kind: 'order'; prompt: string; lines: string[]; solution: number[] }   // put the lines in order
  | { kind: 'trace'; prompt: string; code: string; variables: string[]; rows: { line: number; values: Record<string,string> }[] }  // fill in a variable table
  | { kind: 'spot'; prompt: string; code: string; faultyLines: number[]; feedback: string }                                    // click the faulty line
  | { kind: 'code'; prompt: string }                                          // write code, judged by checks
  | { kind: 'terminal'; prompt: string };                                     // type commands in the terminal panel, judged by checks

interface CodeFile { name: string; content: string; }

// ---------- running code
interface RunRequest { lessonId: string | null; files: CodeFile[]; entry: string; args?: string[]; env?: Record<string,string>; }
type RunEvent =
  | { type: 'started'; runId: string }
  | { type: 'stdout' | 'stderr'; runId: string; text: string }
  | { type: 'input-requested'; runId: string }
  | { type: 'exit'; runId: string; code: number | null; signal: string | null; durationMs: number; error?: PythonError };
interface PythonError { type: string; message: string; line: number | null; file: string | null; traceback: string; friendly: string; }

// ---------- line-by-line runner
interface TraceStep { line: number; file: string; event: 'line' | 'call' | 'return' | 'exception'; variables: Record<string,string>; stdout: string; depth: number; }
interface TraceResult { steps: TraceStep[]; truncated: boolean; error?: PythonError; }

// ---------- tests panel
interface TestRunResult { tests: { name: string; outcome: 'passed' | 'failed' | 'error'; message: string; line: number | null }[]; durationMs: number; raw: string; }

// ---------- terminal panel (a controlled command runner, not a full shell)
type TerminalEvent = { type: 'output'; id: string; text: string } | { type: 'exit'; id: string; code: number | null; cwd: string };

// ---------- practice service (section 9a)
interface PracticeServiceStatus { running: boolean; baseUrl: string | null; mode: 'normal' | 'slow' | 'off' | 'needs-key'; }

// ---------- instant analysis (no AI)
interface Diagnostic { line: number; column: number; endLine: number; endColumn: number;
  severity: 'error' | 'warning' | 'hint'; code: string; message: string; friendly: string; }

// ---------- checks
interface CheckResult { passed: boolean; checkId: string; tests: { name: string; passed: boolean; message: string }[];
  durationMs: number; error?: string; }

// ---------- tutor
type TutorTrigger = 'idle' | 'run-failed' | 'run-ok' | 'check-failed' | 'check-passed' | 'question' | 'hint-small' | 'hint-big';
interface TutorMessage { id: string; at: number; trigger: TutorTrigger; source: 'ai' | 'prepared' | 'analysis';
  text: string; line?: number; streaming?: boolean; }
interface EditorSnapshot { lessonId: string | null; stepId: string | null; file: string; code: string;
  cursorLine: number; recentEdits: EditEvent[]; }
interface EditEvent { at: number; kind: 'insert' | 'delete'; line: number; text: string; }

// ---------- AI
type ProviderId = 'none' | 'local' | 'openai' | 'anthropic' | 'gemini' | 'openai-compatible' | 'mock';
interface ModelEntry { id: string; name: string; tier: 'small' | 'medium' | 'large'; minVramMb: number;
  fileName: string; url: string; sizeBytes: number; sha256: string; licence: string; contextSize: number; chatTemplate?: string; }
interface HardwareInfo { gpus: { name: string; vramMb: number | null; vendor: string }[]; ramMb: number; cpu: string; recommendedTier: 'small'|'medium'|'large'|'none'; }
interface ModelStatus { provider: ProviderId; modelId: string | null; state: 'not-set-up' | 'downloading' | 'starting' | 'ready' | 'error';
  message?: string; download?: { receivedBytes: number; totalBytes: number; bytesPerSecond: number }; }

// ---------- settings and progress
interface Settings { theme: 'light' | 'dark' | 'system'; accent: string; editorFontSize: number; uiScale: number;
  wordWrap: boolean; reducedMotion: boolean; highContrast: boolean;
  tutor: { enabled: boolean; idleSeconds: number; minGapSeconds: number; speakOnRunFailure: boolean };
  ai: { provider: ProviderId; modelId: string | null; apiKeyStored: boolean; baseUrl?: string; cloudModel?: string };
  layout: { sidebarWidth: number; consoleWidth: number; tutorWidth: number; sidebarCollapsed: boolean; tutorCollapsed: boolean; consolePosition: 'right' | 'bottom' };
  profileId: string; onboardingDone: boolean; }
interface LessonProgress { lessonId: string; started: boolean; passed: boolean; stepsDone: string[]; attempts: number;
  hintsUsed: { small: number; big: number; answer: number }; secondsSpent: number; lastOpened: number; code: Record<string,string>; notes: string; bookmarked: boolean; }
```

`Api` (every method returns a Promise; `on…` methods return an unsubscribe function):

```ts
interface Api {
  app:      { info(): Promise<AppInfo>; openDataFolder(): Promise<void>; exportBackup(): Promise<string|null>; importBackup(): Promise<boolean>; }
  settings: { get(): Promise<Settings>; set(patch: DeepPartial<Settings>): Promise<Settings>; onChanged(cb): Unsub; }
  profiles: { list(): Promise<Profile[]>; create(name: string): Promise<Profile>; switchTo(id: string): Promise<void>; rename(id, name): Promise<void>; remove(id): Promise<void>; }
  lessons:  { list(): Promise<LessonSummary[]>; get(id: string): Promise<Lesson>; solution(id: string): Promise<CodeFile[]>; dataFile(id, name): Promise<string>; }
  progress: { all(): Promise<LessonProgress[]>; get(id): Promise<LessonProgress>; update(id, patch): Promise<LessonProgress>; reset(id): Promise<LessonProgress>; }
  python:   { run(req: RunRequest): Promise<string /*runId*/>; sendInput(runId, text): Promise<void>; stop(runId): Promise<void>; onEvent(cb: (e: RunEvent) => void): Unsub;
              analyse(code: string, lessonId: string | null): Promise<Diagnostic[]>;
              trace(req: RunRequest, inputs: string[]): Promise<TraceResult>;
              runTests(lessonId: string | null, files: CodeFile[]): Promise<TestRunResult>; }
  terminal: { run(lessonId: string | null, commandLine: string): Promise<string /*id*/>; stop(id: string): Promise<void>; cwd(lessonId: string | null): Promise<string>;
              reset(lessonId: string | null): Promise<void>; onEvent(cb: (e: TerminalEvent) => void): Unsub; }
  practice: { status(): Promise<PracticeServiceStatus>; setMode(mode: PracticeServiceStatus['mode']): Promise<PracticeServiceStatus>; onStatus(cb): Unsub; }
  checks:   { run(lessonId: string, checkId: string, files: CodeFile[]): Promise<CheckResult>; }
  tutor:    { notifyEdit(s: EditorSnapshot): void; notifyRun(lessonId, e: RunEvent): void; notifyCheck(lessonId, r: CheckResult): void;
              ask(lessonId: string | null, question: string, s: EditorSnapshot): Promise<void>;
              hint(lessonId: string, stepId: string, size: 'small' | 'big', s: EditorSnapshot): Promise<void>;
              onMessage(cb: (m: TutorMessage) => void): Unsub; onMessageDelta(cb: (id: string, text: string) => void): Unsub;
              rate(id: string, good: boolean): void; clear(): void; }
  ai:       { hardware(): Promise<HardwareInfo>; catalogue(): Promise<ModelEntry[]>; status(): Promise<ModelStatus>; onStatus(cb): Unsub;
              useLocal(modelId: string): Promise<void>; useOwnFile(): Promise<boolean>; cancelDownload(): Promise<void>;
              useCloud(provider: ProviderId, key: string, opts?: { baseUrl?: string; model?: string }): Promise<{ ok: boolean; message: string }>;
              useNone(): Promise<void>; removeModel(modelId: string): Promise<void>; }
}
```

## 6. Lesson format

One folder per lesson under `lessons/`, named `NNN-slug` (three-digit number).

```
lessons/index.json            { "stages": [{ "number": 1, "title": "First programs" }, ...] }
lessons/001-hello-world/
  lesson.json                 metadata (see below)
  guide.md                    the text for the left sidebar, plain Markdown
  steps.json                  the steps, in order
  starter.py                  what the editor opens with (more files allowed: list them in lesson.json)
  solution.py                 a model answer for the Make step
  checks.py                   automatic checks (section 7)
  hints.json                  { "<stepId>": { "small": "...", "big": "..." } }
  tutor.json                  common mistakes for this lesson (section 8)
  files/                      data the lesson needs
```

`lesson.json`:

```json
{ "number": 1, "title": "Hello, world", "stage": 1, "type": "learn", "minutes": 15,
  "newIdea": "print(), printing several things at once, running a program, the main panels",
  "online": false, "optional": false,
  "starterFiles": ["starter.py"],
  "introduces": ["print"],
  "notYetTaught": "auto" }
```

`introduces` is a list of idea keys from `lessons/ideas.json` (the single vocabulary of ideas, each with the Python names it covers, for example `"for-loop": { "label": "for loops", "ast": ["For"], "names": ["range"] }`). `taught` for a lesson is the union of `introduces` over all lessons up to and including it. `notYetTaught: "auto"` means everything else in `ideas.json`.

`steps.json`: an array of `Step` objects as in section 5. A Learn lesson has the six steps in this order: `recall`, `predict`, `run`, `investigate`, `modify`, `make`. Lesson 1 has no `recall`. Other lesson types use whatever steps suit them and always end with a step that has a `checkId`.

Writing rules for lesson text: age 11 and up, plain words, short sentences, British spelling, no brands, no real people, no slang that will date. Every code sample must run. Labels on worked examples ("get the input", "work it out", "show the result") are reused word for word across lessons.

Lesson QA (automated, runs in CI): the solution passes every check group; the starter fails the `make` group; `steps.json` validates against the schema; every `checkId` exists in `checks.py`; solution and starter use only ideas in `taught` (checked by walking the AST against `ideas.json`); no banned words (a small list of brand and franchise names in `tests/banned_words.txt`).

## 7. Checks

`checks.py` is ordinary Python that the CheckRunner executes with the bundled interpreter. It uses one helper module, `pylearn_checks`, that ships in `python/pylearn_checks/`.

```python
from pylearn_checks import group, expect

@group("make")
def make(t):
    r = t.run(inputs=["Sam", "chess"])           # run the learner's entry file with scripted answers
    expect(r.ok, "Your program stopped with an error. Run it and read the last line of the message.")
    expect(r.asked == 2, "Ask two questions with input().")
    expect("Sam" in r.out, "Use the name the person typed in your greeting.")
```

Helper API:

- `t.run(inputs=[], args=[], env={}, files={}, timeout=5, seed=1234, today="2026-01-15")` runs the learner's code in a fresh subprocess inside a temporary copy of the lesson folder. Returns `r` with `ok`, `out` (stdout), `err`, `lines` (stdout split), `asked` (number of `input()` calls), `prompts` (their prompt strings), `error` (type name or `None`), `files` (dict of files written).
- `t.source` is the learner's code as text. `t.tree` is its AST. `t.uses("for-loop")` is true if the code uses that idea key.
- `t.call("function_name", *args, **kwargs)` imports the learner's file with stdin blocked and calls a function. `t.has_function("name")`.
- `expect(condition, message)` records a pass or a fail with a message written for the learner. Messages never contain the solution.
- Random numbers are seeded and `datetime` "today" is fixed inside `t.run`, so results repeat.
- Output matching is loose by default: helpers `r.says("text")` (case-insensitive, whitespace-collapsed) and `r.number_in_output(42)`.

CheckRunner protocol: `python -m pylearn_checks.cli --lesson <dir> --group <id> --work <dir with learner files>` prints one JSON object matching `CheckResult` on stdout. Hard time limit 20 seconds per group, enforced by the main process.

## 8. The tutor

Three layers, in this order. Each one works without the next.

1. **Analysis (instant, no AI).** `python/analysis_server.py` is a long-lived process speaking JSON lines. For each code snapshot it returns `Diagnostic[]`: syntax errors with exact positions, unclosed brackets and quotes, bad indentation, names that are never defined (with a "did you mean" from names that are), `=` used where `==` was meant, a function called without brackets, `print` of a function that returns nothing. Each has a `friendly` explanation in plain words. The editor underlines these as you type (debounced 300 ms).
2. **Prepared messages (no AI).** `tutor.json` lists the lesson's common mistakes: `{ "id", "when": { ... }, "say": "...", "sayAgain": "..." }`. `when` is a small matcher: `diagnosticCode`, `errorType`, `sourceRegex`, `usesIdea`, `missingIdea`, `outputRegex`, `checkFailed`, combined with `all` / `any` / `not`. First match wins.
3. **AI.** If a model is ready, the engine asks it for one short comment, giving it: the lesson title and task, the `taught` and `notYetTaught` lists, the matched prepared message if any (as the fact to convey), the diagnostics, the code, a summary of recent typing and deleting, and the last run or check result. The reply is streamed.

Rules the engine enforces in code (not only in the prompt):

- Speaks when the learner has been idle for `idleSeconds` (default 2), the code has changed since the last comment, and at least `minGapSeconds` (default 10) have passed. Speaks immediately after a failed run if `speakOnRunFailure`. Never speaks while keys are being pressed. Cancels a reply that is still streaming if the learner starts typing.
- One issue per comment. Two sentences at most for unprompted comments. No praise padding.
- Never outputs the solution. Any reply is scanned: code blocks are removed from unprompted comments and small hints; a reply too similar to `solution.py` (token overlap above a threshold) is replaced by the prepared message.
- Never mentions an idea in `notYetTaught`. A reply that does is replaced by the prepared message.
- Question box: answers about the current lesson and code only. Anything else gets one fixed, friendly redirect. Same no-solution rule.
- Small hint and big hint come from `hints.json`. With a model, the wording may be adapted to the learner's code; without one, the text is shown as written. Give answer shows `solution.py` in a read-only view, never pastes it into the editor, and records it in progress.
- Repeats: the same prepared message is not shown twice in a row; second time uses `sayAgain`; after that the tutor stays quiet on that point until the code changes.

Prompts live in `src/main/tutor/prompts.ts`. They are written for small models: short, with the rules first and the facts in a fixed order.

## 9. AI providers and models

`Provider` interface: `chat(messages, { maxTokens, temperature, signal }): AsyncIterable<string>` and `test(): Promise<{ ok, message }>`.

- `local`: spawns `llama-server` on `127.0.0.1` with a free port and talks to its OpenAI-compatible endpoint. GPU layers on by default, falling back to CPU if start-up fails. Context size from the catalogue. Stopped when the app quits.
- `openai`, `anthropic`, `gemini`, `openai-compatible`: the learner's own key. The key is stored with Electron `safeStorage` in the data folder, never in settings JSON and never logged. A plain warning is shown before a key is saved: it may be slower, it costs money per message, and the code being typed is sent to that company.
- `mock`: deterministic replies, for tests and development.
- `none`: prepared messages only.

ModelManager: reads `resources/models/catalog.json`; detects hardware (GPU names and VRAM through `wmic`/PowerShell CIM on Windows, with graceful failure); recommends a tier leaving headroom (model file at most about 60% of VRAM: small up to 4 GB cards, medium 8 GB, large 12 GB and up); downloads into `data/models/` with resume, progress events and SHA-256 verification; lets the user pick any tier, cancel, delete a model, or point at their own `.gguf` file.

## 9a. Terminal, practice service, Git

- **Terminal panel.** Not a real shell. A command runner in the main process that accepts a fixed set of commands and runs them in the lesson's working folder: `python`, `pytest`, `git`, `pip list`, `cd`, `dir`/`ls`, `cls`/`clear`, `type`/`cat`. Anything else gets a friendly "that command isn't available here". `python` and `pytest` resolve to the bundled interpreter, `git` to the bundled Git. No command may leave the lesson's folder (paths are resolved and checked). Used from lesson 83.
- **Practice service.** `python/practice_service/` is a small HTTP server on `127.0.0.1` (free port, started on demand by the main process, never bound to other interfaces). It serves invented data only: weather stations on a made-up island, exchange rates between made-up currencies, a register of made-up clubs that changes between snapshots. Modes: normal, slow, off, needs-key. Learner code finds it through the environment variable `PRACTICE_URL`, which the app sets for every run. Used from lesson 79.
- **Git.** A portable Git ships in `resources/git/`. The app sets a local learner identity for lesson repositories. Git lessons start from a supplied folder and are checked by inspecting the repository (commit count, tracked files, branches, remotes). Lessons 91 and 92 are the only ones that touch the internet; 91 falls back to a bundled copy, 92 is optional.
- **Line-by-line runner.** `python/tracer.py` runs a program under `sys.settrace` with scripted inputs and returns each executed line with the values of the variables, capped at 2,000 steps. The interface steps through the result with a variable table.
- **Tests panel.** Runs `pytest` on the learner's files and shows each test as passed or failed with its message.

## 10. Where files live

`src/main/paths.ts` is the only place that builds paths.

- Installed app: `<install dir>/` holds the program; `<install dir>/data/` holds everything written at run time (settings, profiles, progress, models, logs, cache, scratch). `app.setPath('userData', ...)` and the session cache are pointed there before the app is ready.
- Development: `./.devdata/`.
- Installer: NSIS, per-user, lets the user choose the folder. The default is `C:\Users\<name>\Py Learn`, so no admin rights are needed and the folder is easy to find. Creates a Start menu and desktop shortcut. Uninstall removes the program and asks before deleting `data/`.
- Learner code for a lesson is stored in progress (`LessonProgress.code`) and written to `data/scratch/<profile>/<lesson>/` only while running.

## 11. Interface

The look: modern, calm, uncluttered. Generous spacing, clear type hierarchy, rounded panels, soft shadows, smooth but short transitions. It must look equally finished in light and dark.

Layout (matches the owner's sketch): left sidebar (lesson guide and steps), editor in the centre with file tabs, console to its right, tutor panel on the far right. A slim top bar holds the lesson title, Run, Stop, Check, the three hint buttons, and the theme switch. Every divider drags to resize, panels collapse, and the layout is remembered.

Theme: light, dark and "match Windows", switched from the top bar and from Settings, applied instantly without a restart, including the Monaco editor and the console. Colours come only from tokens in `src/renderer/src/styles/tokens.css`. Both themes meet WCAG AA contrast.

Required screens and parts: first-run welcome and model setup; lesson map (all 100 lessons by stage, ticks, search, "continue where you left off"); lesson view; playground (free coding with the tutor, no lesson); settings; model manager; profile switcher; shortcut cheat sheet; command palette.

## 12. Quality-of-life features (all in version 1)

Editor and running
- Run with Ctrl+Enter, Stop with Ctrl+. , Check with Ctrl+Shift+Enter. All shortcuts listed in a cheat sheet (press `?`).
- Auto-save of every keystroke per lesson and per profile. "Reset to starter" with undo. "Restore my last passing version".
- Bracket matching and colouring, auto-indent, auto-closing quotes and brackets, indent guides, word wrap toggle, font size with Ctrl + and Ctrl -.
- Inline underlines with plain-English explanations on hover. Error lines from a run are highlighted in the editor and clicking the error jumps to the line.
- Console: live output, `input()` typed straight into the console, Stop, clear, copy all, run time shown, output capped so a runaway loop can't freeze the app.
- Friendly explanation above every Python error, with the original error one click away.

Learning
- Lesson map with progress, search and filters (type, stage, bookmarked, not done).
- "What I've learned" cheat sheet that grows as lessons are passed, with a one-line reminder and a tiny example per idea.
- Notes per lesson. Bookmarks.
- Playground mode for free coding.
- Give answer never pastes into the editor.
- Gentle completion moment when a lesson passes (subtle, respects reduced motion). No streaks, no timers, no leaderboards.

Tutor
- Slider for how often it speaks, a mute button, and a history of what it said in this lesson.
- Thumbs up or down on any comment (stored locally, used to tune the prepared messages later).
- Works with no model. A banner says so and offers setup.

App
- Light, dark and system themes. Accent colour choice. Interface scale. High-contrast option. Reduced motion.
- Several learner profiles on one PC, each with its own progress and settings.
- Backup and restore of progress to a single file.
- "Open my data folder". A local log file for troubleshooting. No telemetry, no accounts, no network calls except the model download, the two GitHub lessons and a cloud model if the user adds a key.
- Remembers window size, position and the last lesson.
- Full keyboard access, visible focus, labels for screen readers.

## 13. Testing

- Every service has unit tests beside it (`*.test.ts`). Python code has pytest tests under `python/tests/`.
- The renderer is tested with Playwright against `vite` serving the renderer with `mockApi`. Screenshots of the main screens in both themes are saved to `tests/screenshots/` and looked at by a person or agent before a release.
- `npm test` runs everything that can run on Linux. CI also builds the Windows installer and runs a smoke test that starts the packaged app and runs lesson 1's solution through the checker.

## 14. Build order

There is one release: the complete app. The order below is how it gets built, not a series of releases.

1. Skeleton and contracts.
2. The engine, in parallel: Python runtime and checker; lesson engine and QA tooling; tutor and AI layer; the interface; installer and CI.
3. Lessons 1 and 2 written as the reference standard and reviewed.
4. Lessons 3 to 100, written in parallel by stage against the lesson plan, every one passing lesson QA.
5. Integration, full test run, screenshots reviewed in both themes, independent review of lesson content against the hard rules.
6. Windows installer built on GitHub and smoke-tested there.
7. Tuning on real hardware: model choice per tier, prompts, timing.

## 15. Decisions made while scaffolding

These are part of the contract. They are marked `SPEC-EXT` in the code where they add to section 5.

- `Api.lessons.ideas(): Promise<Idea[]>` and the `Idea` type, for the "What I've learned" sheet.
- `LessonProgress.passedCode?`, for "Restore my last passing version".
- `ModelStatus.installed?: string[]`, so the model manager knows which models are on disk.
- `BackupService` (factory in `src/main/lessons`) implements backup export and import.
- `LessonService` also has `hints(id)`, `tutorRules(id)` and `ideaList()`.
- `SecretStore` and `Dialogs` interfaces (implemented in `src/main/host.ts`) keep Electron out of the services.
- A lesson's `id` is its folder name (`001-hello-world`); `slug` is the part after the number.
- A Step holds one Question. Several recall questions are several steps of kind `recall`.
- Profiles: `data/profiles.json` holds the list and the active id; settings and progress are per profile under `data/profiles/<id>/`.
- `progress.update` replaces each top-level field given; `settings.set` deep-merges.
- `sendInput` text has no trailing newline; the service adds it. Run events can arrive before `python.run()` resolves; key on `runId`.
- `TraceStep.stdout` is the text printed during that step, not cumulative.
- Diagnostic positions are 1-based with an exclusive end. Canonical codes are in `DIAGNOSTIC_CODES`.
- `tutor.json` is a top-level array; `sayAgain` is required; keys in one `when` object are ANDed; `checkFailed` is a group id or `"*"`; regexes use JavaScript syntax.
- `ideas.json` entries have `label` plus optional `ast`, `names`, `attrs`, `modules`, `reminder`, `example`. Key order is teaching order.
- `lesson.json` has optional `solutionFiles` (default `["solution.py"]`) and `allowUntaught` (lessons 49 and 94).
- Schemas are strict. The last step must have a `checkId`; `code` and `terminal` questions must have one.
- `Settings.accent` is a key from `ACCENT_KEYS`, not a hex value.
- Installed layout: `<install>/resources/{python,git,llama,models,lessons,pyruntime}`. The repo's `python/` ships as `pyruntime`.
- All npm packages are devDependencies; the build bundles everything into `out/`.
- Verified download links, hashes and launch flags are in `docs/DOWNLOADS.md`.
