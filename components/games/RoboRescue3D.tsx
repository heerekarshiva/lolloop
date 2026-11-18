'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createCharacter, createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';

interface Props {
  onDone: (score: number) => void;
}

export default function RoboRescue3D({ onDone }: Props) {
  const [botsRescued, setBotsRescued] = useState(0);
  const [lasersDisabled, setLasersDisabled] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);

  const stateRef = useRef({
    dronePos: new THREE.Vector3(0, 0.4, 4),
    droneMesh: null as THREE.Group | null,
    miniBots: [] as { mesh: THREE.Group; pos: THREE.Vector3; rescued: boolean }[],
    laserMeshes: [] as THREE.Mesh[],
    terminalPos: new THREE.Vector3(-3.5, 0.4, 0),
    terminalMesh: null as THREE.Mesh | null,
    scene: null as THREE.Scene | null,
    particles: [] as { update: (dt: number) => boolean }[],
  });

  const initGame = ({ scene }: { scene: THREE.Scene }) => {
    stateRef.current.scene = scene;
    scene.background = new THREE.Color(0x020617);

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    const cyanLight = new THREE.DirectionalLight(0x00e5ff, 1.4);
    cyanLight.position.set(5, 12, 8);
    scene.add(ambient, cyanLight);

    // Cyber Metal Grid Floor
    const floorGeo = new THREE.BoxGeometry(10, 0.4, 12);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.2;
    scene.add(floor);

    // Player Drone
    const drone = createCharacter({ color: 0x00e5ff, accessory: 'none', scale: 0.7 });
    drone.position.set(0, 0.4, 4);
    scene.add(drone);
    stateRef.current.droneMesh = drone;

    // Laser Security Grid (red beams blocking center)
    [-1, 1].forEach((x) => {
      const beamGeo = new THREE.BoxGeometry(0.08, 0.08, 12);
      const beamMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(x * 1.8, 0.4, 0);
      scene.add(beam);
      stateRef.current.laserMeshes.push(beam);
    });

    // Terminal Override Console (Left)
    const termGeo = new THREE.BoxGeometry(0.8, 1.2, 0.8);
    const termMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.5 });
    const terminal = new THREE.Mesh(termGeo, termMat);
    terminal.position.set(-3.5, 0.6, 0);
    scene.add(terminal);
    stateRef.current.terminalMesh = terminal;

    // 3 Stranded Mini-Bots (Yellow)
    [
      new THREE.Vector3(0, 0.3, -4),
      new THREE.Vector3(3.2, 0.3, -3),
      new THREE.Vector3(-3.2, 0.3, -4),
    ].forEach((pos) => {
      const mb = createCharacter({ color: 0xffb800, scale: 0.45 });
      mb.position.copy(pos);
      scene.add(mb);
      stateRef.current.miniBots.push({ mesh: mb, pos, rescued: false });
    });
  };

  const moveDrone = (dx: number, dz: number) => {
    if (gameOver || gameWon) return;
    const s = stateRef.current;
    const nextX = Math.max(-4.5, Math.min(4.5, s.dronePos.x + dx));
    const nextZ = Math.max(-5.5, Math.min(5.5, s.dronePos.z + dz));

    // Check laser barrier collision if not disabled
    if (!lasersDisabled) {
      if (
        (Math.abs(nextX - 1.8) < 0.3 || Math.abs(nextX - (-1.8)) < 0.3) &&
        Math.abs(nextZ) < 5.0
      ) {
        setGameOver(true);
        sound.playHit();
        sound.playLose();
        onDone(botsRescued * 300);
        return;
      }
    }

    s.dronePos.set(nextX, 0.4, nextZ);
    sound.playTap();
    if (s.droneMesh) s.droneMesh.position.copy(s.dronePos);

    // Terminal hack to disable lasers
    if (!lasersDisabled && s.dronePos.distanceTo(s.terminalPos) < 1.4) {
      setLasersDisabled(true);
      sound.playScore();
      s.laserMeshes.forEach((l) => s.scene?.remove(l));
      if (s.terminalMesh) {
        (s.terminalMesh.material as THREE.MeshStandardMaterial).color.setHex(0x22c55e);
      }
    }

    // Rescue mini bots
    s.miniBots.forEach((b) => {
      if (!b.rescued && b.pos.distanceTo(s.dronePos) < 1.2) {
        b.rescued = true;
        s.scene?.remove(b.mesh);
        sound.playScore();
        if (s.scene) {
          s.particles.push(createParticleBurst(s.scene, b.pos, 0xffb800, 16));
        }

        setBotsRescued((r) => {
          const nr = r + 1;
          if (nr === 3) {
            setGameWon(true);
            sound.playWin();
            onDone(1500);
          }
          return nr;
        });
      }
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') moveDrone(0, -1);
      if (e.key === 'ArrowDown' || e.key === 's') moveDrone(0, 1);
      if (e.key === 'ArrowLeft' || e.key === 'a') moveDrone(-1, 0);
      if (e.key === 'ArrowRight' || e.key === 'd') moveDrone(1, 0);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gameOver, gameWon, lasersDisabled]);

  const onFrame = (dt: number) => {
    const delta = Math.min(dt, 0.05);
    stateRef.current.particles = stateRef.current.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    setBotsRescued(0);
    setLasersDisabled(false);
    setGameOver(false);
    setGameWon(false);
    stateRef.current.dronePos.set(0, 0.4, 4);
    stateRef.current.miniBots.forEach((b) => {
      b.rescued = false;
      stateRef.current.scene?.add(b.mesh);
    });
  };

  return (
    <div className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-ink select-none">
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[0, 9.5, 7.5]}
        cameraLookAt={[0, 0, 0]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Mini-Bots: <span className="text-marigold">{botsRescued} / 3 Rescued</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Laser Grid: <span className={lasersDisabled ? 'text-emerald-400' : 'text-red-400'}>{lasersDisabled ? 'DISABLED 🔓' : 'ACTIVE ⚡'}</span>
        </div>
      </div>

      <div className="absolute top-16 inset-x-0 text-center pointer-events-none">
        <span className="text-xs font-bold text-white/70 bg-ink/70 px-4 py-1.5 rounded-full border border-white/10">
          Hack the left terminal to disable red laser grids, then rescue all 3 companion mini-bots!
        </span>
      </div>

      {/* Controls */}
      <div className="absolute bottom-6 inset-x-0 flex flex-col items-center gap-2 pointer-events-auto">
        <button
          onClick={() => moveDrone(0, -1)}
          className="w-14 h-14 bg-white/20 backdrop-blur text-white font-black text-2xl rounded-2xl active:scale-90"
        >
          ▲
        </button>
        <div className="flex gap-4">
          <button
            onClick={() => moveDrone(-1, 0)}
            className="w-14 h-14 bg-white/20 backdrop-blur text-white font-black text-2xl rounded-2xl active:scale-90"
          >
            ◀
          </button>
          <button
            onClick={() => moveDrone(0, 1)}
            className="w-14 h-14 bg-white/20 backdrop-blur text-white font-black text-2xl rounded-2xl active:scale-90"
          >
            ▼
          </button>
          <button
            onClick={() => moveDrone(1, 0)}
            className="w-14 h-14 bg-white/20 backdrop-blur text-white font-black text-2xl rounded-2xl active:scale-90"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Win/Loss Modal */}
      {(gameOver || gameWon) && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">{gameWon ? '🤖🏆✨' : '⚡💥'}</div>
          <h2 className="text-3xl font-extrabold tracking-tight">
            {gameWon ? 'All Mini-Bots Rescued!' : 'Electrocuted by Laser Grid!'}
          </h2>
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
