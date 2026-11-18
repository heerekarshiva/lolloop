'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createCharacter, createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';

interface Props {
  onDone: (score: number) => void;
}

export default function SpaceBuddies3D({ onDone }: Props) {
  const [repairs, setRepairs] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const stateRef = useRef({
    astro1Pos: new THREE.Vector3(-1.5, 0, 0),
    astro2Pos: new THREE.Vector3(1.5, 0, 0),
    astro1Mesh: null as THREE.Group | null,
    astro2Mesh: null as THREE.Group | null,
    tetherLine: null as THREE.Line | null,
    arrays: [] as { mesh: THREE.Mesh; pos: THREE.Vector3; repaired: boolean }[],
    meteoroids: [] as { mesh: THREE.Mesh; pos: THREE.Vector3; vel: THREE.Vector3 }[],
    scene: null as THREE.Scene | null,
    particles: [] as { update: (dt: number) => boolean }[],
    keysDown: {} as Record<string, boolean>,
  });

  const initGame = ({ scene }: { scene: THREE.Scene }) => {
    stateRef.current.scene = scene;
    scene.background = new THREE.Color(0x030712);

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    const sun = new THREE.DirectionalLight(0x38bdf8, 1.4);
    sun.position.set(10, 15, 10);
    scene.add(ambient, sun);

    // Distant Earth sphere
    const earthGeo = new THREE.SphereGeometry(15, 32, 32);
    const earthMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.6 });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    earth.position.set(-20, -18, -40);
    scene.add(earth);

    // Astronaut 1 (Player)
    const astro1 = createCharacter({ color: 0xffffff, accessory: 'spaceHelmet', scale: 0.75 });
    astro1.position.set(-1.5, 0, 0);
    scene.add(astro1);
    stateRef.current.astro1Mesh = astro1;

    // Astronaut 2 (AI Buddy)
    const astro2 = createCharacter({ color: 0xffb800, accessory: 'spaceHelmet', scale: 0.75 });
    astro2.position.set(1.5, 0, 0);
    scene.add(astro2);
    stateRef.current.astro2Mesh = astro2;

    // Glowing Tether Line
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-1.5, 0.5, 0),
      new THREE.Vector3(1.5, 0.5, 0),
    ]);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x00e5ff });
    const tether = new THREE.Line(lineGeo, lineMat);
    scene.add(tether);
    stateRef.current.tetherLine = tether;

    // 4 Broken Solar Arrays to Repair
    [
      new THREE.Vector3(-4, 2, -2),
      new THREE.Vector3(4, 2, -2),
      new THREE.Vector3(-3, -2, 2),
      new THREE.Vector3(3, -2, 2),
    ].forEach((pos) => {
      const arrayGeo = new THREE.BoxGeometry(1.6, 0.8, 0.1);
      const arrayMat = new THREE.MeshStandardMaterial({
        color: 0xef4444, // red means damaged
        emissive: 0xb91c1c,
        emissiveIntensity: 0.4,
      });
      const arrMesh = new THREE.Mesh(arrayGeo, arrayMat);
      arrMesh.position.copy(pos);
      scene.add(arrMesh);
      stateRef.current.arrays.push({ mesh: arrMesh, pos, repaired: false });
    });
  };

  const movePlayer = (dx: number, dy: number) => {
    if (gameOver || gameWon) return;
    const s = stateRef.current;
    s.astro1Pos.x = Math.max(-5.5, Math.min(5.5, s.astro1Pos.x + dx));
    s.astro1Pos.y = Math.max(-3.5, Math.min(3.5, s.astro1Pos.y + dy));
    sound.playTap();

    if (s.astro1Mesh) s.astro1Mesh.position.copy(s.astro1Pos);

    // AI Buddy follows via elastic tether
    const dir = s.astro1Pos.clone().sub(s.astro2Pos);
    if (dir.length() > 2.8) {
      s.astro2Pos.add(dir.normalize().multiplyScalar(0.8));
      if (s.astro2Mesh) s.astro2Mesh.position.copy(s.astro2Pos);
    }

    // Check array repair (either astronaut touches)
    s.arrays.forEach((arr) => {
      if (!arr.repaired) {
        if (arr.pos.distanceTo(s.astro1Pos) < 1.4 || arr.pos.distanceTo(s.astro2Pos) < 1.4) {
          arr.repaired = true;
          (arr.mesh.material as THREE.MeshStandardMaterial).color.setHex(0x22c55e);
          (arr.mesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x15803d);
          sound.playScore();

          if (s.scene) {
            s.particles.push(createParticleBurst(s.scene, arr.pos, 0x22c55e, 18));
          }

          setRepairs((r) => {
            const nr = r + 1;
            if (nr === 4) {
              setGameWon(true);
              sound.playWin();
              onDone(1600);
            }
            return nr;
          });
        }
      }
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') movePlayer(0, 0.8);
      if (e.key === 'ArrowDown' || e.key === 's') movePlayer(0, -0.8);
      if (e.key === 'ArrowLeft' || e.key === 'a') movePlayer(-0.8, 0);
      if (e.key === 'ArrowRight' || e.key === 'd') movePlayer(0.8, 0);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gameOver, gameWon]);

  const onFrame = (dt: number) => {
    const s = stateRef.current;
    const delta = Math.min(dt, 0.05);

    // Update tether line endpoints
    if (s.tetherLine && s.astro1Mesh && s.astro2Mesh) {
      s.tetherLine.geometry.setFromPoints([
        s.astro1Pos.clone().add(new THREE.Vector3(0, 0.5, 0)),
        s.astro2Pos.clone().add(new THREE.Vector3(0, 0.5, 0)),
      ]);
    }

    s.particles = s.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    setRepairs(0);
    setGameOver(false);
    setGameWon(false);
    stateRef.current.astro1Pos.set(-1.5, 0, 0);
    stateRef.current.astro2Pos.set(1.5, 0, 0);
    stateRef.current.arrays.forEach((a) => {
      a.repaired = false;
      (a.mesh.material as THREE.MeshStandardMaterial).color.setHex(0xef4444);
    });
  };

  return (
    <div className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-ink select-none">
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[0, 0, 8.5]}
        cameraLookAt={[0, 0, 0]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Arrays Repaired: <span className="text-cyan-400">{repairs} / 4</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-sm">
          Zero-G Spacewalk Co-op Tether
        </div>
      </div>

      {/* Thruster Controls */}
      <div className="absolute bottom-6 inset-x-0 flex flex-col items-center gap-2 pointer-events-auto">
        <button
          onClick={() => movePlayer(0, 0.8)}
          className="w-14 h-14 bg-white/20 backdrop-blur text-white font-black text-2xl rounded-2xl active:scale-90"
        >
          ▲
        </button>
        <div className="flex gap-4">
          <button
            onClick={() => movePlayer(-0.8, 0)}
            className="w-14 h-14 bg-white/20 backdrop-blur text-white font-black text-2xl rounded-2xl active:scale-90"
          >
            ◀
          </button>
          <button
            onClick={() => movePlayer(0, -0.8)}
            className="w-14 h-14 bg-white/20 backdrop-blur text-white font-black text-2xl rounded-2xl active:scale-90"
          >
            ▼
          </button>
          <button
            onClick={() => movePlayer(0.8, 0)}
            className="w-14 h-14 bg-white/20 backdrop-blur text-white font-black text-2xl rounded-2xl active:scale-90"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Win Modal */}
      {gameWon && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">👨‍🚀👩‍🚀🛰️</div>
          <h2 className="text-3xl font-extrabold tracking-tight">Mothership Restored!</h2>
          <p className="text-xl font-bold mt-2">
            All solar arrays repaired! Spacewalk complete!
          </p>
          <button
            onClick={restart}
            className="mt-6 px-8 py-3.5 bg-marigold text-ink rounded-full font-extrabold text-lg hover:scale-105 active:scale-95 transition"
          >
            Spacewalk Again
          </button>
        </div>
      )}
    </div>
  );
}
