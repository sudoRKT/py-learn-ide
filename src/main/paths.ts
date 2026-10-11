// Every file location the app uses (SPEC section 10). Nothing else in the code base may
// build a path to the data folder or to a bundled resource by hand.
//
// This file does not import Electron, so it works in unit tests. The Electron-specific part
// (finding the install folder, app.setPath) lives in src/main/electron-paths.ts.
//
// Layout
//
//   Development (repo checkout)            Installed app
//   ----------------------------------     ------------------------------------------------
//   <repo>/.devdata/            data       <install dir>/data/                 data
//   <repo>/lessons/             lessons    <install dir>/resources/lessons/
//   <repo>/python/              runtime    <install dir>/resources/pyruntime/
//   python3 (on PATH)           python     <install dir>/resources/python/python.exe
//   git (on PATH)               git        <install dir>/resources/git/cmd/git.exe
//   <repo>/resources/llama/     llama      <install dir>/resources/llama/llama-server.exe
//   <repo>/resources/models/    catalogue  <install dir>/resources/models/catalog.json
//
// (`<install dir>/resources` is Electron's process.resourcesPath. The installer's
// extraResources must copy: resources/python -> python, resources/git -> git,
// resources/llama -> llama, resources/models -> models, lessons -> lessons,
// python -> pyruntime.)
//
// Inside the data folder:
//
//   profiles.json                     the list of profiles and which one is active
//   profiles/<profileId>/settings.json
//   profiles/<profileId>/progress.json
//   profiles/<profileId>/tutor-ratings.jsonl
//   models/                           downloaded .gguf files (shared by all profiles)
//   scratch/<profileId>/<lessonId>/   learner code, only while running (playground: "playground")
//   logs/app.log
//   cache/                            Chromium session data (app.setPath('sessionData'))
//   electron/                         Electron's own userData
//   secrets.bin                       API key, encrypted with safeStorage
//   window.json                       window size and position

import { mkdirSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { PLAYGROUND_ID } from '@shared/constants';

export interface PathsOptions {
  /** True for the installed app, false in development and tests. */
  packaged: boolean;
  /** Development: the repository root. Installed: the folder that holds the exe. */
  appDir: string;
  /** Installed: Electron's process.resourcesPath. Development: leave out (`<appDir>/resources`). */
  resourcesDir?: string;
  /** Override the data folder (tests, and PYLEARN_DATA_DIR in development). */
  dataDir?: string;
  /** Defaults to process.platform. */
  platform?: NodeJS.Platform;
}

const SAFE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;

/** Throws unless `name` is safe to use as a single folder or file name. */
export function assertSafeSegment(name: string, what = 'name'): string {
  if (!SAFE_SEGMENT.test(name) || name.endsWith('.') || name.includes('..')) {
    throw new Error(`Unsafe ${what}: ${JSON.stringify(name)}`);
  }
  return name;
}

/** True if `child` is `parent` itself or somewhere inside it. Both are resolved first. */
export function isInside(parent: string, child: string): boolean {
  const rel = relative(resolve(parent), resolve(child));
  return rel === '' || (!rel.startsWith('..' + sep) && rel !== '..' && !isAbsolute(rel));
}

export class Paths {
  readonly packaged: boolean;
  readonly platform: NodeJS.Platform;

  /** Development: the repository root. Installed: the install folder. */
  readonly appDir: string;
  /** Bundled, read-only resources. */
  readonly resourcesDir: string;
  /** Everything written at run time. The app never writes outside this folder. */
  readonly dataDir: string;

  // ---- read-only locations
  readonly lessonsDir: string;
  readonly lessonIndexFile: string;
  readonly ideasFile: string;
  /** The Python-side runtime: runner, analysis server, tracer, pylearn_checks, practice service. */
  readonly pythonRuntimeDir: string;
  /** The interpreter that runs learner code. A bare command name in development. */
  readonly pythonExe: string;
  /** The Git that the terminal panel runs. A bare command name in development. */
  readonly gitExe: string;
  readonly llamaDir: string;
  readonly llamaServerExe: string;
  readonly modelCatalogueFile: string;

  // ---- inside the data folder
  readonly logsDir: string;
  readonly modelsDir: string;
  readonly scratchRoot: string;
  readonly cacheDir: string;
  readonly electronDataDir: string;
  readonly profilesDir: string;
  readonly profilesFile: string;
  readonly secretsFile: string;
  readonly windowStateFile: string;

  constructor(options: PathsOptions) {
    this.packaged = options.packaged;
    this.platform = options.platform ?? process.platform;
    const win = this.platform === 'win32';

    this.appDir = resolve(options.appDir);
    this.resourcesDir = resolve(options.resourcesDir ?? join(this.appDir, 'resources'));
    this.dataDir = resolve(options.dataDir ?? join(this.appDir, this.packaged ? 'data' : '.devdata'));

    if (this.packaged) {
      this.lessonsDir = join(this.resourcesDir, 'lessons');
      this.pythonRuntimeDir = join(this.resourcesDir, 'pyruntime');
      this.pythonExe = join(this.resourcesDir, 'python', win ? 'python.exe' : 'bin/python3');
      this.gitExe = join(this.resourcesDir, 'git', win ? 'cmd/git.exe' : 'bin/git');
    } else {
      this.lessonsDir = join(this.appDir, 'lessons');
      this.pythonRuntimeDir = join(this.appDir, 'python');
      this.pythonExe = win ? 'python' : 'python3';
      this.gitExe = 'git';
    }
    this.lessonIndexFile = join(this.lessonsDir, 'index.json');
    this.ideasFile = join(this.lessonsDir, 'ideas.json');
    this.llamaDir = join(this.resourcesDir, 'llama');
    this.llamaServerExe = join(this.llamaDir, win ? 'llama-server.exe' : 'llama-server');
    this.modelCatalogueFile = join(this.resourcesDir, 'models', 'catalog.json');

    this.logsDir = join(this.dataDir, 'logs');
    this.modelsDir = join(this.dataDir, 'models');
    this.scratchRoot = join(this.dataDir, 'scratch');
    this.cacheDir = join(this.dataDir, 'cache');
    this.electronDataDir = join(this.dataDir, 'electron');
    this.profilesDir = join(this.dataDir, 'profiles');
    this.profilesFile = join(this.dataDir, 'profiles.json');
    this.secretsFile = join(this.dataDir, 'secrets.bin');
    this.windowStateFile = join(this.dataDir, 'window.json');
  }

  /** Create the data folder and its fixed sub-folders. Safe to call more than once. */
  ensureDataDirs(): void {
    for (const dir of [
      this.dataDir, this.logsDir, this.modelsDir, this.scratchRoot, this.cacheDir,
      this.electronDataDir, this.profilesDir,
    ]) {
      mkdirSync(dir, { recursive: true });
    }
  }

  // ---- lessons (read-only)

  /** The folder of one lesson. `lessonId` is the folder name, e.g. "001-hello-world". */
  lessonDir(lessonId: string): string {
    return join(this.lessonsDir, assertSafeSegment(lessonId, 'lesson id'));
  }

  /** The files/ folder of one lesson (data the lesson needs). */
  lessonDataDir(lessonId: string): string {
    return join(this.lessonDir(lessonId), 'files');
  }

  // ---- per profile

  profileDir(profileId: string): string {
    return join(this.profilesDir, assertSafeSegment(profileId, 'profile id'));
  }

  settingsFile(profileId: string): string {
    return join(this.profileDir(profileId), 'settings.json');
  }

  progressFile(profileId: string): string {
    return join(this.profileDir(profileId), 'progress.json');
  }

  /** Thumbs up and down on tutor comments, one JSON object per line. */
  tutorRatingsFile(profileId: string): string {
    return join(this.profileDir(profileId), 'tutor-ratings.jsonl');
  }

  // ---- scratch (learner code while it runs)

  /** All scratch folders of one profile. */
  profileScratchDir(profileId: string): string {
    return join(this.scratchRoot, assertSafeSegment(profileId, 'profile id'));
  }

  /** The working folder for one lesson (or the playground when `lessonId` is null).
   *  Runs, checks, the tracer, the tests panel and the terminal all work in here. */
  scratchDir(profileId: string, lessonId: string | null): string {
    const leaf = lessonId === null ? PLAYGROUND_ID : assertSafeSegment(lessonId, 'lesson id');
    return join(this.profileScratchDir(profileId), leaf);
  }

  // ---- models

  /** Where a downloaded model file lives. `fileName` comes from the catalogue. */
  modelFile(fileName: string): string {
    return join(this.modelsDir, assertSafeSegment(fileName, 'model file name'));
  }

  // ---- safety helpers

  /** True if `target` is inside the data folder. */
  isInsideData(target: string): boolean {
    return isInside(this.dataDir, target);
  }

  /** Resolve `relativePath` against `baseDir` and throw if the result escapes `baseDir`.
   *  Use this for any path that comes from the learner (terminal `cd`, file names in a run). */
  resolveInside(baseDir: string, relativePath: string): string {
    const target = resolve(baseDir, relativePath);
    if (!isInside(baseDir, target)) {
      throw new Error(`Path leaves its folder: ${JSON.stringify(relativePath)}`);
    }
    return target;
  }
}

/** Build a Paths. Kept as a function so call sites read the same in tests and in the app. */
export function createPaths(options: PathsOptions): Paths {
  return new Paths(options);
}
