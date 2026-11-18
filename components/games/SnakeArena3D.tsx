'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';
import { BotDifficulty } from '@/lib/bots';

interface Props {
  onDone: (score: number) => void;
  botDifficulty?: BotDifficulty;
}

interface BodySegment {
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
}

export default function SnakeArena3D({ onDone, botDifficulty = 'Medium' }: Props) {
  const [score, setScore] = useState(0);
  const [snakeLength, setSnakeLength] = useState(5);
  const [gameOver, setGameOver] = useState(false);

  const stateRef = useRef({
    score: 0,
    headPos: new THREE.Vector3(0, 0.4, 0),
    headAngle: 0,
    targetAngle: 0,
    segments: [] as BodySegment[],
    botHeadPos: new THREE.Vector3(4, 0.4, 4),
    botAngle: Math.PI,
    botSegments: [] as BodySegment[],
    foodPellets: [] as { mesh: THREE.Mesh; pos: THREE.Vector3 }[],
    particles: [] as { update: (dt: number) => boolean }[],
    scene: null as THREE.Scene | null,
    arenaSize: 22,
  });

  const initGame = ({ scene }: { scene: THREE.Scene }) => {
    stateRef.current.scene = scene;
    scene.background = new THREE.Color(0x0f172a);

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    const sun = new THREE.DirectionalLight(0xffb800, 1.3);
    sun.position.set(10, 20, 15);
    scene.add(ambient, sun);

    // Arena Floor & Grid
    const floorGeo = new THREE.PlaneGeometry(24, 24);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(24, 24, 0x00e5ff, 0x334155);
    grid.position.y = 0.02;
    scene.add(grid);

    // Initial Player Snake Segments (Cyan)
    for (let i = 0; i < 5; i++) {
      const geo = new THREE.SphereGeometry(0.38 - i * 0.02, 12, 12);
      const mat = new THREE.MeshStandardMaterial({
        color: i === 0 ? 0x00e5ff : 0x0284c7,
        emissive: 0x00b0ff,
        emissiveIntensity: 0.3,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const pos = new THREE.Vector3(0, 0.4, i * 0.6);
      mesh.position.copy(pos);
      scene.add(mesh);
      stateRef.current.segments.push({ mesh, pos });
    }

    // Initial AI Bot Snake Segments (Red)
    for (let i = 0; i < 5; i++) {
      const geo = new THREE.SphereGeometry(0.38 - i * 0.02, 12, 12);
      const mat = new THREE.MeshStandardMaterial({
        color: i === 0 ? 0xff1744 : 0xb91c1c,
        emissive: 0xd50000,
        emissiveIntensity: 0.3,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const pos = new THREE.Vector3(4, 0.4, 4 + i * 0.6);
      mesh.position.copy(pos);
      scene.add(mesh);
      stateRef.current.botSegments.push({ mesh, pos });
    }

    // Spawn 15 Glowing Food Pellets
    for (let i = 0; i < 15; i++) {
      spawnFoodPellet(scene);
    }
  };

  const spawnFoodPellet = (scene: THREE.Scene) => {
    const geo = new THREE.SphereGeometry(0.22, 10, 10);
    const colors = [0xffb800, 0x00e676, 0xff007f, 0x76ff03];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.7,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const pos = new THREE.Vector3(
      (Math.random() - 0.5) * 20,
      0.3,
      (Math.random() - 0.5) * 20
    );
    mesh.position.copy(pos);
    scene.add(mesh);
    stateRef.current.foodPellets.push({ mesh, pos });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    stateRef.current.targetAngle = Math.atan2(ny, nx);
  };

  const onFrame = (dt: number) => {
    if (gameOver) return;
    const s = stateRef.current;
    const delta = Math.min(dt, 0.05);

    // Player Snake Steering & Movement
    let diff = s.targetAngle - s.headAngle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    s.headAngle += diff * 6 * delta;

    const speed = 7.5;
    s.headPos.x += Math.cos(s.headAngle) * speed * delta;
    s.headPos.z += Math.sin(s.headAngle) * speed * delta;

    // Boundary wrap or check
    if (Math.abs(s.headPos.x) > 11.5 || Math.abs(s.headPos.z) > 11.5) {
      setGameOver(true);
      sound.playHit();
      sound.playLose();
      onDone(s.score);
      return;
    }

    // Follow segments
    s.segments[0].pos.copy(s.headPos);
    s.segments[0].mesh.position.copy(s.headPos);

    for (let i = 1; i < s.segments.length; i++) {
      const prev = s.segments[i - 1].pos;
      const curr = s.segments[i].pos;
      const dir = prev.clone().sub(curr);
      const dist = dir.length();
      if (dist > 0.5) {
        curr.add(dir.normalize().multiplyScalar(dist - 0.5));
      }
      s.segments[i].mesh.position.copy(curr);
    }

    // Bot AI Slither (Hunts nearest food)
    if (s.foodPellets.length > 0) {
      const nearest = s.foodPellets.reduce((best, f) => {
        const d = f.pos.distanceTo(s.botHeadPos);
        return d < best.d ? { f, d } : best;
      }, { f: s.foodPellets[0], d: Infinity });

      const targetBotAngle = Math.atan2(
        nearest.f.pos.z - s.botHeadPos.z,
        nearest.f.pos.x - s.botHeadPos.x
      );
      s.botAngle += (targetBotAngle - s.botAngle) * 5 * delta;
    }

    const botSpeed = 6.8;
    s.botHeadPos.x += Math.cos(s.botAngle) * botSpeed * delta;
    s.botHeadPos.z += Math.sin(s.botAngle) * botSpeed * delta;

    s.botSegments[0].pos.copy(s.botHeadPos);
    s.botSegments[0].mesh.position.copy(s.botHeadPos);
    for (let i = 1; i < s.botSegments.length; i++) {
      const prev = s.botSegments[i - 1].pos;
      const curr = s.botSegments[i].pos;
      const dir = prev.clone().sub(curr);
      const dist = dir.length();
      if (dist > 0.5) {
        curr.add(dir.normalize().multiplyScalar(dist - 0.5));
      }
      s.botSegments[i].mesh.position.copy(curr);
    }

    // Check Player Eating Food
    for (let i = s.foodPellets.length - 1; i >= 0; i--) {
      const f = s.foodPellets[i];
      if (f.pos.distanceTo(s.headPos) < 0.8) {
        s.scene?.remove(f.mesh);
        s.foodPellets.splice(i, 1);

        s.score += 50;
        setScore(s.score);
        sound.playPop();

        // Grow player snake
        if (s.scene) {
          s.particles.push(createParticleBurst(s.scene, f.pos, 0x00e5ff, 12));
          spawnFoodPellet(s.scene);

          const tail = s.segments[s.segments.length - 1].pos.clone();
          const geo = new THREE.SphereGeometry(0.3, 10, 10);
          const mat = new THREE.MeshStandardMaterial({ color: 0x0284c7 });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.copy(tail);
          s.scene.add(mesh);
          s.segments.push({ mesh, pos: tail });
          setSnakeLength(s.segments.length);
        }
      }
    }

    // Check Collision with Bot Body
    for (const bSeg of s.botSegments) {
      if (bSeg.pos.distanceTo(s.headPos) < 0.6) {
        setGameOver(true);
        sound.playHit();
        sound.playLose();
        onDone(s.score);
        return;
      }
    }

    s.particles = s.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    const s = stateRef.current;
    s.score = 0;
    setScore(0);
    setGameOver(false);
    s.headPos.set(0, 0.4, 0);
    s.headAngle = 0;
    s.targetAngle = 0;
    setSnakeLength(5);
  };

  return (
    <div
      className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-ink select-none cursor-crosshair touch-none"
      onPointerMove={handlePointerMove}
    >
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[0, 16, 12]}
        cameraLookAt={[0, 0, 0]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Score: <span className="text-cyan-400">{score}</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Length: <span className="text-marigold">{snakeLength}</span>
        </div>
      </div>

      <div className="absolute bottom-4 inset-x-0 text-center pointer-events-none">
        <span className="text-xs font-bold text-white/60 bg-ink/70 px-4 py-1.5 rounded-full border border-white/10">
          Guide snake with cursor/finger. Eat glowing pellets to grow. Don't crash into arena walls or the bot snake!
        </span>
      </div>

      {/* Game Over Screen */}
      {gameOver && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">🐍💥</div>
          <h2 className="text-3xl font-extrabold tracking-tight">Snake Crashed!</h2>
          <p className="text-xl font-bold mt-2">
            Final Score: <span className="text-cyan-400">{score} pts</span> · Length: {snakeLength}
          </p>
          <button
            onClick={restart}
            className="mt-6 px-8 py-3.5 bg-marigold text-ink rounded-full font-extrabold text-lg hover:scale-105 active:scale-95 transition"
          >
            Slither Again
          </button>
        </div>
      )}
    </div>
  );
}
