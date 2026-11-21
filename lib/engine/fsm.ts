export type GamePhase =
  | 'loading'
  | 'ready'
  | 'countdown'
  | 'playing'
  | 'paused'
  | 'gameover'
  | 'results';

export interface FSMConfig<S extends string, E extends string> {
  initial: S;
  transitions: Partial<Record<S, Partial<Record<E, S>>>>;
  onEnter?: Partial<Record<S, () => void>>;
  onExit?: Partial<Record<S, () => void>>;
}

export interface FSM<S extends string, E extends string> {
  readonly state: S;
  send(event: E): boolean;
  can(event: E): boolean;
  on(state: S, cb: () => void): () => void;
  reset(): void;
}

export function createFSM<S extends string, E extends string>(
  config: FSMConfig<S, E>
): FSM<S, E> {
  let current: S = config.initial;
  const listeners = new Map<S, Set<() => void>>();

  function fireEnter(state: S) {
    config.onEnter?.[state]?.();
    listeners.get(state)?.forEach((cb) => cb());
  }

  // Fire enter for initial state
  fireEnter(current);

  return {
    get state() { return current; },

    can(event: E): boolean {
      const stateMap = config.transitions[current];
      return stateMap !== undefined && event in stateMap;
    },

    send(event: E): boolean {
      const stateMap = config.transitions[current];
      if (!stateMap) return false;
      const next = stateMap[event];
      if (next === undefined) return false;

      config.onExit?.[current]?.();
      current = next;
      fireEnter(current);
      return true;
    },

    on(state: S, cb: () => void): () => void {
      if (!listeners.has(state)) listeners.set(state, new Set());
      listeners.get(state)!.add(cb);
      return () => listeners.get(state)?.delete(cb);
    },

    reset(): void {
      config.onExit?.[current]?.();
      current = config.initial;
      fireEnter(current);
    },
  };
}
