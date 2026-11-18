'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createCharacter, createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';

interface Props {
  onDone: (score: number) => void;
}

interface Projectile {
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
}

export default function DodgeMaster3D({ onDone }: Props) {
  const [seconds, setSeconds] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const stateRef = useRef({
    playerPos: new THREE.Vector3(0, 0, 0),
    playerMesh: null as THREE.Group | null,
    projectiles: [] as Projectile[],
    scene: null as THREE.Scene | null,
    spawnTimer: 0,
    particles: [] as { update: (dt: number) => boolean }[],
  });

  const initGame = ({ scene }: { scene: THREE.Scene }) => {
    stateRef.current.scene = scene;
    scene.background = new THREE.Color(0x18181b);

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    const dir = new THREE.DirectionalLight(0xffb800, 1.4);
    dir.position.set(5, 12, 10);
    scene.add(ambient, dir);

    // Floor Arena
    const floorGeo = new THREE.BoxGeometry(10, 0.4, 10);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.7 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.2;
    scene.add(floor);

    // Player
    const player = createCharacter({ color: 0x84cc16, scale: 0.75 });
    player.position.set(0, 0, 0);
    scene.add(player);
    stateRef.current.playerMesh = player;
  };

  const spawnProjectile = (scene: THREE.Scene) => {
    const geo = new THREE.SphereGeometry(0.35, 12, 12);
    const colors = [0xff1744, 0xffd600, 0x00e5ff, 0xff9100];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.3 });
    const mesh = new THREE.Mesh(geo, mat);

    // Spawn at outer edge
    const angle = Math.random() * Math.PI * 2;
    const spawnX = Math.cos(angle) * 7;
    const spawnZ = Math.sin(angle) * 7;
    mesh.position.set(spawnX, 0.35, spawnZ);
    scene.add(mesh);

    // Aim toward player center with velocity
    const vel = new THREE.Vector3(-spawnX, 0, -spawnZ).normalize().multiplyScalar(6.5 + Math.random() * 3);

    stateRef.current.projectiles.push({
      mesh,
      pos: new THREE.Vector3(spawnX, 0.35, spawnZ),
      vel,
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gameOver) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;

    const s = stateRef.current;
    s.playerPos.x = Math.max(-4.2, Math.min(4.2, nx * 4.5));
    s.playerPos.z = Math.max(-4.2, Math.min(4.2, ny * 4.5));

    if (s.playerMesh) {
      s.playerMesh.position.copy(s.playerPos);
    }
  };

  useEffect(() => {
    if (gameOver) return;
    const interval = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [gameOver]);

  const onFrame = (dt: number) => {
    if (gameOver) return;
    const s = stateRef.current;
    const delta = Math.min(dt, 0.05);

    // Spawn waves
    s.spawnTimer += delta;
    if (s.spawnTimer > 0.4 && s.scene) {
      s.spawnTimer = 0;
      spawnProjectile(s.scene);
    }

    // Move projectiles & check collisions
    for (let i = s.projectiles.length - 1; i >= 0; i--) {
      const p = s.projectiles[i];
      p.pos.addScaledVector(p.vel, delta);
      p.mesh.position.copy(p.pos);

      // Check hit with player
      if (p.pos.distanceTo(s.playerPos) < 0.85) {
        setGameOver(true);
        sound.playHit();
        sound.playLose();
        if (s.scene) {
          s.particles.push(createParticleBurst(s.scene, s.playerPos, 0xff1744, 25));
        }
        onDone(seconds * 50);
        return;
      }

      // Recycle projectiles
      if (Math.hypot(p.pos.x, p.pos.z) > 10) {
        s.scene?.remove(p.mesh);
        s.projectiles.splice(i, 1);
      }
    }

    s.particles = s.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    setSeconds(0);
    setGameOver(false);
    stateRef.current.playerPos.set(0, 0, 0);
    if (stateRef.current.scene) {
      stateRef.current.projectiles.forEach((p) => stateRef.current.scene?.remove(p.mesh));
      stateRef.current.projectiles = [];
    }
  };

  return (
    <div
      className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-ink select-none cursor-crosshair touch-none"
      onPointerMove={handlePointerMove}
    >
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[0, 9.5, 6.5]}
        cameraLookAt={[0, 0, 0]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Dodge Time: <span className="text-lime-400">{seconds}s</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-sm">
          Move cursor/finger to dodge flying projectiles!
        </div>
      </div>

      {/* Game Over Screen */}
      {gameOver && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">🥧💥</div>
          <h2 className="text-3xl font-extrabold tracking-tight">Splat! Hit By Projectile!</h2>
          <p className="text-xl font-bold mt-2">
            Survived: <span className="text-lime-400">{seconds} seconds</span>
          </p>
          <button
            onClick={restart}
            className="mt-6 px-8 py-3.5 bg-marigold text-ink rounded-full font-extrabold text-lg hover:scale-105 active:scale-95 transition"
          >
            Dodge Again
          </button>
        </div>
      )}
    </div>
  );
}
