'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';

interface Props {
  onDone: (score: number) => void;
}

// 7x7 grid maze layout (1 = wall, 0 = path, 2 = key, 3 = exit gate)
const MAZE_MAP = [
  [1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 1, 2, 0, 1],
  [1, 0, 1, 1, 0, 1, 1],
  [1, 2, 0, 0, 0, 2, 1],
  [1, 1, 0, 1, 1, 0, 1],
  [1, 0, 0, 0, 1, 3, 1],
  [1, 1, 1, 1, 1, 1, 1],
];

export default function MazeRunner3D({ onDone }: Props) {
  const [keysLeft, setKeysLeft] = useState(3);
  const [timeLeft, setTimeLeft] = useState(45);
  const [gameWon, setGameWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const stateRef = useRef({
    playerPos: new THREE.Vector3(-2.4, 0.4, -2.4),
    targetPos: new THREE.Vector3(-2.4, 0.4, -2.4),
    playerMesh: null as THREE.Mesh | null,
    keys: [] as { x: number; z: number; mesh: THREE.Mesh; collected: boolean }[],
    exitMesh: null as THREE.Mesh | null,
    particles: [] as { update: (dt: number) => boolean }[],
    scene: null as THREE.Scene | null,
    camera: null as THREE.PerspectiveCamera | null,
    keysRemaining: 3,
  });

  const initGame = ({ scene, camera }: { scene: THREE.Scene; camera: THREE.PerspectiveCamera }) => {
    stateRef.current.scene = scene;
    stateRef.current.camera = camera;
    scene.background = new THREE.Color(0x0f172a);
    scene.fog = new THREE.FogExp2(0x0f172a, 0.03);

    const ambient = new THREE.AmbientLight(0xffffff, 0.75);
    const torchLight = new THREE.PointLight(0xffb800, 1.8, 12);
    torchLight.position.set(0, 5, 0);
    scene.add(ambient, torchLight);

    // Floor
    const floorGeo = new THREE.PlaneGeometry(12, 12);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Build Maze Walls from map
    const wallGeo = new THREE.BoxGeometry(1.2, 1.4, 1.2);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });

    MAZE_MAP.forEach((row, r) => {
      row.forEach((val, c) => {
        const x = (c - 3) * 1.2;
        const z = (r - 3) * 1.2;

        if (val === 1) {
          const wall = new THREE.Mesh(wallGeo, wallMat);
          wall.position.set(x, 0.7, z);
          wall.castShadow = true;
          wall.receiveShadow = true;
          scene.add(wall);
        } else if (val === 2) {
          // 3D Key
          const keyGeo = new THREE.OctahedronGeometry(0.3);
          const keyMat = new THREE.MeshStandardMaterial({
            color: 0xffb800,
            emissive: 0xff9800,
            emissiveIntensity: 0.6,
          });
          const keyMesh = new THREE.Mesh(keyGeo, keyMat);
          keyMesh.position.set(x, 0.5, z);
          scene.add(keyMesh);
          stateRef.current.keys.push({ x: c, z: r, mesh: keyMesh, collected: false });
        } else if (val === 3) {
          // Exit Portal
          const portalGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16);
          const portalMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
          const portal = new THREE.Mesh(portalGeo, portalMat);
          portal.position.set(x, 0.05, z);
          scene.add(portal);
          stateRef.current.exitMesh = portal;
        }
      });
    });

    // Player Glowing Orb
    const orbGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const orbMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x00b0ff,
      emissiveIntensity: 0.5,
      roughness: 0.1,
    });
    const player = new THREE.Mesh(orbGeo, orbMat);
    player.position.copy(stateRef.current.playerPos);
    player.castShadow = true;
    scene.add(player);
    stateRef.current.playerMesh = player;
  };

  const movePlayer = (dc: number, dr: number) => {
    if (gameWon || gameOver) return;
    const s = stateRef.current;

    // Convert current targetPos to map coords
    const currC = Math.round(s.targetPos.x / 1.2 + 3);
    const currR = Math.round(s.targetPos.z / 1.2 + 3);

    const nextC = currC + dc;
    const nextR = currR + dr;

    if (
      nextR >= 0 &&
      nextR < 7 &&
      nextC >= 0 &&
      nextC < 7 &&
      MAZE_MAP[nextR][nextC] !== 1 // not wall
    ) {
      s.targetPos.set((nextC - 3) * 1.2, 0.4, (nextR - 3) * 1.2);
      sound.playTap();

      // Check keys
      const keyObj = s.keys.find((k) => k.x === nextC && k.z === nextR && !k.collected);
      if (keyObj) {
        keyObj.collected = true;
        s.scene?.remove(keyObj.mesh);
        s.keysRemaining -= 1;
        setKeysLeft(s.keysRemaining);
        sound.playScore();
        if (s.scene) {
          s.particles.push(createParticleBurst(s.scene, keyObj.mesh.position, 0xffb800, 16));
        }
      }

      // Check exit portal
      if (nextC === 5 && nextR === 5) {
        if (s.keysRemaining === 0) {
          setGameWon(true);
          sound.playWin();
          onDone(timeLeft * 30);
        } else {
          sound.playHit();
        }
      }
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') movePlayer(0, -1);
      if (e.key === 'ArrowDown' || e.key === 's') movePlayer(0, 1);
      if (e.key === 'ArrowLeft' || e.key === 'a') movePlayer(-1, 0);
      if (e.key === 'ArrowRight' || e.key === 'd') movePlayer(1, 0);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gameWon, gameOver]);

  // Countdown timer
  useEffect(() => {
    if (gameWon || gameOver) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setGameOver(true);
          sound.playLose();
          onDone(0);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameWon, gameOver]);

  const onFrame = (dt: number) => {
    const s = stateRef.current;
    const delta = Math.min(dt, 0.05);

    // Smooth movement towards target
    s.playerPos.lerp(s.targetPos, 14 * delta);
    if (s.playerMesh) {
      s.playerMesh.position.copy(s.playerPos);
      s.playerMesh.rotation.x += delta * 4;
      s.playerMesh.rotation.z += delta * 4;
    }

    // Camera follow
    if (s.camera && s.playerMesh) {
      s.camera.position.x += (s.playerMesh.position.x - s.camera.position.x) * 4 * delta;
      s.camera.position.z += (s.playerMesh.position.z + 5.5 - s.camera.position.z) * 4 * delta;
    }

    // Spin keys
    s.keys.forEach((k) => {
      if (!k.collected) {
        k.mesh.rotation.y += delta * 3;
      }
    });

    s.particles = s.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    setTimeLeft(45);
    setKeysLeft(3);
    setGameWon(false);
    setGameOver(false);
    stateRef.current.keysRemaining = 3;
    stateRef.current.playerPos.set(-2.4, 0.4, -2.4);
    stateRef.current.targetPos.set(-2.4, 0.4, -2.4);
    stateRef.current.keys.forEach((k) => {
      k.collected = false;
      stateRef.current.scene?.add(k.mesh);
    });
  };

  return (
    <div className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-ink select-none">
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[-2.4, 6.5, 3]}
        cameraLookAt={[-2.4, 0.4, -2.4]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Keys: <span className="text-marigold">{3 - keysLeft} / 3</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Time: <span className={timeLeft < 10 ? 'text-red-400 animate-pulse' : 'text-white'}>{timeLeft}s</span>
        </div>
      </div>

      {/* Directional Pad for Touch & Mouse */}
      <div className="absolute bottom-5 inset-x-0 flex flex-col items-center gap-1.5 pointer-events-auto">
        <button
          onClick={() => movePlayer(0, -1)}
          className="w-13 h-13 px-4 py-2 bg-white/20 backdrop-blur text-white font-black text-xl rounded-2xl active:scale-90"
        >
          ▲
        </button>
        <div className="flex gap-4">
          <button
            onClick={() => movePlayer(-1, 0)}
            className="w-13 h-13 px-4 py-2 bg-white/20 backdrop-blur text-white font-black text-xl rounded-2xl active:scale-90"
          >
            ◀
          </button>
          <button
            onClick={() => movePlayer(0, 1)}
            className="w-13 h-13 px-4 py-2 bg-white/20 backdrop-blur text-white font-black text-xl rounded-2xl active:scale-90"
          >
            ▼
          </button>
          <button
            onClick={() => movePlayer(1, 0)}
            className="w-13 h-13 px-4 py-2 bg-white/20 backdrop-blur text-white font-black text-xl rounded-2xl active:scale-90"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Win/Loss Modal */}
      {(gameWon || gameOver) && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20 cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">{gameWon ? '🏆🧭' : '⏳'}</div>
          <h2 className="text-3xl font-extrabold tracking-tight">
            {gameWon ? 'Maze Escaped!' : 'Time Ran Out!'}
          </h2>
          <p className="text-xl font-bold mt-2">
            {gameWon ? `Score: ${timeLeft * 30} pts` : 'Find all 3 keys before exiting!'}
          </p>
          <button
            onClick={restart}
            className="mt-6 px-8 py-3.5 bg-marigold text-ink rounded-full font-extrabold text-lg hover:scale-105 active:scale-95 transition"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}
