// Boots the BUILT app (out/) and proves the main -> preload -> renderer chain works.
//
//   npm run smoke          builds first, then runs this
//
// The main process sees PYLEARN_SMOKE=1, loads the window, runs a probe inside the page
// (window.api present, lessons listed, a real Python run streamed back, something rendered),
// prints "BOOT_OK {...}" and quits. This script also checks that the app wrote only inside
// its data folder. On Linux without a display it runs under xvfb-run.

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import electronPath from 'electron';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TIMEOUT_MS = 120_000;

function fail(message) {
  console.error(`SMOKE FAILED: ${message}`);
  process.exitCode = 1;
}

if (!existsSync(join(root, 'out/main/index.js')) || !existsSync(join(root, 'out/renderer/index.html'))) {
  fail('out/ is missing. Run "npm run build" first (or use "npm run smoke", which builds).');
  process.exit(1);
}

const dataDir = mkdtempSync(join(tmpdir(), 'pylearn-smoke-'));

// Places Electron would write to if paths.ts had not redirected it.
const strayDirs = [
  join(homedir(), '.config', 'Py Learn'),
  join(homedir(), '.config', 'py-learn-ide'),
  join(homedir(), '.config', 'Electron'),
  join(homedir(), 'AppData', 'Roaming', 'Py Learn'),
  join(homedir(), 'AppData', 'Roaming', 'py-learn-ide'),
];
const strayBefore = new Set(strayDirs.filter((dir) => existsSync(dir)));

const electronArgs = ['.'];
// Chromium refuses to run as root with its sandbox on (containers, CI).
if (process.platform === 'linux' && process.getuid?.() === 0) electronArgs.push('--no-sandbox');
if (process.platform === 'linux') electronArgs.push('--disable-gpu', '--disable-dev-shm-usage');

const headless = process.platform === 'linux' && !process.env.DISPLAY;
const command = headless ? 'xvfb-run' : electronPath;
const args = headless ? ['-a', electronPath, ...electronArgs] : electronArgs;

const child = spawn(command, args, {
  cwd: root,
  env: { ...process.env, PYLEARN_SMOKE: '1', PYLEARN_DATA_DIR: dataDir, ELECTRON_DISABLE_SECURITY_WARNINGS: '1' },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let stdout = '';
let stderr = '';
child.stdout.on('data', (chunk) => {
  stdout += chunk;
});
child.stderr.on('data', (chunk) => {
  stderr += chunk;
});

const timer = setTimeout(() => {
  fail(`no result after ${TIMEOUT_MS / 1000} s`);
  child.kill('SIGKILL');
}, TIMEOUT_MS);

child.on('error', (error) => {
  clearTimeout(timer);
  fail(`could not start Electron: ${error.message}`);
});

child.on('close', (code) => {
  clearTimeout(timer);
  const okLine = stdout.split('\n').find((line) => line.startsWith('BOOT_OK'));
  const failLine = stdout.split('\n').find((line) => line.startsWith('BOOT_FAIL'));

  if (failLine) fail(failLine);
  else if (!okLine) fail(`the app exited with code ${code} without printing BOOT_OK`);
  else if (code !== 0) fail(`BOOT_OK was printed but the exit code was ${code}`);

  if (!existsSync(join(dataDir, 'logs', 'app.log'))) fail('no log file was written to <data>/logs/app.log');
  if (!existsSync(join(dataDir, 'profiles.json'))) fail('no profiles.json was written to the data folder');
  const strayAfter = strayDirs.filter((dir) => existsSync(dir) && !strayBefore.has(dir));
  if (strayAfter.length) fail(`the app wrote outside its data folder: ${strayAfter.join(', ')}`);

  if (process.exitCode) {
    console.error('--- stdout ---\n' + stdout.trim());
    console.error('--- stderr (last 40 lines) ---\n' + stderr.trim().split('\n').slice(-40).join('\n'));
  } else {
    console.log(okLine);
    console.log(`data folder contents: ${readdirSync(dataDir).sort().join(', ')}`);
    console.log('SMOKE PASSED');
  }
  rmSync(dataDir, { recursive: true, force: true, maxRetries: 3 });
});
