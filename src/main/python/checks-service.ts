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

export function createChecksService(_deps: ServiceDeps['checks']): ChecksService {
  return {
    async run(_lessonId, checkId) {
      return { passed: false, checkId, tests: [], durationMs: 0, error: 'not implemented' };
    },
    async dispose() {},
  };
}

// ================================================================ terminal
