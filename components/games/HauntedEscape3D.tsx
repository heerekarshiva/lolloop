'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createCharacter, createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';

interface Props {
  onDone: (score: number) => void;
}

export default function HauntedEscape3D({ onDone }: Props) {
  const [talismans, setTalismans] = useState(0);
  const [battery, setBattery] = useState(100);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);

  const stateRef = useRef({
    playerPos: new THREE.Vector3(0, 0, 4),
    playerMesh: null as THREE.Group | null,
    ghostMesh: null as THREE.Mesh | null,
    ghostPos: new THREE.Vector3(0, 0.8, -4),
    flashlight: null as THREE.SpotLight | null,
    talismansList: [] as { mesh: THREE.Mesh; pos: THREE.Vector3; collected: boolean }[],
    scene: null as THREE.Scene | null,
    particles: [] as { update: (dt: number) => boolean }[],
  });

  const initGame = ({ scene }: { scene: THREE.Scene }) => {
    stateRef.current.scene = scene;
    scene.background = new THREE.Color(0x05050a);
    scene.fog = new THREE.FogExp2(0x05050a, 0.05);

    const ambient = new THREE.AmbientLight(0x1e1b4b, 0.4);
    scene.add(ambient);

    // Flashlight attached to player
    const flash = new THREE.SpotLight(0xfff5d6, 4.0, 15, Math.PI / 4, 0.3);
    flash.position.set(0, 1.5, 4);
    scene.add(flash);
    scene.add(flash.target);
    stateRef.current.flashlight = flash;

    // Haunted Manor Floor
    const floorGeo = new THREE.BoxGeometry(12, 0.4, 12);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.9 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.2;
    scene.add(floor);

    // Player Explorer
    const player = createCharacter({ color: 0x9333ea, scale: 0.75 });
    player.position.set(0, 0, 4);
    scene.add(player);
    stateRef.current.playerMesh = player;

    // Roaming Ghost Phantom (Semi-transparent glowing)
    const ghostGeo = new THREE.SphereGeometry(0.6, 16, 16);
    const ghostMat = new THREE.MeshStandardMaterial({
      color: 0x818cf8,
      emissive: 0x6366f1,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.65,
    });
    const ghost = new THREE.Mesh(ghostGeo, ghostMat);
    ghost.position.copy(stateRef.current.ghostPos);
    scene.add(ghost);
    stateRef.current.ghostMesh = ghost;

    // 4 Mystic Talismans
    [
      new THREE.Vector3(-4, 0.6, -3),
      new THREE.Vector3(4, 0.6, -3),
      new THREE.Vector3(-3.5, 0.6, 2),
      new THREE.Vector3(3.5, 0.6, 2),
    ].forEach((pos) => {
      const geo = new THREE.OctahedronGeometry(0.4);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffb800,
        emissive: 0xff9800,
        emissiveIntensity: 0.8,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      scene.add(mesh);
      stateRef.current.talismansList.push({ mesh, pos, collected: false });
    });
  };

  const movePlayer = (dx: number, dz: number) => {
    if (gameOver || gameWon) return;
    const s = stateRef.current;
    s.playerPos.x = Math.max(-5, Math.min(5, s.playerPos.x + dx));
    s.playerPos.z = Math.max(-5, Math.min(5, s.playerPos.z + dz));
    sound.playTap();

    if (s.playerMesh) s.playerMesh.position.copy(s.playerPos);
    if (s.flashlight) {
      s.flashlight.position.set(s.playerPos.x, 1.5, s.playerPos.z);
      s.flashlight.target.position.set(s.playerPos.x + dx * 2, 0, s.playerPos.z + dz * 2);
    }

    // Collect Talismans
    s.talismansList.forEach((t) => {
      if (!t.collected && t.pos.distanceTo(s.playerPos) < 1.2) {
        t.collected = true;
        s.scene?.remove(t.mesh);
        sound.playScore();

        if (s.scene) {
          s.particles.push(createParticleBurst(s.scene, t.pos, 0xffb800, 20));
        }

        setTalismans((tl) => {
          const n = tl + 1;
          if (n === 4) {
            setGameWon(true);
            sound.playWin();
            onDone(1600);
          }
          return n;
        });
      }
    });
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
  }, [gameOver, gameWon]);

  // Battery drain
  useEffect(() => {
    if (gameOver || gameWon) return;
    const interval = setInterval(() => {
      setBattery((b) => Math.max(0, b - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [gameOver, gameWon]);

  const onFrame = (dt: number, time: number) => {
    if (gameOver || gameWon) return;
    const s = stateRef.current;
    const delta = Math.min(dt, 0.05);

    // Roaming ghost tracks player slowly
    const toPlayer = s.playerPos.clone().sub(s.ghostPos).normalize();
    s.ghostPos.addScaledVector(toPlayer, 2.4 * delta);
    s.ghostPos.y = 0.8 + Math.sin(time * 3) * 0.2;

    if (s.ghostMesh) {
      s.ghostMesh.position.copy(s.ghostPos);
    }

    // Check ghost catch
    if (s.ghostPos.distanceTo(s.playerPos) < 1.1) {
      setGameOver(true);
      sound.playHit();
      sound.playLose();
      onDone(talismans * 250);
      return;
    }

    s.particles = s.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    setTalismans(0);
    setBattery(100);
    setGameOver(false);
    setGameWon(false);
    stateRef.current.playerPos.set(0, 0, 4);
    stateRef.current.ghostPos.set(0, 0.8, -4);
    stateRef.current.talismansList.forEach((t) => {
      t.collected = false;
      stateRef.current.scene?.add(t.mesh);
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
          Talismans: <span className="text-marigold">{talismans} / 4</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Battery: <span className={battery < 25 ? 'text-red-400 animate-pulse' : 'text-cyan-300'}>{battery}%</span>
        </div>
      </div>

      <div className="absolute top-16 inset-x-0 text-center pointer-events-none">
        <span className="text-xs font-bold text-white/70 bg-ink/70 px-4 py-1.5 rounded-full border border-white/10">
          Shine your beam to find all 4 mystic talismans. EVADE the roaming ghost!
        </span>
      </div>

      {/* Controls */}
      <div className="absolute bottom-6 inset-x-0 flex flex-col items-center gap-2 pointer-events-auto">
        <button
          onClick={() => movePlayer(0, -1)}
          className="w-14 h-14 bg-white/20 backdrop-blur text-white font-black text-2xl rounded-2xl active:scale-90"
        >
          ▲
        </button>
        <div className="flex gap-4">
          <button
            onClick={() => movePlayer(-1, 0)}
            className="w-14 h-14 bg-white/20 backdrop-blur text-white font-black text-2xl rounded-2xl active:scale-90"
          >
            ◀
          </button>
          <button
            onClick={() => movePlayer(0, 1)}
            className="w-14 h-14 bg-white/20 backdrop-blur text-white font-black text-2xl rounded-2xl active:scale-90"
          >
            ▼
          </button>
          <button
            onClick={() => movePlayer(1, 0)}
            className="w-14 h-14 bg-white/20 backdrop-blur text-white font-black text-2xl rounded-2xl active:scale-90"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Game Over Screen */}
      {(gameOver || gameWon) && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">{gameWon ? '👻🏆✨' : '👻💀'}</div>
          <h2 className="text-3xl font-extrabold tracking-tight">
            {gameWon ? 'Manor Curse Broken!' : 'Caught by the Phantom!'}
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
