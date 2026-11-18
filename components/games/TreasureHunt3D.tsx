'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createCharacter, createCoin, createParticleBurst, createTree } from '../3d/models';
import { sound } from '@/lib/sound';

interface Props {
  onDone: (score: number) => void;
}

export default function TreasureHunt3D({ onDone }: Props) {
  const [chestFound, setChestFound] = useState(false);
  const [detectorSignal, setDetectorSignal] = useState(0); // 0 to 100%
  const [score, setScore] = useState(0);

  const stateRef = useRef({
    playerPos: new THREE.Vector3(0, 0, 4),
    targetTreasure: new THREE.Vector3(3.2, 0, -3.5),
    playerMesh: null as THREE.Group | null,
    chestMesh: null as THREE.Group | null,
    scene: null as THREE.Scene | null,
    particles: [] as { update: (dt: number) => boolean }[],
  });

  const createChestMesh = (): THREE.Group => {
    const group = new THREE.Group();
    const boxGeo = new THREE.BoxGeometry(1.2, 0.7, 0.8);
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 });
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.position.y = 0.35;
    group.add(box);

    const lidGeo = new THREE.CylinderGeometry(0.4, 0.4, 1.2, 16);
    const lidMat = new THREE.MeshStandardMaterial({ color: 0xffb800, metalness: 0.8 });
    const lid = new THREE.Mesh(lidGeo, lidMat);
    lid.rotation.z = Math.PI / 2;
    lid.position.y = 0.75;
    group.add(lid);

    return group;
  };

  const initGame = ({ scene }: { scene: THREE.Scene }) => {
    stateRef.current.scene = scene;
    scene.background = new THREE.Color(0x38bdf8);
    scene.fog = new THREE.FogExp2(0x38bdf8, 0.02);

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    const sun = new THREE.DirectionalLight(0xfff5d6, 1.4);
    sun.position.set(10, 20, 15);
    scene.add(ambient, sun);

    // Tropical Sandy Island
    const islandGeo = new THREE.CylinderGeometry(8.5, 9.5, 0.8, 32);
    const islandMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.9 });
    const island = new THREE.Mesh(islandGeo, islandMat);
    island.position.y = -0.4;
    island.receiveShadow = true;
    scene.add(island);

    // Palm trees
    [
      [-4.5, -3],
      [4.5, -2],
      [-3.5, 3],
      [4, 3],
    ].forEach(([tx, tz]) => {
      const palm = createTree(1.3);
      palm.position.set(tx, 0, tz);
      scene.add(palm);
    });

    // Player Pirate
    const pirate = createCharacter({ color: 0xd97706, accessory: 'none', scale: 0.8 });
    pirate.position.set(0, 0, 4);
    scene.add(pirate);
    stateRef.current.playerMesh = pirate;

    // Buried Chest (Initially hidden beneath sand)
    const chest = createChestMesh();
    chest.position.set(3.2, -1.0, -3.5);
    scene.add(chest);
    stateRef.current.chestMesh = chest;
  };

  const movePlayer = (dx: number, dz: number) => {
    if (chestFound) return;
    const s = stateRef.current;
    s.playerPos.x = Math.max(-5.5, Math.min(5.5, s.playerPos.x + dx));
    s.playerPos.z = Math.max(-5.5, Math.min(5.5, s.playerPos.z + dz));
    sound.playTap();

    if (s.playerMesh) s.playerMesh.position.copy(s.playerPos);

    // Update Metal Detector proximity to target
    const dist = s.playerPos.distanceTo(s.targetTreasure);
    const signalPercent = Math.max(0, Math.min(100, Math.round((1 - dist / 8.5) * 100)));
    setDetectorSignal(signalPercent);

    if (dist < 1.4) {
      // Unearth chest!
      setChestFound(true);
      sound.playScore();
      sound.playWin();
      if (s.chestMesh) s.chestMesh.position.y = 0;
      if (s.scene) {
        s.particles.push(createParticleBurst(s.scene, s.targetTreasure, 0xffd700, 30));
      }
      setScore(1500);
      onDone(1500);
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
  }, [chestFound]);

  const onFrame = (dt: number) => {
    const delta = Math.min(dt, 0.05);
    stateRef.current.particles = stateRef.current.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    const s = stateRef.current;
    s.playerPos.set(0, 0, 4);
    if (s.playerMesh) s.playerMesh.position.set(0, 0, 4);
    if (s.chestMesh) s.chestMesh.position.y = -1.0;
    setChestFound(false);
    setDetectorSignal(0);
    setScore(0);
  };

  return (
    <div className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-sky-200 select-none">
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[0, 9.5, 7.5]}
        cameraLookAt={[0, 0, 0]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Detector Signal: <span className="text-marigold font-black">{detectorSignal}%</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-sm">
          Follow signal to locate buried treasure!
        </div>
      </div>

      {/* Detector Signal Bar */}
      <div className="absolute top-16 inset-x-12 pointer-events-none">
        <div className="w-full h-3 rounded-full bg-slate-900/30 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 transition-all duration-150"
            style={{ width: `${detectorSignal}%` }}
          />
        </div>
      </div>

      {/* Virtual D-pad */}
      <div className="absolute bottom-6 inset-x-0 flex flex-col items-center gap-2 pointer-events-auto">
        <button
          onClick={() => movePlayer(0, -1.2)}
          className="w-14 h-14 bg-ink/70 backdrop-blur text-white font-black text-2xl rounded-2xl active:scale-90"
        >
          ▲
        </button>
        <div className="flex gap-4">
          <button
            onClick={() => movePlayer(-1.2, 0)}
            className="w-14 h-14 bg-ink/70 backdrop-blur text-white font-black text-2xl rounded-2xl active:scale-90"
          >
            ◀
          </button>
          <button
            onClick={() => movePlayer(0, 1.2)}
            className="w-14 h-14 bg-ink/70 backdrop-blur text-white font-black text-2xl rounded-2xl active:scale-90"
          >
            ▼
          </button>
          <button
            onClick={() => movePlayer(1.2, 0)}
            className="w-14 h-14 bg-ink/70 backdrop-blur text-white font-black text-2xl rounded-2xl active:scale-90"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Win Modal */}
      {chestFound && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">🏴‍☠️💰✨</div>
          <h2 className="text-3xl font-extrabold tracking-tight">Treasure Chest Unearthed!</h2>
          <p className="text-xl font-bold mt-2">
            Gold Doubloons Secured! Score: <span className="text-marigold">{score} pts</span>
          </p>
          <button
            onClick={restart}
            className="mt-6 px-8 py-3.5 bg-marigold text-ink rounded-full font-extrabold text-lg hover:scale-105 active:scale-95 transition"
          >
            Hunt Again
          </button>
        </div>
      )}
    </div>
  );
}
