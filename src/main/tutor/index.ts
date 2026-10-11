// Tutor area: TutorEngine, prompts, guards.
// Owner: the "ai" agent. See README.md in this folder.
//
// This is a WORKING STUB so the app boots today: it says one prepared sentence the first
// time the learner edits anything and nothing after that. Replace the body; keep the
// factory name and signature.

import { nanoid } from 'nanoid';
import type { TutorMessage, TutorTrigger, Unsub } from '@shared/types';
import { Emitter } from '../emitter';
import type { ServiceDeps, TutorService } from '../services';

export function createTutorService(deps: ServiceDeps['tutor']): TutorService {
  const logger = deps.logger.child('tutor');
  const messages = new Emitter<[TutorMessage]>();
  const deltas = new Emitter<[string, string]>();
  let greeted = false;

  function say(trigger: TutorTrigger, text: string): void {
    messages.emit({ id: nanoid(10), at: Date.now(), trigger, source: 'prepared', text });
  }

  return {
    notifyEdit() {
      if (greeted) return;
      greeted = true;
      say('idle', 'I can see you typing. The full tutor is still being built, so this is all I can say for now.');
    },
    notifyRun() {},
    notifyCheck() {},
    async ask() {
      say('question', 'I cannot answer questions yet.');
    },
    async hint(lessonId, stepId, size) {
      const hints = await deps.lessons.hints(lessonId).catch(() => null);
      const hint = hints?.[stepId];
      say(size === 'small' ? 'hint-small' : 'hint-big', hint ? hint[size] : 'There is no hint for this step yet.');
    },
    onMessage(cb): Unsub {
      return messages.on(cb);
    },
    onMessageDelta(cb): Unsub {
      return deltas.on(cb);
    },
    rate(id, good) {
      logger.debug(`rated ${id} ${good ? 'up' : 'down'}`);
    },
    clear() {
      greeted = false;
    },
    async dispose() {
      messages.clear();
      deltas.clear();
    },
  };
}
