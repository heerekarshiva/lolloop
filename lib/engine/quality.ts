import type { WebGLRenderer } from 'three';

export type QualityLevel = 'low' | 'medium' | 'high';

export interface QualitySettings {
  pixelRatio: number;
  shadowMapSize: number;
  shadowsEnabled: boolean;
  bloomEnabled: boolean;
  ssaoEnabled: boolean;
  particleCount: number;
  fogEnabled: boolean;
}

const dpr = typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1;

export const QUALITY_PRESETS: Record<QualityLevel, QualitySettings> = {
  low: {
    pixelRatio: 1,
    shadowMapSize: 512,
    shadowsEnabled: false,
    bloomEnabled: false,
    ssaoEnabled: false,
    particleCount: 50,
    fogEnabled: true,
  },
  medium: {
    pixelRatio: Math.min(dpr, 1.5),
    shadowMapSize: 1024,
    shadowsEnabled: true,
    bloomEnabled: true,
    ssaoEnabled: false,
    particleCount: 200,
    fogEnabled: true,
  },
  high: {
    pixelRatio: Math.min(dpr, 2),
    shadowMapSize: 2048,
    shadowsEnabled: true,
    bloomEnabled: true,
    ssaoEnabled: true,
    particleCount: 500,
    fogEnabled: true,
  },
};

const STORAGE_KEY = 'lolloop.quality';

export interface QualityManager {
  level: QualityLevel;
  settings: QualitySettings;
  setLevel(l: QualityLevel): void;
  autoDetect(renderer: WebGLRenderer): Promise<QualityLevel>;
  checkFPS(currentFPS: number): void;
  subscribe(cb: (settings: QualitySettings) => void): () => void;
  dispose(): void;
}

export function createQualityManager(): QualityManager {
  // Load persisted level
  function loadLevel(): QualityLevel {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === 'low' || v === 'medium' || v === 'high') return v;
    } catch { /* ignore */ }
    return 'medium';
  }

  let currentLevel: QualityLevel = loadLevel();
  let currentSettings: QualitySettings = { ...QUALITY_PRESETS[currentLevel] };

  const subscribers = new Set<(settings: QualitySettings) => void>();

  // Auto-downgrade state
  let lowFPSStartMs: number | null = null;
  let disposed = false;

  function notifySubscribers() {
    subscribers.forEach((cb) => cb({ ...currentSettings }));
  }

  const mgr: QualityManager = {
    get level() { return currentLevel; },
    get settings() { return currentSettings; },

    setLevel(l: QualityLevel) {
      currentLevel = l;
      currentSettings = { ...QUALITY_PRESETS[l] };
      try { localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
      notifySubscribers();
    },

    async autoDetect(renderer: WebGLRenderer): Promise<QualityLevel> {
      return new Promise<QualityLevel>((resolve) => {
        const FRAMES = 60;
        let count = 0;
        let lastTs = 0;
        const samples: number[] = [];

        function frame(ts: number) {
          if (disposed) { resolve('medium'); return; }
          if (lastTs !== 0) {
            const dt = ts - lastTs;
            if (dt > 0) samples.push(1000 / dt);
          }
          lastTs = ts;
          count++;

          // Render a simple pass
          renderer.render(renderer.getRenderTarget()?.texture ? new (renderer as unknown as { scene: never }).scene : new (require('three').Scene)(), new (require('three').PerspectiveCamera)());

          if (count < FRAMES) {
            requestAnimationFrame(frame);
          } else {
            const avgFPS = samples.length > 0
              ? samples.reduce((a, b) => a + b, 0) / samples.length
              : 60;
            let detected: QualityLevel;
            if (avgFPS >= 50) detected = 'high';
            else if (avgFPS >= 35) detected = 'medium';
            else detected = 'low';
            mgr.setLevel(detected);
            resolve(detected);
          }
        }

        requestAnimationFrame(frame);
      });
    },

    checkFPS(currentFPS: number) {
      if (currentLevel === 'low') return; // Can't go lower
      const now = performance.now();
      if (currentFPS < 45) {
        if (lowFPSStartMs === null) {
          lowFPSStartMs = now;
        } else if (now - lowFPSStartMs >= 2000) {
          lowFPSStartMs = null;
          if (currentLevel === 'high') mgr.setLevel('medium');
          else if (currentLevel === 'medium') mgr.setLevel('low');
        }
      } else {
        lowFPSStartMs = null;
      }
    },

    subscribe(cb: (settings: QualitySettings) => void): () => void {
      subscribers.add(cb);
      return () => subscribers.delete(cb);
    },

    dispose() {
      disposed = true;
      subscribers.clear();
    },
  };

  return mgr;
}
