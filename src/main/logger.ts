// A simple logger: one line per entry, written to <data>/logs/app.log and to the console.
// No dependencies on Electron, so services and tests can use it freely.
//
// Never log secrets (API keys) or the learner's code at info level or above.

import { appendFileSync, existsSync, mkdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(message: string, ...details: unknown[]): void;
  info(message: string, ...details: unknown[]): void;
  warn(message: string, ...details: unknown[]): void;
  error(message: string, ...details: unknown[]): void;
  /** A logger that prefixes every line with `[scope]`. */
  child(scope: string): Logger;
}

export interface LoggerOptions {
  /** Folder for app.log. Omit to log to the console only. */
  dir?: string;
  /** Lowest level that is written. Default 'info' ('debug' when PYLEARN_DEBUG is set). */
  level?: LogLevel;
  /** Write to the console as well. Default true. */
  console?: boolean;
  /** app.log is rotated to app.1.log when it grows past this. Default 2 MB. */
  maxBytes?: number;
}

const ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const LOG_FILE = 'app.log';
const OLD_LOG_FILE = 'app.1.log';

function describe(detail: unknown): string {
  if (detail instanceof Error) return detail.stack ?? `${detail.name}: ${detail.message}`;
  if (typeof detail === 'string') return detail;
  try {
    return JSON.stringify(detail);
  } catch {
    return String(detail);
  }
}

export function createLogger(options: LoggerOptions = {}): Logger {
  const level = options.level ?? (process.env.PYLEARN_DEBUG ? 'debug' : 'info');
  const toConsole = options.console ?? true;
  const maxBytes = options.maxBytes ?? 2 * 1024 * 1024;
  const file = options.dir ? join(options.dir, LOG_FILE) : null;
  let fileBroken = false;

  if (options.dir) {
    try {
      mkdirSync(options.dir, { recursive: true });
    } catch {
      fileBroken = true;
    }
  }

  function rotateIfNeeded(): void {
    if (!file || !options.dir) return;
    try {
      if (existsSync(file) && statSync(file).size > maxBytes) {
        const old = join(options.dir, OLD_LOG_FILE);
        rmSync(old, { force: true });
        renameSync(file, old);
      }
    } catch {
      // Rotation is best effort. Keep appending to the same file.
    }
  }

  function write(lvl: LogLevel, scope: string, message: string, details: unknown[]): void {
    if (ORDER[lvl] < ORDER[level]) return;
    const extra = details.length ? ' ' + details.map(describe).join(' ') : '';
    const line = `${new Date().toISOString()} ${lvl.toUpperCase().padEnd(5)} ${scope ? `[${scope}] ` : ''}${message}${extra}`;
    if (toConsole) {
      const sink = lvl === 'error' ? console.error : lvl === 'warn' ? console.warn : console.log;
      sink(line);
    }
    if (file && !fileBroken) {
      try {
        rotateIfNeeded();
        appendFileSync(file, line + '\n', 'utf8');
      } catch {
        // A logger must never take the app down. Stop trying the file after one failure.
        fileBroken = true;
      }
    }
  }

  function make(scope: string): Logger {
    return {
      debug: (message, ...details) => write('debug', scope, message, details),
      info: (message, ...details) => write('info', scope, message, details),
      warn: (message, ...details) => write('warn', scope, message, details),
      error: (message, ...details) => write('error', scope, message, details),
      child: (name) => make(scope ? `${scope}:${name}` : name),
    };
  }

  return make('');
}

/** A logger that discards everything. For unit tests. */
export function createNullLogger(): Logger {
  const logger: Logger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    child: () => logger,
  };
  return logger;
}
