import * as THREE from 'three';

export interface EmitOptions {
  position: THREE.Vector3;
  count: number;
  color: number | number[];
  speed?: number;
  lifetime?: number;
  size?: number;
  spread?: number;
  type?: 'spark' | 'smoke' | 'confetti' | 'trail' | 'splash';
}

export interface ParticleSystem {
  object: THREE.Points;
  update(dt: number): void;
  emit(options: EmitOptions): void;
  dispose(): void;
}

const vertexShader = /* glsl */`
attribute vec3 aVelocity;
attribute float aLifetime;
attribute float aMaxLifetime;
attribute float aSize;
attribute vec3 aColor;

varying float vAlpha;
varying vec3 vColor;

void main() {
  vColor = aColor;
  float t = clamp(aLifetime / max(aMaxLifetime, 0.0001), 0.0, 1.0);
  vAlpha = t;

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * (200.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = /* glsl */`
varying float vAlpha;
varying vec3 vColor;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if (d > 0.5) discard;
  float alpha = vAlpha * (1.0 - d * 2.0);
  gl_FragColor = vec4(vColor, alpha);
}
`;

export function createParticleSystem(
  scene: THREE.Scene,
  maxParticles = 2000
): ParticleSystem {
  const positions = new Float32Array(maxParticles * 3);
  const velocities = new Float32Array(maxParticles * 3);
  const lifetimes = new Float32Array(maxParticles);
  const maxLifetimes = new Float32Array(maxParticles);
  const sizes = new Float32Array(maxParticles);
  const colors = new Float32Array(maxParticles * 3);

  // Initialize all as dead
  for (let i = 0; i < maxParticles; i++) {
    lifetimes[i] = 0;
    maxLifetimes[i] = 1;
    sizes[i] = 5;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aVelocity', new THREE.BufferAttribute(velocities, 3));
  geometry.setAttribute('aLifetime', new THREE.BufferAttribute(lifetimes, 1));
  geometry.setAttribute('aMaxLifetime', new THREE.BufferAttribute(maxLifetimes, 1));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);

  let nextIndex = 0;

  function findDeadParticle(): number {
    // Try to find a dead particle starting from nextIndex
    for (let i = 0; i < maxParticles; i++) {
      const idx = (nextIndex + i) % maxParticles;
      if (lifetimes[idx] <= 0) {
        nextIndex = (idx + 1) % maxParticles;
        return idx;
      }
    }
    // All alive: overwrite oldest (nextIndex)
    const idx = nextIndex;
    nextIndex = (nextIndex + 1) % maxParticles;
    return idx;
  }

  function colorToRGB(c: number): [number, number, number] {
    return [(c >> 16 & 255) / 255, (c >> 8 & 255) / 255, (c & 255) / 255];
  }

  const system: ParticleSystem = {
    object: points,

    update(dt: number) {
      let needsUpdate = false;
      for (let i = 0; i < maxParticles; i++) {
        if (lifetimes[i] <= 0) continue;
        needsUpdate = true;
        lifetimes[i] -= dt;
        if (lifetimes[i] < 0) lifetimes[i] = 0;

        const i3 = i * 3;
        positions[i3] += velocities[i3] * dt;
        positions[i3 + 1] += velocities[i3 + 1] * dt;
        positions[i3 + 2] += velocities[i3 + 2] * dt;

        // Gravity for sparks and confetti
        velocities[i3 + 1] -= 4 * dt;
      }

      if (needsUpdate) {
        (geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
        (geometry.attributes.aLifetime as THREE.BufferAttribute).needsUpdate = true;
      }
    },

    emit(options: EmitOptions) {
      const {
        position,
        count,
        color,
        speed = 5,
        lifetime = 1,
        size = 6,
        spread = Math.PI / 4,
      } = options;

      const colorList = Array.isArray(color) ? color : [color];

      for (let i = 0; i < count; i++) {
        const idx = findDeadParticle();
        const i3 = idx * 3;

        positions[i3] = position.x;
        positions[i3 + 1] = position.y;
        positions[i3 + 2] = position.z;

        // Random direction within spread cone
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * spread;
        const vx = Math.sin(phi) * Math.cos(theta) * speed * (0.5 + Math.random() * 0.5);
        const vy = Math.cos(phi) * speed * (0.5 + Math.random() * 0.5);
        const vz = Math.sin(phi) * Math.sin(theta) * speed * (0.5 + Math.random() * 0.5);

        velocities[i3] = vx;
        velocities[i3 + 1] = vy;
        velocities[i3 + 2] = vz;

        lifetimes[idx] = lifetime * (0.7 + Math.random() * 0.3);
        maxLifetimes[idx] = lifetimes[idx];
        sizes[idx] = size;

        const c = colorList[Math.floor(Math.random() * colorList.length)];
        const [r, g, b] = colorToRGB(c);
        colors[i3] = r;
        colors[i3 + 1] = g;
        colors[i3 + 2] = b;
      }

      (geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (geometry.attributes.aVelocity as THREE.BufferAttribute).needsUpdate = true;
      (geometry.attributes.aLifetime as THREE.BufferAttribute).needsUpdate = true;
      (geometry.attributes.aMaxLifetime as THREE.BufferAttribute).needsUpdate = true;
      (geometry.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
      (geometry.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;
    },

    dispose() {
      scene.remove(points);
      geometry.dispose();
      material.dispose();
    },
  };

  return system;
}

// ── Screen Shake ──────────────────────────────────────────────────────────────
export function screenShake(
  camera: THREE.Camera,
  intensity = 0.3,
  duration = 300
): void {
  const originalPos = camera.position.clone();
  const startTime = performance.now();

  function animate() {
    const elapsed = performance.now() - startTime;
    if (elapsed >= duration) {
      camera.position.copy(originalPos);
      return;
    }
    const t = elapsed / duration;
    const decay = 1 - t;
    camera.position.set(
      originalPos.x + (Math.random() * 2 - 1) * intensity * decay,
      originalPos.y + (Math.random() * 2 - 1) * intensity * decay,
      originalPos.z + (Math.random() * 2 - 1) * intensity * decay
    );
    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

// ── Hit Stop ──────────────────────────────────────────────────────────────────
export function hitStop(durationMs = 30): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}
