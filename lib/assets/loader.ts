/**
 * Asset loader: GLTFLoader + DRACOLoader with URL cache and progress events.
 * All imports are dynamic so this can be used in browser-only 'use client' components.
 */

import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type * as THREE from 'three';

export interface LoadProgress {
  url: string;
  loaded: number;
  total: number;
  ratio: number;
}

export type ProgressCallback = (p: LoadProgress) => void;

// URL-keyed cache
const cache = new Map<string, GLTF>();

let _loaderPromise: Promise<typeof import('three/examples/jsm/loaders/GLTFLoader.js')> | null = null;

async function getGLTFLoader() {
  if (!_loaderPromise) {
    _loaderPromise = import('three/examples/jsm/loaders/GLTFLoader.js');
  }
  return _loaderPromise;
}

/**
 * Load a GLB/GLTF file with optional DRACOLoader decompression.
 * Results are cached by URL.
 */
export async function loadGLTF(url: string, onProgress?: ProgressCallback): Promise<GLTF> {
  if (cache.has(url)) return cache.get(url)!;

  const { GLTFLoader } = await getGLTFLoader();
  const loader = new GLTFLoader();

  // Attach DRACOLoader if decoders are present
  try {
    const { DRACOLoader } = await import('three/examples/jsm/loaders/DRACOLoader.js');
    const draco = new DRACOLoader();
    draco.setDecoderPath('/draco/');
    loader.setDRACOLoader(draco);
  } catch { /* DRACOLoader optional */ }

  return new Promise<GLTF>((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        cache.set(url, gltf);
        resolve(gltf);
      },
      (event) => {
        if (onProgress) {
          const total = event.total || 1;
          onProgress({
            url,
            loaded: event.loaded,
            total,
            ratio: Math.min(event.loaded / total, 1),
          });
        }
      },
      reject,
    );
  });
}

/**
 * Clone a loaded GLTF scene so many instances share geometry/materials.
 * Uses SkeletonUtils.clone for skinned meshes.
 */
export async function cloneGLTF(gltf: GLTF): Promise<THREE.Object3D> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const su = await import('three/examples/jsm/utils/SkeletonUtils.js') as any;
    const clone = (su.SkeletonUtils ?? su).clone ?? su.clone;
    if (typeof clone === 'function') return clone(gltf.scene) as THREE.Object3D;
    return gltf.scene.clone(true);
  } catch {
    return gltf.scene.clone(true);
  }
}

/**
 * Preload multiple URLs, reporting combined progress.
 */
export async function preloadAssets(
  urls: string[],
  onProgress?: (ratio: number) => void,
): Promise<GLTF[]> {
  const ratios = new Array<number>(urls.length).fill(0);

  const results = await Promise.all(
    urls.map((url, i) =>
      loadGLTF(url, (p) => {
        ratios[i] = p.ratio;
        const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length;
        onProgress?.(avg);
      }),
    ),
  );

  return results;
}

/** Clear the asset cache (call on unmount if needed) */
export function clearCache() {
  cache.clear();
}
