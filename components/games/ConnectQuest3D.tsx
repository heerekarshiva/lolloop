'use client';

import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';

interface Props {
  onDone: (score: number) => void;
}

// 3x3 Pipe Network: each cell has connections [top, right, bottom, left]
interface PipeCell {
  id: number;
  r: number;
  c: number;
  rotation: number; // 0, 90, 180, 270
  type: 'straight' | 'corner' | 'source' | 'target';
  mesh: THREE.Group | null;
  isPowered: boolean;
}

export default function ConnectQuest3D({ onDone }: Props) {
  const [cells, setCells] = useState<PipeCell[]>(() => [
    { id: 0, r: 0, c: 0, rotation: 0, type: 'source', mesh: null, isPowered: true },
    { id: 1, r: 0, c: 1, rotation: 90, type: 'straight', mesh: null, isPowered: false },
    { id: 2, r: 0, c: 2, rotation: 180, type: 'corner', mesh: null, isPowered: false },
    { id: 3, r: 1, c: 0, rotation: 0, type: 'corner', mesh: null, isPowered: false },
    { id: 4, r: 1, c: 1, rotation: 270, type: 'straight', mesh: null, isPowered: false },
    { id: 5, r: 1, c: 2, rotation: 90, type: 'straight', mesh: null, isPowered: false },
    { id: 6, r: 2, c: 0, rotation: 180, type: 'corner', mesh: null, isPowered: false },
    { id: 7, r: 2, c: 1, rotation: 0, type: 'straight', mesh: null, isPowered: false },
    { id: 8, r: 2, c: 2, rotation: 0, type: 'target', mesh: null, isPowered: false },
  ]);

  const [moves, setMoves] = useState(0);
  const [circuitPowered, setCircuitPowered] = useState(false);

  const stateRef = useRef({
    scene: null as THREE.Scene | null,
    particles: [] as { update: (dt: number) => boolean }[],
  });

  const initGame = ({ scene }: { scene: THREE.Scene }) => {
    stateRef.current.scene = scene;
    scene.background = new THREE.Color(0x18181b);

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    const dir = new THREE.DirectionalLight(0xffb800, 1.4);
    dir.position.set(5, 12, 8);
    scene.add(ambient, dir);

    // Circuit Base Pad
    const baseGeo = new THREE.BoxGeometry(6.5, 0.4, 6.5);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.6 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = -0.2;
    scene.add(base);
  };

  const rotateCell = (id: number) => {
    if (circuitPowered) return;
    sound.playTap();

    setMoves((m) => m + 1);
    setCells((prev) => {
      const updated = prev.map((c) => {
        if (c.id === id) {
          return { ...c, rotation: (c.rotation + 90) % 360 };
        }
        return c;
      });

      // Quick check: if corner 2 and corner 8 match standard path
      const c2 = updated.find((c) => c.id === 2);
      const c5 = updated.find((c) => c.id === 5);
      const c8 = updated.find((c) => c.id === 8);

      if (c2?.rotation === 90 && c5?.rotation === 0 && c8?.rotation === 0) {
        setCircuitPowered(true);
        sound.playWin();
        if (stateRef.current.scene) {
          stateRef.current.particles.push(
            createParticleBurst(stateRef.current.scene, new THREE.Vector3(0, 0.5, 0), 0x00e5ff, 30)
          );
        }
        onDone(Math.max(200, 1500 - moves * 40));
      }

      return updated;
    });
  };

  const onFrame = (dt: number) => {
    const delta = Math.min(dt, 0.05);
    stateRef.current.particles = stateRef.current.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    setCircuitPowered(false);
    setMoves(0);
    setCells((prev) =>
      prev.map((c) => ({
        ...c,
        rotation: Math.floor(Math.random() * 4) * 90,
      }))
    );
  };

  return (
    <div className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-ink select-none">
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[0, 7.5, 5.5]}
        cameraLookAt={[0, 0, 0]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Power Grid: <span className={circuitPowered ? 'text-emerald-400 font-black' : 'text-amber-400'}>{circuitPowered ? 'ONLINE ⚡' : 'OFFLINE'}</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Rotations: <span className="text-cyan-400">{moves}</span>
        </div>
      </div>

      {/* Interactive 3D Nodes Matrix */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="grid grid-cols-3 gap-3 p-4 bg-zinc-900/85 backdrop-blur rounded-3xl border border-white/10 shadow-2xl max-w-xs w-full">
          {cells.map((cell) => {
            const isSource = cell.type === 'source';
            const isTarget = cell.type === 'target';

            return (
              <button
                key={cell.id}
                onClick={() => rotateCell(cell.id)}
                className={`h-20 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 shadow-lg ${
                  circuitPowered
                    ? 'bg-cyan-500/20 border-2 border-cyan-400 text-cyan-300 shadow-cyan-500/30'
                    : isSource
                    ? 'bg-amber-500/20 border-2 border-amber-400 text-amber-300'
                    : isTarget
                    ? 'bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300'
                    : 'bg-zinc-800 border border-zinc-700 text-white hover:bg-zinc-700'
                }`}
                style={{ transform: `rotate(${cell.rotation}deg)` }}
              >
                <span className="text-2xl font-black">
                  {isSource ? '⚡' : isTarget ? '🔋' : cell.type === 'straight' ? '━' : '┗'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="absolute bottom-4 inset-x-0 text-center pointer-events-none">
        <span className="text-xs font-bold text-white/60 bg-ink/70 px-4 py-1.5 rounded-full border border-white/10">
          Tap nodes to rotate conduits. Route energy from ⚡ Generator to 🔋 Battery!
        </span>
      </div>

      {/* Win Modal */}
      {circuitPowered && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">⚡🔋✨</div>
          <h2 className="text-3xl font-extrabold tracking-tight">Circuit Powered!</h2>
          <p className="text-xl font-bold mt-2">
            Completed in <span className="text-cyan-400">{moves} rotations</span>
          </p>
          <button
            onClick={restart}
            className="mt-6 px-8 py-3.5 bg-cyan-400 text-ink rounded-full font-extrabold text-lg hover:scale-105 active:scale-95 transition"
          >
            Connect Again
          </button>
        </div>
      )}
    </div>
  );
}
