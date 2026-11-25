import * as THREE from 'three';
import { createRenderer } from './renderer';
import { createLoop, type LoopCallbacks } from './loop';
import { createInputManager, type InputManager } from './input';
import { createQualityManager, type QualityManager } from './quality';
import { createParticleSystem, type ParticleSystem } from './vfx';
import { createLightingRig, type LightingPreset, type LightingRig } from './lighting';

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  loop: ReturnType<typeof createLoop>;
  input: InputManager;
  quality: QualityManager;
  vfx: ParticleSystem;
  lighting: LightingRig;
  container: HTMLElement;
  dispose(): void;
}

export interface SceneOptions {
  container: HTMLElement;
  preset?: LightingPreset;
  cameraPos?: [number, number, number];
  cameraTarget?: [number, number, number];
  fov?: number;
  near?: number;
  far?: number;
  onUpdate?: (dt: number) => void;
  onRender?: (alpha: number) => void;
}

export async function createGameScene(options: SceneOptions): Promise<SceneContext> {
  const {
    container,
    preset = 'day',
    cameraPos = [0, 5, 10],
    cameraTarget = [0, 0, 0],
    fov = 50,
    near = 0.1,
    far = 1000,
  } = options;

  // 1. Scene and Camera
  const scene = new THREE.Scene();
  const aspect = container.clientWidth / Math.max(container.clientHeight, 1);
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(...cameraPos);
  camera.lookAt(...cameraTarget);

  // 2. Renderer
  const renderer = createRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  // 3. Quality manager
  const quality = createQualityManager();
  // Run autoDetect then apply pixel ratio
  await quality.autoDetect(renderer);
  renderer.setPixelRatio(quality.settings.pixelRatio);

  // 4. Lighting
  const lighting = createLightingRig(scene, preset);

  // 5. VFX particle system
  const vfx = createParticleSystem(scene);

  // 6. Input manager
  const input = createInputManager(container);

  // 7. ResizeObserver
  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }
    }
  });
  observer.observe(container);

  // 8. Loop
  const callbacks: LoopCallbacks = {
    update(dt: number) {
      vfx.update(dt);
      options.onUpdate?.(dt);
    },
    render(alpha: number) {
      renderer.render(scene, camera);
      options.onRender?.(alpha);
    },
  };
  const loop = createLoop(callbacks);
  loop.start();

  // 9. Dispose function
  function dispose() {
    loop.stop();
    input.dispose();
    quality.dispose();
    lighting.dispose(scene);
    vfx.dispose();
    disposeScene(scene);
    renderer.dispose();
    observer.disconnect();
    if (renderer.domElement.parentNode === container) {
      container.removeChild(renderer.domElement);
    }
  }

  return {
    scene,
    camera,
    renderer,
    loop,
    input,
    quality,
    vfx,
    lighting,
    container,
    dispose,
  };
}

export function disposeScene(scene: THREE.Scene): void {
  const textureKeys: (keyof THREE.MeshStandardMaterial)[] = [
    'map', 'normalMap', 'roughnessMap', 'aoMap', 'emissiveMap',
    'metalnessMap', 'envMap', 'lightMap',
  ] as (keyof THREE.MeshStandardMaterial)[];

  scene.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) {
      const m = object as THREE.Mesh;
      m.geometry?.dispose();

      const disposeMaterial = (mat: THREE.Material) => {
        mat.dispose();
        const stdMat = mat as THREE.MeshStandardMaterial;
        for (const key of textureKeys) {
          const tex = stdMat[key] as THREE.Texture | null | undefined;
          if (tex && typeof tex.dispose === 'function') tex.dispose();
        }
      };

      if (Array.isArray(m.material)) {
        m.material.forEach(disposeMaterial);
      } else if (m.material) {
        disposeMaterial(m.material);
      }
    }

    if ((object as THREE.SkinnedMesh).isSkinnedMesh) {
      const sm = object as THREE.SkinnedMesh;
      sm.skeleton?.bones.forEach((bone) => scene.remove(bone));
    }
  });
}
