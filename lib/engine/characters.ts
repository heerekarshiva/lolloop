import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CharacterMesh {
  group: THREE.Group;
  mixer: THREE.AnimationMixer;
  update(dt: number): void;
  playAction(name: 'idle' | 'run' | 'jump' | 'land' | 'win' | 'lose' | 'hit'): void;
  dispose(): void;
}

export type NPCTheme = 'jungle' | 'castle' | 'ocean' | 'space' | 'highway' | 'haunted';
export type NPCVariant = 0 | 1 | 2;
export type PropType = 'brick' | 'coin' | 'chest' | 'orb' | 'platform' | 'spike' | 'bubble' | 'tree' | 'rock' | 'vehicle';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material): THREE.Mesh {
  return new THREE.Mesh(geo, mat);
}

/** Build a simple AnimationClip that bobs body position on Y */
function buildIdleClip(bodyName: string): THREE.AnimationClip {
  const times = [0, 1, 2];
  const values = [0, 0, 0.05, 0, 0, -0.05, 0, 0, 0];
  const track = new THREE.VectorKeyframeTrack(`${bodyName}.position[y]`, times, [0, 0.05, 0]);
  return new THREE.AnimationClip('idle', 2, [track]);
}

function buildRunClip(): THREE.AnimationClip {
  const times = [0, 0.25, 0.5];
  const fwd = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.3, 0, 0));
  const qArr = [...fwd.toArray()];
  const track = new THREE.QuaternionKeyframeTrack('.quaternion', times, [
    ...qArr, ...qArr, ...qArr,
  ]);
  return new THREE.AnimationClip('run', 0.5, [track]);
}

function buildJumpClip(): THREE.AnimationClip {
  const times = [0, 0.1, 0.4];
  const track = new THREE.VectorKeyframeTrack('.scale', times, [
    1.3, 0.7, 1.3,
    0.9, 1.3, 0.9,
    1, 1, 1,
  ]);
  return new THREE.AnimationClip('jump', 0.4, [track]);
}

function buildLandClip(): THREE.AnimationClip {
  const times = [0, 0.07, 0.25];
  const track = new THREE.VectorKeyframeTrack('.scale', times, [
    1.4, 0.6, 1.4,
    1.4, 0.6, 1.4,
    1, 1, 1,
  ]);
  return new THREE.AnimationClip('land', 0.25, [track]);
}

function buildWinClip(): THREE.AnimationClip {
  const times = [0, 0.3, 0.6, 1.0];
  const qs: number[] = [];
  for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 2]) {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, angle, 0));
    qs.push(...q.toArray());
  }
  const track = new THREE.QuaternionKeyframeTrack('.quaternion', times, qs);
  return new THREE.AnimationClip('win', 1.0, [track]);
}

function buildLoseClip(): THREE.AnimationClip {
  const times = [0, 0.4];
  const track = new THREE.VectorKeyframeTrack('.position', times, [0, 0, 0, 0, -0.3, 0]);
  return new THREE.AnimationClip('lose', 0.4, [track]);
}

function buildHitClip(): THREE.AnimationClip {
  const times = [0, 0.05, 0.1, 0.15, 0.2];
  const track = new THREE.VectorKeyframeTrack('.position', times, [
    0, 0, 0,
    0.1, 0, 0,
    -0.1, 0, 0,
    0.1, 0, 0,
    0, 0, 0,
  ]);
  return new THREE.AnimationClip('hit', 0.2, [track]);
}

function buildAllClips(): THREE.AnimationClip[] {
  return [
    buildIdleClip('.position'),
    buildRunClip(),
    buildJumpClip(),
    buildLandClip(),
    buildWinClip(),
    buildLoseClip(),
    buildHitClip(),
  ];
}

