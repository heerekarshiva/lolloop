'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';

interface Props {
  onDone: (score: number) => void;
}

type Stage = 'waiting' | 'ready' | 'green' | 'early' | 'success';

export default function ReactionMaster3D({ onDone }: Props) {
  const [stage, setStage] = useState<Stage>('waiting');
  const [reactionMs, setReactionMs] = useState(0);
  const [bestTime, setBestTime] = useState<number | null>(null);

  const stateRef = useRef({
    startTime: 0,
    timer: null as any,
    lightMesh: null as THREE.Mesh | null,
    scene: null as THREE.Scene | null,
    particles: [] as { update: (dt: number) => boolean }[],
  });

  const initGame = ({ scene }: { scene: THREE.Scene }) => {
    stateRef.current.scene = scene;
    scene.background = new THREE.Color(0x18181b);

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);

    // Giant 3D Traffic / Reflex Signal Light
    const poleGeo = new THREE.CylinderGeometry(0.2, 0.2, 3, 16);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = -1;
    scene.add(pole);

    const domeGeo = new THREE.SphereGeometry(1.6, 24, 24);
    const domeMat = new THREE.MeshStandardMaterial({
      color: 0xef4444, // starts red
      emissive: 0xb91c1c,
      emissiveIntensity: 0.6,
      roughness: 0.2,
    });
    const light = new THREE.Mesh(domeGeo, domeMat);
    light.position.y = 1.2;
    scene.add(light);
    stateRef.current.lightMesh = light;

    startRound();
  };

  const startRound = () => {
    setStage('waiting');
    if (stateRef.current.lightMesh) {
      (stateRef.current.lightMesh.material as THREE.MeshStandardMaterial).color.setHex(0xef4444);
      (stateRef.current.lightMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0xb91c1c);
    }

    const delay = 1800 + Math.random() * 2500;
    stateRef.current.timer = setTimeout(() => {
      setStage('green');
      stateRef.current.startTime = Date.now();
      sound.playTap();
      if (stateRef.current.lightMesh) {
        (stateRef.current.lightMesh.material as THREE.MeshStandardMaterial).color.setHex(0x22c55e);
        (stateRef.current.lightMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x15803d);
      }
    }, delay);
  };

  const handleTap = () => {
    if (stage === 'waiting') {
      // Tapped too early!
      clearTimeout(stateRef.current.timer);
      setStage('early');
      sound.playHit();
      sound.playLose();
      if (stateRef.current.lightMesh) {
        (stateRef.current.lightMesh.material as THREE.MeshStandardMaterial).color.setHex(0xf97316);
      }
    } else if (stage === 'green') {
      const ms = Date.now() - stateRef.current.startTime;
      setReactionMs(ms);
      setBestTime((prev) => (prev ? Math.min(prev, ms) : ms));
      setStage('success');
      sound.playScore();
      sound.playWin();

      if (stateRef.current.scene) {
        stateRef.current.particles.push(
          createParticleBurst(stateRef.current.scene, new THREE.Vector3(0, 1.2, 0), 0x22c55e, 25)
        );
      }
      onDone(Math.max(100, 1000 - ms));
    }
  };

  const onFrame = (dt: number) => {
    const delta = Math.min(dt, 0.05);
    stateRef.current.particles = stateRef.current.particles.filter((p) => p.update(delta));
  };

  return (
    <div
      className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-ink select-none cursor-pointer"
      onPointerDown={handleTap}
    >
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[0, 1.5, 5.5]}
        cameraLookAt={[0, 1.2, 0]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Reaction Time: <span className="text-marigold">{reactionMs ? `${reactionMs} ms` : '---'}</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Best: <span className="text-emerald-400">{bestTime ? `${bestTime} ms` : 'None'}</span>
        </div>
      </div>

      {/* Center Banner Message */}
      <div className="absolute inset-x-0 bottom-24 flex flex-col items-center pointer-events-none">
        {stage === 'waiting' && (
          <div className="px-8 py-3.5 rounded-full bg-red-950/80 border border-red-500/50 text-red-400 font-black text-xl animate-pulse">
            WAIT FOR GREEN... 🔴
          </div>
        )}
        {stage === 'green' && (
          <div className="px-8 py-3.5 rounded-full bg-emerald-950/80 border border-emerald-500 text-emerald-300 font-black text-2xl animate-bounce">
            TAP NOW! 🟢⚡
          </div>
        )}
        {stage === 'early' && (
          <div className="px-8 py-3.5 rounded-full bg-orange-950/80 border border-orange-500 text-orange-300 font-black text-lg">
            Too early! You jumped the buzzer! ❌
          </div>
        )}
        {stage === 'success' && (
          <div className="px-8 py-3.5 rounded-full bg-emerald-950/80 border border-emerald-500 text-emerald-300 font-black text-xl">
            Lightning Reflex! {reactionMs} ms! ⚡
          </div>
        )}
      </div>

      {/* Restart Button */}
      {(stage === 'early' || stage === 'success') && (
        <div className="absolute bottom-6 inset-x-0 flex justify-center pointer-events-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              startRound();
            }}
            className="px-8 py-3.5 bg-marigold text-ink rounded-full font-black text-lg shadow-xl active:scale-95"
          >
            Try Again ↻
          </button>
        </div>
      )}
    </div>
  );
}
