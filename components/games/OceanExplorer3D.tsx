'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';

interface Props {
  onDone: (score: number) => void;
}

export default function OceanExplorer3D({ onDone }: Props) {
  const [pearls, setPearls] = useState(0);
  const [oxygen, setOxygen] = useState(100);
  const [gameWon, setGameWon] = useState(false);

  const stateRef = useRef({
    subPos: new THREE.Vector3(0, 0, 0),
    subMesh: null as THREE.Group | null,
    pearlsList: [] as { mesh: THREE.Mesh; pos: THREE.Vector3; collected: boolean }[],
    scene: null as THREE.Scene | null,
    particles: [] as { update: (dt: number) => boolean }[],
  });

  const createSubmarine = (): THREE.Group => {
    const group = new THREE.Group();
    // Hull
    const hullGeo = new THREE.CapsuleGeometry(0.7, 1.8, 12, 16);
    const hullMat = new THREE.MeshStandardMaterial({ color: 0xffb800, roughness: 0.3, metalness: 0.7 });
    const hull = new THREE.Mesh(hullGeo, hullMat);
    hull.rotation.x = Math.PI / 2;
    group.add(hull);

    // Conning tower / periscope
    const towerGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.7, 12);
    const towerMat = new THREE.MeshStandardMaterial({ color: 0xd97706 });
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.set(0, 0.7, -0.2);
    group.add(tower);

    // Glass viewport (front)
    const viewGeo = new THREE.SphereGeometry(0.4, 12, 12);
    const viewMat = new THREE.MeshStandardMaterial({ color: 0x00e5ff, metalness: 0.9, roughness: 0.1 });
    const view = new THREE.Mesh(viewGeo, viewMat);
    view.position.set(0, 0.1, -1.2);
    group.add(view);

    return group;
  };

  const initGame = ({ scene }: { scene: THREE.Scene }) => {
    stateRef.current.scene = scene;
    scene.background = new THREE.Color(0x021727);
    scene.fog = new THREE.FogExp2(0x021727, 0.035);

    const ambient = new THREE.AmbientLight(0x0284c7, 0.6);
    const searchlight = new THREE.SpotLight(0xffffff, 2.5);
    searchlight.position.set(0, 0, -1);
    searchlight.target.position.set(0, 0, -10);
    scene.add(ambient, searchlight);

    // Submarine
    const sub = createSubmarine();
    scene.add(sub);
    stateRef.current.subMesh = sub;

    // Glowing Pearls scattered in ocean
    [
      new THREE.Vector3(-3, 1.5, -4),
      new THREE.Vector3(3, -1.5, -5),
      new THREE.Vector3(-2, -2.0, -8),
      new THREE.Vector3(2, 2.0, -10),
      new THREE.Vector3(0, 0, -13),
    ].forEach((pos) => {
      const geo = new THREE.SphereGeometry(0.35, 16, 16);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.8,
        roughness: 0.1,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      scene.add(mesh);
      stateRef.current.pearlsList.push({ mesh, pos, collected: false });
    });
  };

  const moveSub = (dx: number, dy: number, dz: number) => {
    if (gameWon) return;
    const s = stateRef.current;
    s.subPos.x = Math.max(-5, Math.min(5, s.subPos.x + dx));
    s.subPos.y = Math.max(-3.5, Math.min(3.5, s.subPos.y + dy));
    s.subPos.z = Math.max(-15, Math.min(2, s.subPos.z + dz));
    sound.playTap();

    if (s.subMesh) {
      s.subMesh.position.copy(s.subPos);
      s.subMesh.rotation.z = -dx * 0.2;
      s.subMesh.rotation.x = -dy * 0.15;
    }

    // Check pearl collect
    s.pearlsList.forEach((p) => {
      if (!p.collected && p.pos.distanceTo(s.subPos) < 1.3) {
        p.collected = true;
        s.scene?.remove(p.mesh);
        sound.playScore();
        if (s.scene) {
          s.particles.push(createParticleBurst(s.scene, p.pos, 0x38bdf8, 16));
        }

        setPearls((pr) => {
          const np = pr + 1;
          if (np === 5) {
            setGameWon(true);
            sound.playWin();
            onDone(1500);
          }
          return np;
        });
      }
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') moveSub(0, 0.8, -0.8);
      if (e.key === 'ArrowDown' || e.key === 's') moveSub(0, -0.8, 0.8);
      if (e.key === 'ArrowLeft' || e.key === 'a') moveSub(-0.8, 0, 0);
      if (e.key === 'ArrowRight' || e.key === 'd') moveSub(0.8, 0, 0);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gameWon]);

  // Oxygen consumption
  useEffect(() => {
    if (gameWon) return;
    const interval = setInterval(() => {
      setOxygen((o) => Math.max(0, o - 2));
    }, 1000);
    return () => clearInterval(interval);
  }, [gameWon]);

  const onFrame = (dt: number) => {
    const delta = Math.min(dt, 0.05);
    stateRef.current.particles = stateRef.current.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    setPearls(0);
    setOxygen(100);
    setGameWon(false);
    stateRef.current.subPos.set(0, 0, 0);
    stateRef.current.pearlsList.forEach((p) => {
      p.collected = false;
      stateRef.current.scene?.add(p.mesh);
    });
  };

  return (
    <div className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-ink select-none">
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[0, 2.5, 6]}
        cameraLookAt={[0, 0, -4]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Pearls: <span className="text-cyan-400">{pearls} / 5</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Oxygen: <span className={oxygen < 25 ? 'text-red-400 animate-pulse' : 'text-cyan-300'}>{oxygen}%</span>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-6 inset-x-0 flex flex-col items-center gap-2 pointer-events-auto">
        <button
          onClick={() => moveSub(0, 0.8, -0.8)}
          className="w-14 h-14 bg-white/20 backdrop-blur text-white font-black text-2xl rounded-2xl active:scale-90"
        >
          ▲
        </button>
        <div className="flex gap-4">
          <button
            onClick={() => moveSub(-0.8, 0, 0)}
            className="w-14 h-14 bg-white/20 backdrop-blur text-white font-black text-2xl rounded-2xl active:scale-90"
          >
            ◀
          </button>
          <button
            onClick={() => moveSub(0, -0.8, 0.8)}
            className="w-14 h-14 bg-white/20 backdrop-blur text-white font-black text-2xl rounded-2xl active:scale-90"
          >
            ▼
          </button>
          <button
            onClick={() => moveSub(0.8, 0, 0)}
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
          <div className="text-5xl mb-2">🌊⚓💎</div>
          <h2 className="text-3xl font-extrabold tracking-tight">Trench Explored!</h2>
          <p className="text-xl font-bold mt-2">
            All 5 legendary glowing ocean pearls retrieved!
          </p>
          <button
            onClick={restart}
            className="mt-6 px-8 py-3.5 bg-marigold text-ink rounded-full font-extrabold text-lg hover:scale-105 active:scale-95 transition"
          >
            Dive Again
          </button>
        </div>
      )}
    </div>
  );
}