/** Attach mixer, build clips, wire playAction */
function wrapCharacter(group: THREE.Group, scale = 1.0): CharacterMesh {
  group.scale.setScalar(scale);
  const mixer = new THREE.AnimationMixer(group);
  const clips = buildAllClips();
  let currentAction: THREE.AnimationAction | null = null;

  function playAction(name: 'idle' | 'run' | 'jump' | 'land' | 'win' | 'lose' | 'hit') {
    const clip = THREE.AnimationClip.findByName(clips, name);
    if (!clip) return;
    const next = mixer.clipAction(clip);
    if (currentAction && currentAction !== next) {
      next.reset();
      next.crossFadeFrom(currentAction, 0.2, true);
    }
    next.play();
    currentAction = next;
  }

  // Auto-play idle
  playAction('idle');

  return {
    group,
    mixer,
    update(dt: number) { mixer.update(dt); },
    playAction,
    dispose() {
      mixer.stopAllAction();
      group.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          (o as THREE.Mesh).geometry?.dispose();
          const m = (o as THREE.Mesh).material;
          if (Array.isArray(m)) m.forEach((x) => x.dispose());
          else m?.dispose();
        }
      });
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EMBER (fire hero)
// ─────────────────────────────────────────────────────────────────────────────

export function createEmber(scale = 1.0): CharacterMesh {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0xc62828,
    roughness: 0.4,
    emissive: 0xff5722,
    emissiveIntensity: 0.3,
  });

  // Body
  const body = mesh(new THREE.CapsuleGeometry(0.3, 0.5, 8, 16), bodyMat);
  body.position.y = 0.55;
  group.add(body);

  // Rim glow (BackSide slightly larger)
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xff5722,
    side: THREE.BackSide,
    emissive: 0xff5722,
    emissiveIntensity: 0.4,
  });
  const rim = mesh(new THREE.CapsuleGeometry(0.33, 0.52, 8, 16), rimMat);
  rim.position.y = 0.55;
  group.add(rim);

  // Head
  const headMat = new THREE.MeshPhysicalMaterial({
    color: 0xe64a19,
    roughness: 0.4,
    emissive: 0xff5722,
    emissiveIntensity: 0.2,
  });
  const head = mesh(new THREE.SphereGeometry(0.35, 16, 16), headMat);
  head.position.y = 1.25;
  group.add(head);

  // Eyes
  const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const eyePupilMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  const eyeHlMat = new THREE.MeshStandardMaterial({ color: 0xffffff });

  for (const sx of [-0.13, 0.13]) {
    const white = mesh(new THREE.SphereGeometry(0.08, 8, 8), eyeWhiteMat);
    white.position.set(sx, 1.3, 0.3);
    group.add(white);

    const pupil = mesh(new THREE.SphereGeometry(0.05, 8, 8), eyePupilMat);
    pupil.position.set(sx, 1.3, 0.37);
    group.add(pupil);

    const hl = mesh(new THREE.SphereGeometry(0.03, 6, 6), eyeHlMat);
    hl.position.set(sx + 0.02, 1.33, 0.4);
    group.add(hl);
  }

  // Flame crown
  const flameMat1 = new THREE.MeshStandardMaterial({ color: 0xff5722, emissive: 0xff3d00, emissiveIntensity: 1.0 });
  const flameMat2 = new THREE.MeshStandardMaterial({ color: 0xff9800, emissive: 0xff3d00, emissiveIntensity: 1.0 });
  const flameMat3 = new THREE.MeshStandardMaterial({ color: 0xffcc02, emissive: 0xff3d00, emissiveIntensity: 1.0 });

  const flameData: [number, number, THREE.Material][] = [
    [0, 1.75, flameMat1],
    [-0.2, 1.65, flameMat2],
    [0.2, 1.65, flameMat3],
  ];
  for (const [fx, fy, fmat] of flameData) {
    const cone = mesh(new THREE.ConeGeometry(0.1, 0.3, 6), fmat);
    cone.position.set(fx, fy, 0);
    group.add(cone);
  }

  // Arms
  const armMat = bodyMat.clone();
  for (const [ax, ay] of [[-0.42, 0.75], [0.42, 0.75]]) {
    const arm = mesh(new THREE.CapsuleGeometry(0.12, 0.3, 4, 8), armMat);
    arm.position.set(ax, ay, 0);
    arm.rotation.z = ax < 0 ? 0.4 : -0.4;
    group.add(arm);
  }

  // Legs
  const legMat = bodyMat.clone();
  for (const [lx, ly] of [[-0.18, 0.1], [0.18, 0.1]]) {
    const leg = mesh(new THREE.CapsuleGeometry(0.13, 0.35, 4, 8), legMat);
    leg.position.set(lx, ly, 0);
    group.add(leg);
  }

  return wrapCharacter(group, scale);
}

