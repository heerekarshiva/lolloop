import * as THREE from 'three';

export type LightingPreset =
  | 'day'
  | 'sunset'
  | 'nightNeon'
  | 'underwater'
  | 'cavern'
  | 'haunted'
  | 'space'
  | 'arena'
  | 'jungle'
  | 'castle';

export interface LightingRig {
  lights: THREE.Light[];
  fogColor: number;
  fogDensity: number;
  dispose(scene: THREE.Scene): void;
}

export function createLightingRig(
  scene: THREE.Scene,
  preset: LightingPreset
): LightingRig {
  const lights: THREE.Light[] = [];
  const extraObjects: THREE.Object3D[] = []; // e.g. star field

  function addLight<T extends THREE.Light>(light: T): T {
    lights.push(light);
    scene.add(light);
    return light;
  }

  let fogColor = 0x000000;
  let fogDensity = 0.01;

  switch (preset) {
    // ── Day ───────────────────────────────────────────────────────────────────
    case 'day': {
      const dir = addLight(new THREE.DirectionalLight(0xfff5e0, 1.8));
      dir.position.set(8, 20, 10);
      dir.castShadow = true;
      dir.shadow.mapSize.set(1024, 1024);
      addLight(new THREE.HemisphereLight(0x87ceeb, 0x556832, 0.6));
      addLight(new THREE.AmbientLight(0xffffff, 0.3));
      fogColor = 0x87ceeb;
      fogDensity = 0.008;
      break;
    }

    // ── Sunset ────────────────────────────────────────────────────────────────
    case 'sunset': {
      const dir = addLight(new THREE.DirectionalLight(0xff6a00, 2.0));
      dir.position.set(-8, 15, 5);
      dir.castShadow = true;
      dir.shadow.mapSize.set(1024, 1024);
      addLight(new THREE.HemisphereLight(0xff9500, 0x4a2000, 0.5));
      addLight(new THREE.AmbientLight(0xff8c00, 0.2));
      fogColor = 0xff4500;
      fogDensity = 0.012;
      break;
    }

    // ── Night Neon ────────────────────────────────────────────────────────────
    case 'nightNeon': {
      addLight(new THREE.AmbientLight(0x0a0a1e, 0.4));
      const c = addLight(new THREE.PointLight(0x00ffff, 3, 50));
      c.position.set(0, 5, 0);
      const m = addLight(new THREE.PointLight(0xff00ff, 3, 50));
      m.position.set(-5, 3, 5);
      const y = addLight(new THREE.PointLight(0xffff00, 2, 50));
      y.position.set(5, 3, -5);
      fogColor = 0x05051a;
      fogDensity = 0.03;
      break;
    }

    // ── Underwater ────────────────────────────────────────────────────────────
    case 'underwater': {
      const dir = addLight(new THREE.DirectionalLight(0x40e0d0, 0.8));
      dir.position.set(0, 20, 0);
      addLight(new THREE.HemisphereLight(0x006994, 0x003344, 1.0));
      addLight(new THREE.AmbientLight(0x004488, 0.5));
      fogColor = 0x006994;
      fogDensity = 0.025;
      break;
    }

    // ── Cavern ────────────────────────────────────────────────────────────────
    case 'cavern': {
      addLight(new THREE.AmbientLight(0x1a0800, 0.5));
      const o = addLight(new THREE.PointLight(0xff6600, 4, 20));
      o.position.set(0, 3, 0);
      const r = addLight(new THREE.PointLight(0xff2200, 2, 15));
      r.position.set(5, 2, 5);
      fogColor = 0x0a0500;
      fogDensity = 0.05;
      break;
    }

    // ── Haunted ───────────────────────────────────────────────────────────────
    case 'haunted': {
      addLight(new THREE.AmbientLight(0x0a0a05, 0.3));
      const dir = addLight(new THREE.DirectionalLight(0x8888aa, 0.4));
      dir.position.set(2, 10, -5);
      const p = addLight(new THREE.PointLight(0x6600aa, 2, 20));
      p.position.set(0, 4, 0);
      fogColor = 0x05050a;
      fogDensity = 0.04;
      break;
    }

    // ── Space ─────────────────────────────────────────────────────────────────
    case 'space': {
      addLight(new THREE.AmbientLight(0x000020, 0.2));
      const dir = addLight(new THREE.DirectionalLight(0xffffff, 2.5));
      dir.position.set(10, 10, 10);
      fogColor = 0x000000;
      fogDensity = 0;
      // Star field
      const starGeo = new THREE.BufferGeometry();
      const starPositions = new Float32Array(2000 * 3);
      for (let i = 0; i < 2000; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 400;
        starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        starPositions[i * 3 + 2] = r * Math.cos(phi);
      }
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
      const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, sizeAttenuation: false });
      const stars = new THREE.Points(starGeo, starMat);
      scene.add(stars);
      extraObjects.push(stars);
      break;
    }

    // ── Arena ─────────────────────────────────────────────────────────────────
    case 'arena': {
      addLight(new THREE.AmbientLight(0x334455, 0.5));
      const corners: [number, number, number][] = [[-10, 15, -10], [10, 15, -10], [-10, 15, 10], [10, 15, 10]];
      for (const pos of corners) {
        const spot = addLight(new THREE.SpotLight(0xfff5e0, 3));
        spot.position.set(...pos);
        spot.target.position.set(0, 0, 0);
        scene.add(spot.target);
        extraObjects.push(spot.target);
      }
      fogColor = 0x334455;
      fogDensity = 0.005;
      break;
    }

    // ── Jungle ────────────────────────────────────────────────────────────────
    case 'jungle': {
      const dir = addLight(new THREE.DirectionalLight(0x88dd44, 1.2));
      dir.position.set(5, 15, 10);
      addLight(new THREE.HemisphereLight(0x44aa00, 0x224400, 0.7));
      fogColor = 0x224400;
      fogDensity = 0.015;
      break;
    }

    // ── Castle ────────────────────────────────────────────────────────────────
    case 'castle': {
      addLight(new THREE.AmbientLight(0x334455, 0.4));
      const dir = addLight(new THREE.DirectionalLight(0x8899bb, 1.0));
      dir.position.set(-5, 15, 5);
      const torch = addLight(new THREE.PointLight(0xff6600, 3, 15));
      torch.position.set(0, 3, 0);
      fogColor = 0x222233;
      fogDensity = 0.015;
      break;
    }
  }

  // Apply fog (space has no fog)
  if (preset !== 'space') {
    scene.fog = new THREE.FogExp2(fogColor, fogDensity);
  } else {
    scene.fog = null;
  }

  return {
    lights,
    fogColor,
    fogDensity,
    dispose(s: THREE.Scene) {
      for (const light of lights) {
        s.remove(light);
        if ((light as THREE.SpotLight).shadow?.map) {
          (light as THREE.SpotLight).shadow.map?.dispose();
        }
      }
      for (const obj of extraObjects) {
        s.remove(obj);
        if ((obj as THREE.Points).geometry) (obj as THREE.Points).geometry.dispose();
        const mat = (obj as THREE.Points).material;
        if (mat) {
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat.dispose();
        }
      }
      s.fog = null;
    },
  };
}
