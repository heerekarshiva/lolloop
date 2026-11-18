import * as THREE from 'three';

// Procedural 3D Character Builder (Cute stylized low-poly avatar with head, eyes, body, limbs)
export function createCharacter(options: {
  color: number;
  headColor?: number;
  eyeColor?: number;
  accessory?: 'none' | 'fire' | 'ice' | 'chefHat' | 'spaceHelmet' | 'crown' | 'ears';
  scale?: number;
}): THREE.Group {
  const group = new THREE.Group();
  const s = options.scale ?? 1;

  // Body
  const bodyGeo = new THREE.CapsuleGeometry(0.35 * s, 0.5 * s, 8, 16);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: options.color,
    roughness: 0.3,
    metalness: 0.1,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.6 * s;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Head
  const headGeo = new THREE.SphereGeometry(0.38 * s, 16, 16);
  const headMat = new THREE.MeshStandardMaterial({
    color: options.headColor ?? options.color,
    roughness: 0.25,
  });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.25 * s;
  head.castShadow = true;
  group.add(head);

  // Eyes (Cute glossy black or colored eyes)
  const eyeGeo = new THREE.SphereGeometry(0.07 * s, 8, 8);
  const eyeMat = new THREE.MeshBasicMaterial({ color: options.eyeColor ?? 0x111111 });
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.13 * s, 1.32 * s, 0.32 * s);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.13 * s, 1.32 * s, 0.32 * s);
  group.add(leftEye, rightEye);

  // Eye highlights
  const pupilGeo = new THREE.SphereGeometry(0.025 * s, 6, 6);
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
  leftPupil.position.set(-0.11 * s, 1.34 * s, 0.37 * s);
  const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
  rightPupil.position.set(0.15 * s, 1.34 * s, 0.37 * s);
  group.add(leftPupil, rightPupil);

  // Accessories
  if (options.accessory === 'fire') {
    // Ember Flame crest
    const flameGeo = new THREE.ConeGeometry(0.18 * s, 0.4 * s, 8);
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xff5722,
      emissive: 0xff3d00,
      emissiveIntensity: 0.6,
    });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(0, 1.7 * s, 0);
    group.add(flame);
  } else if (options.accessory === 'ice') {
    // Glacio Crystal crest
    const iceGeo = new THREE.OctahedronGeometry(0.16 * s);
    const iceMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x00b0ff,
      emissiveIntensity: 0.7,
      roughness: 0.1,
    });
    const ice = new THREE.Mesh(iceGeo, iceMat);
    ice.position.set(0, 1.72 * s, 0);
    group.add(ice);
  } else if (options.accessory === 'chefHat') {
    const hatGeo = new THREE.CylinderGeometry(0.28 * s, 0.22 * s, 0.35 * s, 12);
    const hatMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const hat = new THREE.Mesh(hatGeo, hatMat);
    hat.position.set(0, 1.68 * s, 0);
    group.add(hat);
  } else if (options.accessory === 'spaceHelmet') {
    const visorGeo = new THREE.SphereGeometry(0.25 * s, 12, 12);
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      roughness: 0.1,
      metalness: 0.9,
    });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 1.28 * s, 0.2 * s);
    group.add(visor);
  } else if (options.accessory === 'ears') {
    // Animal ears (cute panda/bear)
    const earGeo = new THREE.SphereGeometry(0.12 * s, 8, 8);
    const earMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const leftEar = new THREE.Mesh(earGeo, earMat);
    leftEar.position.set(-0.3 * s, 1.55 * s, 0);
    const rightEar = new THREE.Mesh(earGeo, earMat);
    rightEar.position.set(0.3 * s, 1.55 * s, 0);
    group.add(leftEar, rightEar);
  }

  // Feet
  const footGeo = new THREE.SphereGeometry(0.14 * s, 8, 8);
  const footMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 });
  const leftFoot = new THREE.Mesh(footGeo, footMat);
  leftFoot.position.set(-0.2 * s, 0.1 * s, 0);
  const rightFoot = new THREE.Mesh(footGeo, footMat);
  rightFoot.position.set(0.2 * s, 0.1 * s, 0);
  leftFoot.castShadow = true;
  rightFoot.castShadow = true;
  group.add(leftFoot, rightFoot);

  return group;
}

// 3D Gem / Crystal
export function createCrystal(color: number, scale = 1): THREE.Mesh {
  const geo = new THREE.OctahedronGeometry(0.4 * scale);
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.4,
    roughness: 0.1,
    metalness: 0.2,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

// 3D Floating Coin
export function createCoin(scale = 1): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(0.35 * scale, 0.35 * scale, 0.08 * scale, 16);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffb800,
    emissive: 0xff9800,
    emissiveIntensity: 0.3,
    roughness: 0.2,
    metalness: 0.8,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = Math.PI / 2;
  mesh.castShadow = true;
  return mesh;
}

// 3D Low-Poly Cloud
export function createCloud(scale = 1): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.8,
  });
  const puffs = [
    { r: 0.8, x: 0, y: 0, z: 0 },
    { r: 0.6, x: -0.6, y: -0.1, z: 0 },
    { r: 0.65, x: 0.65, y: -0.1, z: 0 },
    { r: 0.5, x: 0.2, y: 0.4, z: 0.1 },
    { r: 0.45, x: -0.3, y: 0.3, z: -0.1 },
  ];
  puffs.forEach((p) => {
    const geo = new THREE.SphereGeometry(p.r * scale, 8, 8);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(p.x * scale, p.y * scale, p.z * scale);
    group.add(m);
  });
  return group;
}

// 3D Low-Poly Tree
export function createTree(scale = 1): THREE.Group {
  const group = new THREE.Group();

  // Trunk
  const trunkGeo = new THREE.CylinderGeometry(0.12 * scale, 0.18 * scale, 0.8 * scale, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.9 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 0.4 * scale;
  trunk.castShadow = true;
  group.add(trunk);

  // Foliage
  const foliageGeo = new THREE.ConeGeometry(0.7 * scale, 1.4 * scale, 6);
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x43a047, roughness: 0.6 });
  const foliage = new THREE.Mesh(foliageGeo, foliageMat);
  foliage.position.y = 1.3 * scale;
  foliage.castShadow = true;
  group.add(foliage);

  return group;
}

// 3D Particle Burst (Explosions, confetti, item picks)
export function createParticleBurst(
  scene: THREE.Scene,
  position: THREE.Vector3,
  color: number,
  count = 20
): { update: (dt: number) => boolean } {
  const group = new THREE.Group();
  const geo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
  const mat = new THREE.MeshBasicMaterial({ color });

  const velocities: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    group.add(mesh);

    const v = new THREE.Vector3(
      (Math.random() - 0.5) * 6,
      Math.random() * 5 + 2,
      (Math.random() - 0.5) * 6
    );
    velocities.push(v);
  }
  scene.add(group);

  let life = 1.0;
  return {
    update: (dt: number) => {
      life -= dt * 1.5;
      if (life <= 0) {
        scene.remove(group);
        group.children.forEach((c) => (c as THREE.Mesh).geometry.dispose());
        mat.dispose();
        return false;
      }
      group.children.forEach((c, idx) => {
        velocities[idx].y -= 9.8 * dt; // gravity
        c.position.addScaledVector(velocities[idx], dt);
        c.scale.setScalar(life);
      });
      return true;
    },
  };
}
