export interface LoopCallbacks {
  update(dt: number, state: GameLoopState): void;
  render(alpha: number): void;
}

export interface GameLoopState {
  time: number;
  frame: number;
  fps: number;
}

const FIXED_DT = 1 / 60;         // 60 Hz simulation
const MAX_DT   = 0.1;             // 100 ms clamp to prevent spiral
const MAX_SUBSTEPS = 5;           // max accumulated steps per frame

type LoopController = {
  start(): void;
  stop(): void;
  pause(): void;
  resume(): void;
  state: GameLoopState;
};

/**
 * Fixed-timestep game loop with accumulator pattern.
 *
 * Usage:
 *   const loop = createLoop({ update, render });
 *   loop.start();
 */
export function createLoop(callbacks: LoopCallbacks): LoopController {
  const state: GameLoopState = { time: 0, frame: 0, fps: 0 };

  let rafId = 0;
  let running = false;
  let paused  = false;
  let lastTimestamp = 0;
  let accumulator   = 0;

  // FPS rolling average over 60 samples
  const fpsSamples: number[] = [];
  const FPS_WINDOW = 60;

  function tick(timestamp: number): void {
    if (!running || paused) return;
    rafId = requestAnimationFrame(tick);

    if (lastTimestamp === 0) {
      lastTimestamp = timestamp;
      return;
    }

    const rawDt = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    const dt = Math.min(rawDt, MAX_DT);
    accumulator += dt;
    state.time  += dt;

    // Track FPS
    if (rawDt > 0) {
      fpsSamples.push(1 / rawDt);
      if (fpsSamples.length > FPS_WINDOW) fpsSamples.shift();
      state.fps = fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length;
    }

    // Fixed-step updates
    let substeps = 0;
    while (accumulator >= FIXED_DT && substeps < MAX_SUBSTEPS) {
      callbacks.update(FIXED_DT, state);
      accumulator -= FIXED_DT;
      state.frame++;
      substeps++;
    }

    // Interpolation alpha for render
    const alpha = accumulator / FIXED_DT;
    callbacks.render(alpha);
  }

  // Auto-pause when tab is hidden
  function onVisibilityChange(): void {
    if (document.hidden) {
      if (running && !paused) {
        paused = true;
        lastTimestamp = 0;
      }
    } else {
      if (running && paused) {
        paused = false;
        lastTimestamp = 0;
        rafId = requestAnimationFrame(tick);
      }
    }
  }

  document.addEventListener('visibilitychange', onVisibilityChange);

  const controller: LoopController = {
    state,

    start() {
      if (running) return;
      running = true;
      paused  = false;
      lastTimestamp = 0;
      accumulator   = 0;
      rafId = requestAnimationFrame(tick);
    },

    stop() {
      running = false;
      paused  = false;
      cancelAnimationFrame(rafId);
      rafId = 0;
      document.removeEventListener('visibilitychange', onVisibilityChange);
    },

    pause() {
      if (!running || paused) return;
      paused = true;
      cancelAnimationFrame(rafId);
    },

    resume() {
      if (!running || !paused) return;
      paused = false;
      lastTimestamp = 0;
      rafId = requestAnimationFrame(tick);
    },
  };

  return controller;
}
