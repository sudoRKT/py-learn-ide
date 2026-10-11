// Enforces the import rules in CLAUDE.md, so a slip is caught by `npm test` and not in review.

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(path));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(path.split(sep).join('/'));
  }
  return out;
}

/** Every module specifier a file imports from (static, dynamic and require). */
function importsOf(file: string): string[] {
  // Comments are dropped first so that prose such as "never import 'electron'" does not count.
  const text = readFileSync(join(ROOT, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  const found: string[] = [];
  const patterns = [/\bfrom\s+['"]([^'"]+)['"]/g, /\bimport\s+['"]([^'"]+)['"]/g, /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g, /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g];
  for (const pattern of patterns) for (const match of text.matchAll(pattern)) found.push(match[1]!);
  return found;
}

const isTest = (file: string): boolean => /\.test\.tsx?$/.test(file);

describe('import rules', () => {
  it('the renderer never imports the main process, the preload, Electron or Node', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles('src/renderer').filter((f) => !isTest(f))) {
      for (const spec of importsOf(file)) {
        const resolved = spec.startsWith('.') ? relative(ROOT, join(ROOT, file, '..', spec)).split(sep).join('/') : spec;
        if (resolved.startsWith('src/main') || resolved.startsWith('src/preload') || spec === 'electron' || spec.startsWith('node:')) {
          offenders.push(`${file} imports ${spec}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('shared code imports nothing from Node, Electron, main or the renderer', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles('src/shared').filter((f) => !isTest(f))) {
      for (const spec of importsOf(file)) {
        if (spec === 'electron' || spec.startsWith('node:') || spec.includes('/main/') || spec.includes('/renderer/') || spec.startsWith('@renderer')) {
          offenders.push(`${file} imports ${spec}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('only the start-up files in src/main import Electron', () => {
    const allowed = new Set(['src/main/index.ts', 'src/main/host.ts', 'src/main/electron-paths.ts', 'src/main/window-state.ts']);
    const offenders = sourceFiles('src/main')
      .filter((file) => !allowed.has(file))
      .filter((file) => importsOf(file).includes('electron'));
    expect(offenders).toEqual([]);
  });

  it('the preload imports only Electron and shared code', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles('src/preload')) {
      for (const spec of importsOf(file)) {
        if (spec !== 'electron' && !spec.startsWith('@shared/')) offenders.push(`${file} imports ${spec}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
