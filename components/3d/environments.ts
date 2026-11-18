import * as THREE from 'three';

export function setupArcadeLighting(scene: THREE.Scene, ambientHex = 0xffffff, keyColor = 0xffb800) {
  scene.fog = new THREE.FogExp2(0x191b1f, 0.025);

  const ambient = new THREE.AmbientLight(ambientHex, 0.6);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(keyColor, 1.2);
  keyLight.position.set(10, 20, 15);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 50;
  keyLight.shadow.bias = -0.0005;
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x00e5ff, 0.7);
  rimLight.position.set(-10, 8, -10);
  scene.add(rimLight);
}

export function setupPuzzleLighting(scene: THREE.Scene) {
  scene.fog = new THREE.FogExp2(0xfaf9f6, 0.015);

  const ambient = new THREE.AmbientLight(0xffffff, 0.85);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xfff5d6, 1.0);
  dirLight.position.set(8, 16, 10);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  scene.add(dirLight);

  const softFill = new THREE.DirectionalLight(0xbbdefb, 0.5);
  softFill.position.set(-8, 10, -5);
  scene.add(softFill);
}

export function setupCyberNeonGrid(scene: THREE.Scene, size = 40, divisions = 40) {
  const grid = new THREE.GridHelper(size, divisions, 0xffb800, 0x333333);
  grid.position.y = -0.01;
  scene.add(grid);

  const floorGeo = new THREE.PlaneGeometry(size, size);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x121417,
    roughness: 0.8,
    metalness: 0.2,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
}

export function setupCleanFloor(scene: THREE.Scene, size = 40, color = 0xf5f3ef) {
  const floorGeo = new THREE.PlaneGeometry(size, size);
  const floorMat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.6,
    metalness: 0.05,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
}
