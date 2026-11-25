// Mock WebGL + canvas so Three.js doesn't crash in jsdom
import { vi } from 'vitest';

// localStorage mock
const store: Record<string, string> = {};
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  },
  writable: true,
});

// performance.now
if (typeof performance === 'undefined') {
  Object.defineProperty(globalThis, 'performance', {
    value: { now: () => Date.now() },
  });
}

// requestAnimationFrame / cancelAnimationFrame
globalThis.requestAnimationFrame = vi.fn((cb) => { setTimeout(() => cb(performance.now()), 16); return 0; });
globalThis.cancelAnimationFrame = vi.fn();

// ResizeObserver
globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// WebGLRenderingContext mock (minimal)
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: (type: string) => {
    if (type === 'webgl' || type === 'webgl2') {
      return {
        getExtension: () => null,
        getParameter: () => null,
        createBuffer: () => ({}),
        bindBuffer: vi.fn(),
        bufferData: vi.fn(),
        enable: vi.fn(),
        disable: vi.fn(),
        viewport: vi.fn(),
        clearColor: vi.fn(),
        clear: vi.fn(),
        drawArrays: vi.fn(),
      };
    }
    return null;
  },
  writable: true,
});
