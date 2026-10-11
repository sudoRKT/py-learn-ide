// Offline Monaco wiring. Call setupMonaco() once before the first <Editor /> mounts.
//
// Why this file exists: left alone, @monaco-editor/react downloads Monaco from a CDN at run
// time. The app must work offline and its Content-Security-Policy blocks that, so the
// loader is pointed at the copy bundled from node_modules instead.
//
// Verified in the sandboxed Electron window under the production CSP (file:// origin):
// Python highlighting, markers (squiggles), the find widget and the web worker all work.
// The UI agent owns this file and may trim the feature list to shrink the bundle
// (import 'monaco-editor/features/<name>/register' one by one instead of register.all).

import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/editor/editor.api';
// Every editor feature (find, folding, hover, bracket matching, ...), no languages.
import 'monaco-editor/features/register.all';
// Python is the only language the app needs. It has no language worker of its own.
import 'monaco-editor/languages/definitions/python/register';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';

let done = false;

/** Points @monaco-editor/react at the bundled Monaco. Safe to call more than once. */
export function setupMonaco(): typeof monaco {
  if (!done) {
    done = true;
    self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
    loader.config({ monaco });
  }
  return monaco;
}

export { monaco };
