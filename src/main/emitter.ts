// A small typed event emitter for services. One Emitter per kind of event:
//
//   private readonly events = new Emitter<[RunEvent]>();
//   onEvent(cb: (e: RunEvent) => void): Unsub { return this.events.on(cb); }
//   ...
//   this.events.emit({ type: 'started', runId });

import type { Unsub } from '@shared/types';

export class Emitter<Args extends unknown[]> {
  private readonly listeners = new Set<(...args: Args) => void>();

  /** Subscribe. Returns the function that unsubscribes. */
  on(listener: (...args: Args) => void): Unsub {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Subscribe for one event only. */
  once(listener: (...args: Args) => void): Unsub {
    const off = this.on((...args) => {
      off();
      listener(...args);
    });
    return off;
  }

  /** Call every listener. A listener that throws does not stop the others. */
  emit(...args: Args): void {
    for (const listener of [...this.listeners]) {
      try {
        listener(...args);
      } catch (error) {
        this.onListenerError?.(error);
      }
    }
  }

  /** Optional hook so a service can log listener failures. */
  onListenerError?: (error: unknown) => void;

  get size(): number {
    return this.listeners.size;
  }

  clear(): void {
    this.listeners.clear();
  }
}
