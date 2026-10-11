// Python area: PythonRunner, AnalysisClient, CheckRunner, Tracer, TestRunner, Terminal,
// PracticeService. Owner: the "python" agent. See README.md in this folder.
//
// These are WORKING STUBS so the app boots today. Replace the bodies; keep the factory
// names and signatures (src/main/compose.ts and the tests call them).
//
// What the stubs do:
//   python.run       really runs the entry file with the development interpreter and streams
//                    stdout/stderr. It does NOT detect input() (no 'input-requested' event),
//                    does not build a PythonError, and does not set PRACTICE_URL.
//   python.analyse   resolves to []
//   python.trace     resolves to an empty result
//   python.runTests  resolves to no tests
//   checks.run       resolves to passed:false with error 'not implemented'
//   terminal.run     refuses every command with one line of output
//   practice         reports "not running"; ensureStarted() rejects

import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { nanoid } from 'nanoid';
import { LIMITS } from '@shared/constants';
import type { PracticeServiceStatus, RunEvent, TerminalEvent, Unsub } from '@shared/types';
import { Emitter } from '../emitter';
import { writeCodeFiles } from '../fs-util';
import type { ChecksService, PracticeService, PythonService, ServiceDeps, TerminalService } from '../services';

// ================================================================ python

export function createPythonService(deps: ServiceDeps['python']): PythonService {
  const { paths, profiles } = deps;
  const logger = deps.logger.child('python');
  const events = new Emitter<[RunEvent]>();
  const running = new Map<string, ChildProcessWithoutNullStreams>();

  return {
    async run(req) {
      if (!req.files.some((f) => f.name === req.entry)) {
        throw new Error(`The entry file "${req.entry}" is not among the files of this run.`);
      }
      const cwd = paths.scratchDir(profiles.current().id, req.lessonId);
      writeCodeFiles(cwd, req.files);

      const runId = nanoid(10);
      const startedAt = Date.now();
      const child = spawn(paths.pythonExe, ['-u', req.entry, ...(req.args ?? [])], {
        cwd,
        env: {
          ...process.env,
          PYTHONIOENCODING: 'utf-8',
          PYTHONUTF8: '1',
          PYTHONUNBUFFERED: '1',
          PYTHONDONTWRITEBYTECODE: '1',
          ...req.env,
        },
        windowsHide: true,
      });
      running.set(runId, child);
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdin.on('error', () => {
        // The program ended while we were writing to it. Nothing to do.
      });

      // Listeners are attached straight away (a failed spawn reports on the next tick), but
      // nothing is passed on until 'started' has gone out, one tick after run() has resolved
      // with the runId.
      let announced = false;
      const held: RunEvent[] = [];
      const emit = (event: RunEvent): void => {
        if (announced) events.emit(event);
        else held.push(event);
      };
      const forward = (type: 'stdout' | 'stderr', chunk: string): void => {
        // Keep each event small so one huge print cannot stall the bridge.
        for (let i = 0; i < chunk.length; i += LIMITS.runEventMaxChars) {
          emit({ type, runId, text: chunk.slice(i, i + LIMITS.runEventMaxChars) });
        }
      };
      let finished = false;
      const finish = (code: number | null, signal: string | null): void => {
        if (finished) return;
        finished = true;
        running.delete(runId);
        emit({ type: 'exit', runId, code, signal, durationMs: Date.now() - startedAt });
      };

      child.stdout.on('data', (chunk: string) => forward('stdout', chunk));
      child.stderr.on('data', (chunk: string) => forward('stderr', chunk));
      child.on('error', (error) => {
        logger.error('could not start python', error);
        forward('stderr', `Could not start Python: ${error.message}\n`);
        finish(null, null);
      });
      child.on('close', (code, signal) => finish(code, signal));

      setImmediate(() => {
        events.emit({ type: 'started', runId });
        announced = true;
        for (const event of held.splice(0)) events.emit(event);
      });

      return runId;
    },

    async sendInput(runId, text) {
      const child = running.get(runId);
      if (child && child.stdin.writable) child.stdin.write(text + '\n');
    },

    async stop(runId) {
      running.get(runId)?.kill();
    },

    onEvent(cb): Unsub {
      return events.on(cb);
    },

    async analyse() {
      return [];
    },

    async trace() {
      return { steps: [], truncated: false };
    },

    async runTests() {
      return { tests: [], durationMs: 0, raw: '' };
    },

    async dispose() {
      for (const child of running.values()) child.kill();
      running.clear();
      events.clear();
    },
  };
}

// ================================================================ checks
