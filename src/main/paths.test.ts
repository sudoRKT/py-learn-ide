import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { assertSafeSegment, createPaths, isInside } from './paths';

const temp = mkdtempSync(join(tmpdir(), 'pylearn-paths-'));
afterAll(() => rmSync(temp, { recursive: true, force: true }));

describe('Paths in development', () => {
  const paths = createPaths({ packaged: false, appDir: '/repo', platform: 'linux' });

  it('keeps run-time data in ./.devdata', () => {
    expect(paths.dataDir).toBe(resolve('/repo/.devdata'));
    expect(paths.logsDir).toBe(join(paths.dataDir, 'logs'));
    expect(paths.modelsDir).toBe(join(paths.dataDir, 'models'));
    expect(paths.scratchRoot).toBe(join(paths.dataDir, 'scratch'));
    expect(paths.profilesFile).toBe(join(paths.dataDir, 'profiles.json'));
  });

  it('uses the system python and git, and the repo folders', () => {
    expect(paths.pythonExe).toBe('python3');
    expect(paths.gitExe).toBe('git');
    expect(paths.lessonsDir).toBe(resolve('/repo/lessons'));
    expect(paths.pythonRuntimeDir).toBe(resolve('/repo/python'));
    expect(paths.resourcesDir).toBe(resolve('/repo/resources'));
    expect(paths.modelCatalogueFile).toBe(resolve('/repo/resources/models/catalog.json'));
    expect(paths.llamaServerExe).toBe(resolve('/repo/resources/llama/llama-server'));
  });

  it('calls the interpreter "python" on Windows in development', () => {
    expect(createPaths({ packaged: false, appDir: '/repo', platform: 'win32' }).pythonExe).toBe('python');
  });
});

describe('Paths in the installed app', () => {
  const paths = createPaths({
    packaged: true,
    appDir: '/install',
    resourcesDir: '/install/resources',
    platform: 'win32',
  });

  it('keeps run-time data in <install dir>/data', () => {
    expect(paths.dataDir).toBe(resolve('/install/data'));
    expect(paths.electronDataDir).toBe(join(paths.dataDir, 'electron'));
    expect(paths.cacheDir).toBe(join(paths.dataDir, 'cache'));
  });

  it('uses the bundled python, git, llama and lessons', () => {
    expect(paths.pythonExe).toBe(join(resolve('/install/resources'), 'python', 'python.exe'));
    expect(paths.gitExe).toBe(join(resolve('/install/resources'), 'git', 'cmd/git.exe'));
    expect(paths.llamaServerExe).toBe(join(resolve('/install/resources'), 'llama', 'llama-server.exe'));
    expect(paths.lessonsDir).toBe(resolve('/install/resources/lessons'));
    expect(paths.pythonRuntimeDir).toBe(resolve('/install/resources/pyruntime'));
  });

  it('puts every writable location inside the data folder', () => {
    const writable = [
      paths.logsDir, paths.modelsDir, paths.scratchRoot, paths.cacheDir, paths.electronDataDir,
      paths.profilesDir, paths.profilesFile, paths.secretsFile, paths.windowStateFile,
      paths.settingsFile('default'), paths.progressFile('default'), paths.tutorRatingsFile('default'),
      paths.scratchDir('default', '001-hello-world'), paths.scratchDir('default', null), paths.modelFile('model-q4.gguf'),
    ];
    for (const location of writable) expect(paths.isInsideData(location), location).toBe(true);
    expect(paths.isInsideData(paths.lessonsDir)).toBe(false);
  });
});

describe('per-profile and scratch paths', () => {
  const paths = createPaths({ packaged: false, appDir: '/repo', dataDir: temp });

  it('builds scratch/<profile>/<lesson> and uses "playground" when there is no lesson', () => {
    expect(paths.scratchDir('default', '021-counting-and-totals')).toBe(join(temp, 'scratch', 'default', '021-counting-and-totals'));
    expect(paths.scratchDir('default', null)).toBe(join(temp, 'scratch', 'default', 'playground'));
  });

  it('refuses names that could escape their folder', () => {
    for (const bad of ['..', '../x', 'a/b', 'a\\b', '', '.hidden', 'x'.repeat(200), 'trailing.']) {
      expect(() => assertSafeSegment(bad), bad).toThrow();
      expect(() => paths.scratchDir(bad, null), bad).toThrow();
      expect(() => paths.lessonDir(bad), bad).toThrow();
    }
    expect(assertSafeSegment('001-hello-world')).toBe('001-hello-world');
  });

  it('resolveInside keeps learner-supplied paths in their folder', () => {
    const base = join(temp, 'scratch', 'default', 'playground');
    expect(paths.resolveInside(base, 'main.py')).toBe(join(base, 'main.py'));
    expect(paths.resolveInside(base, 'pkg/util.py')).toBe(join(base, 'pkg', 'util.py'));
    expect(() => paths.resolveInside(base, '../other/main.py')).toThrow();
    expect(() => paths.resolveInside(base, '/etc/passwd')).toThrow();
  });

  it('isInside handles look-alike sibling folders', () => {
    expect(isInside('/a/data', '/a/data/x')).toBe(true);
    expect(isInside('/a/data', '/a/data')).toBe(true);
    expect(isInside('/a/data', '/a/database')).toBe(false);
    expect(isInside('/a/data', '/a')).toBe(false);
  });

  it('ensureDataDirs creates the fixed folders', () => {
    paths.ensureDataDirs();
    for (const dir of [paths.logsDir, paths.modelsDir, paths.scratchRoot, paths.cacheDir, paths.electronDataDir, paths.profilesDir]) {
      expect(existsSync(dir), dir).toBe(true);
    }
  });
});