// ─────────────────────────────────────────────────────────────────────────────
// GLACIO (ice hero)
// ─────────────────────────────────────────────────────────────────────────────

export function createGlacio(scale = 1.0): CharacterMesh {
  const group = new THREE.Group();

  const iceMat = new THREE.MeshPhysicalMaterial({
    color: 0x0277bd,
    roughness: 0.05,
    metalness: 0.1,
    transmission: 0.2,
    thickness: 0.5,
    ior: 1.4,
  });

  // Body
  const body = mesh(new THREE.CapsuleGeometry(0.3, 0.5, 8, 16), iceMat);
  body.position.y = 0.55;
  group.add(body);

  // Rim glow
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0x00e5ff,
    side: THREE.BackSide,
    emissive: 0x00e5ff,
    emissiveIntensity: 0.3,
  });
  const rim = mesh(new THREE.CapsuleGeometry(0.33, 0.52, 8, 16), rimMat);
  rim.position.y = 0.55;
  group.add(rim);

  // Head
  const headMat = new THREE.MeshPhysicalMaterial({
    color: 0x0288d1,
    roughness: 0.05,
    metalness: 0.1,
    transmission: 0.2,
    thickness: 0.5,
    ior: 1.4,
  });
  const head = mesh(new THREE.SphereGeometry(0.35, 16, 16), headMat);
  head.position.y = 1.25;
  group.add(head);

  // Eyes
  const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const eyePupilMat = new THREE.MeshStandardMaterial({ color: 0x222244 });
  const eyeHlMat = new THREE.MeshStandardMaterial({ color: 0xffffff });

  for (const sx of [-0.13, 0.13]) {
    const white = mesh(new THREE.SphereGeometry(0.09, 8, 8), eyeWhiteMat);
    white.position.set(sx, 1.3, 0.3);
    group.add(white);

    const pupil = mesh(new THREE.SphereGeometry(0.05, 8, 8), eyePupilMat);
    pupil.position.set(sx, 1.3, 0.37);
    group.add(pupil);

    const hl = mesh(new THREE.SphereGeometry(0.03, 6, 6), eyeHlMat);
    hl.position.set(sx + 0.02, 1.33, 0.4);
    group.add(hl);
  }

  // Ice crown: main octahedron + 2 smaller
  const crownMat = new THREE.MeshStandardMaterial({
    color: 0x80d8ff,
    emissive: 0x00e5ff,
    emissiveIntensity: 0.8,
    metalness: 0.3,
    roughness: 0.1,
  });
  const crown = mesh(new THREE.OctahedronGeometry(0.15), crownMat);
  crown.position.set(0, 1.72, 0);
  group.add(crown);

  const c2 = mesh(new THREE.OctahedronGeometry(0.1), crownMat);
  c2.position.set(-0.18, 1.65, 0);
  c2.rotation.z = 0.5;
  group.add(c2);

  const c3 = mesh(new THREE.OctahedronGeometry(0.1), crownMat);
  c3.position.set(0.18, 1.65, 0);
  c3.rotation.z = -0.5;
  group.add(c3);

  // Arms
  const armMat = new THREE.MeshPhysicalMaterial({ color: 0x039be5, roughness: 0.1, transmission: 0.15, ior: 1.4 });
  for (const [ax, ay] of [[-0.42, 0.75], [0.42, 0.75]]) {
    const arm = mesh(new THREE.CapsuleGeometry(0.12, 0.3, 4, 8), armMat);
    arm.position.set(ax, ay, 0);
    arm.rotation.z = ax < 0 ? 0.4 : -0.4;
    group.add(arm);
  }

  // Legs
  for (const [lx, ly] of [[-0.18, 0.1], [0.18, 0.1]]) {
    const leg = mesh(new THREE.CapsuleGeometry(0.13, 0.35, 4, 8), armMat.clone());
    leg.position.set(lx, ly, 0);
    group.add(leg);
  }

  return wrapCharacter(group, scale);
}

