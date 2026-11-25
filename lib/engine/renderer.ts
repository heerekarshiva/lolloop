import * as THREE from 'three';

export interface RendererConfig {
  canvas?: HTMLCanvasElement;
  antialias?: boolean;
  powerPreference?: 'high-performance' | 'default';
}

/**
 * Creates a production-ready WebGLRenderer with sensible defaults.
 * Handles context loss/restore automatically.
 */
export function createRenderer(config: RendererConfig): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    canvas: config.canvas,
    antialias: config.antialias ?? true,
    powerPreference: config.powerPreference ?? 'high-performance',
    stencil: false,
  });

  // Tonemapping & encoding
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Pixel ratio capped at 2 to avoid GPU overload on hi-dpi screens
  renderer.setPixelRatio(Math.min(typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1, 2));

  // Shadows
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Physically correct lights (deprecated in r155 but still valid for compat shims)
  // In Three.js >=r155 this is the default; kept for older-build safety.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ('physicallyCorrectLights' in renderer) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (renderer as any).physicallyCorrectLights = true;
  }

  // ── Context loss / restore ──────────────────────────────────────────────────
  const canvas = renderer.domElement;

  const onContextLost = (event: Event) => {
    event.preventDefault();
    console.warn('[renderer] WebGL context lost');
  };

  const onContextRestored = () => {
    console.info('[renderer] WebGL context restored — reinitialising');
    // Re-applying settings after restore
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  };

  canvas.addEventListener('webglcontextlost', onContextLost);
  canvas.addEventListener('webglcontextrestored', onContextRestored);

  // Store cleanup refs on the renderer so disposeRenderer can reach them
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (renderer as any).__contextHandlers = { onContextLost, onContextRestored };

  return renderer;
}

/**
 * Disposes a renderer created by createRenderer, removes event listeners.
 */
export function disposeRenderer(renderer: THREE.WebGLRenderer): void {
  const canvas = renderer.domElement;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlers = (renderer as any).__contextHandlers as
    | { onContextLost: (e: Event) => void; onContextRestored: () => void }
    | undefined;

  if (handlers) {
    canvas.removeEventListener('webglcontextlost', handlers.onContextLost);
    canvas.removeEventListener('webglcontextrestored', handlers.onContextRestored);
  }

  renderer.dispose();
}
