'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createCharacter, createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';

interface Props {
  onDone: (score: number) => void;
}

export default function CastleEscape3D({ onDone }: Props) {
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [leversPulled, setLeversPulled] = useState(0);

  const stateRef = useRef({
    playerPos: new THREE.Vector3(0, 0, 5),
    playerMesh: null as THREE.Group | null,
    pendulums: [] as { group: THREE.Group; bladeMesh: THREE.Mesh; z: number; phase: number }[],
    leverMesh: null as THREE.Mesh | null,
    leverPulled: false,
    scene: null as THREE.Scene | null,
    particles: [] as { update: (dt: number) => boolean }[],
  });

  const initGame = ({ scene }: { scene: THREE.Scene }) => {
    stateRef.current.scene = scene;
    scene.background = new THREE.Color(0x0f172a);
    scene.fog = new THREE.FogExp2(0x0f172a, 0.025);

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    const torch = new THREE.PointLight(0xff9100, 2.0, 15);
    torch.position.set(0, 4, 0);
    scene.add(ambient, torch);

    // Castle Stone Hallway
    const hallGeo = new THREE.BoxGeometry(5.0, 0.4, 26);
    const hallMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    const hall = new THREE.Mesh(hallGeo, hallMat);
    hall.position.set(0, -0.2, -4);
    scene.add(hall);

    // Wall columns
    for (let z = 6; z > -16; z -= 4) {
      [-2.6, 2.6].forEach((x) => {
        const colGeo = new THREE.BoxGeometry(0.5, 4.5, 0.5);
        const colMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
        const col = new THREE.Mesh(colGeo, colMat);
        col.position.set(x, 2, z);
        scene.add(col);
      });
    }

    // Player Knight
    const player = createCharacter({ color: 0x94a3b8, accessory: 'none', scale: 0.75 });
    player.position.set(0, 0, 5);
    scene.add(player);
    stateRef.current.playerMesh = player;

    // 3 Swinging Pendulum Blades
    [-8, -2, 2].forEach((z, idx) => {
      const group = new THREE.Group();
      group.position.set(0, 4.5, z);

      // Rod
      const rodGeo = new THREE.CylinderGeometry(0.06, 0.06, 4.0, 8);
      const rodMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
      const rod = new THREE.Mesh(rodGeo, rodMat);
      rod.position.y = -2.0;
      group.add(rod);

      // Curved Scythe Blade
      const bladeGeo = new THREE.TorusGeometry(1.0, 0.15, 8, 16, Math.PI / 2);
      const bladeMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.9, roughness: 0.1 });
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.position.y = -4.0;
      blade.rotation.z = Math.PI / 4;
      group.add(blade);

      scene.add(group);
      stateRef.current.pendulums.push({ group, bladeMesh: blade, z, phase: idx * Math.PI * 0.5 });
    });

    // Castle Exit Gate Door at -15
    const gateGeo = new THREE.BoxGeometry(4.0, 3.5, 0.3);
    const gateMat = new THREE.MeshStandardMaterial({ color: 0x78350f, metalness: 0.6 });
    const gate = new THREE.Mesh(gateGeo, gateMat);
    gate.position.set(0, 1.75, -15.5);
    scene.add(gate);
  };

  const movePlayer = (dx: number, dz: number) => {
    if (gameOver || gameWon) return;
    const s = stateRef.current;
    s.playerPos.x = Math.max(-2.0, Math.min(2.0, s.playerPos.x + dx));
    s.playerPos.z = Math.max(-15, Math.min(6, s.playerPos.z + dz));
    sound.playTap();

    if (s.playerMesh) s.playerMesh.position.copy(s.playerPos);

    // Reached Exit Portcullis!
    if (s.playerPos.z <= -14.5) {
      sound.playWin();
      setGameWon(true);
      setLeversPulled(1);
      if (s.scene) {
        s.particles.push(createParticleBurst(s.scene, new THREE.Vector3(0, 1.5, -14.5), 0xffb800, 30));
      }
      onDone(1400);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') movePlayer(0, -1.2);
      if (e.key === 'ArrowDown' || e.key === 's') movePlayer(0, 1.2);
      if (e.key === 'ArrowLeft' || e.key === 'a') movePlayer(-1.2, 0);
      if (e.key === 'ArrowRight' || e.key === 'd') movePlayer(1.2, 0);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gameOver, gameWon]);

  const onFrame = (dt: number, time: number) => {
    if (gameOver || gameWon) return;
    const s = stateRef.current;
    const delta = Math.min(dt, 0.05);

    // Swing pendulums
    s.pendulums.forEach((p) => {
      const angle = Math.sin(time * 3.2 + p.phase) * (Math.PI / 3);
      p.group.rotation.z = angle;

      // Calculate blade world position for collision
      const bladeX = Math.sin(angle) * 4.0;
      if (Math.abs(p.z - s.playerPos.z) < 0.8) {
        if (Math.abs(bladeX - s.playerPos.x) < 1.1) {
          // Hit by pendulum blade!
          setGameOver(true);
          sound.playHit();
          sound.playLose();
          if (s.scene) {
            s.particles.push(createParticleBurst(s.scene, s.playerPos, 0xff1744, 25));
          }
          onDone(300);
        }
      }
    });

    s.particles = s.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    stateRef.current.playerPos.set(0, 0, 5);
    if (stateRef.current.playerMesh) stateRef.current.playerMesh.position.set(0, 0, 5);
    setGameOver(false);
    setGameWon(false);
  };

  return (
    <div className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-ink select-none">
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[0, 6.5, 9.5]}
        cameraLookAt={[0, 1.2, -4]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Castle Escape
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-sm">
          Time moves between swinging pendulum blades!
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-6 inset-x-0 flex flex-col items-center gap-2 pointer-events-auto">
        <button
          onClick={() => movePlayer(0, -1.2)}
          className="w-14 h-14 bg-white/20 backdrop-blur text-white font-black text-2xl rounded-2xl active:scale-90"
        >
          ▲
        </button>
        <div className="flex gap-4">
          <button
            onClick={() => movePlayer(-1.2, 0)}
            className="w-14 h-14 bg-white/20 backdrop-blur text-white font-black text-2xl rounded-2xl active:scale-90"
          >
            ◀
          </button>
          <button
            onClick={() => movePlayer(0, 1.2)}
            className="w-14 h-14 bg-white/20 backdrop-blur text-white font-black text-2xl rounded-2xl active:scale-90"
          >
            ▼
          </button>
          <button
            onClick={() => movePlayer(1.2, 0)}
            className="w-14 h-14 bg-white/20 backdrop-blur text-white font-black text-2xl rounded-2xl active:scale-90"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Game Over Modal */}
      {(gameOver || gameWon) && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">{gameWon ? '🏆🏰' : '⚔️💀'}</div>
          <h2 className="text-3xl font-extrabold tracking-tight">
            {gameWon ? 'Castle Keep Escaped!' : 'Sliced by Pendulum Blade!'}
          </h2>
          <button
            onClick={restart}
            className="mt-6 px-8 py-3.5 bg-marigold text-ink rounded-full font-extrabold text-lg hover:scale-105 active:scale-95 transition"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
