export type InputAction =
  | 'jump'
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'fire'
  | 'pause'
  | 'confirm'
  | 'cancel'
  | 'fullscreen';

export interface InputState {
  actions: Set<InputAction>;
  axes: { x: number; y: number };
  pointer: { x: number; y: number; buttons: number };
}

export interface InputManager {
  state: InputState;
  wasPressed(action: InputAction, windowMs?: number): boolean;
  on(action: InputAction, cb: () => void): () => void;
  dispose(): void;
}

// ----- Key → Action map -----
const KEY_MAP: Record<string, InputAction> = {
  Space: 'jump',
  ArrowUp: 'jump',
  KeyW: 'jump',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowDown: 'down',
  KeyS: 'down',
  KeyF: 'fullscreen',
  Escape: 'cancel',
  Enter: 'confirm',
  KeyP: 'pause',
};

export function createInputManager(container: HTMLElement): InputManager {
  const state: InputState = {
    actions: new Set<InputAction>(),
    axes: { x: 0, y: 0 },
    pointer: { x: 0, y: 0, buttons: 0 },
  };

  // Input buffering: map action → last pressed timestamp
  const pressTimestamps = new Map<InputAction, number>();
  // Action listeners
  const listeners = new Map<InputAction, Set<() => void>>();

  function fireListeners(action: InputAction) {
    listeners.get(action)?.forEach((cb) => cb());
  }

  function pressAction(action: InputAction) {
    if (!state.actions.has(action)) {
      state.actions.add(action);
      pressTimestamps.set(action, performance.now());
      fireListeners(action);
    }
  }

  function releaseAction(action: InputAction) {
    state.actions.delete(action);
  }

  // ── Keyboard ────────────────────────────────────────────────────────────────
  const onKeyDown = (e: KeyboardEvent) => {
    const action = KEY_MAP[e.code];
    if (action) {
      e.preventDefault();
      pressAction(action);
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    const action = KEY_MAP[e.code];
    if (action) releaseAction(action);
  };

  const onBlur = () => {
    // Clear all actions to avoid stuck keys
    state.actions.clear();
    state.axes.x = 0;
    state.axes.y = 0;
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  // ── Mouse ───────────────────────────────────────────────────────────────────
  const onMouseMove = (e: MouseEvent) => {
    const rect = container.getBoundingClientRect();
    state.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    state.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  };

  const onMouseDown = (e: MouseEvent) => {
    state.pointer.buttons = e.buttons;
  };

  const onMouseUp = (e: MouseEvent) => {
    state.pointer.buttons = e.buttons;
  };

  container.addEventListener('mousemove', onMouseMove);
  container.addEventListener('mousedown', onMouseDown);
  container.addEventListener('mouseup', onMouseUp);

  // ── Touch ───────────────────────────────────────────────────────────────────
  // Track touch start positions: touchId → { startX, startY }
  const touchStarts = new Map<number, { x: number; y: number }>();
  let joystickTouchId: number | null = null;

  const JOYSTICK_THRESHOLD = 20; // px

  function handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    const rect = container.getBoundingClientRect();
    const halfWidth = rect.width / 2;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const lx = t.clientX - rect.left;
      const ly = t.clientY - rect.top;
      touchStarts.set(t.identifier, { x: lx, y: ly });

      if (lx < halfWidth) {
        // Left half: virtual joystick
        if (joystickTouchId === null) {
          joystickTouchId = t.identifier;
        }
      } else {
        // Right half: jump + fire
        pressAction('jump');
        pressAction('fire');
      }
    }
  }

  function handleTouchMove(e: TouchEvent) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === joystickTouchId) {
        const start = touchStarts.get(t.identifier);
        if (!start) continue;
        const rect = container.getBoundingClientRect();
        const lx = t.clientX - rect.left;
        const ly = t.clientY - rect.top;
        const dx = lx - start.x;
        const dy = ly - start.y;
        const len = Math.sqrt(dx * dx + dy * dy);

        if (len > JOYSTICK_THRESHOLD) {
          state.axes.x = Math.max(-1, Math.min(1, dx / (JOYSTICK_THRESHOLD * 3)));
          state.axes.y = Math.max(-1, Math.min(1, dy / (JOYSTICK_THRESHOLD * 3)));

          if (dx < -JOYSTICK_THRESHOLD) pressAction('left');
          else releaseAction('left');

          if (dx > JOYSTICK_THRESHOLD) pressAction('right');
          else releaseAction('right');

          if (dy < -JOYSTICK_THRESHOLD) pressAction('up');
          else releaseAction('up');

          if (dy > JOYSTICK_THRESHOLD) pressAction('down');
          else releaseAction('down');
        } else {
          state.axes.x = 0;
          state.axes.y = 0;
          releaseAction('left');
          releaseAction('right');
          releaseAction('up');
          releaseAction('down');
        }
      }
    }
  }

  function handleTouchEnd(e: TouchEvent) {
    e.preventDefault();
    const rect = container.getBoundingClientRect();
    const halfWidth = rect.width / 2;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === joystickTouchId) {
        joystickTouchId = null;
        state.axes.x = 0;
        state.axes.y = 0;
        releaseAction('left');
        releaseAction('right');
        releaseAction('up');
        releaseAction('down');
      } else {
        const lx = t.clientX - rect.left;
        if (lx >= halfWidth) {
          releaseAction('jump');
          releaseAction('fire');
        }
      }
      touchStarts.delete(t.identifier);
    }
  }

  container.addEventListener('touchstart', handleTouchStart, { passive: false });
  container.addEventListener('touchmove', handleTouchMove, { passive: false });
  container.addEventListener('touchend', handleTouchEnd, { passive: false });
  container.addEventListener('touchcancel', handleTouchEnd, { passive: false });

  // ── Gamepad ─────────────────────────────────────────────────────────────────
  const GAMEPAD_BUTTON_MAP: Record<number, InputAction> = {
    0: 'jump',
    1: 'cancel',
    9: 'pause',
  };

  let gpRafId = 0;

  function pollGamepad() {
    gpRafId = requestAnimationFrame(pollGamepad);
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (let i = 0; i < pads.length; i++) {
      const gp = pads[i];
      if (!gp) continue;

      // Buttons
      for (const [idx, action] of Object.entries(GAMEPAD_BUTTON_MAP)) {
        const btn = gp.buttons[Number(idx)];
        if (btn && btn.pressed) pressAction(action as InputAction);
        else releaseAction(action as InputAction);
      }

      // Also map button[0] to confirm
      const btn0 = gp.buttons[0];
      if (btn0 && btn0.pressed) pressAction('confirm');

      // Axes
      const ax = gp.axes[0] ?? 0;
      const ay = gp.axes[1] ?? 0;
      const DEAD = 0.15;
      state.axes.x = Math.abs(ax) > DEAD ? ax : 0;
      state.axes.y = Math.abs(ay) > DEAD ? ay : 0;

      if (state.axes.x < -DEAD) pressAction('left');
      else releaseAction('left');
      if (state.axes.x > DEAD) pressAction('right');
      else releaseAction('right');
      if (state.axes.y < -DEAD) pressAction('up');
      else releaseAction('up');
      if (state.axes.y > DEAD) pressAction('down');
      else releaseAction('down');
    }
  }

  gpRafId = requestAnimationFrame(pollGamepad);

  // ── Manager API ─────────────────────────────────────────────────────────────
  const manager: InputManager = {
    state,

    wasPressed(action: InputAction, windowMs = 100): boolean {
      const ts = pressTimestamps.get(action);
      if (ts === undefined) return false;
      return performance.now() - ts <= windowMs;
    },

    on(action: InputAction, cb: () => void): () => void {
      if (!listeners.has(action)) listeners.set(action, new Set());
      listeners.get(action)!.add(cb);
      return () => listeners.get(action)?.delete(cb);
    },

    dispose(): void {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mousedown', onMouseDown);
      container.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
      cancelAnimationFrame(gpRafId);
      listeners.clear();
    },
  };

  return manager;
}
