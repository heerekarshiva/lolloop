'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createCharacter, createParticleBurst, createTree } from '../3d/models';
import { sound } from '@/lib/sound';

interface Props {
  onDone: (score: number) => void;
}

export default function IslandSurvival3D({ onDone }: Props) {
  const [wood, setWood] = useState(0);
  const [bamboo, setBamboo] = useState(0);
  const [raftBuilt, setRaftBuilt] = useState(false);
  const [stamina, setStamina] = useState(100);

  const stateRef = useRef({
    playerPos: new THREE.Vector3(0, 0, 2),
    playerMesh: null as THREE.Group | null,
    resources: [] as { mesh: THREE.Mesh; pos: THREE.Vector3; type: 'wood' | 'bamboo'; collected: boolean }[],
    raftMesh: null as THREE.Mesh | null,
    scene: null as THREE.Scene | null,
    particles: [] as { update: (dt: number) => boolean }[],
  });

  const initGame = ({ scene }: { scene: THREE.Scene }) => {
    stateRef.current.scene = scene;
    scene.background = new THREE.Color(0x38bdf8);

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    const sun = new THREE.DirectionalLight(0xfff5d6, 1.4);
    sun.position.set(10, 20, 15);
    scene.add(ambient, sun);

    // Island Ground
    const islandGeo = new THREE.CylinderGeometry(7.5, 8.5, 0.6, 24);
    const islandMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.8 });
    const island = new THREE.Mesh(islandGeo, islandMat);
    island.position.y = -0.3;
    scene.add(island);

    // Palm trees
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const tree = createTree(1.2);
      tree.position.set(Math.cos(angle) * 4, 0, Math.sin(angle) * 4);
      scene.add(tree);
    }

    // Player Survivor
    const player = createCharacter({ color: 0x0284c7, scale: 0.8 });
    player.position.set(0, 0, 2);
    scene.add(player);
    stateRef.current.playerMesh = player;

    // Scattered Resources (3 Driftwood, 3 Bamboo)
    [
      { pos: new THREE.Vector3(-2.5, 0.2, -2), type: 'wood' as const },
      { pos: new THREE.Vector3(2.5, 0.2, -2.5), type: 'wood' as const },
      { pos: new THREE.Vector3(-1.5, 0.2, 2.5), type: 'wood' as const },
      { pos: new THREE.Vector3(3.0, 0.2, 1.5), type: 'bamboo' as const },
      { pos: new THREE.Vector3(-3.0, 0.2, 0.5), type: 'bamboo' as const },
      { pos: new THREE.Vector3(0, 0.2, -3.5), type: 'bamboo' as const },
    ].forEach(({ pos, type }) => {
      const geo = new THREE.CylinderGeometry(0.12, 0.12, 1.2, 8);
      const mat = new THREE.MeshStandardMaterial({
        color: type === 'wood' ? 0x78350f : 0x84cc16,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.z = Math.PI / 2;
      mesh.position.copy(pos);
      scene.add(mesh);
      stateRef.current.resources.push({ mesh, pos, type, collected: false });
    });

    // Raft Construction Site on Shore (Z = -5)
    const raftGeo = new THREE.BoxGeometry(2.4, 0.3, 2.4);
    const raftMat = new THREE.MeshStandardMaterial({ color: 0xa16207 });
    const raft = new THREE.Mesh(raftGeo, raftMat);
    raft.position.set(0, -0.1, -5.2);
    scene.add(raft);
    stateRef.current.raftMesh = raft;
  };

  const movePlayer = (dx: number, dz: number) => {
    if (raftBuilt) return;
    const s = stateRef.current;
    s.playerPos.x = Math.max(-5.5, Math.min(5.5, s.playerPos.x + dx));
    s.playerPos.z = Math.max(-5.5, Math.min(5.5, s.playerPos.z + dz));
    sound.playTap();
    setStamina((st) => Math.max(10, st - 1));

    if (s.playerMesh) s.playerMesh.position.copy(s.playerPos);

    // Harvest resources
    s.resources.forEach((res) => {
      if (!res.collected && res.pos.distanceTo(s.playerPos) < 1.2) {
        res.collected = true;
        s.scene?.remove(res.mesh);
        sound.playScore();

        if (res.type === 'wood') setWood((w) => w + 1);
        if (res.type === 'bamboo') setBamboo((b) => b + 1);

        if (s.scene) {
          s.particles.push(createParticleBurst(s.scene, res.pos, 0x84cc16, 14));
        }
      }
    });

    // Check Raft Completion (3 wood + 3 bamboo)
    const totalCollected = s.resources.filter((r) => r.collected).length;
    if (totalCollected === 6 && s.playerPos.distanceTo(new THREE.Vector3(0, 0, -5.2)) < 1.8) {
      setRaftBuilt(true);
      sound.playWin();
      onDone(1500);
    }
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
  }, [raftBuilt]);

  const onFrame = (dt: number) => {
    const delta = Math.min(dt, 0.05);
    stateRef.current.particles = stateRef.current.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    setWood(0);
    setBamboo(0);
    setRaftBuilt(false);
    setStamina(100);
    stateRef.current.playerPos.set(0, 0, 2);
    stateRef.current.resources.forEach((r) => {
      r.collected = false;
      stateRef.current.scene?.add(r.mesh);
    });
  };

  return (
    <div className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-sky-100 select-none">
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[0, 8.5, 7.5]}
        cameraLookAt={[0, 0, 0]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Wood: <span className="text-amber-400">{wood} / 3</span> · Bamboo: <span className="text-lime-400">{bamboo} / 3</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Stamina: <span className="text-cyan-300">{stamina}%</span>
        </div>
      </div>

      <div className="absolute top-16 inset-x-0 text-center pointer-events-none">
        <span className="text-xs font-bold text-ink/80 bg-white/80 px-4 py-1.5 rounded-full border border-ink/10 shadow-sm">
          Collect 3 Wood + 3 Bamboo, then walk to shore to construct escape raft!
        </span>
      </div>

      {/* Controls */}
      <div className="absolute bottom-6 inset-x-0 flex flex-col items-center gap-2 pointer-events-auto">
        <button
          onClick={() => movePlayer(0, -1)}
          className="w-14 h-14 bg-ink/70 backdrop-blur text-white font-black text-2xl rounded-2xl active:scale-90"
        >
          ▲
        </button>
        <div className="flex gap-4">
          <button
            onClick={() => movePlayer(-1, 0)}
            className="w-14 h-14 bg-ink/70 backdrop-blur text-white font-black text-2xl rounded-2xl active:scale-90"
          >
            ◀
          </button>
          <button
            onClick={() => movePlayer(0, 1)}
            className="w-14 h-14 bg-ink/70 backdrop-blur text-white font-black text-2xl rounded-2xl active:scale-90"
          >
            ▼
          </button>
          <button
            onClick={() => movePlayer(1, 0)}
            className="w-14 h-14 bg-ink/70 backdrop-blur text-white font-black text-2xl rounded-2xl active:scale-90"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Win Modal */}
      {raftBuilt && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">🏝️⛵✨</div>
          <h2 className="text-3xl font-extrabold tracking-tight">Raft Constructed!</h2>
          <p className="text-xl font-bold mt-2">
            Castaway escape successful! You sailed to safety!
          </p>
          <button
            onClick={restart}
            className="mt-6 px-8 py-3.5 bg-marigold text-ink rounded-full font-extrabold text-lg hover:scale-105 active:scale-95 transition"
          >
            Survive Again
          </button>
        </div>
      )}
    </div>
  );
}
