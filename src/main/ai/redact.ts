// Keeps API keys out of log lines and error messages.
//
// Two layers: the exact keys this process knows about (passed in by whoever holds them) and
// patterns that look like a key. A SHA-256 or any other all-hex string is left alone so
// that download hashes stay readable in the log.

import type { Logger } from '../logger';

const MASK = '[key hidden]';

const PATTERNS: RegExp[] = [
  /\bsk-[A-Za-z0-9_-]{8,}/g, // OpenAI style, also sk-ant-..., sk-proj-...
  /\bAIza[0-9A-Za-z_-]{16,}/g, // Google API keys
  /\b(Bearer)\s+[A-Za-z0-9._~+/=-]{8,}/gi,
  /\b(x-api-key|x-goog-api-key|api[-_]?key|authorization)(["']?\s*[:=]\s*["']?)[^\s"',;&]{6,}/gi,
  /([?&]key=)[^&\s"']{6,}/gi,
];

/** A long token that mixes letters and digits and is not plain hex (hashes are plain hex). */
const LONG_TOKEN = /\b(?=[A-Za-z0-9_-]*[A-Za-z])(?=[A-Za-z0-9_-]*\d)[A-Za-z0-9_-]{40,}\b/g;
const HEX_ONLY = /^[0-9a-fA-F]+$/;

export function redactSecrets(text: string, known: readonly string[] = []): string {
  let out = text;
  for (const secret of known) {
    if (secret && secret.length >= 4) out = out.split(secret).join(MASK);
  }
  out = out.replace(PATTERNS[0]!, MASK).replace(PATTERNS[1]!, MASK);
  out = out.replace(PATTERNS[2]!, (_m, word: string) => `${word} ${MASK}`);
  out = out.replace(PATTERNS[3]!, (_m, name: string, sep: string) => `${name}${sep}${MASK}`);
  out = out.replace(PATTERNS[4]!, (_m, prefix: string) => `${prefix}${MASK}`);
  out = out.replace(LONG_TOKEN, (token) => (HEX_ONLY.test(token) ? token : MASK));
  return out;
}

function redactDetail(detail: unknown, known: readonly string[]): unknown {
  if (typeof detail === 'string') return redactSecrets(detail, known);
  if (detail instanceof Error) return redactSecrets(`${detail.name}: ${detail.message}`, known);
  try {
    return redactSecrets(JSON.stringify(detail) ?? String(detail), known);
  } catch {
    return redactSecrets(String(detail), known);
  }
}

/** Wraps a logger so that everything written through it is redacted first. `known` is read
 *  on every call, so keys added later are covered too. */
export function redactingLogger(inner: Logger, known: () => readonly string[] = () => []): Logger {
  const wrap =
    (write: (message: string, ...details: unknown[]) => void) =>
    (message: string, ...details: unknown[]): void => {
      const secrets = known();
      write(redactSecrets(message, secrets), ...details.map((d) => redactDetail(d, secrets)));
    };
  return {
    debug: wrap(inner.debug.bind(inner)),
    info: wrap(inner.info.bind(inner)),
    warn: wrap(inner.warn.bind(inner)),
    error: wrap(inner.error.bind(inner)),
    child: (scope) => redactingLogger(inner.child(scope), known),
  };
}
