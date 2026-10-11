// Small file helpers shared by the services. No Electron imports.

import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { CodeFile } from '@shared/types';
import { isInside } from './paths';

/** Read and parse a JSON file. Returns `fallback` if the file is missing or not valid JSON. */
export function readJsonFile<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

/** Read and parse a JSON file. Throws with the file name in the message on any failure. */
export function readJsonFileStrict(file: string): unknown {
  let raw: string;
  try {
    raw = readFileSync(file, 'utf8');
  } catch (error) {
    throw new Error(`Cannot read ${file}: ${(error as Error).message}`);
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch (error) {
    throw new Error(`${file} is not valid JSON: ${(error as Error).message}`);
  }
}

/** Write JSON so that a crash mid-write cannot leave a half-written file:
 *  write to a temporary file beside it, then rename over the target. */
export function writeJsonFileAtomic(file: string, value: unknown): void {
  mkdirSync(dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  try {
    writeFileSync(temp, JSON.stringify(value, null, 2) + '\n', 'utf8');
    renameSync(temp, file);
  } catch (error) {
    rmSync(temp, { force: true });
    throw error;
  }
}

/** Write a set of code files into `dir`, creating sub-folders as needed.
 *  Throws if any file name would land outside `dir`. */
export function writeCodeFiles(dir: string, files: readonly CodeFile[]): void {
  mkdirSync(dir, { recursive: true });
  for (const file of files) {
    const target = resolve(dir, file.name);
    if (!isInside(dir, target) || target === resolve(dir)) {
      throw new Error(`File name leaves its folder: ${JSON.stringify(file.name)}`);
    }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.content, 'utf8');
  }
}
