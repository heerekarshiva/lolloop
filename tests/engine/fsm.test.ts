import { describe, it, expect, vi } from 'vitest';
import { createFSM } from '../../lib/engine/fsm';

type State = 'idle' | 'running' | 'paused' | 'over';
type Event = 'start' | 'pause' | 'resume' | 'end' | 'reset';

function makeGameFSM() {
  return createFSM<State, Event>({
    initial: 'idle',
    transitions: {
      idle:    { start: 'running' },
      running: { pause: 'paused', end: 'over' },
      paused:  { resume: 'running', end: 'over' },
      over:    { reset: 'idle' },
    },
  });
}

describe('createFSM', () => {
  it('starts in initial state', () => {
    const fsm = makeGameFSM();
    expect(fsm.state).toBe('idle');
  });

  it('valid transition changes state and returns true', () => {
    const fsm = makeGameFSM();
    const ok = fsm.send('start');
    expect(ok).toBe(true);
    expect(fsm.state).toBe('running');
  });

  it('invalid transition returns false and keeps state', () => {
    const fsm = makeGameFSM();
    const ok = fsm.send('pause'); // can't pause from idle
    expect(ok).toBe(false);
    expect(fsm.state).toBe('idle');
  });

  it('can() reflects valid transitions', () => {
    const fsm = makeGameFSM();
    expect(fsm.can('start')).toBe(true);
    expect(fsm.can('pause')).toBe(false);
  });

  it('calls onEnter when entering a state', () => {
    const onEnter = vi.fn();
    const fsm = createFSM<State, Event>({
      initial: 'idle',
      transitions: { idle: { start: 'running' }, running: {}, paused: {}, over: {} },
      onEnter: { running: onEnter },
    });
    fsm.send('start');
    expect(onEnter).toHaveBeenCalledOnce();
  });

  it('calls onExit when leaving a state', () => {
    const onExit = vi.fn();
    const fsm = createFSM<State, Event>({
      initial: 'idle',
      transitions: { idle: { start: 'running' }, running: {}, paused: {}, over: {} },
      onExit: { idle: onExit },
    });
    fsm.send('start');
    expect(onExit).toHaveBeenCalledOnce();
  });

  it('subscribe listener is called on state enter', () => {
    const fsm = makeGameFSM();
    const cb = vi.fn();
    fsm.on('running', cb);
    fsm.send('start');
    expect(cb).toHaveBeenCalled();
  });

  it('unsubscribe removes listener', () => {
    const fsm = makeGameFSM();
    const cb = vi.fn();
    const unsub = fsm.on('running', cb);
    unsub();
    fsm.send('start');
    expect(cb).not.toHaveBeenCalled();
  });

  it('reset returns to initial state', () => {
    const fsm = makeGameFSM();
    fsm.send('start');
    fsm.send('end');
    expect(fsm.state).toBe('over');
    fsm.reset();
    expect(fsm.state).toBe('idle');
  });
});
