'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';

interface Props {
  onDone: (score: number) => void;
}

const ITEMS = ['🍎', '⚽', '🧸', '🎮', '🍕', '🚗'];

interface ToyObject {
  id: number;
  type: string;
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
  color: number;
}

export default function MatchMania3D({ onDone }: Props) {
  const [slotItems, setSlotItems] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [itemsLeft, setItemsLeft] = useState(18);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);

  const stateRef = useRef({
    score: 0,
    items: [] as ToyObject[],
    particles: [] as { update: (dt: number) => boolean }[],
    scene: null as THREE.Scene | null,
    camera: null as THREE.PerspectiveCamera | null,
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(),
  });

  const initGame = ({ scene, camera }: { scene: THREE.Scene; camera: THREE.PerspectiveCamera }) => {
    stateRef.current.scene = scene;
    stateRef.current.camera = camera;
    scene.background = new THREE.Color(0xf1f5f9);

    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    const dir = new THREE.DirectionalLight(0xffb800, 1.2);
    dir.position.set(5, 15, 10);
    dir.castShadow = true;
    scene.add(ambient, dir);

    // 3D Dish Basin
    const bowlGeo = new THREE.CylinderGeometry(4.2, 3.2, 1.2, 24);
    const bowlMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const bowl = new THREE.Mesh(bowlGeo, bowlMat);
    bowl.position.y = -0.6;
    bowl.receiveShadow = true;
    scene.add(bowl);

    // Generate 18 objects (3 of each 6 items)
    const deck: string[] = [];
    ITEMS.forEach((it) => {
      deck.push(it, it, it);
    });
    deck.sort(() => Math.random() - 0.5);

    const colors = [0xff1744, 0x2196f3, 0xff9100, 0x9c27b0, 0x00e676, 0xffeb3b];

    deck.forEach((type, idx) => {
      const geo = new THREE.DodecahedronGeometry(0.42);
      const color = colors[ITEMS.indexOf(type)];
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.3,
        metalness: 0.1,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 2.2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = 0.3 + (idx % 4) * 0.4;

      mesh.position.set(x, y, z);
      mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      mesh.castShadow = true;
      scene.add(mesh);

      stateRef.current.items.push({
        id: idx,
        type,
        mesh,
        pos: new THREE.Vector3(x, y, z),
        color,
      });
    });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gameOver || gameWon || slotItems.length >= 7) return;
    const s = stateRef.current;
    if (!s.camera || !s.scene) return;

    const rect = e.currentTarget.getBoundingClientRect();
    s.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    s.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    s.raycaster.setFromCamera(s.mouse, s.camera);
    const meshes = s.items.map((i) => i.mesh);
    const hits = s.raycaster.intersectObjects(meshes);

    if (hits.length > 0) {
      const hitMesh = hits[0].object as THREE.Mesh;
      const idx = s.items.findIndex((i) => i.mesh === hitMesh);
      if (idx !== -1) {
        const item = s.items[idx];
        s.scene.remove(item.mesh);
        s.items.splice(idx, 1);
        setItemsLeft(s.items.length);

        sound.playTap();
        s.particles.push(createParticleBurst(s.scene, item.pos, item.color, 12));

        // Add to matching slot bar
        setSlotItems((prev) => {
          const updated = [...prev, item.type];

          // Check for triple match
          const count = updated.filter((t) => t === item.type).length;
          if (count === 3) {
            sound.playScore();
            s.score += 300;
            setScore(s.score);
            const remainingSlots = updated.filter((t) => t !== item.type);

            // Check win
            if (s.items.length === 0 && remainingSlots.length === 0) {
              setGameWon(true);
              sound.playWin();
              onDone(s.score + 1000);
            }
            return remainingSlots;
          }

          // Check bar overflow lose
          if (updated.length >= 7) {
            setGameOver(true);
            sound.playLose();
            onDone(s.score);
          }

          return updated;
        });
      }
    }
  };

  const onFrame = (dt: number) => {
    const delta = Math.min(dt, 0.05);
    stateRef.current.particles = stateRef.current.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    setSlotItems([]);
    setScore(0);
    setGameOver(false);
    setGameWon(false);
    stateRef.current.score = 0;

    if (stateRef.current.scene) {
      stateRef.current.items.forEach((i) => stateRef.current.scene?.remove(i.mesh));
      stateRef.current.items = [];

      const deck: string[] = [];
      ITEMS.forEach((it) => deck.push(it, it, it));
      deck.sort(() => Math.random() - 0.5);

      const colors = [0xff1744, 0x2196f3, 0xff9100, 0x9c27b0, 0x00e676, 0xffeb3b];
      deck.forEach((type, idx) => {
        const geo = new THREE.DodecahedronGeometry(0.42);
        const color = colors[ITEMS.indexOf(type)];
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.3 });
        const mesh = new THREE.Mesh(geo, mat);
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 2.2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = 0.3 + (idx % 4) * 0.4;

        mesh.position.set(x, y, z);
        stateRef.current.scene?.add(mesh);
        stateRef.current.items.push({ id: idx, type, mesh, pos: new THREE.Vector3(x, y, z), color });
      });
      setItemsLeft(18);
    }
  };

  return (
    <div
      className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-slate-100 select-none cursor-pointer"
      onPointerDown={handlePointerDown}
    >
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[0, 7.5, 4.5]}
        cameraLookAt={[0, 0, 0]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-full border border-ink/10 text-ink font-extrabold text-base shadow-sm">
          Score: <span className="text-marigold">{score}</span>
        </div>
        <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-full border border-ink/10 text-ink font-extrabold text-base shadow-sm">
          Items Left: <span className="text-cyan-600">{itemsLeft}</span>
        </div>
      </div>

      {/* Slot Rack Bar (7 slots) */}
      <div className="absolute bottom-6 inset-x-6 flex justify-center pointer-events-none">
        <div className="flex gap-2 p-3 bg-white/90 backdrop-blur rounded-2xl border border-ink/10 shadow-xl">
          {Array.from({ length: 7 }).map((_, idx) => (
            <div
              key={idx}
              className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-2xl border ${
                slotItems[idx]
                  ? 'bg-amber-50 border-marigold text-ink shadow-sm'
                  : 'bg-slate-100 border-dashed border-slate-300'
              }`}
            >
              {slotItems[idx] || ''}
            </div>
          ))}
        </div>
      </div>

      {/* Game Over / Won Screen */}
      {(gameOver || gameWon) && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20 cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">{gameWon ? '🏆🧸' : '💥'}</div>
          <h2 className="text-3xl font-extrabold tracking-tight">
            {gameWon ? 'All Triples Cleared!' : 'Slot Rack Full!'}
          </h2>
          <p className="text-xl font-bold mt-2">
            Final Score: <span className="text-marigold">{score} pts</span>
          </p>
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
