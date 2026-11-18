'use client';

import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';

interface Props {
  onDone: (score: number) => void;
}

interface Target {
  mesh: THREE.Mesh;
  isBomb: boolean;
  color: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rotSpeed: THREE.Vector3;
  radius: number;
  sliced: boolean;
}

export default function SliceMaster3D({ onDone }: Props) {
  const [score, setScore] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const stateRef = useRef({
    score: 0,
    strikes: 0,
    targets: [] as Target[],
    particles: [] as { update: (dt: number) => boolean }[],
    scene: null as THREE.Scene | null,
    camera: null as THREE.PerspectiveCamera | null,
    lastMouse: null as { x: number; y: number } | null,
    isPointerDown: false,
    spawnCooldown: 0,
    raycaster: new THREE.Raycaster(),
  });

  const initGame = ({ scene, camera }: { scene: THREE.Scene; camera: THREE.PerspectiveCamera }) => {
    stateRef.current.scene = scene;
    stateRef.current.camera = camera;
    scene.background = new THREE.Color(0x18181b);

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    const dirLight = new THREE.DirectionalLight(0xffb800, 1.2);
    dirLight.position.set(5, 10, 8);
    scene.add(ambient, dirLight);

    // Initial launch
    launchWave(scene);
  };

  const launchWave = (scene: THREE.Scene) => {
    const count = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const isBomb = Math.random() < 0.22;
      const radius = isBomb ? 0.45 : 0.4 + Math.random() * 0.25;
      const geo = isBomb ? new THREE.SphereGeometry(radius, 12, 12) : new THREE.DodecahedronGeometry(radius);

      const fruitColors = [0xff1744, 0xff9100, 0x00e676, 0xffeb3b, 0xd500f9];
      const color = isBomb ? 0x212121 : fruitColors[Math.floor(Math.random() * fruitColors.length)];

      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.3,
        metalness: isBomb ? 0.7 : 0.1,
        emissive: isBomb ? 0xd50000 : 0x000000,
        emissiveIntensity: isBomb ? 0.3 : 0,
      });

      const mesh = new THREE.Mesh(geo, mat);
      const startX = (Math.random() - 0.5) * 6;
      mesh.position.set(startX, -5.5, 0);
      scene.add(mesh);

      stateRef.current.targets.push({
        mesh,
        isBomb,
        color,
        pos: new THREE.Vector3(startX, -5.5, 0),
        vel: new THREE.Vector3((Math.random() - 0.5) * 3, 11 + Math.random() * 3.5, 0),
        rotSpeed: new THREE.Vector3(Math.random() * 4, Math.random() * 4, Math.random() * 4),
        radius,
        sliced: false,
      });
    }
  };

  const checkSliceAt = (clientX: number, clientY: number, container: HTMLDivElement) => {
    const s = stateRef.current;
    if (!s.camera || !s.scene || gameOver) return;

    const rect = container.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );

    s.raycaster.setFromCamera(mouse, s.camera);
    const meshes = s.targets.filter((t) => !t.sliced).map((t) => t.mesh);
    const hits = s.raycaster.intersectObjects(meshes);

    if (hits.length > 0) {
      const hitMesh = hits[0].object as THREE.Mesh;
      const t = s.targets.find((target) => target.mesh === hitMesh);
      if (t && !t.sliced) {
        t.sliced = true;
        s.scene.remove(t.mesh);

        if (t.isBomb) {
          sound.playHit();
          s.particles.push(createParticleBurst(s.scene, hits[0].point, 0xff1744, 30));
          setGameOver(true);
          sound.playLose();
          onDone(s.score);
        } else {
          sound.playSlice();
          s.score += 100;
          setScore(s.score);
          s.particles.push(createParticleBurst(s.scene, hits[0].point, t.color, 24));
        }
      }
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    stateRef.current.isPointerDown = true;
    checkSliceAt(e.clientX, e.clientY, e.currentTarget);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (stateRef.current.isPointerDown) {
      checkSliceAt(e.clientX, e.clientY, e.currentTarget);
    }
  };

  const handlePointerUp = () => {
    stateRef.current.isPointerDown = false;
  };

  const onFrame = (dt: number) => {
    if (gameOver) return;
    const s = stateRef.current;
    const delta = Math.min(dt, 0.05);

    // Spawn wave timer
    s.spawnCooldown += delta;
    if (s.spawnCooldown > 1.8 && s.scene) {
      s.spawnCooldown = 0;
      launchWave(s.scene);
    }

    // Update targets
    for (let i = s.targets.length - 1; i >= 0; i--) {
      const t = s.targets[i];
      if (t.sliced) {
        s.targets.splice(i, 1);
        continue;
      }

      t.vel.y -= 13 * delta; // gravity
      t.pos.addScaledVector(t.vel, delta);
      t.mesh.position.copy(t.pos);

      t.mesh.rotation.x += t.rotSpeed.x * delta;
      t.mesh.rotation.y += t.rotSpeed.y * delta;

      // Missed fruit fallen below screen
      if (t.pos.y < -6 && t.vel.y < 0) {
        s.scene?.remove(t.mesh);
        t.mesh.geometry.dispose();
        s.targets.splice(i, 1);

        if (!t.isBomb) {
          s.strikes += 1;
          setStrikes(s.strikes);
          sound.playHit();
          if (s.strikes >= 3) {
            setGameOver(true);
            sound.playLose();
            onDone(s.score);
          }
        }
      }
    }

    // Update particles
    s.particles = s.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    setScore(0);
    setStrikes(0);
    setGameOver(false);
    stateRef.current.score = 0;
    stateRef.current.strikes = 0;
    stateRef.current.spawnCooldown = 0;

    if (stateRef.current.scene) {
      stateRef.current.targets.forEach((t) => stateRef.current.scene?.remove(t.mesh));
      stateRef.current.targets = [];
      launchWave(stateRef.current.scene);
    }
  };

  return (
    <div
      className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-ink select-none cursor-crosshair touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[0, 0, 11]}
        cameraLookAt={[0, 0, 0]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Score: <span className="text-lime-400">{score}</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Strikes: <span className="text-red-400">{'❌'.repeat(strikes)}</span>
        </div>
      </div>

      <div className="absolute bottom-4 inset-x-0 text-center pointer-events-none">
        <span className="text-xs font-bold text-white/60 bg-ink/70 px-4 py-1.5 rounded-full border border-white/10">
          Swipe / Drag cursor across targets to slice! Avoid the bombs.
        </span>
      </div>

      {/* Game Over Screen */}
      {gameOver && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20 cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">⚔️</div>
          <h2 className="text-3xl font-extrabold tracking-tight">Game Over</h2>
          <p className="text-xl font-bold mt-2">
            Final Slices: <span className="text-lime-400">{score} pts</span>
          </p>
          <button
            onClick={restart}
            className="mt-6 px-8 py-3.5 bg-lime-400 text-ink rounded-full font-extrabold text-lg hover:scale-105 active:scale-95 transition"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}
