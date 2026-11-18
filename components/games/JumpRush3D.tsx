'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import ThreeCanvas, { disposeHierarchy } from '../3d/ThreeCanvas';
import { createCharacter, createCoin, createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';

interface Props {
  onDone: (score: number) => void;
}

export default function JumpRush3D({ onDone }: Props) {
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  const stateRef = useRef({
    score: 0,
    speed: 12.0,
    playerY: 0,
    playerVy: 0,
    isGrounded: true,
    playerMesh: null as THREE.Group | null,
    platforms: [] as { mesh: THREE.Mesh; x: number; z: number; width: number; depth: number }[],
    coins: [] as { mesh: THREE.Mesh; x: number; z: number; collected: boolean }[],
    spikes: [] as { mesh: THREE.Mesh; x: number; z: number }[],
    particles: [] as { update: (dt: number) => boolean }[],
    scene: null as THREE.Scene | null,
    lastPlatformZ: 0,
    isJumping: false,
  });

  const jump = () => {
    const s = stateRef.current;
    if (s.isGrounded && !gameOver) {
      s.playerVy = 9.5;
      s.isGrounded = false;
      s.isJumping = true;
      sound.playJump();
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'w') {
        jump();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gameOver]);

  const initGame = ({ scene, camera }: { scene: THREE.Scene; camera: THREE.PerspectiveCamera }) => {
    stateRef.current.scene = scene;
    scene.background = new THREE.Color(0x191b1f);
    scene.fog = new THREE.FogExp2(0x191b1f, 0.025);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    const dirLight = new THREE.DirectionalLight(0xffb800, 1.2);
    dirLight.position.set(5, 15, 10);
    dirLight.castShadow = true;
    scene.add(ambient, dirLight);

    // Player
    const player = createCharacter({ color: 0xff5722, accessory: 'none', scale: 0.8 });
    player.position.set(0, 0, 0);
    scene.add(player);
    stateRef.current.playerMesh = player;

    // Initial starter runway
    const platMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.5 });
    const starterGeo = new THREE.BoxGeometry(4, 0.8, 20);
    const starter = new THREE.Mesh(starterGeo, platMat);
    starter.position.set(0, -0.4, 5);
    starter.receiveShadow = true;
    scene.add(starter);
    stateRef.current.platforms.push({ mesh: starter, x: 0, z: 5, width: 4, depth: 20 });
    stateRef.current.lastPlatformZ = -5;

    // Spawn initial platforms
    for (let i = 0; i < 8; i++) {
      spawnNextPlatform(scene);
    }
  };

  const spawnNextPlatform = (scene: THREE.Scene) => {
    const s = stateRef.current;
    const gap = 3.5 + Math.random() * 2.5;
    const depth = 6 + Math.random() * 6;
    const z = s.lastPlatformZ - gap - depth / 2;

    const platGeo = new THREE.BoxGeometry(4, 0.8, depth);
    const colors = [0x37474f, 0x455a64, 0x263238];
    const platMat = new THREE.MeshStandardMaterial({
      color: colors[Math.floor(Math.random() * colors.length)],
      roughness: 0.4,
    });
    const plat = new THREE.Mesh(platGeo, platMat);
    plat.position.set(0, -0.4, z);
    plat.receiveShadow = true;
    scene.add(plat);
    s.platforms.push({ mesh: plat, x: 0, z, width: 4, depth });
    s.lastPlatformZ = z - depth / 2;

    // Add coin or spike
    if (Math.random() < 0.6) {
      const coin = createCoin(0.7);
      coin.position.set(0, 0.8, z);
      scene.add(coin);
      s.coins.push({ mesh: coin, x: 0, z, collected: false });
    } else if (Math.random() < 0.4) {
      const spikeGeo = new THREE.ConeGeometry(0.35, 0.7, 6);
      const spikeMat = new THREE.MeshStandardMaterial({ color: 0xff1744, roughness: 0.3 });
      const spike = new THREE.Mesh(spikeGeo, spikeMat);
      spike.position.set(0, 0.35, z);
      spike.castShadow = true;
      scene.add(spike);
      s.spikes.push({ mesh: spike, x: 0, z });
    }
  };

  const onFrame = (dt: number) => {
    if (gameOver || !isPlaying) return;
    const s = stateRef.current;
    const delta = Math.min(dt, 0.05);

    // Advance speed
    s.speed += delta * 0.1;
    const moveZ = s.speed * delta;
    s.score += Math.floor(moveZ * 1.5);
    setScore(s.score);

    // Move platforms towards camera
    s.platforms.forEach((p) => {
      p.mesh.position.z += moveZ;
      p.z += moveZ;
    });
    s.coins.forEach((c) => {
      c.mesh.position.z += moveZ;
      c.z += moveZ;
      c.mesh.rotation.z += delta * 3;
    });
    s.spikes.forEach((sp) => {
      sp.mesh.position.z += moveZ;
      sp.z += moveZ;
    });
    s.lastPlatformZ += moveZ;

    // Remove old platforms and spawn new ones
    if (s.platforms.length && s.platforms[0].z > 15) {
      const old = s.platforms.shift()!;
      s.scene?.remove(old.mesh);
      old.mesh.geometry.dispose();
    }
    if (s.lastPlatformZ > -60 && s.scene) {
      spawnNextPlatform(s.scene);
    }

    // Player Gravity and Physics
    s.playerVy -= 22 * delta;
    s.playerY += s.playerVy * delta;

    // Check platform collision
    let onPlat = false;
    for (const p of s.platforms) {
      const minZ = p.z - p.depth / 2 - 0.3;
      const maxZ = p.z + p.depth / 2 + 0.3;
      if (0 >= minZ && 0 <= maxZ) {
        if (s.playerY <= 0 && s.playerY >= -0.8 && s.playerVy <= 0) {
          s.playerY = 0;
          s.playerVy = 0;
          s.isGrounded = true;
          onPlat = true;
          break;
        }
      }
    }

    if (!onPlat && s.playerY <= 0) {
      s.isGrounded = false;
    }

    // Spikes collision
    for (const sp of s.spikes) {
      if (Math.abs(sp.z) < 0.5 && s.playerY < 0.6) {
        triggerGameOver();
        return;
      }
    }

    // Coins collection
    for (const c of s.coins) {
      if (!c.collected && Math.abs(c.z) < 0.6 && s.playerY < 1.4) {
        c.collected = true;
        s.scene?.remove(c.mesh);
        s.score += 50;
        sound.playScore();
        if (s.scene) {
          s.particles.push(
            createParticleBurst(s.scene, new THREE.Vector3(0, 0.8, 0), 0xffb800, 12)
          );
        }
      }
    }

    // Fall into abyss
    if (s.playerY < -5) {
      triggerGameOver();
      return;
    }

    // Update player mesh
    if (s.playerMesh) {
      s.playerMesh.position.y = s.playerY;
      // Running tilt & bounce animation
      if (s.isGrounded) {
        s.playerMesh.position.y += Math.sin(Date.now() * 0.015) * 0.05;
        s.playerMesh.rotation.x = 0.1;
      } else {
        s.playerMesh.rotation.x = -0.2;
      }
    }

    // Update particles
    s.particles = s.particles.filter((p) => p.update(delta));
  };

  const triggerGameOver = () => {
    setGameOver(true);
    sound.playLose();
    onDone(stateRef.current.score);
  };

  const restart = () => {
    setScore(0);
    setGameOver(false);
    stateRef.current.score = 0;
    stateRef.current.speed = 12.0;
    stateRef.current.playerY = 0;
    stateRef.current.playerVy = 0;
    stateRef.current.isGrounded = true;
    stateRef.current.lastPlatformZ = -5;

    if (stateRef.current.scene) {
      stateRef.current.platforms.forEach((p) => stateRef.current.scene?.remove(p.mesh));
      stateRef.current.coins.forEach((c) => stateRef.current.scene?.remove(c.mesh));
      stateRef.current.spikes.forEach((s) => stateRef.current.scene?.remove(s.mesh));
      stateRef.current.platforms = [];
      stateRef.current.coins = [];
      stateRef.current.spikes = [];

      // Re-add starter runway
      const platMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.5 });
      const starterGeo = new THREE.BoxGeometry(4, 0.8, 20);
      const starter = new THREE.Mesh(starterGeo, platMat);
      starter.position.set(0, -0.4, 5);
      stateRef.current.scene.add(starter);
      stateRef.current.platforms.push({ mesh: starter, x: 0, z: 5, width: 4, depth: 20 });

      for (let i = 0; i < 8; i++) {
        spawnNextPlatform(stateRef.current.scene);
      }
    }
  };

  return (
    <div className="relative w-full h-[500px] rounded-3xl overflow-hidden bg-ink select-none cursor-pointer" onClick={jump}>
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[0, 3.5, 7]}
        cameraLookAt={[0, 1, -5]}
      />

      {/* HUD Bar */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-lg">
          Distance: <span className="text-marigold">{score} m</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-3 py-1.5 rounded-full border border-white/10 text-xs font-bold text-white/80">
          Tap / Space to Jump
        </div>
      </div>

      {/* Game Over Screen */}
      {gameOver && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20 cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">💥</div>
          <h2 className="text-3xl font-extrabold tracking-tight">Run Finished!</h2>
          <p className="text-xl font-bold mt-2">
            Distance: <span className="text-marigold">{score} meters</span>
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