// ─────────────────────────────────────────────────────────────────────────────
// NPCs
// ─────────────────────────────────────────────────────────────────────────────

export function createNPC(theme: NPCTheme, variant: NPCVariant = 0): THREE.Group {
  const group = new THREE.Group();

  switch (theme) {
    case 'jungle': {
      const sizes = [1.2, 1.0, 0.75];
      const s = sizes[variant];
      const brownMat = new THREE.MeshStandardMaterial({ color: 0x795548, roughness: 0.8 });
      const body = mesh(new THREE.SphereGeometry(0.3 * s, 12, 12), brownMat);
      body.position.y = 0.3 * s;
      group.add(body);
      const head = mesh(new THREE.SphereGeometry(0.25 * s, 12, 12), brownMat);
      head.position.y = 0.7 * s;
      group.add(head);
      // Ears
      for (const sx of [-1, 1]) {
        const ear = mesh(new THREE.SphereGeometry(0.1 * s, 8, 8), brownMat);
        ear.position.set(sx * 0.22 * s, 0.8 * s, 0);
        group.add(ear);
      }
      break;
    }

    case 'castle': {
      const colors = [0x9e9e9e, 0x78909c, 0x546e7a];
      const mat = new THREE.MeshStandardMaterial({ color: colors[variant], roughness: 0.6, metalness: 0.3 });
      // Body (capsule approximation)
      const body = mesh(new THREE.CapsuleGeometry(0.25, 0.5, 4, 8), mat);
      body.position.y = 0.5;
      group.add(body);
      // Helmet
      const helmetMat = new THREE.MeshStandardMaterial({ color: colors[variant], roughness: 0.4, metalness: 0.6 });
      const helmet = mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.25, 8), helmetMat);
      helmet.position.y = 1.1;
      group.add(helmet);
      break;
    }

    case 'ocean': {
      const fishColors = [0x2196f3, 0xff9800, 0xe91e63];
      const mat = new THREE.MeshStandardMaterial({ color: fishColors[variant], roughness: 0.4 });
      // Ellipsoid body via scaled sphere
      const bodyGeo = new THREE.SphereGeometry(0.3, 12, 8);
      const body = mesh(bodyGeo, mat);
      body.scale.set(1.5, 0.8, 0.8);
      body.position.y = 0.3;
      group.add(body);
      // Triangle tail via custom BufferGeometry
      const tailGeo = new THREE.BufferGeometry();
      tailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
        -0.3, 0.3, 0,
        -0.6, 0.5, 0,
        -0.6, 0.1, 0,
      ]), 3));
      tailGeo.setIndex([0, 1, 2]);
      tailGeo.computeVertexNormals();
      const tail = mesh(tailGeo, mat);
      group.add(tail);
      break;
    }

    case 'space': {
      const metalMat = new THREE.MeshStandardMaterial({ color: 0x90a4ae, roughness: 0.2, metalness: 0.9 });
      const body = mesh(new THREE.BoxGeometry(0.5, 0.6, 0.4), metalMat);
      body.position.y = 0.6;
      group.add(body);
      // Head box
      const head = mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), metalMat.clone());
      head.position.y = 1.1;
      group.add(head);
      // Eye visor
      const visorMat = new THREE.MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 0.5 });
      const visor = mesh(new THREE.BoxGeometry(0.3, 0.1, 0.05), visorMat);
      visor.position.set(0, 1.1, 0.21);
      group.add(visor);
      // Cylinder limbs
      for (const [lx, ly] of [[-0.35, 0.65], [0.35, 0.65], [-0.15, 0.15], [0.15, 0.15]]) {
        const limb = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.4, 6), metalMat.clone());
        limb.position.set(lx, ly, 0);
        if (Math.abs(lx) > 0.2) limb.rotation.z = lx < 0 ? 0.5 : -0.5;
        group.add(limb);
      }
      // Antenna
      const antenna = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4), metalMat.clone());
      antenna.position.set(0, 1.45, 0);
      group.add(antenna);
      const antennaTip = mesh(new THREE.SphereGeometry(0.05, 6, 6), new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1.0 }));
      antennaTip.position.set(0, 1.63, 0);
      group.add(antennaTip);
      break;
    }

    case 'highway': {
      const carColors = [0xf44336, 0x2196f3, 0x4caf50];
      const bodyMat = new THREE.MeshPhysicalMaterial({ color: carColors[variant], roughness: 0.2, clearcoat: 1.0 });
      const body = mesh(new THREE.BoxGeometry(1.6, 0.5, 0.8), bodyMat);
      body.position.y = 0.4;
      group.add(body);
      // Cabin
      const cabin = mesh(new THREE.BoxGeometry(1.0, 0.4, 0.75), bodyMat);
      cabin.position.set(0, 0.85, 0);
      group.add(cabin);
      // Wheels
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.9 });
      const wheelPos: [number, number, number][] = [[-0.6, 0.2, 0.42], [0.6, 0.2, 0.42], [-0.6, 0.2, -0.42], [0.6, 0.2, -0.42]];
      for (const wp of wheelPos) {
        const wheel = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 12), wheelMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(...wp);
        group.add(wheel);
      }
      break;
    }

    case 'haunted': {
      // Ghost using LatheGeometry
      const points: THREE.Vector2[] = [];
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        const x = t < 0.5
          ? Math.sin(t * Math.PI) * 0.35
          : 0.3 + Math.sin((t - 0.5) * Math.PI * 3) * 0.08;
        points.push(new THREE.Vector2(x, (1 - t) * 1.0));
      }
      const ghostMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transmission: 0.7,
        roughness: 0.0,
        emissive: 0x9c27b0,
        emissiveIntensity: 0.2,
        side: THREE.DoubleSide,
      });
      const ghostGeo = new THREE.LatheGeometry(points, 12);
      const ghost = mesh(ghostGeo, ghostMat);
      group.add(ghost);
      break;
    }
  }

  return group;
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

