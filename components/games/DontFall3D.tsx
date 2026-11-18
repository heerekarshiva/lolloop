'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createCharacter, createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';

interface Props {
  onDone: (score: number) => void;
}

interface HexTile {
  mesh: THREE.Mesh;
  x: number;
  z: number;
  tier: number;
  crumbleTimer: number;
  isTriggered: boolean;
  isFallen: boolean;
}

export default function DontFall3D({ onDone }: Props) {
  const [survivalSecs, setSurvivalSecs] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const stateRef = useRef({
    playerPos: new THREE.Vector3(0, 0.4, 0),
    playerMesh: null as THREE.Group | null,
    tiles: [] as HexTile[],
    scene: null as THREE.Scene | null,
    particles: [] as { update: (dt: number) => boolean }[],
  });

  const initGame = ({ scene }: { scene: THREE.Scene }) => {
    stateRef.current.scene = scene;
    scene.background = new THREE.Color(0x0f172a);

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    const dir = new THREE.DirectionalLight(0xffb800, 1.4);
    dir.position.set(5, 15, 10);
    scene.add(ambient, dir);

    // Player
    const player = createCharacter({ color: 0x00e5ff, scale: 0.75 });
    player.position.set(0, 0.4, 0);
    scene.add(player);
    stateRef.current.playerMesh = player;

    // Generate 5x5 Hexagonal Grid Floor
    const hexGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.25, 6);
    const colors = [0x3b82f6, 0x8b5cf6, 0xec4899];

    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const x = c * 1.55 + (r % 2 !== 0 ? 0.77 : 0);
        const z = r * 1.35;
        const mat = new THREE.MeshStandardMaterial({
          color: colors[(Math.abs(r) + Math.abs(c)) % colors.length],
          roughness: 0.4,
        });
        const mesh = new THREE.Mesh(hexGeo, mat);
        mesh.position.set(x, 0, z);
        scene.add(mesh);

        stateRef.current.tiles.push({
          mesh,
          x,
          z,
          tier: 1,
          crumbleTimer: 1.1,
          isTriggered: false,
          isFallen: false,
        });
      }
    }
  };

  const movePlayer = (dx: number, dz: number) => {
    if (gameOver) return;
    const s = stateRef.current;
    s.playerPos.x += dx;
    s.playerPos.z += dz;
    sound.playJump();

    if (s.playerMesh) s.playerMesh.position.copy(s.playerPos);

    // Trigger tile under player
    s.tiles.forEach((t) => {
      if (!t.isFallen && Math.hypot(t.x - s.playerPos.x, t.z - s.playerPos.z) < 0.9) {
        t.isTriggered = true;
        (t.mesh.material as THREE.MeshStandardMaterial).color.setHex(0xff1744); // turns warning red!
      }
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') movePlayer(0, -1.35);
      if (e.key === 'ArrowDown' || e.key === 's') movePlayer(0, 1.35);
      if (e.key === 'ArrowLeft' || e.key === 'a') movePlayer(-1.55, 0);
      if (e.key === 'ArrowRight' || e.key === 'd') movePlayer(1.55, 0);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gameOver]);

  // Survival seconds timer
  useEffect(() => {
    if (gameOver) return;
    const interval = setInterval(() => {
      setSurvivalSecs((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [gameOver]);

  const onFrame = (dt: number) => {
    if (gameOver) return;
    const s = stateRef.current;
    const delta = Math.min(dt, 0.05);

    // Check if player stands on air (all surrounding tiles fallen)
    let supported = false;
    s.tiles.forEach((t) => {
      if (t.isTriggered && !t.isFallen) {
        t.crumbleTimer -= delta;
        if (t.crumbleTimer <= 0) {
          t.isFallen = true;
          s.scene?.remove(t.mesh);
          sound.playHit();
        }
      }

      if (!t.isFallen && Math.hypot(t.x - s.playerPos.x, t.z - s.playerPos.z) < 0.8) {
        supported = true;
      }
    });

    if (!supported && s.tiles.some((t) => t.isTriggered)) {
      setGameOver(true);
      sound.playLose();
      onDone(survivalSecs * 50);
    }

    s.particles = s.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    setSurvivalSecs(0);
    setGameOver(false);
    stateRef.current.playerPos.set(0, 0.4, 0);
    if (stateRef.current.playerMesh) stateRef.current.playerMesh.position.set(0, 0.4, 0);
    stateRef.current.tiles.forEach((t) => {
      t.isTriggered = false;
      t.isFallen = false;
      t.crumbleTimer = 1.1;
      (t.mesh.material as THREE.MeshStandardMaterial).color.setHex(0x3b82f6);
      stateRef.current.scene?.add(t.mesh);
    });
  };

  return (
    <div className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-ink select-none">
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[0, 7.5, 6.5]}
        cameraLookAt={[0, 0, 0]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Survived: <span className="text-marigold">{survivalSecs}s</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-sm">
          Tiles collapse after stepping on them!
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-6 inset-x-0 flex flex-col items-center gap-2 pointer-events-auto">
        <button
          onClick={() => movePlayer(0, -1.35)}
          className="w-14 h-14 bg-white/20 backdrop-blur text-white font-black text-2xl rounded-2xl active:scale-90"
        >
          ▲
        </button>
        <div className="flex gap-4">
          <button
            onClick={() => movePlayer(-1.55, 0)}
            className="w-14 h-14 bg-white/20 backdrop-blur text-white font-black text-2xl rounded-2xl active:scale-90"
          >
            ◀
          </button>
          <button
            onClick={() => movePlayer(0, 1.35)}
            className="w-14 h-14 bg-white/20 backdrop-blur text-white font-black text-2xl rounded-2xl active:scale-90"
          >
            ▼
          </button>
          <button
            onClick={() => movePlayer(1.55, 0)}
            className="w-14 h-14 bg-white/20 backdrop-blur text-white font-black text-2xl rounded-2xl active:scale-90"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Game Over Screen */}
      {gameOver && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">🕳️🏃‍♂️</div>
          <h2 className="text-3xl font-extrabold tracking-tight">Fell Into The Abyss!</h2>
          <p className="text-xl font-bold mt-2">
            Survival Time: <span className="text-marigold">{survivalSecs} seconds</span>
          </p>
          <button
            onClick={restart}
            className="mt-6 px-8 py-3.5 bg-marigold text-ink rounded-full font-extrabold text-lg hover:scale-105 active:scale-95 transition"
          >
            Hop Again
          </button>
        </div>
      )}
    </div>
  );
}
