// PLACEHOLDER interface. The UI agent replaces everything in src/renderer except api.ts,
// mockApi.ts, mockData.ts and env.d.ts. Its only job is to prove the plumbing: the lesson
// list, a run with live output and input(), and tutor messages all travel through `api`.

import { useEffect, useRef, useState } from 'react';
import { APP_NAME } from '@shared/constants';
import type { LessonSummary, RunEvent, TutorMessage } from '@shared/types';
import { api, isMock } from './api';

const START_CODE = 'name = input("What is your name? ")\nprint("Hello,", name)\n';
const FILE = 'main.py';

interface ConsoleLine {
  kind: 'out' | 'err' | 'meta';
  text: string;
}

export function App() {
  const [lessons, setLessons] = useState<LessonSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [code, setCode] = useState(START_CODE);
  const [lines, setLines] = useState<ConsoleLine[]>([]);
  const [runId, setRunId] = useState<string | null>(null);
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [typed, setTyped] = useState('');
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const activeRun = useRef<string | null>(null);

  useEffect(() => {
    api.lessons.list().then(setLessons, (error: unknown) => setLoadError(String(error)));
  }, []);

  useEffect(() => {
    const push = (line: ConsoleLine): void => setLines((all) => [...all, line]);
    return api.python.onEvent((event: RunEvent) => {
      // Events can arrive before run() resolves, so the first 'started' claims the run.
      if (event.type === 'started' && activeRun.current === null) activeRun.current = event.runId;
      if (event.runId !== activeRun.current) return;
      if (event.type === 'stdout') push({ kind: 'out', text: event.text });
      else if (event.type === 'stderr') push({ kind: 'err', text: event.text });
      else if (event.type === 'input-requested') setWaitingForInput(true);
      else if (event.type === 'exit') {
        push({ kind: 'meta', text: `\n[finished in ${event.durationMs} ms, exit code ${event.code ?? event.signal}]\n` });
        activeRun.current = null;
        setRunId(null);
        setWaitingForInput(false);
      }
      api.tutor.notifyRun(null, event);
    });
  }, []);

  useEffect(() => {
    const offMessage = api.tutor.onMessage((message) =>
      setMessages((all) => (all.some((m) => m.id === message.id) ? all.map((m) => (m.id === message.id ? message : m)) : [...all, message])),
    );
    const offDelta = api.tutor.onMessageDelta((id, text) =>
      setMessages((all) => all.map((m) => (m.id === id ? { ...m, text: m.text + text } : m))),
    );
    return () => {
      offMessage();
      offDelta();
    };
  }, []);

  function edit(next: string): void {
    setCode(next);
    api.tutor.notifyEdit({ lessonId: null, stepId: null, file: FILE, code: next, cursorLine: 1, recentEdits: [] });
  }

  async function run(): Promise<void> {
    setLines([]);
    setWaitingForInput(false);
    activeRun.current = null;
    try {
      const id = await api.python.run({ lessonId: null, files: [{ name: FILE, content: code }], entry: FILE });
      if (activeRun.current === null || activeRun.current === id) {
        activeRun.current = id;
        setRunId(id);
      }
    } catch (error) {
      setLines([{ kind: 'err', text: String(error) }]);
    }
  }

  async function sendInput(): Promise<void> {
    const id = activeRun.current;
    if (!id) return;
    setLines((all) => [...all, { kind: 'meta', text: typed + '\n' }]);
    setWaitingForInput(false);
    setTyped('');
    await api.python.sendInput(id, typed);
  }

  let lastStage = 0;

  return (
    <div className="ph-app" data-testid="app">
      <header className="ph-top">
        <h1>{APP_NAME}: skeleton</h1>
        <span className="ph-badge" data-testid="bridge">{isMock ? 'mock bridge' : 'real bridge'}</span>
        <button className="ph-primary" data-testid="run" onClick={() => void run()} disabled={runId !== null}>
          Run
        </button>
        <button data-testid="stop" onClick={() => runId && void api.python.stop(runId)} disabled={runId === null}>
          Stop
        </button>
      </header>

      <section className="ph-panel" aria-label="Lessons">
        <h2>Lessons</h2>
        {loadError && <p className="ph-console ph-err">{loadError}</p>}
        {!lessons && !loadError && <p className="ph-empty">Loading...</p>}
        {lessons && (
          <ul className="ph-lessons" data-testid="lesson-list">
            {lessons.map((lesson) => {
              const heading = lesson.stage !== lastStage;
              lastStage = lesson.stage;
              return (
                <li key={lesson.id} data-testid="lesson-item" style={{ flexWrap: 'wrap' }}>
                  {heading && (
                    <span className="ph-stage" style={{ flexBasis: '100%' }}>
                      Stage {lesson.stage}: {lesson.stageTitle}
                    </span>
                  )}
                  <span className="ph-num">{lesson.number}</span>
                  <span>{lesson.title}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="ph-panel" aria-label="Editor">
        <h2>Editor</h2>
        <textarea
          className="ph-code"
          data-testid="code"
          aria-label="Code"
          spellCheck={false}
          value={code}
          onChange={(event) => edit(event.target.value)}
        />
      </section>

      <section className="ph-panel" aria-label="Console">
        <h2>Console</h2>
        <pre className="ph-console" data-testid="console">
          {lines.map((line, index) => (
            <span key={index} className={line.kind === 'err' ? 'ph-err' : line.kind === 'meta' ? 'ph-meta' : undefined}>
              {line.text}
            </span>
          ))}
        </pre>
        {waitingForInput && (
          <form
            className="ph-row"
            onSubmit={(event) => {
              event.preventDefault();
              void sendInput();
            }}
          >
            <input data-testid="stdin" aria-label="Type your answer" autoFocus value={typed} onChange={(event) => setTyped(event.target.value)} />
            <button type="submit">Enter</button>
          </form>
        )}
      </section>

      <section className="ph-panel" aria-label="Tutor">
        <h2>Tutor</h2>
        <div data-testid="tutor" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {messages.length === 0 && <p className="ph-empty">Nothing yet. Type in the editor.</p>}
          {messages.map((message) => (
            <div key={message.id} className="ph-tutor-msg" data-testid="tutor-message">
              <small>
                {message.trigger} / {message.source}
                {message.streaming ? ' / streaming' : ''}
              </small>
              {message.text}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