function makeCanvasNormalMap(size = 64): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 40; i++) {
    const gx = Math.random() * size;
    const gy = Math.random() * size;
    ctx.fillStyle = `rgba(${100 + Math.random() * 60 | 0},${100 + Math.random() * 60 | 0},255,0.4)`;
    ctx.fillRect(gx, gy, 4, 4);
  }
  return new THREE.CanvasTexture(canvas);
}

function makeStoneTexture(size = 64): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#888';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 100; i++) {
    const v = 100 + Math.random() * 100 | 0;
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 3, 3);
  }
  return new THREE.CanvasTexture(canvas);
}

export function createProp(type: PropType, color?: number): THREE.Mesh | THREE.Group {
  switch (type) {
    case 'brick': {
      const normalMap = makeCanvasNormalMap();
      const mat = new THREE.MeshStandardMaterial({
        color: color ?? 0x8d6e63,
        roughness: 0.9,
        normalMap,
      });
      return mesh(new THREE.BoxGeometry(0.6, 0.3, 0.3), mat);
    }

    case 'coin': {
      const mat = new THREE.MeshStandardMaterial({ color: color ?? 0xffd700, metalness: 0.9, roughness: 0.1 });
      return mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 16), mat);
    }

    case 'chest': {
      const group = new THREE.Group();
      const woodMat = new THREE.MeshStandardMaterial({ color: color ?? 0x8b4513, roughness: 0.8 });
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.1 });
      // Body
      const body = mesh(new THREE.BoxGeometry(0.6, 0.35, 0.4), woodMat);
      body.position.y = 0.175;
      group.add(body);
      // Curved lid (half cylinder)
      const lid = mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.4, 12, 1, false, 0, Math.PI), woodMat);
      lid.position.set(0, 0.35, 0);
      lid.rotation.z = Math.PI / 2;
      group.add(lid);
      // Gold trim
      const trim = mesh(new THREE.BoxGeometry(0.62, 0.05, 0.42), goldMat);
      trim.position.y = 0.35;
      group.add(trim);
      return group;
    }

    case 'orb': {
      const mat = new THREE.MeshPhysicalMaterial({
        color: color ?? 0x88aaff,
        transmission: 0.9,
        roughness: 0.0,
        ior: 1.5,
        emissive: 0x4488ff,
        emissiveIntensity: 0.3,
      });
      return mesh(new THREE.SphereGeometry(0.3, 32, 32), mat);
    }

    case 'platform': {
      const stoneMap = makeStoneTexture();
      const mat = new THREE.MeshStandardMaterial({ color: color ?? 0x9e9e9e, roughness: 0.9, map: stoneMap });
      return mesh(new THREE.BoxGeometry(2, 0.3, 2), mat);
    }

    case 'spike': {
      const mat = new THREE.MeshStandardMaterial({ color: color ?? 0x607d8b, roughness: 0.3, metalness: 0.5 });
      return mesh(new THREE.ConeGeometry(0.2, 0.8, 8), mat);
    }

    case 'bubble': {
      const mat = new THREE.MeshPhysicalMaterial({
        color: color ?? 0xaaddff,
        transmission: 0.95,
        roughness: 0.0,
        ior: 1.3,
        envMapIntensity: 1,
      });
      return mesh(new THREE.SphereGeometry(0.4, 16, 16), mat);
    }

    case 'tree': {
      const group = new THREE.Group();
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x795548, roughness: 0.9 });
      const leafMat = new THREE.MeshStandardMaterial({ color: color ?? 0x388e3c, roughness: 0.8 });
      const trunk = mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.5, 8), trunkMat);
      trunk.position.y = 0.75;
      group.add(trunk);
      const cone1 = mesh(new THREE.ConeGeometry(1.2, 2, 8), leafMat);
      cone1.position.y = 2.5;
      group.add(cone1);
      const cone2 = mesh(new THREE.ConeGeometry(0.9, 1.5, 8), leafMat.clone());
      cone2.position.y = 3.5;
      group.add(cone2);
      return group;
    }

    case 'rock': {
      const mat = new THREE.MeshStandardMaterial({ color: color ?? 0x78909c, roughness: 1.0 });
      return mesh(new THREE.IcosahedronGeometry(0.5, 1), mat);
    }

    case 'vehicle': {
      const group = new THREE.Group();
      const bodyMat = new THREE.MeshPhysicalMaterial({ color: color ?? 0x1565c0, roughness: 0.2, clearcoat: 1.0 });
      const vehicleBody = mesh(new THREE.BoxGeometry(2, 0.8, 1), bodyMat);
      vehicleBody.position.y = 0.5;
      group.add(vehicleBody);
      const windMat = new THREE.MeshPhysicalMaterial({ color: 0xaaddff, roughness: 0.0, transmission: 0.6 });
      const windshield = mesh(new THREE.BoxGeometry(0.8, 0.5, 0.05), windMat);
      windshield.position.set(0.4, 0.95, 0.5);
      windshield.rotation.x = -0.3;
      group.add(windshield);
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.9 });
      const wheelPos: [number, number, number][] = [[-0.7, 0.3, 0.52], [0.7, 0.3, 0.52], [-0.7, 0.3, -0.52], [0.7, 0.3, -0.52]];
      for (const wp of wheelPos) {
        const wheel = mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.2, 12), wheelMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(...wp);
        group.add(wheel);
      }
      return group;
    }
  }
}
