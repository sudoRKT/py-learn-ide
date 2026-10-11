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

export function createPracticeService(_deps: ServiceDeps['practice']): PracticeService {
  const changed = new Emitter<[PracticeServiceStatus]>();
  let status: PracticeServiceStatus = { running: false, baseUrl: null, mode: 'normal' };
  return {
    async status() {
      return status;
    },
    async setMode(mode) {
      status = { ...status, mode };
      changed.emit(status);
      return status;
    },
    onStatus(cb): Unsub {
      return changed.on(cb);
    },
    async ensureStarted() {
      throw new Error('The practice service is not implemented yet.');
    },
    async dispose() {
      changed.clear();
    },
  };
}
